/**
 * @fileoverview SHAP-like Explainability Engine for industrial safety risk scores.
 *
 * Provides feature-contribution analysis, counterfactual reasoning, human-readable
 * narrative generation, and a regulatory-compliance audit trail. All computations
 * are pure JavaScript with no external dependencies.
 *
 * @module ExplainabilityEngine
 */

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Maximum number of decisions stored in the circular audit buffer. */
const AUDIT_TRAIL_CAPACITY = 500;

/** Default number of permutation samples for Shapley estimation. */
const DEFAULT_PERMUTATION_SAMPLES = 50;

/** Severity thresholds for narrative generation. */
const SEVERITY_THRESHOLDS = Object.freeze({
  LOW: 0.25,
  MODERATE: 0.50,
  HIGH: 0.75,
  // ≥ 0.75 → Critical
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Generate a compact UUID-v4–like identifier for audit entries.
 * @returns {string}
 * @private
 */
function generateId() {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

/**
 * Classify a risk score into a severity label.
 * @param {number} score - Risk score in [0, 1].
 * @returns {'Low'|'Moderate'|'High'|'Critical'}
 * @private
 */
function classifySeverity(score) {
  if (score < SEVERITY_THRESHOLDS.LOW) return 'Low';
  if (score < SEVERITY_THRESHOLDS.MODERATE) return 'Moderate';
  if (score < SEVERITY_THRESHOLDS.HIGH) return 'High';
  return 'Critical';
}

/**
 * Shuffle an array in-place using Fisher–Yates.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 * @private
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Format a number as a percentage string (e.g. "34.2%").
 * @param {number} value - Value in [0, 1].
 * @param {number} [decimals=1]
 * @returns {string}
 * @private
 */
function pct(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

// ─── ExplainabilityEngine ───────────────────────────────────────────────────────

/**
 * Provides SHAP-like explanations, counterfactual analysis, narrative generation,
 * and audit-trail management for industrial safety risk scores.
 *
 * @example
 * ```js
 * const engine = new ExplainabilityEngine();
 * const explanation = engine.explain(0.72, [
 *   { name: 'CH4-ZA', value: 45, weight: 0.6, contribution: 0.34 },
 *   { name: 'PTW-003', value: 1,  weight: 0.4, contribution: 0.22 },
 * ]);
 * console.log(engine.generateNarrative(explanation));
 * ```
 *
 * @export
 * @class ExplainabilityEngine
 */
export class ExplainabilityEngine {
  /**
   * Create a new ExplainabilityEngine instance.
   *
   * @param {Object} [opts]
   * @param {number} [opts.permutationSamples=50] - Number of random permutations
   *        used in the Shapley value approximation.
   */
  constructor({ permutationSamples = DEFAULT_PERMUTATION_SAMPLES } = {}) {
    /** @type {number} */
    this._permutationSamples = permutationSamples;

    /**
     * Circular buffer for the audit trail.
     * @type {Array<Object>}
     * @private
     */
    this._auditBuffer = new Array(AUDIT_TRAIL_CAPACITY);
    /** @type {number} Index of the next write position. */
    this._auditHead = 0;
    /** @type {number} Total number of decisions recorded (may exceed capacity). */
    this._auditCount = 0;
  }

  // ─── explain() ──────────────────────────────────────────────────────────────

  /**
   * Explain a risk score by computing Shapley-like feature contributions.
   *
   * The method takes the pre-computed contributions and refines them via a
   * simplified permutation-based Shapley estimation, then ranks features by
   * absolute importance.
   *
   * @param {number} riskScore - Final aggregated risk score in [0, 1].
   * @param {Array<{ name: string, value: number, weight: number, contribution: number }>}
   *        featureContributions - Raw per-feature contribution data.
   * @returns {{
   *   riskScore: number,
   *   severity: string,
   *   baselineRisk: number,
   *   topContributors: Array<{ name: string, value: number, shapleyValue: number, rank: number }>,
   *   explanation: string,
   *   featureImportance: Map<string, number>
   * }}
   */
  explain(riskScore, featureContributions) {
    if (!Array.isArray(featureContributions) || featureContributions.length === 0) {
      throw new Error('ExplainabilityEngine.explain(): featureContributions must be a non-empty array.');
    }

    // Compute Shapley-like values via permutation sampling
    const shapleyValues = this._computeShapleyValues(riskScore, featureContributions);

    // Build feature-importance map and sort by absolute Shapley value
    const featureImportance = new Map();
    const ranked = [];
    for (const fc of featureContributions) {
      const sv = shapleyValues.get(fc.name) ?? fc.contribution;
      featureImportance.set(fc.name, sv);
      ranked.push({ name: fc.name, value: fc.value, shapleyValue: sv });
    }
    ranked.sort((a, b) => Math.abs(b.shapleyValue) - Math.abs(a.shapleyValue));

    // Assign ranks
    ranked.forEach((item, idx) => { item.rank = idx + 1; });

    // Baseline risk: score minus sum of all contributions
    const totalContribution = ranked.reduce((s, r) => s + r.shapleyValue, 0);
    const baselineRisk = riskScore - totalContribution;

    // Top 5 contributors
    const topContributors = ranked.slice(0, 5);

    // Build short explanation string
    const topDescriptions = topContributors
      .map((c) => `${c.name} (${pct(Math.abs(c.shapleyValue))})`)
      .join(', ');
    const severity = classifySeverity(riskScore);
    const explanation =
      `${severity} risk at ${pct(riskScore)}. ` +
      `Primary contributors: ${topDescriptions}.`;

    return {
      riskScore,
      severity,
      baselineRisk,
      topContributors,
      explanation,
      featureImportance,
    };
  }

  // ─── counterfactual() ───────────────────────────────────────────────────────

  /**
   * Compute the minimum set of feature changes required to reach a target risk.
   *
   * Uses a greedy approach: features are sorted by their risk-reduction per
   * unit of change, then adjusted one at a time until the target risk is
   * reached or no further changes are possible.
   *
   * @param {Array<{ name: string, value: number, weight: number, contribution: number }>}
   *        currentFeatures - Current feature values and their contributions.
   * @param {number} targetRisk - Desired risk score to reach (0–1).
   * @param {Object<string, { min: number, max: number, step?: number }>}
   *        featureRanges - Allowable ranges and step sizes for each feature.
   * @returns {{
   *   changes: Array<{ feature: string, from: number, to: number, riskReduction: number }>,
   *   achievable: boolean,
   *   predictedRisk: number
   * }}
   */
  counterfactual(currentFeatures, targetRisk, featureRanges) {
    if (!Array.isArray(currentFeatures) || currentFeatures.length === 0) {
      throw new Error('ExplainabilityEngine.counterfactual(): currentFeatures must be non-empty.');
    }

    // Current risk estimate = sum of contributions + baseline
    let currentRisk = currentFeatures.reduce((s, f) => s + f.contribution, 0);
    const riskGap = currentRisk - targetRisk;

    if (riskGap <= 0) {
      // Already at or below target
      return { changes: [], achievable: true, predictedRisk: currentRisk };
    }

    // Build candidates: features we can actually change
    const candidates = currentFeatures
      .filter((f) => featureRanges[f.name])
      .map((f) => {
        const range = featureRanges[f.name];
        const step = range.step ?? 1;
        // Maximum units we can move this feature toward its safe bound
        const direction = f.contribution > 0 ? -1 : 1; // reduce risk → move opposite to contribution
        const safeBound = f.contribution > 0 ? range.min : range.max;
        const maxDelta = Math.abs(f.value - safeBound);
        const maxSteps = Math.floor(maxDelta / step);
        // Risk reduction per step
        const riskPerStep = maxSteps > 0
          ? (Math.abs(f.contribution) / (Math.abs(f.value - safeBound) || 1)) * step
          : 0;

        return {
          name: f.name,
          value: f.value,
          weight: f.weight,
          contribution: f.contribution,
          safeBound,
          step,
          direction,
          maxSteps,
          riskPerStep,
        };
      })
      .filter((c) => c.maxSteps > 0 && c.riskPerStep > 0)
      .sort((a, b) => b.riskPerStep - a.riskPerStep); // highest impact first

    const changes = [];
    let remainingGap = riskGap;

    for (const candidate of candidates) {
      if (remainingGap <= 0) break;

      // How many steps do we need from this feature?
      const stepsNeeded = Math.min(
        candidate.maxSteps,
        Math.ceil(remainingGap / candidate.riskPerStep)
      );
      const actualReduction = stepsNeeded * candidate.riskPerStep;
      const newValue = candidate.value + candidate.direction * stepsNeeded * candidate.step;

      changes.push({
        feature: candidate.name,
        from: candidate.value,
        to: Math.round(newValue * 1000) / 1000, // avoid float dust
        riskReduction: Math.round(actualReduction * 10000) / 10000,
      });

      remainingGap -= actualReduction;
    }

    const predictedRisk = Math.max(0, currentRisk - (riskGap - remainingGap));
    const achievable = remainingGap <= 0;

    return { changes, achievable, predictedRisk };
  }

  // ─── generateNarrative() ───────────────────────────────────────────────────

  /**
   * Generate a human-readable narrative from an explanation object.
   *
   * @param {{
   *   riskScore: number,
   *   severity: string,
   *   baselineRisk: number,
   *   topContributors: Array<{ name: string, value: number, shapleyValue: number, rank: number }>,
   *   explanation: string,
   *   featureImportance: Map<string, number>
   * }} explanation - Output of {@link explain}.
   * @returns {string} Multi-sentence plain-English narrative.
   */
  generateNarrative(explanation) {
    const { riskScore, severity, topContributors, baselineRisk } = explanation;

    const lines = [];

    // Opening statement
    lines.push(
      `Overall risk is assessed at ${pct(riskScore)}, classified as ${severity.toUpperCase()} severity.`
    );

    // Baseline context
    if (baselineRisk > 0) {
      lines.push(
        `The baseline environmental risk accounts for ${pct(Math.abs(baselineRisk))} of this score.`
      );
    }

    // Top contributors
    if (topContributors.length > 0) {
      const primary = topContributors[0];
      lines.push(
        `The primary risk driver is ${primary.name} (value: ${primary.value}), ` +
        `contributing ${pct(Math.abs(primary.shapleyValue))} to the total risk.`
      );

      if (topContributors.length > 1) {
        const others = topContributors.slice(1).map(
          (c) => `${c.name} (${pct(Math.abs(c.shapleyValue))})`
        );
        lines.push(`Additional contributing factors: ${others.join(', ')}.`);
      }
    }

    // Severity-specific advice
    switch (severity) {
      case 'Critical':
        lines.push('IMMEDIATE ACTION REQUIRED. Evacuate affected zones and engage emergency protocols.');
        break;
      case 'High':
        lines.push('Prompt intervention recommended. Review contributing factors and initiate mitigation.');
        break;
      case 'Moderate':
        lines.push('Monitor closely. Consider preventive measures for top contributing factors.');
        break;
      case 'Low':
        lines.push('Conditions are within acceptable limits. Continue routine monitoring.');
        break;
    }

    return lines.join(' ');
  }

  // ─── Audit trail ───────────────────────────────────────────────────────────

  /**
   * Record a decision in the regulatory-compliance audit trail.
   *
   * The audit trail is a fixed-capacity circular buffer (FIFO). Once full,
   * the oldest entry is overwritten.
   *
   * @param {Object} decision - Arbitrary decision payload to log.
   * @param {string} [decision.type]   - E.g. "RISK_ASSESSMENT", "ALARM_TRIGGER".
   * @param {*}      [decision.data]   - Associated data.
   * @returns {{ id: string, timestamp: string, index: number }} Metadata of the stored entry.
   */
  addDecisionToAuditTrail(decision) {
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      index: this._auditCount,
      ...decision,
    };

    this._auditBuffer[this._auditHead] = entry;
    this._auditHead = (this._auditHead + 1) % AUDIT_TRAIL_CAPACITY;
    this._auditCount++;

    return { id: entry.id, timestamp: entry.timestamp, index: entry.index };
  }

  /**
   * Retrieve recent entries from the audit trail.
   *
   * @param {number} [limit=50] - Maximum number of entries to return.
   * @returns {Array<Object>} Most recent entries, newest first.
   */
  getAuditTrail(limit = 50) {
    const stored = Math.min(this._auditCount, AUDIT_TRAIL_CAPACITY);
    const count = Math.min(limit, stored);
    const results = [];

    for (let i = 0; i < count; i++) {
      // Walk backwards from the most recent entry
      let idx = (this._auditHead - 1 - i + AUDIT_TRAIL_CAPACITY) % AUDIT_TRAIL_CAPACITY;
      if (this._auditBuffer[idx] !== undefined) {
        results.push(this._auditBuffer[idx]);
      }
    }

    return results;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Approximate Shapley values via random-permutation sampling.
   *
   * For each permutation of features, the marginal contribution of feature i
   * is the change in the model output when feature i is added to the set of
   * features preceding it. We average these marginal contributions across
   * many permutations.
   *
   * @param {number} riskScore
   * @param {Array<{ name: string, value: number, weight: number, contribution: number }>} features
   * @returns {Map<string, number>} Feature name → estimated Shapley value.
   * @private
   */
  _computeShapleyValues(riskScore, features) {
    const n = features.length;
    const shapleyAccum = new Map();
    const shapleyCount = new Map();

    for (const f of features) {
      shapleyAccum.set(f.name, 0);
      shapleyCount.set(f.name, 0);
    }

    // Simplified model: contribution is weight × value (normalized)
    // We evaluate subsets by summing contributions of included features.
    const totalWeight = features.reduce((s, f) => s + Math.abs(f.weight), 0) || 1;

    /**
     * Evaluate the "model" on a subset of features (by index set).
     * @param {Set<number>} subset
     * @returns {number}
     */
    const evaluate = (subset) => {
      let score = 0;
      for (const idx of subset) {
        score += features[idx].contribution;
      }
      return score;
    };

    const indices = Array.from({ length: n }, (_, i) => i);
    const numSamples = Math.min(this._permutationSamples, this._factorial(n));

    for (let s = 0; s < numSamples; s++) {
      const perm = shuffle([...indices]);
      const precedingSet = new Set();

      for (const idx of perm) {
        const withoutCurrent = evaluate(precedingSet);
        precedingSet.add(idx);
        const withCurrent = evaluate(precedingSet);
        const marginal = withCurrent - withoutCurrent;

        const name = features[idx].name;
        shapleyAccum.set(name, shapleyAccum.get(name) + marginal);
        shapleyCount.set(name, shapleyCount.get(name) + 1);
      }
    }

    // Average the accumulated marginals
    const result = new Map();
    for (const f of features) {
      const count = shapleyCount.get(f.name) || 1;
      result.set(f.name, shapleyAccum.get(f.name) / count);
    }

    return result;
  }

  /**
   * Compute factorial (capped for permutation sampling).
   * @param {number} n
   * @returns {number}
   * @private
   */
  _factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }
}
