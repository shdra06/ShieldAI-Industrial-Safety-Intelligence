// ============================================================================
// ShieldAI — Pattern Agent
// Matches current conditions against historical incidents using keyword
// similarity to surface relevant past events as early warnings.
// Enhanced with regulatory cross-referencing and improved similarity scoring.
// ============================================================================

import { searchRegulations } from '../../data/regulations.js';
import { GeminiAgent } from '../ai/GeminiAgent.js';

export class PatternAgent {
  constructor() {
    this.name = 'Pattern';
    /** @type {Map<string, number>} Tracks near-miss counts by incident ID. */
    this.nearMissCounter = new Map();
    /** @type {Map<string, number>} Document frequency for TF-IDF weighting. */
    this.documentFrequency = new Map();
    this.totalDocuments = 0;

    // Gemini AI Reasoning
    this.geminiAgent = new GeminiAgent({
      agentName: 'PatternAI',
      callInterval: 15,
      systemPrompt: `You are a Pattern Recognition AI for industrial safety.
Given current plant conditions and a list of historical incidents, determine:
1. Which historical incident is the CLOSEST match to current conditions?
2. How similar is the current situation (0-100% match)?
3. What specific conditions overlap (exact sensor types, permit types)?
4. What DIVERGES from the historical pattern (what's different)?
5. Based on the matched incident, what happened NEXT historically?
6. What preventive action could avoid repeating history?

Be specific. Name the historical incident and cite specific similarities.`,
    });
    this.lastAIAnalysis = null;
  }

