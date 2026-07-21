// ============================================================================
// ShieldAI — Audit Agent
// Continuous compliance auditing and evidence preservation. Captures state
// snapshots, builds compliance timelines, generates regulatory reports,
// tracks violations, maintains evidence chains, and computes audit readiness.
// ============================================================================

export class AuditAgent {
  constructor() {
    this.name = 'Audit';

    /** @type {Array<object>} Periodic system-state snapshots for regulatory evidence */
    this.snapshots = [];

    /** @type {Array<{tick: number, timestamp: Date, event: string, category: string, details: string, status: string}>} */
    this.complianceTimeline = [];

    /**
     * Regulatory report data grouped by authority.
     * @type {{DGMS: object, PESO: object, FactoryInspector: object}}
     */
    this.regulatoryReports = {
      DGMS: { inspectionReadiness: 100, ventilationCompliance: true, gasMonitoring: true, rescueTeamStatus: 'standby' },
      PESO: { explosivesHandling: true, blastingPermits: true, magazineStorage: true },
      FactoryInspector: { workerSafety: 100, machineryGuarding: true, fireProtection: true },
    };

    /** @type {Array<{type: string, zone: string, severity: string, description: string, timestamp: Date, tick: number}>} */
    this.violationHistory = [];

    /** @type {Map<string, number>} Running count per violation type */
    this.violationCounts = new Map();

    /** @type {Array<{evidenceId: string, violationType: string, timestamp: Date, sensorData: object[], witnessWorkers: string[], chainOfCustody: object[]}>} */
    this.evidenceChain = [];

    /** @type {number} Current audit readiness score (0-100) */
    this.currentAuditScore = 100;

    /** @type {number} Ticks since the last recorded violation */
    this.ticksSinceLastViolation = 0;

    /** @type {number} Snapshot capture interval in ticks */
    this.SNAPSHOT_INTERVAL = 50;

    /** @type {number} Maximum stored snapshots */
    this.MAX_SNAPSHOTS = 100;

    /** @type {number} Internal evidence ID counter */
    this._evidenceCounter = 0;
  }

