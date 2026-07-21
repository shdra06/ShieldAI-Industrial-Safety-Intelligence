// ============================================================================
// ShieldAI — Training Agent
// Training gap identification and competency monitoring. Maps worker
// certifications against zone hazard requirements, forecasts expiries,
// recommends incident-based training, schedules drills, and evaluates
// worker-zone knowledge readiness.
// ============================================================================

export class TrainingAgent {
  constructor() {
    this.name = 'Training';

    /**
     * Zone-specific certification requirements and hazard classifications.
     * @type {Object<string, {requiredCerts: string[], hazardClass: string}>}
     */
    this.zoneRequirements = {
      'Z-A': { requiredCerts: ['confined-space', 'gas-monitoring'], hazardClass: 'A-explosive' },
      'Z-B': { requiredCerts: ['electrical-safety', 'loto'], hazardClass: 'B-flammable' },
      'Z-C': { requiredCerts: ['chemical-handling', 'hazmat'], hazardClass: 'C-oxidizing' },
      'Z-D': { requiredCerts: ['fall-protection', 'rescue'], hazardClass: 'D-toxic' },
      'Z-E': { requiredCerts: ['fire-safety', 'first-aid'], hazardClass: 'E-corrosive' },
      'Z-F': { requiredCerts: ['general-safety'], hazardClass: 'F-general' },
    };

    /** @type {Map<string, {name: string, zone: string, requiredCerts: string[], heldCerts: string[], missingCerts: string[], competencyScore: number}>} */
    this.competencyMap = new Map();

    /** @type {Array<{workerId: string, workerName: string, zone: string, missingCerts: string[], priority: string, recommendedTraining: string[]}>} */
    this.trainingGaps = [];

    /** @type {Map<string, Array<{cert: string, expiresInTicks: number}>>} */
    this.certExpiryForecast = new Map();

    /** @type {Array<{zone: string, incidentType: string, recommendedCert: string, targetWorkers: string[]}>} */
    this.incidentRecommendations = [];

    /** @type {Array<{drillType: string, scheduledTick: number, completedTick: number|null, participants: string[], score: number|null}>} */
    this.drillHistory = [];

    /** @type {number} Tick when next drill is due */
    this.nextDrillTick = 200;

    /** @type {number} Index rotating through drill types */
    this.drillTypeIndex = 0;

    /** @type {string[]} Available drill types */
    this.drillTypes = ['fire', 'evacuation', 'chemical-spill', 'rescue'];

    /** @type {Map<string, number>} Worker → knowledge score (0-100) */
    this.knowledgeScores = new Map();

    /** @type {boolean} Whether cert expiry has been initialised */
    this._expiryInitialised = false;

    /** @type {Map<string, number>} Zone → ticks since last incident */
    this.zoneIncidentFreeStreak = new Map();
  }