  /**
   * Evaluates current conditions against historical incident database.
   *
   * @param {{ keywords: string[], activeSensors: object[], activePermits: object[], zones: object[], driftAlerts?: object[] }} currentConditions
   * @param {object[]} incidents - Historical incidents array.
   * @returns {{ messages: object[], riskFactors: object[], matchedIncidents: object[] }}
   */
  evaluate(currentConditions, incidents) {
    const messages = [];
    const riskFactors = [];
    const matchedIncidents = [];
    const now = new Date();

    // ── Extract current condition keywords ────────────────────────────
    const currentKeywords = this._extractKeywords(currentConditions);

    if (currentKeywords.length === 0) {
      return { messages, riskFactors, matchedIncidents };
    }

    // ── Score each historical incident ───────────────────────────────
    const scored = incidents.map((incident) => {
      const score = this._computeSimilarity(currentKeywords, incident.keywords);
      return { incident, score };
    });

    // Sort by similarity descending, take top matches
    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.filter((s) => s.score > 0.15).slice(0, 3);

    for (const match of topMatches) {
      const { incident, score } = match;
      const pctMatch = (score * 100).toFixed(0);

      matchedIncidents.push({
        incidentId: incident.id,
        title: incident.title,
        similarity: score,
        severity: incident.severity,
        casualties: incident.casualties,
        date: incident.date,
        preventiveMeasures: incident.preventiveMeasures,
        regulatoryRef: incident.regulatoryRef,
      });

      // Determine message severity based on similarity and incident severity
      let severity = 'info';
      if (score > 0.6 && (incident.severity === 'fatal' || incident.severity === 'major')) {
        severity = 'critical';
      } else if (score > 0.4 || incident.severity === 'fatal') {
        severity = 'warning';
      }

      messages.push({
        agent: 'Pattern',
        severity,
        text: `PATTERN MATCH (${pctMatch}%): Current conditions resemble "${incident.title}" (${incident.date}). ${incident.severity === 'fatal' ? `⚠️ ${incident.casualties} fatalities in original incident.` : ''} Root cause: ${incident.rootCause}. Ref: ${incident.regulatoryRef}`,
        timestamp: now,
        incidentId: incident.id,
        similarity: score,
      });

      // Higher similarity to severe incidents → higher risk contribution
      if (score > 0.3) {
        const severityMultiplier = {
          fatal: 1.0,
          major: 0.7,
          minor: 0.4,
          'near-miss': 0.3,
        };
        const mult = severityMultiplier[incident.severity] || 0.3;

        riskFactors.push({
          sensorId: `pattern-${incident.id}`,
          value: Math.min(1, score * mult * 1.5),
          weight: 0.6,
        });
      }
    }

    // ── Regulatory Cross-Reference ───────────────────────────────────
    if (topMatches.length > 0 && currentKeywords.length > 0) {
      const regResults = searchRegulations(currentKeywords.join(' '), 2);
      for (const result of regResults) {
        if (result.score > 5) {
          messages.push({
            agent: 'Pattern',
            severity: 'info',
            text: `REGULATORY REFERENCE: ${result.citation} — Relevant to current conditions. Ensure compliance with ${result.regulation.act} ${result.regulation.section}.`,
            timestamp: now,
          });
        }
      }
    }

    // ── Process Drift Pattern Matching ────────────────────────────────
    if (currentConditions.driftAlerts && currentConditions.driftAlerts.length > 0) {
      const driftIncidents = incidents.filter((inc) =>
        inc.keywords.some((k) =>
          ['normalization', 'deviance', 'drift', 'gradual', 'creep', 'slow rise'].some(
            (dk) => k.toLowerCase().includes(dk),
          ),
        ),
      );

      if (driftIncidents.length > 0) {
        messages.push({
          agent: 'Pattern',
          severity: 'warning',
          text: `DRIFT PATTERN: ${currentConditions.driftAlerts.length} sensor(s) showing consistent drift. Historical analysis shows ${driftIncidents.length} incident(s) with similar pre-incident drift patterns. This may indicate "Normalization of Deviance."`,
          timestamp: now,
        });

        riskFactors.push({
          sensorId: 'pattern-drift-normalization',
          value: 0.4,
          weight: 0.5,
        });
      }
    }

    // ── Near-Miss Tracking ───────────────────────────────────────────
    const nearMisses = [];
    const nearMissScored = scored.filter(s => s.score >= 0.3 && s.score < 0.5);
    for (const match of nearMissScored) {
      const count = (this.nearMissCounter.get(match.incident.id) || 0) + 1;
      this.nearMissCounter.set(match.incident.id, count);
      nearMisses.push({
        incidentId: match.incident.id,
        title: match.incident.title,
        similarity: parseFloat(match.score.toFixed(3)),
        occurrences: count,
        severity: match.incident.severity,
      });
      if (count >= 3) {
        messages.push({
          agent: 'Pattern',
          severity: 'warning',
          text: `NEAR-MISS RECURRING: Conditions have resembled "${match.incident.title}" ${count} times (similarity ~${(match.score * 100).toFixed(0)}%). Persistent near-miss pattern may indicate developing risk.`,
          timestamp: now,
          incidentId: match.incident.id,
        });
      }
    }

    // ── Causal Chain Extraction ──────────────────────────────────────
    const causalChains = [];
    for (const match of topMatches) {
      const { incident } = match;
      if (incident.rootCause && incident.preventiveMeasures) {
        // Extract conditions that led to the incident
        const conditions = incident.keywords.filter(k =>
          ['leak', 'overpressure', 'corrosion', 'fatigue', 'failure', 'drift',
           'high temperature', 'elevated', 'gas', 'toxic'].some(c => k.toLowerCase().includes(c))
        );
        const failure = incident.rootCause;
        const consequence = incident.severity === 'fatal'
          ? `${incident.casualties} fatalities`
          : incident.severity;

        causalChains.push({
          incidentId: incident.id,
          title: incident.title,
          similarity: parseFloat(match.score.toFixed(3)),
          chain: {
            conditions: conditions.length > 0 ? conditions : ['Unknown preconditions'],
            failure,
            consequence,
          },
          preventiveMeasures: incident.preventiveMeasures,
        });
      }
    }

    // Fire-and-forget AI analysis (non-blocking)
    const aiContext = {
      currentKeywords,
      topMatchedIncidents: matchedIncidents.slice(0, 3).map(m => ({
        id: m.incidentId,
        title: m.title,
        similarity: m.similarity,
        severity: m.severity,
        casualties: m.casualties,
        preventiveMeasures: m.preventiveMeasures,
      })),
      nearMissCount: nearMisses.length,
      causalChainCount: causalChains.length,
      hasDriftAlerts: !!(currentConditions.driftAlerts && currentConditions.driftAlerts.length > 0),
    };
    this.geminiAgent.analyze(aiContext).then(result => {
      if (result?.success) this.lastAIAnalysis = result.data;
    }).catch(() => {});

    return { messages, riskFactors, matchedIncidents, nearMisses, causalChains, aiPatternAnalysis: this.lastAIAnalysis };
  }