  /**
   * Evaluates current system state for compliance, generates evidence, and
   * computes the audit readiness score.
   *
   * @param {object[]} sensors          - All sensor readings.
   * @param {object[]} permits          - Permit records.
   * @param {object[]} workers          - Worker roster.
   * @param {object[]} zones            - Zone definitions.
   * @param {object[]} violations       - Violations from other agents this tick.
   * @param {{tick: number, elapsed: number, timestamp: Date}} simulationClock
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(sensors = [], permits = [], workers = [], zones = [], violations = [], simulationClock = {}) {
    const messages = [];
    const riskFactors = [];
    const now = simulationClock.timestamp || new Date();
    const tick = simulationClock.tick || 0;

    // ── 1. Process new violations ─────────────────────────────────────
    this.ticksSinceLastViolation++;
    for (const v of violations) {
      this.ticksSinceLastViolation = 0;
      this.violationHistory.push({ ...v, tick });
      const count = (this.violationCounts.get(v.type) || 0) + 1;
      this.violationCounts.set(v.type, count);

      // Create evidence record
      const nearby = workers.filter(w => w.currentZone === v.zone);
      this._createEvidence(v, sensors, nearby, now);

      // Timeline entry
      this.complianceTimeline.push({
        tick, timestamp: now, event: `Violation: ${v.type}`,
        category: this._categorizeViolation(v.type),
        details: v.description || v.type, status: 'violation',
      });

      const severity = count >= 3 ? 'critical' : 'warning';
      messages.push({
        agent: 'Audit', severity,
        text: `📋 Violation recorded: ${v.type} in zone ${v.zone} (occurrence #${count}). Evidence ID: EVD-${this._evidenceCounter}.`,
        timestamp: now, zone: v.zone,
      });
    }

    // ── 2. Periodic snapshot ──────────────────────────────────────────
    if (tick % this.SNAPSHOT_INTERVAL === 0 && tick > 0) {
      const snapshot = this._captureSnapshot(sensors, permits, workers, zones, tick, now);
      this.snapshots.push(snapshot);
      if (this.snapshots.length > this.MAX_SNAPSHOTS) {
        this.snapshots.shift();
      }
      messages.push({
        agent: 'Audit', severity: 'info',
        text: `📸 Compliance snapshot #${this.snapshots.length} captured at tick ${tick}. Audit score: ${this.currentAuditScore.toFixed(1)}/100.`,
        timestamp: now,
      });
    }

    // ── 3. Compute audit score ────────────────────────────────────────
    this.currentAuditScore = this._computeAuditScore(sensors, permits, workers);

    if (this.currentAuditScore < 50) {
      messages.push({
        agent: 'Audit', severity: 'critical',
        text: `🚩 Audit readiness CRITICAL: Score ${this.currentAuditScore.toFixed(1)}/100. Immediate corrective action required.`,
        timestamp: now,
      });
    } else if (this.currentAuditScore < 70) {
      messages.push({
        agent: 'Audit', severity: 'warning',
        text: `⚠️ Audit readiness LOW: Score ${this.currentAuditScore.toFixed(1)}/100. Review compliance gaps.`,
        timestamp: now,
      });
    }

    // ── 4. Update regulatory reports ──────────────────────────────────
    this._updateRegulatoryReports(sensors, permits, workers, messages, now);

    // ── 5. Risk factors ───────────────────────────────────────────────
    const recentViolations = this.violationHistory.filter(v => tick - v.tick < 100).length;
    const unresolvedEvidence = this.evidenceChain.filter(
      e => e.chainOfCustody.length < 2
    ).length;

    riskFactors.push({
      sensorId: 'audit-compliance-score',
      value: Math.max(0, Math.min(1, 1 - this.currentAuditScore / 100)),
      weight: 0.4,
    });
    riskFactors.push({
      sensorId: 'audit-violation-rate',
      value: Math.min(1, recentViolations / 10),
      weight: 0.5,
    });
    riskFactors.push({
      sensorId: 'audit-evidence-gaps',
      value: Math.min(1, unresolvedEvidence / Math.max(1, this.evidenceChain.length)),
      weight: 0.3,
    });

    return { messages, riskFactors };
  }

  // ── Private: Snapshot Capture ───────────────────────────────────────────

  /**
   * Captures a full system-state snapshot for regulatory evidence.
   * @param {object[]} sensors
   * @param {object[]} permits
   * @param {object[]} workers
   * @param {object[]} zones
   * @param {number}   tick
   * @param {Date}     now
   * @returns {object}
   * @private
   */
  _captureSnapshot(sensors, permits, workers, zones, tick, now) {
    const warningSensors = sensors.filter(s => s.currentValue >= s.warningThreshold).length;
    const criticalSensors = sensors.filter(s => s.currentValue >= s.criticalThreshold).length;
    const expiredPermits = permits.filter(p => p.status === 'expired' || (p.expiresAt && new Date(p.expiresAt) < now)).length;
    const lotoViolations = permits.filter(p => p.lotoRequired && !p.lotoVerified).length;
    const compliantWorkers = workers.filter(w => w.ppeCompliant).length;
    const fatiguedWorkers = workers.filter(w => w.fatigueScore > 0.7).length;
    const zoneHazards = {};
    for (const z of zones) {
      zoneHazards[z.id] = z.hazardClass;
    }

    return {
      tick, timestamp: now,
      sensorSummary: { total: sensors.length, warning: warningSensors, critical: criticalSensors },
      permitSummary: { active: permits.length - expiredPermits, expired: expiredPermits, lotoViolations },
      workerSummary: { total: workers.length, compliant: compliantWorkers, fatigued: fatiguedWorkers },
      zoneHazards,
    };
  }

  // ── Private: Audit Score ────────────────────────────────────────────────

  /**
   * Computes a 0-100 audit readiness score from weighted compliance factors.
   * @param {object[]} sensors
   * @param {object[]} permits
   * @param {object[]} workers
   * @returns {number}
   * @private
   */
  _computeAuditScore(sensors, permits, workers) {
    let score = 0;

    // Sensor compliance (25 pts): % of sensors within warning threshold
    if (sensors.length > 0) {
      const safe = sensors.filter(s => s.currentValue < s.warningThreshold).length;
      score += (safe / sensors.length) * 25;
    } else {
      score += 25;
    }

    // Permit validity (20 pts): % active & non-expired
    if (permits.length > 0) {
      const valid = permits.filter(p => p.status === 'active').length;
      score += (valid / permits.length) * 20;
    } else {
      score += 20;
    }

    // PPE compliance (20 pts)
    if (workers.length > 0) {
      const compliant = workers.filter(w => w.ppeCompliant).length;
      score += (compliant / workers.length) * 20;
    } else {
      score += 20;
    }

    // LOTO verification (15 pts)
    const lotoPermits = permits.filter(p => p.lotoRequired);
    if (lotoPermits.length > 0) {
      const verified = lotoPermits.filter(p => p.lotoVerified).length;
      score += (verified / lotoPermits.length) * 15;
    } else {
      score += 15;
    }

    // Low fatigue (10 pts)
    if (workers.length > 0) {
      const rested = workers.filter(w => w.fatigueScore < 0.5).length;
      score += (rested / workers.length) * 10;
    } else {
      score += 10;
    }

    // Violation-free streak (10 pts): max 10 at 100+ ticks clean
    score += Math.min(10, (this.ticksSinceLastViolation / 100) * 10);

    return Math.max(0, Math.min(100, score));
  }