  /**
   * Evaluates training readiness, detects competency gaps, forecasts
   * certification expiries, and schedules drills.
   *
   * @param {object[]} workers           - Worker roster.
   * @param {object[]} zones             - Zone definitions.
   * @param {object[]} permits           - Permit records.
   * @param {object[]} matchedIncidents  - Incidents detected by PatternAgent.
   * @param {{tick: number, elapsed: number, timestamp: Date}} simulationClock
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(workers = [], zones = [], permits = [], matchedIncidents = [], simulationClock = {}) {
    const messages = [];
    const riskFactors = [];
    const now = simulationClock.timestamp || new Date();
    const tick = simulationClock.tick || 0;

    // ── 1. Competency mapping & gap detection ─────────────────────────
    this.trainingGaps = [];
    this.competencyMap.clear();

    for (const w of workers) {
      const zoneReq = this.zoneRequirements[w.currentZone];
      if (!zoneReq) continue;

      const heldCerts = w.certifications || [];
      const missingCerts = zoneReq.requiredCerts.filter(c => !heldCerts.includes(c));
      const competencyScore = zoneReq.requiredCerts.length > 0
        ? (zoneReq.requiredCerts.length - missingCerts.length) / zoneReq.requiredCerts.length
        : 1;

      this.competencyMap.set(w.id, {
        name: w.name, zone: w.currentZone,
        requiredCerts: zoneReq.requiredCerts,
        heldCerts, missingCerts, competencyScore,
      });

      if (missingCerts.length > 0) {
        const priority = missingCerts.length >= 2 ? 'high' : 'medium';
        this.trainingGaps.push({
          workerId: w.id, workerName: w.name, zone: w.currentZone,
          missingCerts, priority,
          recommendedTraining: missingCerts.map(c => `${c}-certification-course`),
        });

        messages.push({
          agent: 'Training', severity: priority === 'high' ? 'critical' : 'warning',
          text: `📚 ${w.name} in zone ${w.currentZone} missing certifications: ${missingCerts.join(', ')}. Priority: ${priority}.`,
          timestamp: now, zone: w.currentZone,
        });
      }
    }

    // ── 2. Certification expiry forecasting ───────────────────────────
    if (!this._expiryInitialised && workers.length > 0) {
      this._initExpiryForecasts(workers);
      this._expiryInitialised = true;
    }
    this._tickExpiries(messages, now, tick);

    // ── 3. Incident-based training recommendations ────────────────────
    this.incidentRecommendations = [];
    this._updateIncidentStreaks(matchedIncidents, tick);

    for (const incident of matchedIncidents) {
      const rec = this._mapIncidentToTraining(incident, workers);
      if (rec) {
        this.incidentRecommendations.push(rec);
        messages.push({
          agent: 'Training', severity: 'warning',
          text: `🎓 Incident-based recommendation: "${rec.recommendedCert}" refresher for ${rec.targetWorkers.length} workers in zone ${rec.zone}.`,
          timestamp: now, zone: rec.zone,
        });
      }
    }

    // ── 4. Drill scheduling ───────────────────────────────────────────
    if (tick >= this.nextDrillTick) {
      const drillType = this.drillTypes[this.drillTypeIndex % this.drillTypes.length];
      this.drillTypeIndex++;
      const participants = workers.map(w => w.id);
      const score = Math.round(60 + Math.random() * 35); // simulated 60-95

      this.drillHistory.push({
        drillType, scheduledTick: this.nextDrillTick,
        completedTick: tick, participants, score,
      });

      messages.push({
        agent: 'Training', severity: 'info',
        text: `🔔 ${drillType.toUpperCase()} drill completed at tick ${tick}. ${participants.length} participants. Score: ${score}/100.`,
        timestamp: now,
      });

      this.nextDrillTick = tick + 200;
    } else if (this.nextDrillTick - tick <= 20) {
      messages.push({
        agent: 'Training', severity: 'info',
        text: `📅 ${this.drillTypes[this.drillTypeIndex % this.drillTypes.length].toUpperCase()} drill due in ${this.nextDrillTick - tick} ticks.`,
        timestamp: now,
      });
    }

    // ── 5. Knowledge assessment ───────────────────────────────────────
    this.knowledgeScores.clear();
    const lastDrill = this.drillHistory[this.drillHistory.length - 1];

    for (const w of workers) {
      const comp = this.competencyMap.get(w.id);
      const baseScore = (comp?.competencyScore || 0) * 50;
      const zoneStreak = this.zoneIncidentFreeStreak.get(w.currentZone) || 0;
      const streakBonus = zoneStreak >= 100 ? 20 : 0;
      const drillBonus = lastDrill?.participants?.includes(w.id) ? 15 : 0;
      const fatiguePenalty = (w.fatigueScore || 0) * 15;
      const score = Math.max(0, Math.min(100, baseScore + streakBonus + drillBonus - fatiguePenalty));
      this.knowledgeScores.set(w.id, score);
    }

    // ── 6. Risk factors ───────────────────────────────────────────────
    const workersWithGaps = this.trainingGaps.length;
    const totalCerts = workers.reduce((s, w) => s + (w.certifications?.length || 0), 0);
    let expiringCerts = 0;
    for (const [, certs] of this.certExpiryForecast) {
      expiringCerts += certs.filter(c => c.expiresInTicks < 50).length;
    }
    const ticksSinceDrill = tick - (lastDrill?.completedTick || 0);
    const avgKnowledge = workers.length > 0
      ? [...this.knowledgeScores.values()].reduce((s, v) => s + v, 0) / workers.length
      : 100;

    riskFactors.push({
      sensorId: 'training-gap-rate',
      value: workers.length > 0 ? Math.min(1, workersWithGaps / workers.length) : 0,
      weight: 0.5,
    });
    riskFactors.push({
      sensorId: 'training-expiry-risk',
      value: Math.min(1, expiringCerts / Math.max(1, totalCerts)),
      weight: 0.4,
    });
    riskFactors.push({
      sensorId: 'training-drill-overdue',
      value: Math.min(1, ticksSinceDrill / 200),
      weight: 0.3,
    });
    riskFactors.push({
      sensorId: 'training-knowledge-deficit',
      value: Math.max(0, Math.min(1, 1 - avgKnowledge / 100)),
      weight: 0.4,
    });

    return { messages, riskFactors };
  }

  // ── Private: Certification Expiry ───────────────────────────────────────

  /**
   * Initialises simulated certification expiry timelines using deterministic
   * hashing so results are reproducible across resets.
   *
   * @param {object[]} workers
   * @private
   */
  _initExpiryForecasts(workers) {
    this.certExpiryForecast.clear();
    for (const w of workers) {
      const certs = (w.certifications || []).map(cert => ({
        cert,
        expiresInTicks: this._simpleHash(w.id + cert) % 500 + 100,
      }));
      this.certExpiryForecast.set(w.id, certs);
    }
  }