  /**
   * Extracts keywords from current conditions for matching.
   * @param {object} conditions
   * @returns {string[]}
   */
  _extractKeywords(conditions) {
    const keywords = new Set(
      (conditions.keywords || []).map((k) => k.toLowerCase()),
    );

    // Extract keywords from elevated sensors
    if (conditions.activeSensors) {
      for (const sensor of conditions.activeSensors) {
        if (sensor.currentValue >= sensor.warningThreshold) {
          keywords.add(sensor.type.toLowerCase());
          if (sensor.type === 'CH4') {
            keywords.add('methane');
            keywords.add('flammable');
            if (sensor.currentValue >= sensor.criticalThreshold) {
              keywords.add('explosion');
            }
          }
          if (sensor.type === 'CO') {
            keywords.add('carbon monoxide');
            keywords.add('poisoning');
          }
          if (sensor.type === 'H2S') {
            keywords.add('hydrogen sulfide');
            keywords.add('toxic');
          }
          if (sensor.type === 'NH3') {
            keywords.add('ammonia');
            keywords.add('toxic release');
          }
          if (sensor.type === 'Pressure') {
            keywords.add('overpressure');
            keywords.add('pressure excursion');
          }
        }
      }
    }

    // Extract keywords from active permits
    if (conditions.activePermits) {
      for (const permit of conditions.activePermits) {
        if (permit.status === 'active') {
          keywords.add(permit.type.toLowerCase());
          if (permit.type === 'Hot Work') {
            keywords.add('hot work');
            keywords.add('welding');
            keywords.add('sparks');
          }
          if (permit.type === 'Confined Space') {
            keywords.add('confined space');
            keywords.add('entry');
          }
        }
      }
    }

    // Extract drift-related keywords
    if (conditions.driftAlerts && conditions.driftAlerts.length > 0) {
      keywords.add('drift');
      keywords.add('gradual rise');
      keywords.add('normalization');
    }

    return [...keywords];
  }

  /**
   * Computes enhanced similarity between current keywords and incident keywords.
   * Uses a weighted Jaccard-like approach with partial matching bonuses.
   * @param {string[]} current  - Current condition keywords.
   * @param {string[]} incident - Historical incident keywords.
   * @returns {number} Similarity score in [0, 1].
   */
  _computeSimilarity(current, incident) {
    if (current.length === 0 || incident.length === 0) return 0;

    const incidentLower = incident.map((k) => k.toLowerCase());
    let matches = 0;
    let weightedMatches = 0;

    // High-value keywords that indicate more dangerous matches
    const criticalKeywords = new Set([
      'explosion', 'fatal', 'toxic', 'poisoning', 'asphyxiation',
      'fire', 'rupture', 'molten', 'ladle',
    ]);

    // TF-IDF-like weighting: rare keywords across incidents get higher weight
    const allKeywords = [...current, ...incidentLower];
    const keywordFrequency = new Map();
    for (const k of allKeywords) {
      keywordFrequency.set(k, (keywordFrequency.get(k) || 0) + 1);
    }

    for (const keyword of current) {
      for (const incKey of incidentLower) {
        // Exact match
        if (keyword === incKey) {
          const criticalWeight = criticalKeywords.has(keyword) ? 1.5 : 1.0;
          // TF-IDF boost: keywords that appear less frequently are weighted higher
          const freq = keywordFrequency.get(keyword) || 1;
          const idfWeight = 1 + Math.log(allKeywords.length / freq);
          const weight = criticalWeight * Math.min(2.0, idfWeight);
          matches += 1;
          weightedMatches += weight;
          break;
        }
        // Partial match (one contains the other)
        if (keyword.includes(incKey) || incKey.includes(keyword)) {
          matches += 0.5;
          weightedMatches += 0.5;
          break;
        }
      }
    }

    // Normalize by the geometric mean of set sizes for balanced scoring
    const union = new Set([...current, ...incidentLower]).size;
    const baseScore = matches / union;

    // Apply weighted bonus (capped) — TF-IDF weighting naturally increases bonus for rare terms
    const weightedBonus = union > 0 ? (weightedMatches - matches) / union * 0.3 : 0;

    return Math.min(1, baseScore + weightedBonus);
  }
}
