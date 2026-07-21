// ============================================================================
// ShieldAI — SCADA Agent
// Monitors sensor readings, computes trends, generates risk assessments,
// and detects process drift (steady creep toward thresholds).
// ============================================================================

import { getSensorRiskLevel } from '../../utils/riskCalculator.js';
import { GeminiAgent } from '../ai/GeminiAgent.js';

/**
 * Trend symbols based on rate of change over recent readings.
 */
const TREND_SYMBOLS = {
  RISING_FAST:  '↑',
  RISING:       '↗',
  STABLE:       '→',
  FALLING:      '↘',
  FALLING_FAST: '↓',
};

export class SCADAAgent {
  constructor() {
    /** @type {Map<string, number[]>} Rolling window of last N readings per sensor. */
    this.readingHistory = new Map();
    this.historyDepth = 10; // Increased for better drift detection
    /** @type {Map<string, {count: number, mean: number, m2: number}>} Running statistics per sensor for Z-score anomaly detection. */
    this.sensorStats = new Map();
    /** @type {Map<string, {ewma: number, mean: number, sumSq: number, count: number, lambda: number}>} EWMA state per sensor for drift detection. */
    this.ewmaState = new Map();
    /** @type {Map<string, {sPlus: number, sMinus: number, mean: number, count: number, k: number, h: number}>} CUSUM state per sensor for abrupt shift detection. */
    this.cusumState = new Map();

    this.geminiAgent = new GeminiAgent({
      agentName: 'SCADA-AI',
      callInterval: 15,
      systemPrompt: `You are an AI-enhanced SCADA monitoring system for an industrial chemical plant.
You receive raw sensor data including statistical anomaly scores (EWMA, CUSUM, Z-score).
Analyze:
1. Are any sensors showing CORRELATED drift (multiple sensors drifting together = systemic issue)?
2. Which sensor readings are MOST concerning and WHY?
3. Distinguish between sensor MALFUNCTION vs. real PROCESS issues
4. Predict: if current trends continue, which sensor will breach first and when?
5. Rate overall sensor system health (0-100%)

Be specific about sensor IDs and values.`,
    });
    this.lastAIAnalysis = null;
  }

