// ============================================================================
// ShieldAI — SCADA Agent
// Monitors sensor readings, computes trends, and generates risk assessments.
// ============================================================================

import { getSensorRiskLevel } from '../../utils/riskCalculator.js';

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
    this.historyDepth = 5;
  }

  /**
   * Evaluates current sensor state against previous readings.
   *
   * @param {object[]} sensors         - Current sensor array (with currentValue).
   * @param {object[]} previousReadings - Previous tick's sensor array (optional).
   * @returns {{ messages: object[], riskFactors: object[], alerts: object[] }}
   */
  evaluate(sensors, previousReadings = []) {
    const messages = [];
    const riskFactors = [];
    const alerts = [];
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
      );

      riskFactors.push({
        sensorId: sensor.id,
        value: riskValue,
        weight: this._getTypeWeight(sensor.type),
      });

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
    }

    return { messages, riskFactors, alerts };
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
}