  /**
   * Decrements expiry counters each tick and generates messages for
   * approaching expirations.
   *
   * @param {object[]} messages
   * @param {Date}     now
   * @param {number}   tick
   * @private
   */
  _tickExpiries(messages, now, tick) {
    for (const [workerId, certs] of this.certExpiryForecast) {
      for (const entry of certs) {
        entry.expiresInTicks = Math.max(0, entry.expiresInTicks - 1);

        if (entry.expiresInTicks === 0) {
          messages.push({
            agent: 'Training', severity: 'critical',
            text: `🚨 Certification EXPIRED: Worker ${workerId} — "${entry.cert}". Immediate re-certification required.`,
            timestamp: now,
          });
          // Reset with a new cycle
          entry.expiresInTicks = this._simpleHash(workerId + entry.cert + tick) % 400 + 200;
        } else if (entry.expiresInTicks < 10) {
          messages.push({
            agent: 'Training', severity: 'warning',
            text: `⏰ Certification "${entry.cert}" for worker ${workerId} expires in ${entry.expiresInTicks} ticks.`,
            timestamp: now,
          });
        } else if (entry.expiresInTicks < 50 && entry.expiresInTicks % 10 === 0) {
          messages.push({
            agent: 'Training', severity: 'info',
            text: `📋 Certification "${entry.cert}" for worker ${workerId} expires in ${entry.expiresInTicks} ticks. Schedule renewal.`,
            timestamp: now,
          });
        }
      }
    }
  }

  /**
   * Simple deterministic hash for reproducible expiry simulation.
   * @param {string} str
   * @returns {number}
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ── Private: Incident-based Recommendations ─────────────────────────────

  /**
   * Maps an incident to a training recommendation.
   *
   * @param {object}   incident
   * @param {object[]} workers
   * @returns {object|null}
   * @private
   */
  _mapIncidentToTraining(incident, workers) {
    const type = (incident.type || '').toLowerCase();
    const zone = incident.zone;
    let recommendedCert = null;

    if (type.includes('gas') || type.includes('leak')) {
      recommendedCert = 'gas-monitoring';
    } else if (type.includes('ppe') || type.includes('protective')) {
      recommendedCert = 'ppe-awareness';
    } else if (type.includes('permit') || type.includes('loto')) {
      recommendedCert = 'permit-to-work';
    } else if (type.includes('fall') || type.includes('rescue')) {
      recommendedCert = 'fall-protection';
    } else if (type.includes('fire') || type.includes('thermal')) {
      recommendedCert = 'fire-safety';
    } else if (type.includes('chemical') || type.includes('spill')) {
      recommendedCert = 'chemical-handling';
    }

    if (!recommendedCert) return null;

    const targetWorkers = workers
      .filter(w => w.currentZone === zone)
      .map(w => w.id);

    return { zone, incidentType: type, recommendedCert, targetWorkers };
  }

  /**
   * Updates per-zone incident-free streaks.
   * @param {object[]} incidents
   * @param {number}   tick
   * @private
   */
  _updateIncidentStreaks(incidents, tick) {
    // Increment all streaks
    for (const [zone, streak] of this.zoneIncidentFreeStreak) {
      this.zoneIncidentFreeStreak.set(zone, streak + 1);
    }
    // Reset zones with new incidents
    for (const incident of incidents) {
      if (incident.zone) {
        this.zoneIncidentFreeStreak.set(incident.zone, 0);
      }
    }
    // Ensure all zones exist in tracker
    for (const zoneId of Object.keys(this.zoneRequirements)) {
      if (!this.zoneIncidentFreeStreak.has(zoneId)) {
        this.zoneIncidentFreeStreak.set(zoneId, 0);
      }
    }
  }

  /**
   * Resets all training agent state to initial values.
   */
  reset() {
    this.competencyMap.clear();
    this.trainingGaps = [];
    this.certExpiryForecast.clear();
    this.incidentRecommendations = [];
    this.drillHistory = [];
    this.nextDrillTick = 200;
    this.drillTypeIndex = 0;
    this.knowledgeScores.clear();
    this._expiryInitialised = false;
    this.zoneIncidentFreeStreak.clear();
  }
}