  /**
   * Evaluates current sensor state against previous readings.
   *
   * @param {object[]} sensors         - Current sensor array (with currentValue).
   * @param {object[]} previousReadings - Previous tick's sensor array (optional).
   * @returns {{ messages: object[], riskFactors: object[], alerts: object[], driftAlerts: object[] }}
   */
  evaluate(sensors, previousReadings = []) {
    const messages = [];
    const riskFactors = [];
    const alerts = [];
    const driftAlerts = [];
    const now = new Date();

    // Build lookup for previous readings
    const prevMap = new Map();
    for (const s of previousReadings) {
      prevMap.set(s.id, s.currentValue);
    }

    for (const sensor of sensors) {
      // ── Update rolling history ──────────────────────────────────────
      if (!this.readingHistory.has(sensor.id)) {
        this.readingHistory.set(sensor.id, []);
      }
      const history = this.readingHistory.get(sensor.id);
      history.push(sensor.currentValue);
      if (history.length > this.historyDepth) {
        history.shift();
      }

      // ── Compute trend ──────────────────────────────────────────────
      const trend = this._computeTrend(history);
      const rateOfChange = this._computeRateOfChange(history);

      // ── Compute risk ───────────────────────────────────────────────
      const riskValue = getSensorRiskLevel(
        sensor.currentValue,
        sensor.warningThreshold,
        sensor.criticalThreshold,
        sensor.normalRange?.max,
      );

      riskFactors.push({
        sensorId: sensor.id,
        value: riskValue,
        weight: this._getTypeWeight(sensor.type),
      });

      // ── Process Drift Detection ────────────────────────────────────
      const drift = this._detectProcessDrift(sensor, history);
      if (drift) {
        driftAlerts.push(drift);
        messages.push({
          agent: 'SCADA',
          severity: drift.severity,
          text: `PROCESS DRIFT: ${sensor.label} (${sensor.id}) has been steadily ${drift.direction} over last ${history.length} readings. Current: ${sensor.currentValue} ${sensor.unit}, Baseline: ${drift.baseline} ${sensor.unit}, Drift rate: ${drift.rate.toFixed(3)} ${sensor.unit}/tick. ${drift.severity === 'warning' ? 'Approaching abnormal operating range.' : 'Monitor trend.'}`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        });

        if (drift.severity === 'warning') {
          riskFactors.push({
            sensorId: `drift-${sensor.id}`,
            value: Math.min(0.5, drift.driftRatio * 0.5),
            weight: 0.5,
          });
        }
      }

      // ── Generate messages based on severity ────────────────────────
      if (sensor.currentValue >= sensor.criticalThreshold) {
        const msg = {
          agent: 'SCADA',
          severity: 'critical',
          text: `${sensor.label} (${sensor.id}) at ${sensor.currentValue} ${sensor.unit} — EXCEEDS CRITICAL THRESHOLD (${sensor.criticalThreshold} ${sensor.unit}). Trend: ${trend.symbol} (${rateOfChange > 0 ? '+' : ''}${rateOfChange.toFixed(2)} ${sensor.unit}/tick)`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        };
        messages.push(msg);
        alerts.push({ ...msg, type: 'critical_threshold' });
      } else if (sensor.currentValue >= sensor.warningThreshold) {
        messages.push({
          agent: 'SCADA',
          severity: 'warning',
          text: `${sensor.label} (${sensor.id}) at ${sensor.currentValue} ${sensor.unit} — exceeds warning threshold (${sensor.warningThreshold} ${sensor.unit}). Trend: ${trend.symbol}`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        });
      } else if (trend.symbol === TREND_SYMBOLS.RISING_FAST && riskValue > 0.3) {
        messages.push({
          agent: 'SCADA',
          severity: 'info',
          text: `${sensor.label} (${sensor.id}) rising rapidly at ${sensor.currentValue} ${sensor.unit}. Rate: +${rateOfChange.toFixed(2)} ${sensor.unit}/tick. Monitor closely.`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        });
      }

      // ── Cascade Alert ──────────────────────────────────────────────
      if (sensor.cascadeRelations && sensor.cascadeRelations.length > 0 && riskValue > 0.6) {
        const relatedSensors = sensor.cascadeRelations
          .map((id) => sensors.find((s) => s.id === id))
          .filter(Boolean);

        const cascadingRelated = relatedSensors.filter((s) => {
          const relHistory = this.readingHistory.get(s.id) || [];
          if (relHistory.length < 2) return false;
          const relTrend = this._computeTrend(relHistory);
          return relTrend.symbol === TREND_SYMBOLS.RISING || relTrend.symbol === TREND_SYMBOLS.RISING_FAST;
        });

        if (cascadingRelated.length > 0) {
          messages.push({
            agent: 'SCADA',
            severity: 'warning',
            text: `CASCADE ALERT: ${sensor.label} elevated at ${sensor.currentValue} ${sensor.unit}. Related sensors also rising: ${cascadingRelated.map((s) => s.label).join(', ')}. Possible cascade failure.`,
            timestamp: now,
            sensorId: sensor.id,
            zone: sensor.zoneId,
          });
        }
      }
    }

    // ── Z-Score Anomaly Detection ─────────────────────────────────────
    const anomalies = [];
    for (const sensor of sensors) {
      const stats = this._updateSensorStats(sensor.id, sensor.currentValue);
      if (stats.count >= 5) {
        const zScore = stats.stddev > 0 ? Math.abs(sensor.currentValue - stats.mean) / stats.stddev : 0;
        if (zScore > 2) {
          anomalies.push({
            sensorId: sensor.id,
            label: sensor.label,
            currentValue: sensor.currentValue,
            mean: parseFloat(stats.mean.toFixed(3)),
            stddev: parseFloat(stats.stddev.toFixed(3)),
            zScore: parseFloat(zScore.toFixed(3)),
            severity: zScore > 3 ? 'critical' : 'warning',
          });
          messages.push({
            agent: 'SCADA',
            severity: zScore > 3 ? 'critical' : 'warning',
            text: `ANOMALY DETECTED: ${sensor.label} (${sensor.id}) value ${sensor.currentValue} ${sensor.unit} deviates ${zScore.toFixed(1)} standard deviations from rolling mean (${stats.mean.toFixed(2)} ± ${stats.stddev.toFixed(2)}).`,
            timestamp: now,
            sensorId: sensor.id,
            zone: sensor.zoneId,
          });
        }
      }
    }

    // ── Time-to-Breach Forecasting ────────────────────────────────────
    const timeToBreachEstimates = [];
    for (const sensor of sensors) {
      const history = this.readingHistory.get(sensor.id);
      if (history && history.length >= 3 && sensor.currentValue < sensor.criticalThreshold) {
        const regression = this._linearRegression(history);
        if (regression.slope > 0) {
          const currentProjected = regression.intercept + regression.slope * (history.length - 1);
          const ticksToWarning = sensor.currentValue < sensor.warningThreshold
            ? Math.ceil((sensor.warningThreshold - currentProjected) / regression.slope)
            : 0;
          const ticksToCritical = Math.ceil((sensor.criticalThreshold - currentProjected) / regression.slope);

          if (ticksToCritical > 0 && ticksToCritical < 100) {
            const estimate = {
              sensorId: sensor.id,
              label: sensor.label,
              ticksToWarning: ticksToWarning > 0 ? ticksToWarning : null,
              ticksToCritical: ticksToCritical,
              slope: parseFloat(regression.slope.toFixed(4)),
              confidence: parseFloat(regression.rSquared.toFixed(3)),
            };
            timeToBreachEstimates.push(estimate);
            messages.push({
              agent: 'SCADA',
              severity: ticksToCritical < 10 ? 'warning' : 'info',
              text: `BREACH FORECAST: ${sensor.label} (${sensor.id}) estimated to breach critical threshold in ~${ticksToCritical} ticks (slope: ${regression.slope.toFixed(3)} ${sensor.unit}/tick, R²: ${regression.rSquared.toFixed(2)}).${ticksToWarning > 0 ? ` Warning threshold in ~${ticksToWarning} ticks.` : ''}`,
              timestamp: now,
              sensorId: sensor.id,
              zone: sensor.zoneId,
            });
          }
        }
      }
    }

    // ── Sensor Health Monitoring ──────────────────────────────────────
    const sensorHealth = [];
    for (const sensor of sensors) {
      const history = this.readingHistory.get(sensor.id);
      if (!history || history.length < 5) continue;

      const issues = [];
      const lastFive = history.slice(-5);

      // Stuck sensor: last 5 readings identical
      if (lastFive.every(v => v === lastFive[0])) {
        issues.push('STUCK');
      }

      // Flatline: all readings are 0
      if (history.every(v => v === 0)) {
        issues.push('FLATLINE');
      }

      // Excessive noise: stddev > 20% of sensor range
      const range = sensor.criticalThreshold - (sensor.normalRange?.min || 0);
      if (range > 0) {
        const mean = history.reduce((s, v) => s + v, 0) / history.length;
        const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
        const stddev = Math.sqrt(variance);
        if (stddev > range * 0.2) {
          issues.push('NOISY');
        }
      }

      if (issues.length > 0) {
        sensorHealth.push({
          sensorId: sensor.id,
          label: sensor.label,
          issues,
          lastFiveReadings: [...lastFive],
        });
        messages.push({
          agent: 'SCADA',
          severity: issues.includes('STUCK') || issues.includes('FLATLINE') ? 'warning' : 'info',
          text: `SENSOR HEALTH: ${sensor.label} (${sensor.id}) — ${issues.join(', ')} detected. Last 5 readings: [${lastFive.join(', ')}]. Recommend maintenance check.`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        });
      }
    }

    // ── Statistical Drift Detection (EWMA + CUSUM) ─────────────────
    const statisticalAlerts = [];
    for (const sensor of sensors) {
      const ewmaResult = this._updateEWMA(sensor.id, sensor.currentValue);
      const cusumResult = this._updateCUSUM(sensor.id, sensor.currentValue);

      if (!ewmaResult.inControl || cusumResult.alarm) {
        const detail = {
          sensorId: sensor.id,
          label: sensor.label,
          type: 'statistical_drift',
          ewma: {
            value: parseFloat(ewmaResult.ewma.toFixed(4)),
            mean: ewmaResult.mean !== undefined ? parseFloat(ewmaResult.mean.toFixed(4)) : null,
            ucl: ewmaResult.ucl !== undefined ? parseFloat(ewmaResult.ucl.toFixed(4)) : null,
            lcl: ewmaResult.lcl !== undefined ? parseFloat(ewmaResult.lcl.toFixed(4)) : null,
            inControl: ewmaResult.inControl,
          },
          cusum: {
            alarm: cusumResult.alarm,
            direction: cusumResult.direction || null,
            sPlus: parseFloat(cusumResult.sPlus.toFixed(4)),
            sMinus: parseFloat(cusumResult.sMinus.toFixed(4)),
          },
          severity: cusumResult.alarm ? 'warning' : 'info',
        };
        statisticalAlerts.push(detail);

        const reasons = [];
        if (!ewmaResult.inControl) reasons.push(`EWMA out-of-control (${ewmaResult.ewma.toFixed(2)} outside [${ewmaResult.lcl?.toFixed(2)}, ${ewmaResult.ucl?.toFixed(2)}])`);
        if (cusumResult.alarm) reasons.push(`CUSUM alarm (${cusumResult.direction} shift detected)`);

        messages.push({
          agent: 'SCADA',
          severity: detail.severity,
          text: `STATISTICAL DRIFT: ${sensor.label} (${sensor.id}) — ${reasons.join('; ')}. Current value: ${sensor.currentValue} ${sensor.unit}.`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        });
      }
    }

    // ── Multi-Variate Anomaly Detection (per zone) ────────────────────
    const multiVariateAlerts = [];
    const zoneMap = new Map();
    for (const sensor of sensors) {
      if (!sensor.zoneId) continue;
      if (!zoneMap.has(sensor.zoneId)) zoneMap.set(sensor.zoneId, []);
      zoneMap.get(sensor.zoneId).push(sensor);
    }
    for (const [zoneId, zoneSensors] of zoneMap) {
      if (zoneSensors.length < 2) continue;
      const mvResult = this._multiVariateAnomalyScore(zoneSensors);
      if (mvResult.score > 0.6) {
        const mvAlert = {
          zoneId,
          type: 'multi_variate_anomaly',
          score: parseFloat(mvResult.score.toFixed(4)),
          elevatedCount: mvResult.allElevated,
          totalSensors: zoneSensors.length,
          severity: mvResult.score > 0.8 ? 'warning' : 'info',
        };
        multiVariateAlerts.push(mvAlert);
        messages.push({
          agent: 'SCADA',
          severity: mvAlert.severity,
          text: `MULTI-VARIATE ANOMALY: Zone ${zoneId} — ${mvResult.allElevated}/${zoneSensors.length} sensors collectively elevated (compound score: ${mvResult.score.toFixed(3)}). Possible correlated degradation.`,
          timestamp: now,
          sensorId: null,
          zone: zoneId,
        });
      }
    }

    // ── Fire-and-forget AI Analysis ──────────────────────────────────
    const topRiskSensors = [...sensors]
      .map(s => ({
        id: s.id,
        label: s.label,
        type: s.type,
        value: s.currentValue,
        unit: s.unit,
        warningThreshold: s.warningThreshold,
        criticalThreshold: s.criticalThreshold,
        riskRatio: s.currentValue / (s.criticalThreshold || 1),
        trend: this._computeTrend(this.readingHistory.get(s.id) || []).direction,
        ewma: this.ewmaState.has(s.id) ? {
          value: this.ewmaState.get(s.id).ewma,
          inControl: true, // simplified; full check done above
        } : null,
      }))
      .sort((a, b) => b.riskRatio - a.riskRatio)
      .slice(0, 5);

    this.geminiAgent.analyze(
      `Current top 5 highest-risk sensors:\n${JSON.stringify(topRiskSensors, null, 2)}\n\nActive drift alerts: ${driftAlerts.length}, Anomalies: ${anomalies.length}, Statistical alerts: ${statisticalAlerts.length}, Multi-variate alerts: ${multiVariateAlerts.length}.`
    ).then(result => {
      this.lastAIAnalysis = result;
    }).catch(() => {});

    return { messages, riskFactors, alerts, driftAlerts, anomalies, timeToBreachEstimates, sensorHealth, statisticalAlerts, multiVariateAlerts, aiSCADAAnalysis: this.lastAIAnalysis };
  }

