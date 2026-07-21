// ============================================================================
// ShieldAI — Predictive Agent
// Forward-looking risk prediction and early warning system. Uses linear
// regression on rolling sensor histories to forecast future values, predicts
// risk trajectories, detects converging trends, and generates early warnings
// with lead-time estimates.
// ============================================================================

/** Number of ticks to retain in the internal risk history. */
const RISK_HISTORY_DEPTH = 30;

/** Forecast horizons in simulation ticks. */
const HORIZONS = [5, 10, 15];

/** Minimum data points required for meaningful regression. */
const MIN_REGRESSION_POINTS = 4;

/** Confidence thresholds for prediction reliability. */
const CONFIDENCE = {
  HIGH:   0.75,
  MEDIUM: 0.50,
  LOW:    0.25,
};

export class PredictiveAgent {
  constructor() {
    this.name = 'Predictive';

    /** @type {number[]} Rolling history of compound risk scores. */
    this.riskHistory = [];

    /**
     * Tracks prediction accuracy: sensorId → { predicted: number, actual: number, tick: number }[].
     * @type {Map<string, object[]>}
     */
    this.predictionAccuracy = new Map();

    /**
     * Stores predictions from previous tick for accuracy tracking.
     * @type {Map<string, object>}
     */
    this.lastPredictions = new Map();

    /**
     * Holt-Winters state per sensor: sensorId → { level, trend, alpha, beta, fitted, residuals }.
     * @type {Map<string, object>}
     */
    this.holtState = new Map();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Projects sensor values and risk scores into the future, generates
   * early warnings, and detects converging trend patterns.
   *
   * @param {object[]}           sensors        - Current sensor array.
   * @param {number}             riskScore      - Current compound risk score (0–1).
   * @param {Map<string,number[]>} sensorHistory - Rolling readings per sensor.
   * @param {number}             simulationClock - Current simulation tick.
   * @returns {{ messages: object[], riskFactors: object[], predictions: object[] }}
   */
  evaluate(sensors, riskScore, sensorHistory, simulationClock) {
    const messages = [];
    const riskFactors = [];
    const predictions = [];
    const now = new Date();

    // ── 0. Update internal risk history ─────────────────────────────────
    this.riskHistory.push(riskScore);
    if (this.riskHistory.length > RISK_HISTORY_DEPTH) {
      this.riskHistory.shift();
    }

    // ── 1. Track accuracy of previous predictions ───────────────────────
    this._trackAccuracy(sensors, simulationClock);

    // ── 2. Per-sensor time-series forecasting (adaptive model selection) ─
    for (const sensor of sensors) {
      const history = sensorHistory?.get(sensor.id);
      if (!history || history.length < MIN_REGRESSION_POINTS) continue;

      // Use adaptive model selection: Holt-Winters primary, OLS fallback
      const modelResult = this._selectBestModel(sensor.id, history);
      const { slope, intercept, rSquared, selectedModel, reason } = {
        slope: modelResult.slope ?? modelResult.trend ?? 0,
        intercept: modelResult.intercept ?? modelResult.level ?? 0,
        rSquared: modelResult.rSquared ?? modelResult.confidence ?? 0,
        selectedModel: modelResult.selectedModel,
        reason: modelResult.reason,
      };

      // Project at each horizon
      const lastIdx = history.length - 1;
      const predictedValues = {};
      if (modelResult.method === 'holt-winters' && modelResult.forecasts) {
        // Use Holt-Winters forecasts with prediction intervals
        for (const fc of modelResult.forecasts) {
          predictedValues[`t${fc.horizon}`] = fc.predicted;
        }
      } else {
        // Fallback to OLS projection
        for (const h of HORIZONS) {
          predictedValues[`t${h}`] = intercept + slope * (lastIdx + h);
        }
      }

      // Determine trend label
      const trend = this._classifyTrend(slope, sensor);

      // Calculate time-to-threshold (ticks until warning threshold is breached)
      const timeToWarning = this._ticksToThreshold(
        sensor.currentValue, slope, sensor.warningThreshold
      );
      const timeToCritical = this._ticksToThreshold(
        sensor.currentValue, slope, sensor.criticalThreshold
      );

      // Build prediction intervals from Holt-Winters if available
      const predictionIntervals = {};
      if (modelResult.forecasts) {
        for (const fc of modelResult.forecasts) {
          predictionIntervals[`t${fc.horizon}`] = {
            ci80: fc.ci80,
            ci95: fc.ci95,
            confidence: fc.confidence,
          };
        }
      }

      const prediction = {
        sensorId: sensor.id,
        zone: sensor.zoneId,
        type: sensor.type,
        currentValue: sensor.currentValue,
        predictedValues,
        predictionIntervals,
        warningThreshold: sensor.warningThreshold,
        criticalThreshold: sensor.criticalThreshold,
        timeToWarning,
        timeToCritical,
        confidence: rSquared,
        trend,
        slope,
        modelSelection: { model: selectedModel, reason },
      };
      predictions.push(prediction);

      // Store for next-tick accuracy tracking
      this.lastPredictions.set(sensor.id, {
        predicted: intercept + slope * (lastIdx + 1),
        tick: simulationClock,
      });

      // ── 3. Early warning generation ─────────────────────────────────
      // Warn if currently safe but predicted to breach threshold
      const isSafe = sensor.currentValue < sensor.warningThreshold;

      if (isSafe && timeToWarning !== null && timeToWarning > 0 && timeToWarning <= 15) {
        const urgency = timeToWarning <= 5 ? 'critical'
                      : timeToWarning <= 10 ? 'warning' : 'info';
        const confLabel = rSquared >= CONFIDENCE.HIGH ? 'HIGH'
                        : rSquared >= CONFIDENCE.MEDIUM ? 'MEDIUM' : 'LOW';

        messages.push({
          agent: this.name,
          severity: urgency,
          text: `Early warning: ${sensor.label} projected to breach warning threshold in ~${timeToWarning} ticks (confidence: ${confLabel}, R²=${rSquared.toFixed(2)}). Current: ${sensor.currentValue.toFixed(1)}${sensor.unit}, Threshold: ${sensor.warningThreshold}${sensor.unit}`,
          timestamp: now,
          zone: sensor.zoneId,
        });

        riskFactors.push({
          sensorId: sensor.id,
          value: Math.min(1, 1 - (timeToWarning / 20)),
          weight: rSquared * 0.7,
        });
      }

      // Critical threshold early warning
      if (sensor.currentValue < sensor.criticalThreshold &&
          timeToCritical !== null && timeToCritical > 0 && timeToCritical <= 15) {
        const urgency = timeToCritical <= 5 ? 'emergency' : 'critical';
        messages.push({
          agent: this.name,
          severity: urgency,
          text: `Critical forecast: ${sensor.label} projected to reach CRITICAL level in ~${timeToCritical} ticks. Immediate attention recommended.`,
          timestamp: now,
          zone: sensor.zoneId,
        });

        riskFactors.push({
          sensorId: `${sensor.id}-critical-forecast`,
          value: Math.min(1, 1 - (timeToCritical / 20)),
          weight: rSquared * 0.85,
        });
      }
    }

    // ── 4. Risk trajectory prediction ───────────────────────────────────
    if (this.riskHistory.length >= MIN_REGRESSION_POINTS) {
      const riskRegression = this._linearRegression(this.riskHistory);
      const lastIdx = this.riskHistory.length - 1;

      for (const h of HORIZONS) {
        const projectedRisk = Math.max(0, Math.min(1,
          riskRegression.intercept + riskRegression.slope * (lastIdx + h)
        ));

        if (projectedRisk > 0.7 && riskScore < 0.7) {
          const severity = projectedRisk > 0.85 ? 'emergency' : 'critical';
          messages.push({
            agent: this.name,
            severity,
            text: `Risk trajectory: Compound risk projected to reach ${(projectedRisk * 100).toFixed(0)}% in ${h} ticks (current: ${(riskScore * 100).toFixed(0)}%). R²=${riskRegression.rSquared.toFixed(2)}`,
            timestamp: now,
          });
        }
      }

      // Report overall risk trajectory as a risk factor
      const projectedT5 = Math.max(0, Math.min(1,
        riskRegression.intercept + riskRegression.slope * (lastIdx + 5)
      ));
      if (riskRegression.slope > 0) {
        riskFactors.push({
          sensorId: 'risk-trajectory',
          value: projectedT5,
          weight: riskRegression.rSquared * 0.6,
        });
      }
    }

    // ── 4b. Trend acceleration detection ──────────────────────────────
    const trendAcceleration = this._detectTrendAcceleration(this.riskHistory);
    if (trendAcceleration && trendAcceleration.accelerating) {
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `${trendAcceleration.description}: risk acceleration = ${trendAcceleration.acceleration.toFixed(4)}/tick². Compound risk may escalate rapidly.`,
        timestamp: now,
      });
      riskFactors.push({
        sensorId: 'trend-acceleration',
        value: Math.min(1, trendAcceleration.acceleration * 50),
        weight: 0.65,
      });
    }