  // ── Private: Regulatory Reports ─────────────────────────────────────────

  /**
   * Updates regulatory report fields and emits messages on non-compliance.
   * @param {object[]} sensors
   * @param {object[]} permits
   * @param {object[]} workers
   * @param {object[]} messages
   * @param {Date}     now
   * @private
   */
  _updateRegulatoryReports(sensors, permits, workers, messages, now) {
    // DGMS — gas monitoring and ventilation
    const gasSensors = sensors.filter(s => s.type?.includes('gas') || s.type?.includes('methane'));
    const gasOk = gasSensors.every(s => s.currentValue < s.criticalThreshold);
    this.regulatoryReports.DGMS.gasMonitoring = gasOk;
    this.regulatoryReports.DGMS.inspectionReadiness = this.currentAuditScore;
    if (!gasOk) {
      messages.push({
        agent: 'Audit', severity: 'critical',
        text: '📜 DGMS non-compliance: Gas monitoring threshold breached. Immediate ventilation review required.',
        timestamp: now,
      });
    }

    // PESO — blasting permits
    const blastPermits = permits.filter(p => p.type?.includes('blast') || p.type?.includes('hot-work'));
    const blastOk = blastPermits.every(p => p.status === 'active');
    this.regulatoryReports.PESO.blastingPermits = blastOk;
    if (!blastOk) {
      messages.push({
        agent: 'Audit', severity: 'warning',
        text: '📜 PESO flag: Blasting/hot-work permit non-compliance detected.',
        timestamp: now,
      });
    }

    // Factory Inspector — worker safety score
    if (workers.length > 0) {
      const safetyPct = (workers.filter(w => w.ppeCompliant).length / workers.length) * 100;
      this.regulatoryReports.FactoryInspector.workerSafety = safetyPct;
    }
  }

  // ── Private: Evidence Chain ─────────────────────────────────────────────

  /**
   * Creates an evidence record for a violation with chain-of-custody metadata.
   * @param {object}   violation
   * @param {object[]} sensors
   * @param {object[]} nearbyWorkers
   * @param {Date}     now
   * @private
   */
  _createEvidence(violation, sensors, nearbyWorkers, now) {
    this._evidenceCounter++;
    const zoneSensors = sensors
      .filter(s => s.zoneId === violation.zone)
      .map(s => ({ id: s.id, type: s.type, value: s.currentValue, unit: s.unit }));

    this.evidenceChain.push({
      evidenceId: `EVD-${this._evidenceCounter}`,
      violationType: violation.type,
      timestamp: now,
      sensorData: zoneSensors,
      witnessWorkers: nearbyWorkers.map(w => w.id),
      chainOfCustody: [{ action: 'created', timestamp: now, actor: 'AuditAgent' }],
    });
  }

  /**
   * Categorizes a violation type into a compliance category.
   * @param {string} type
   * @returns {string}
   * @private
   */
  _categorizeViolation(type) {
    if (type?.includes('sensor') || type?.includes('gas')) return 'sensor';
    if (type?.includes('permit')) return 'permit';
    if (type?.includes('ppe')) return 'ppe';
    if (type?.includes('loto')) return 'loto';
    if (type?.includes('fatigue')) return 'fatigue';
    return 'general';
  }

  /**
   * Resets all audit agent state to initial values.
   */
  reset() {
    this.snapshots = [];
    this.complianceTimeline = [];
    this.regulatoryReports = {
      DGMS: { inspectionReadiness: 100, ventilationCompliance: true, gasMonitoring: true, rescueTeamStatus: 'standby' },
      PESO: { explosivesHandling: true, blastingPermits: true, magazineStorage: true },
      FactoryInspector: { workerSafety: 100, machineryGuarding: true, fireProtection: true },
    };
    this.violationHistory = [];
    this.violationCounts.clear();
    this.evidenceChain = [];
    this.currentAuditScore = 100;
    this.ticksSinceLastViolation = 0;
    this._evidenceCounter = 0;
  }
}
