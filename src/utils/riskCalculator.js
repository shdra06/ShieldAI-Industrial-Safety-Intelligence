// ============================================================================
// ShieldAI — Risk Calculator
// Compound risk scoring, single-sensor risk, and risk labeling utilities.
// ============================================================================

/**
 * Risk level thresholds and their visual representations.
 */
const RISK_LEVELS = [
  { max: 0.25, label: 'Normal',    color: '#10B981', level: 0 },
  { max: 0.50, label: 'Elevated',  color: '#F59E0B', level: 1 },
  { max: 0.75, label: 'Warning',   color: '#F97316', level: 2 },
  { max: 0.90, label: 'Critical',  color: '#EF4444', level: 3 },
  { max: 1.00, label: 'Emergency', color: '#7F1D1D', level: 4 },
];

/**
 * Computes compound risk using the formula:
 *   R = 1 - ∏(1 - w_i * r_i)
 *
 * This models the probability that *at least one* risk factor contributes to
 * an adverse event, accounting for independence between factors.
 *
 * @param {{ value: number, weight: number }[]} riskFactors
 *   Each factor's `value` is in [0, 1] and `weight` is a positive number.
 * @returns {number} Compound risk score in [0, 1].
 */
export function calculateCompoundRisk(riskFactors) {
  if (!riskFactors || riskFactors.length === 0) {
    return 0;
  }

  // Calculate effective risk for each factor
  const effectiveRisks = riskFactors
    .map(f => {
      const v = Math.max(0, Math.min(1, f.value));
      const w = Math.max(0, Math.min(1, f.weight));
      return v * w;
    })
    .filter(r => r > 0.01) // Ignore noise-level factors
    .sort((a, b) => b - a); // Descending by severity

  if (effectiveRisks.length === 0) {
    return 0;
  }

  // Use the WORST individual factor as the base, with modest boost from
  // additional factors. This ensures that many safe sensors never accumulate
  // to emergency, but one truly dangerous sensor drives the score up.
  const worst = effectiveRisks[0];

  // Add diminishing contribution from additional risk factors
  // Each subsequent factor adds at most 10% of its own risk
  let bonus = 0;
  for (let i = 1; i < Math.min(effectiveRisks.length, 8); i++) {
    bonus += effectiveRisks[i] * (0.1 / i);
  }

  return Math.max(0, Math.min(1, worst + bonus));
}

/**
 * Returns the maximum individual risk value (worst-case single sensor).
 *
 * @param {{ value: number, weight: number }[]} riskFactors
 * @returns {number} Maximum risk value in [0, 1].
 */
export function calculateSingleSensorRisk(riskFactors) {
  if (!riskFactors || riskFactors.length === 0) {
    return 0;
  }

  let maxRisk = 0;
  for (const factor of riskFactors) {
    const v = Math.max(0, Math.min(1, factor.value));
    if (v > maxRisk) {
      maxRisk = v;
    }
  }

  return maxRisk;
}

/**
 * Normalizes a sensor reading to a 0-1 risk score based on its thresholds.
 *
 * - Below warning threshold → linear ramp from 0 to 0.5
 * - Between warning and critical → linear ramp from 0.5 to 1.0
 * - Above critical → 1.0
 *
 * @param {number} value     - Current sensor reading.
 * @param {number} warning   - Warning threshold.
 * @param {number} critical  - Critical threshold.
 * @returns {number} Normalized risk in [0, 1].
 */
export function getSensorRiskLevel(value, warning, critical, normalMax) {
  if (value <= 0) return 0;
  if (value >= critical) return 1;

  // Use normalMax as the zero-risk baseline if available.
  // Only readings ABOVE the normal operating range contribute to risk.
  // This prevents Temperature sensors at 1520°C (normal for blast furnaces)
  // from producing false risk of 0.45 when warning is 1700.
  const safeMax = normalMax ?? 0;

  if (value <= safeMax) {
    // Completely within normal range — zero risk
    return 0;
  }

  if (value <= warning) {
    // Between normalMax and warning: ramp from 0 to 0.3
    // (reduced from 0.5 to prevent accumulation)
    const range = warning - safeMax;
    if (range <= 0) return 0;
    return ((value - safeMax) / range) * 0.3;
  }

  // Between warning and critical: ramp from 0.5 to 1.0
  const range = critical - warning;
  if (range <= 0) return 1;
  return 0.5 + ((value - warning) / range) * 0.5;
}

/**
 * Converts a numeric risk score (0-1) into a human-readable label with color.
 *
 * | Score Range | Label     | Color   |
 * |-------------|-----------|---------|
 * | 0 – 25%     | Normal    | Green   |
 * | 25 – 50%    | Elevated  | Yellow  |
 * | 50 – 75%    | Warning   | Orange  |
 * | 75 – 90%    | Critical  | Red     |
 * | 90 – 100%   | Emergency | DarkRed |
 *
 * @param {number} score - Risk score in [0, 1].
 * @returns {{ label: string, color: string, level: number }}
 */
export function getRiskLabel(score) {
  const clamped = Math.max(0, Math.min(1, score));

  for (const tier of RISK_LEVELS) {
    if (clamped <= tier.max) {
      return { label: tier.label, color: tier.color, level: tier.level };
    }
  }

  // Fallback (should never reach here)
  return RISK_LEVELS[RISK_LEVELS.length - 1];
}