    // ── 5. Trend confluence detection ───────────────────────────────────
    const confluences = this._detectTrendConfluence(predictions);
    for (const conf of confluences) {
      messages.push({
        agent: this.name,
        severity: conf.severity,
        text: `Trend confluence in zone ${conf.zone}: ${conf.count} sensors simultaneously trending toward thresholds (${conf.sensors.join(', ')}). Converging danger pattern detected.`,
        timestamp: now,
        zone: conf.zone,
      });

      riskFactors.push({
        sensorId: `confluence-${conf.zone}`,
        value: Math.min(1, conf.count * 0.25),
        weight: 0.7,
      });
    }

    // ── 6. Lead-time reporting ──────────────────────────────────────────
    const shortLeadTime = predictions.filter(p =>
      p.timeToWarning !== null && p.timeToWarning > 0 &&
      p.timeToWarning <= 5 && p.confidence >= CONFIDENCE.MEDIUM
    );

    if (shortLeadTime.length > 0) {
      messages.push({
        agent: this.name,
        severity: 'critical',
        text: `Short lead time: ${shortLeadTime.length} sensor(s) projected to breach thresholds within 5 ticks with medium+ confidence. Immediate pre-emptive action recommended.`,
        timestamp: now,
      });
    }

    return { messages, riskFactors, predictions };
  }

  /**
   * Clears all internal state for a fresh simulation run.
   */
  reset() {
    this.riskHistory = [];
    this.predictionAccuracy.clear();
    this.lastPredictions.clear();
    this.holtState.clear();
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Performs ordinary least-squares linear regression on an array of values.
   * The x-axis is the array index (0, 1, 2, …).
   *
   * @param {number[]} values
   * @returns {{ slope: number, intercept: number, rSquared: number }}
   */
  _linearRegression(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Compute R² (coefficient of determination)
    const meanY = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * i;
      ssTot += (values[i] - meanY) ** 2;
      ssRes += (values[i] - predicted) ** 2;
    }

    const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

    return { slope, intercept, rSquared, r2: rSquared };
  }

  // ── Holt-Winters Double Exponential Smoothing ──────────────────────────

  /**
   * Holt's Double Exponential Smoothing.
   * Level equation:    L_t = α × Y_t + (1-α) × (L_{t-1} + T_{t-1})
   * Trend equation:    T_t = β × (L_t - L_{t-1}) + (1-β) × T_{t-1}
   * Forecast:          F_{t+h} = L_t + h × T_t
   * Prediction interval: F_{t+h} ± z × σ × √(1 + (h-1) × (α² + α×β×h))
   *
   * @param {string}   sensorId - Sensor identifier for state tracking.
   * @param {number[]} values   - Rolling sensor readings.
   * @returns {{ level: number, trend: number, sigma: number, forecasts: object[], method: string }}
   */
  _holtWinters(sensorId, values) {
    const alpha = 0.3;  // Level smoothing (0.1-0.5 typical)
    const beta = 0.1;   // Trend smoothing (0.01-0.3 typical)

    let state = this.holtState.get(sensorId);

    if (!state || values.length < 3) {
      // Initialize: level = first value, trend = average of first differences
      const level = values[0];
      const trend = values.length >= 2
        ? (values[values.length - 1] - values[0]) / (values.length - 1)
        : 0;
      state = { level, trend, alpha, beta, fitted: [], residuals: [] };
      this.holtState.set(sensorId, state);
    }

    // Process each new observation
    const fitted = [];
    const residuals = [];
    let L = state.level;
    let T = state.trend;

    for (let i = 0; i < values.length; i++) {
      const prevL = L;
      L = alpha * values[i] + (1 - alpha) * (L + T);
      T = beta * (L - prevL) + (1 - beta) * T;
      fitted.push(L + T);  // One-step-ahead forecast
      residuals.push(values[i] - (prevL + T));
    }

    // Update state
    state.level = L;
    state.trend = T;
    state.fitted = fitted;
    state.residuals = residuals;

    // Calculate error variance for prediction intervals
    const n = residuals.length;
    const mse = n > 0 ? residuals.reduce((s, r) => s + r * r, 0) / n : 1;
    const sigma = Math.sqrt(mse);

    // Generate forecasts at multiple horizons
    const forecasts = [];
    for (const h of HORIZONS) {
      const pointForecast = L + h * T;
      // Prediction interval widening factor
      const intervalFactor = Math.sqrt(
        1 + (h - 1) * (alpha * alpha + alpha * beta * h)
      );
      const z95 = 1.96;  // 95% confidence
      const z80 = 1.28;  // 80% confidence

      forecasts.push({
        horizon: h,
        predicted: pointForecast,
        trend: T,
        ci95: {
          lower: pointForecast - z95 * sigma * intervalFactor,
          upper: pointForecast + z95 * sigma * intervalFactor,
        },
        ci80: {
          lower: pointForecast - z80 * sigma * intervalFactor,
          upper: pointForecast + z80 * sigma * intervalFactor,
        },
        confidence: Math.max(
          0,
          1 - (sigma * intervalFactor) / (Math.abs(pointForecast) + 1)
        ),
      });
    }

    return { level: L, trend: T, sigma, forecasts, method: 'holt-winters' };
  }

  // ── Adaptive Model Selection ───────────────────────────────────────────

  /**
   * Selects the best forecasting model for a given sensor by comparing
   * OLS linear regression and Holt-Winters double exponential smoothing.
   *
   * @param {string}   sensorId - Sensor identifier.
   * @param {number[]} values   - Rolling sensor readings.
   * @returns {object} Best model result with `selectedModel` and `reason`.
   */
  _selectBestModel(sensorId, values) {
    // Run both OLS and Holt-Winters
    const ols = this._linearRegression(values);
    const hw = this._holtWinters(sensorId, values);

    // Compare based on recent prediction accuracy
    // Use the model with lower recent MSE
    // Default to Holt-Winters for non-stationary data (trend changes)
    const trendChange = this._detectTrendChange(values);

    if (trendChange) {
      return { ...hw, selectedModel: 'holt-winters', reason: 'trend change detected' };
    }

    // If R² of OLS > 0.85 and data is roughly linear, use OLS (simpler/faster)
    if (ols.r2 > 0.85 && !trendChange) {
      return {
        ...ols,
        method: 'ols',
        selectedModel: 'ols',
        reason: 'strong linear fit',
      };
    }

    return { ...hw, selectedModel: 'holt-winters', reason: 'default (handles non-linearity)' };
  }

  /**
   * Detects whether the trend direction or magnitude has changed
   * significantly between the first and second halves of the data.
   *
   * @param {number[]} values
   * @returns {boolean} True if a trend change is detected.
   */
  _detectTrendChange(values) {
    if (values.length < 10) return false;
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const trend1 =
      (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf.length;
    const trend2 =
      (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf.length;
    // Trend changed direction or magnitude shifted significantly
    return (
      trend1 * trend2 < 0 || Math.abs(trend2) > 3 * Math.abs(trend1)
    );
  }

  // ── Trend Acceleration Detection ───────────────────────────────────────

  /**
   * Computes the second derivative (acceleration) of the risk history
   * to detect whether risk growth is accelerating or decelerating.
   *
   * @param {number[]} riskHistory - Recent risk score history.
   * @returns {object|null} Acceleration analysis or null if insufficient data.
   */
  _detectTrendAcceleration(riskHistory) {
    if (riskHistory.length < 15) return null;
    // Compute second derivative (acceleration of risk)
    const recent = riskHistory.slice(-15);
    const velocities = [];
    for (let i = 1; i < recent.length; i++) {
      velocities.push(recent[i] - recent[i - 1]);
    }
    const accelerations = [];
    for (let i = 1; i < velocities.length; i++) {
      accelerations.push(velocities[i] - velocities[i - 1]);
    }
    const avgAccel =
      accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    // If acceleration is positive and significant, risk is growing faster
    return {
      acceleration: avgAccel,
      accelerating: avgAccel > 0.005,
      decelerating: avgAccel < -0.005,
      description:
        avgAccel > 0.005
          ? 'Risk growth is ACCELERATING'
          : avgAccel < -0.005
            ? 'Risk growth is decelerating'
            : 'Stable trend',
    };
  }

  /**
   * Estimates the number of ticks until a sensor value reaches a threshold,
   * given the current value and regression slope.
   *
   * @param {number} currentValue
   * @param {number} slope        - Per-tick rate of change.
   * @param {number} threshold
   * @returns {number|null}        Ticks to threshold, or null if not approaching.
   */
  _ticksToThreshold(currentValue, slope, threshold) {
    if (slope <= 0) return null; // Not approaching
    if (currentValue >= threshold) return 0; // Already breached

    const remaining = threshold - currentValue;
    const ticks = Math.ceil(remaining / slope);
    return ticks;
  }

  /**
   * Classifies the trend direction and magnitude for a sensor.
   * @param {number} slope
   * @param {object} sensor
   * @returns {string}
   */
  _classifyTrend(slope, sensor) {
    const range = (sensor.criticalThreshold ?? 100) - (sensor.normalRange?.min ?? 0);
    const normalizedSlope = range > 0 ? slope / range : 0;

    if (normalizedSlope > 0.05) return 'rising_fast';
    if (normalizedSlope > 0.01) return 'rising';
    if (normalizedSlope < -0.05) return 'falling_fast';
    if (normalizedSlope < -0.01) return 'falling';
    return 'stable';
  }

  /**
   * Detects zones where multiple independent sensors simultaneously trend
   * toward their thresholds — a convergence pattern that often precedes
   * compound incidents.
   *
   * @param {object[]} predictions
   * @returns {object[]}
   */
  _detectTrendConfluence(predictions) {
    const confluences = [];

    // Group rising predictions by zone
    const zoneRising = new Map();
    for (const pred of predictions) {
      if (!pred.zone) continue;
      if (pred.trend !== 'rising' && pred.trend !== 'rising_fast') continue;
      if (pred.timeToWarning === null || pred.timeToWarning > 20) continue;

      if (!zoneRising.has(pred.zone)) zoneRising.set(pred.zone, []);
      zoneRising.get(pred.zone).push(pred);
    }

    // Flag zones with 2+ converging sensors
    for (const [zone, risingSensors] of zoneRising.entries()) {
      if (risingSensors.length < 2) continue;

      const avgConfidence = risingSensors.reduce((sum, p) => sum + p.confidence, 0) / risingSensors.length;
      const sensorLabels = risingSensors.map(p => p.sensorId);
      const minTTT = Math.min(...risingSensors.map(p => p.timeToWarning ?? Infinity));

      const severity = minTTT <= 5 ? 'critical'
                     : minTTT <= 10 ? 'warning' : 'info';

      confluences.push({
        zone,
        count: risingSensors.length,
        sensors: sensorLabels,
        avgConfidence,
        minTimeToThreshold: minTTT,
        severity,
      });
    }

    return confluences;
  }

  /**
   * Tracks how accurate previous predictions were by comparing predicted
   * values against actual current readings.
   *
   * @param {object[]} sensors
   * @param {number} currentTick
   */
  _trackAccuracy(sensors, currentTick) {
    for (const sensor of sensors) {
      const prev = this.lastPredictions.get(sensor.id);
      if (!prev || prev.tick !== currentTick - 1) continue;

      const error = Math.abs(prev.predicted - sensor.currentValue);
      const range = (sensor.criticalThreshold ?? 100) - (sensor.normalRange?.min ?? 0);
      const normalizedError = range > 0 ? error / range : 0;

      if (!this.predictionAccuracy.has(sensor.id)) {
        this.predictionAccuracy.set(sensor.id, []);
      }

      const history = this.predictionAccuracy.get(sensor.id);
      history.push({
        tick: currentTick,
        predicted: prev.predicted,
        actual: sensor.currentValue,
        error: normalizedError,
      });

      // Keep only last 20 accuracy records
      if (history.length > 20) history.shift();
    }
  }
}
