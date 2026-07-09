// ============================================================================
// ShieldAI — Pattern Agent
// Matches current conditions against historical incidents using keyword
// similarity to surface relevant past events as early warnings.
// ============================================================================

export class PatternAgent {
  constructor() {
    this.name = 'Pattern';
  }

  /**
   * Evaluates current conditions against historical incident database.
   *
   * @param {{ keywords: string[], activeSensors: object[], activePermits: object[], zones: object[] }} currentConditions
   *   - keywords: extracted from current alerts/conditions
   *   - activeSensors: sensors currently in warning/critical state
   *   - activePermits: currently active permits
   *   - zones: zone definitions
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

    return { messages, riskFactors, matchedIncidents };
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

    return [...keywords];
  }

  /**
   * Computes Jaccard-like similarity between current keywords and incident keywords.
   * @param {string[]} current  - Current condition keywords.
   * @param {string[]} incident - Historical incident keywords.
   * @returns {number} Similarity score in [0, 1].
   */
  _computeSimilarity(current, incident) {
    if (current.length === 0 || incident.length === 0) return 0;

    const incidentLower = incident.map((k) => k.toLowerCase());
    let matches = 0;

    for (const keyword of current) {
      for (const incKey of incidentLower) {
        // Exact match
        if (keyword === incKey) {
          matches += 1;
          break;
        }
        // Partial match (one contains the other)
        if (keyword.includes(incKey) || incKey.includes(keyword)) {
          matches += 0.5;
          break;
        }
      }
    }

    // Normalize by the geometric mean of set sizes for balanced scoring
    const union = new Set([...current, ...incidentLower]).size;
    return matches / union;
  }
}