  /**
   * Detects process drift: a steady, consistent rise or fall in readings
   * that may individually be below threshold but collectively indicate a trend.
   * @param {object} sensor
   * @param {number[]} history
   * @returns {object|null}
   */
  _detectProcessDrift(sensor, history) {
    if (history.length < 5) return null; // Need at least 5 readings

    // Check if the trend is consistently in one direction
    let risingCount = 0;
    let fallingCount = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i] > history[i - 1]) risingCount++;
      else if (history[i] < history[i - 1]) fallingCount++;
    }

    const totalChanges = history.length - 1;
    const isConsistentlyRising = risingCount / totalChanges > 0.7;
    const isConsistentlyFalling = fallingCount / totalChanges > 0.7;

    if (!isConsistentlyRising && !isConsistentlyFalling) return null;

    // Calculate drift rate
    const firstValue = history[0];
    const lastValue = history[history.length - 1];
    const totalDrift = lastValue - firstValue;
    const driftRate = totalDrift / history.length;

    // Use baseline from sensor config if available
    const baseline = sensor.driftBaseline || firstValue;
    const driftFromBaseline = lastValue - baseline;
    const range = sensor.criticalThreshold - (sensor.normalRange?.min || 0);
    const driftRatio = Math.abs(driftFromBaseline) / range;

    // Only alert if drift is meaningful (> 5% of range)
    if (driftRatio < 0.05) return null;

    // Determine if individual readings are below threshold
    const allBelowWarning = history.every((v) => v < sensor.warningThreshold);

    return {
      sensorId: sensor.id,
      direction: isConsistentlyRising ? 'rising' : 'falling',
      rate: Math.abs(driftRate),
      baseline,
      currentValue: lastValue,
      driftRatio,
      allBelowWarning,
      severity: allBelowWarning && driftRatio > 0.15 ? 'warning' : 'info',
    };
  }

  /**
   * Computes trend direction from a rolling window of readings.
   * @param {number[]} history
   * @returns {{ symbol: string, direction: string }}
   */
  _computeTrend(history) {
    if (history.length < 2) {
      return { symbol: TREND_SYMBOLS.STABLE, direction: 'stable' };
    }

    // Average slope over the window
    const deltas = [];
    for (let i = 1; i < history.length; i++) {
      deltas.push(history[i] - history[i - 1]);
    }
    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;

    // Normalize by the range of values (avoid div-by-zero)
    const range = Math.max(...history) - Math.min(...history);
    const normalizedRate = range > 0 ? avgDelta / range : 0;

    if (normalizedRate > 0.3) return { symbol: TREND_SYMBOLS.RISING_FAST, direction: 'rising_fast' };
    if (normalizedRate > 0.05) return { symbol: TREND_SYMBOLS.RISING, direction: 'rising' };
    if (normalizedRate < -0.3) return { symbol: TREND_SYMBOLS.FALLING_FAST, direction: 'falling_fast' };
    if (normalizedRate < -0.05) return { symbol: TREND_SYMBOLS.FALLING, direction: 'falling' };
    return { symbol: TREND_SYMBOLS.STABLE, direction: 'stable' };
  }

  /**
   * Computes the rate of change (last reading minus previous).
   * @param {number[]} history
   * @returns {number}
   */
  _computeRateOfChange(history) {
    if (history.length < 2) return 0;
    return history[history.length - 1] - history[history.length - 2];
  }

  /**
   * Returns a weight factor based on sensor type — gas sensors get higher
   * weight because their hazards are more immediately life-threatening.
   * @param {string} type
   * @returns {number}
   */
  _getTypeWeight(type) {
    const weights = {
      CH4: 0.95,
      CO: 0.90,
      H2S: 0.92,
      NH3: 0.85,
      Temperature: 0.70,
      Pressure: 0.75,
    };
    return weights[type] ?? 0.5;
  }

  /**
   * Updates running statistics for a sensor (for Z-score anomaly detection).
   * Uses Welford's online algorithm for numerically stable mean/variance.
   * @param {string} sensorId
   * @param {number} value
   * @returns {{ mean: number, stddev: number, count: number }}
   */
  _updateSensorStats(sensorId, value) {
    if (!this.sensorStats.has(sensorId)) {
      this.sensorStats.set(sensorId, { count: 0, mean: 0, m2: 0 });
    }
    const stats = this.sensorStats.get(sensorId);
    stats.count++;
    const delta = value - stats.mean;
    stats.mean += delta / stats.count;
    const delta2 = value - stats.mean;
    stats.m2 += delta * delta2;

    const variance = stats.count > 1 ? stats.m2 / (stats.count - 1) : 0;
    return { mean: stats.mean, stddev: Math.sqrt(variance), count: stats.count };
  }

  /**
   * Performs simple linear regression on a history array.
   * x-values are indices (0, 1, 2, ...), y-values are readings.
   * @param {number[]} values
   * @returns {{ slope: number, intercept: number, rSquared: number }}
   */
  _linearRegression(values) {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
      sumY2 += values[i] * values[i];
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: values[0] || 0, rSquared: 0 };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    const ssTotal = sumY2 - n * meanY * meanY;
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + (y - predicted) ** 2;
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { slope, intercept, rSquared: Math.max(0, rSquared) };
  }

  /**
   * Resets all internal state including reading history and sensor statistics.
   */
  reset() {
    this.readingHistory.clear();
    this.sensorStats.clear();
    this.ewmaState.clear();
    this.cusumState.clear();
  }

  // ══════════════════════════════════════════════════════════════════════
  // Advanced ML Methods
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Updates the Exponentially Weighted Moving Average for a sensor.
   * EWMA is effective at detecting small, sustained shifts in process mean.
   * Uses ±3σ control limits that tighten as more data is collected.
   *
   * @param {string} sensorId
   * @param {number} value
   * @returns {{ ewma: number, ucl?: number, lcl?: number, mean?: number, sigma?: number, inControl: boolean }}
   */
  _updateEWMA(sensorId, value) {
    const lambda = 0.2; // Smoothing factor (industry standard: 0.1–0.3)
    let state = this.ewmaState.get(sensorId);
    if (!state) {
      state = { ewma: value, mean: value, sumSq: 0, count: 0, lambda };
      this.ewmaState.set(sensorId, state);
      return { ewma: value, inControl: true };
    }

    // Update running statistics (Welford-style)
    state.count++;
    const delta = value - state.mean;
    state.mean += delta / state.count;
    state.sumSq += delta * (value - state.mean);
    const sigma = state.count > 1 ? Math.sqrt(state.sumSq / (state.count - 1)) : 1;

    // EWMA update
    state.ewma = lambda * value + (1 - lambda) * state.ewma;

    // Control limits: ±Lσ × √(λ/(2−λ) × (1−(1−λ)^(2n)))
    const L = 3; // Control limit width (3-sigma)
    const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * state.count)));
    const ucl = state.mean + L * sigma * factor;
    const lcl = state.mean - L * sigma * factor;

    return {
      ewma: state.ewma,
      ucl,
      lcl,
      mean: state.mean,
      sigma,
      inControl: state.ewma >= lcl && state.ewma <= ucl,
    };
  }

  /**
   * Updates the Cumulative Sum (CUSUM) chart for a sensor.
   * CUSUM is highly effective at detecting abrupt mean shifts.
   * Uses the first 10 readings to establish a target mean, then monitors
   * for sustained deviations using one-sided cumulative sums.
   *
   * @param {string} sensorId
   * @param {number} value
   * @returns {{ alarm: boolean, direction?: string, sPlus: number, sMinus: number }}
   */
  _updateCUSUM(sensorId, value) {
    let state = this.cusumState.get(sensorId);
    if (!state) {
      state = { sPlus: 0, sMinus: 0, mean: value, count: 0, k: 0.5, h: 4 };
      // k = allowable slack (typically 0.5σ), h = decision interval (typically 4–5σ)
      this.cusumState.set(sensorId, state);
      return { alarm: false, sPlus: 0, sMinus: 0 };
    }

    state.count++;

    // Use first 10 readings to establish target mean
    if (state.count <= 10) {
      state.mean = state.mean + (value - state.mean) / state.count;
      return { alarm: false, sPlus: 0, sMinus: 0 };
    }

    // Normalized deviation from target mean
    const z = value - state.mean;

    // CUSUM statistics (one-sided upper and lower)
    state.sPlus = Math.max(0, state.sPlus + z - state.k);
    state.sMinus = Math.max(0, state.sMinus - z - state.k);

    // Alarm if either cumulative sum exceeds threshold h
    const alarm = state.sPlus > state.h || state.sMinus > state.h;

    // Determine direction before potential reset
    const direction = state.sPlus > state.h ? 'increase' : 'decrease';

    // Auto-reset after alarm to detect subsequent shifts
    if (alarm) {
      state.sPlus = 0;
      state.sMinus = 0;
    }

    return { alarm, direction, sPlus: state.sPlus, sMinus: state.sMinus };
  }

  /**
   * Computes a multi-variate anomaly score for a group of sensors in the same zone.
   * Uses a Mahalanobis-inspired approach: if multiple sensors are simultaneously
   * elevated — each below its individual threshold — the compound score flags
   * correlated degradation that single-sensor monitors would miss.
   *
   * @param {object[]} zoneSensors - Array of sensor objects in the same zone.
   * @returns {{ score: number, deviations: number[], allElevated: number }}
   */
  _multiVariateAnomalyScore(zoneSensors) {
    // Calculate per-sensor normalized deviation (0 = normal min, 1 = critical)
    const deviations = zoneSensors.map(s => {
      const range = (s.criticalThreshold || 100) - (s.normalRange?.min || 0);
      return (s.currentValue - (s.normalRange?.min || 0)) / (range || 1);
    });

    // Compound score: geometric mean of deviations × correlation bonus
    const product = deviations.reduce((a, b) => a * Math.max(b, 0.01), 1);
    const geoMean = Math.pow(product, 1 / deviations.length);

    // Correlation bonus: if many sensors deviate simultaneously, boost score
    const allElevated = deviations.filter(d => d > 0.5).length;
    const correlationBonus = allElevated >= 3 ? 1.5 : allElevated >= 2 ? 1.2 : 1.0;

    return {
      score: Math.min(geoMean * correlationBonus, 1),
      deviations,
      allElevated,
    };
  }
}
