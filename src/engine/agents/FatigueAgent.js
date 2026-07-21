// ============================================================================
// ShieldAI — Fatigue Agent
// Dedicated worker fatigue and cognitive wellness monitoring.  Models circadian
// rhythms, cumulative fatigue, cognitive load, break compliance, fatigue-
// incident correlation, and generates rotation recommendations.
// ============================================================================

export class FatigueAgent {
  /**
   * Creates a FatigueAgent instance.
   * Initialises worker fatigue tracking state and configurable thresholds
   * for break intervals and fatigue limits.
   *
   * @param {object} [messageBus]  - Optional shared message bus for inter-agent communication.
   * @param {object} [blackboard]  - Optional shared blackboard for cross-agent data.
   */
  constructor(messageBus, blackboard) {
    this.name = 'Fatigue';
    this.messageBus = messageBus ?? null;
    this.blackboard = blackboard ?? null;

    /**
     * Per-worker fatigue tracking.
     * @type {Map<string, { hoursWorked: number, lastBreakTick: number, cognitiveLoad: number, alertnessScore: number, rotationSuggested: boolean, consecutiveHighLoadTicks: number }>}
     */
    this.workerFatigueLog = new Map();

    /** @type {number} Internal tick counter for time calculations. */
    this.tickCount = 0;

    /** Ticks between mandatory breaks (~4 simulated hours). */
    this.breakInterval = 120;
    /** Ticks after which missing a break becomes critical (~6h). */
    this.criticalBreakInterval = 180;

    /** Hours-worked thresholds for escalating fatigue warnings. */
    this.hoursThresholds = [
      { hours: 8, severity: 'warning', label: 'standard shift limit' },
      { hours: 10, severity: 'critical', label: 'extended shift limit' },
      { hours: 12, severity: 'emergency', label: 'maximum permissible hours' },
    ];
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Evaluates worker fatigue, cognitive load, break compliance, and
   * generates rotation recommendations for high-risk zones.
   *
   * @param {object[]} workers        - Current worker data.
   * @param {object[]} zones          - Zone definitions.
   * @param {number}   temporalRisk   - Current time-based risk (0-1) from other agents.
   * @param {number}   simulationClock - Current simulation tick.
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(workers, zones, temporalRisk, simulationClock) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();
    this.tickCount = simulationClock;

    // Build zone lookup
    const zoneMap = new Map();
    for (const zone of zones) zoneMap.set(zone.id, zone);

    // Workers grouped by zone for rotation analysis
    const workersByZone = new Map();

    for (const worker of workers) {
      // ── 1. Update fatigue log ──────────────────────────────────────
      this._updateFatigueLog(worker, simulationClock);

      const log = this.workerFatigueLog.get(worker.id);
      const zone = zoneMap.get(worker.currentZone);

      // Group workers by zone
      if (!workersByZone.has(worker.currentZone)) {
        workersByZone.set(worker.currentZone, []);
      }
      workersByZone.get(worker.currentZone).push({ worker, log });

      // ── 2. Circadian alertness ─────────────────────────────────────
      const alertness = this._getCircadianAlertness(worker.shift, simulationClock);
      log.alertnessScore = alertness;

      if (alertness < 0.4) {
        const severity = alertness < 0.25 ? 'critical' : 'warning';
        messages.push({
          agent: 'Fatigue',
          severity,
          text: `CIRCADIAN LOW: ${worker.name} (${worker.role}) alertness at ${(alertness * 100).toFixed(0)}% ` +
                `due to ${worker.shift} shift circadian trough. Increased error probability.`,
          timestamp: now,
          zone: worker.currentZone,
        });
        riskFactors.push({
          sensorId: `fatigue-circadian-${worker.id}`,
          value: 1 - alertness,
          weight: 0.6,
        });
      }

      // ── 3. Cumulative fatigue / hours worked ───────────────────────
      this._assessCumulativeFatigue(worker, log, now, messages, riskFactors);

      // ── 4. Cognitive load ──────────────────────────────────────────
      const hazardClass = zone ? zone.hazardClass : 'Zone 2';
      const cogLoad = this._assessCognitiveLoad(worker, hazardClass, temporalRisk);
      log.cognitiveLoad = cogLoad;

      if (cogLoad > 0.7) {
        log.consecutiveHighLoadTicks++;
        const severity = cogLoad > 0.9 ? 'critical' : 'warning';
        messages.push({
          agent: 'Fatigue',
          severity,
          text: `COGNITIVE OVERLOAD: ${worker.name} (${worker.role}) cognitive load at ${(cogLoad * 100).toFixed(0)}%. ` +
                `Role complexity + zone hazard + fatigue creating high error risk. ` +
                `${log.consecutiveHighLoadTicks > 10 ? 'Sustained high load — rotation urgently recommended.' : ''}`,
          timestamp: now,
          zone: worker.currentZone,
        });
        riskFactors.push({
          sensorId: `fatigue-cogload-${worker.id}`,
          value: cogLoad,
          weight: 0.65,
        });
      } else {
        log.consecutiveHighLoadTicks = Math.max(0, log.consecutiveHighLoadTicks - 1);
      }

      // ── 5. Break compliance ────────────────────────────────────────
      this._checkBreakCompliance(worker, log, simulationClock, now, messages, riskFactors);

      // ── 6. Fatigue-incident correlation ────────────────────────────
      if (zone) {
        this._correlateFatigueWithZoneRisk(worker, log, zone, temporalRisk, now, messages, riskFactors);
      }
    }

    // ── 7. Rotation recommendations per zone ─────────────────────────
    for (const [zoneId, zoneWorkers] of workersByZone) {
      const zone = zoneMap.get(zoneId);
      if (!zone) continue;
      this._generateRotationRecommendations(zoneWorkers, zone, now, messages, riskFactors);
    }

    // Publish to blackboard
    if (this.blackboard) {
      const summary = {};
      for (const [id, log] of this.workerFatigueLog) {
        summary[id] = { ...log };
      }
      this.blackboard.fatigueState = summary;
    }

    return { messages, riskFactors };
  }

  /**
   * Resets all internal fatigue tracking state.
   */
  reset() {
    this.workerFatigueLog.clear();
    this.tickCount = 0;
  }

  // ── Circadian Rhythm Model ─────────────────────────────────────────

  /**
   * Models circadian alertness as a function of shift type and
   * simulation time.  Day-shift workers peak mid-morning; night-shift
   * workers have an inverted curve with a deep trough around 03:00-05:00.
   *
   * @param {string} shift           - 'Day', 'Night', or 'Rotating'.
   * @param {number} simulationClock - Current tick.
   * @returns {number} Alertness factor 0-1 (1 = fully alert).
   * @private
   */
  _getCircadianAlertness(shift, simulationClock) {
    // 720 ticks ≈ 24 simulated hours
    const hourOfDay = ((simulationClock % 720) / 720) * 24;

    switch (shift) {
      case 'Day': {
        // Peak alertness ~10:00, trough ~15:00 (post-lunch dip) and early morning
        const base = 0.7 + 0.25 * Math.sin(((hourOfDay - 4) / 24) * 2 * Math.PI);
        const postLunchDip = hourOfDay > 13 && hourOfDay < 16
          ? -0.1 * Math.sin(((hourOfDay - 13) / 3) * Math.PI)
          : 0;
        return Math.max(0.15, Math.min(1, base + postLunchDip));
      }
      case 'Night': {
        // Inverted pattern: lowest ~03:00-05:00, reasonable ~20:00-00:00
        const base = 0.5 + 0.3 * Math.sin(((hourOfDay - 16) / 24) * 2 * Math.PI);
        // Deep trough at 03:00-05:00
        const deepTrough = hourOfDay > 2 && hourOfDay < 6
          ? -0.2 * Math.sin(((hourOfDay - 2) / 4) * Math.PI)
          : 0;
        return Math.max(0.1, Math.min(0.85, base + deepTrough));
      }
      case 'Rotating':
      default: {
        // Rotating workers have chronically lower baseline due to disrupted rhythms
        const base = 0.55 + 0.15 * Math.sin(((hourOfDay - 4) / 24) * 2 * Math.PI);
        return Math.max(0.2, Math.min(0.8, base));
      }
    }
  }

  // ── Fatigue Log Management ─────────────────────────────────────────

  /**
   * Initialises or updates the fatigue log entry for a worker.
   * Simulates incremental fatigue accumulation each tick.
   *
   * @param {object} worker          - Worker data.
   * @param {number} simulationClock - Current tick.
   * @private
   */
  _updateFatigueLog(worker, simulationClock) {
    if (!this.workerFatigueLog.has(worker.id)) {
      this.workerFatigueLog.set(worker.id, {
        hoursWorked: 0,
        lastBreakTick: simulationClock,
        cognitiveLoad: 0,
        alertnessScore: 1,
        rotationSuggested: false,
        consecutiveHighLoadTicks: 0,
      });
    }

    const log = this.workerFatigueLog.get(worker.id);
    // Each tick ≈ 2 simulated minutes → 30 ticks = 1 hour
    log.hoursWorked += 1 / 30;
  }

  // ── Cumulative Fatigue ─────────────────────────────────────────────

  /**
   * Checks cumulative hours worked against regulatory thresholds and
   * generates escalating warnings.
   *
   * @param {object}   worker
   * @param {object}   log
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _assessCumulativeFatigue(worker, log, now, messages, riskFactors) {
    const { hoursWorked } = log;
    const fatigueScore = worker.fatigueScore ?? 0;

    // Combined fatigue: reported + cumulative
    const combinedFatigue = Math.min(1, fatigueScore * 0.6 + (hoursWorked / 14) * 0.4);

    for (const threshold of this.hoursThresholds) {
      // Only trigger at the threshold crossing (within ±0.05 hours)
      if (hoursWorked >= threshold.hours && hoursWorked < threshold.hours + 0.05) {
        messages.push({
          agent: 'Fatigue',
          severity: threshold.severity,
          text: `HOURS LIMIT: ${worker.name} (${worker.role}) has worked ${hoursWorked.toFixed(1)} hours, ` +
                `reaching ${threshold.label}. Fatigue score: ${(combinedFatigue * 100).toFixed(0)}%. ` +
                `${threshold.hours >= 12 ? 'IMMEDIATE relief required.' : 'Consider scheduling relief.'}`,
          timestamp: now,
          zone: worker.currentZone,
        });
      }
    }

    // Continuous fatigue risk factor
    if (combinedFatigue > 0.3) {
      riskFactors.push({
        sensorId: `fatigue-cumulative-${worker.id}`,
        value: combinedFatigue,
        weight: 0.55,
      });
    }
  }

  // ── Cognitive Load ─────────────────────────────────────────────────

  /**
   * Estimates cognitive load based on role complexity, zone hazard level,
   * current temporal risk, fatigue score, and alertness.
   *
   * @param {object} worker          - Worker data.
   * @param {string} zoneHazardClass - Zone hazard classification string.
   * @param {number} temporalRisk    - Current temporal risk 0-1.
   * @returns {number} Cognitive load 0-1.
   * @private
   */
  _assessCognitiveLoad(worker, zoneHazardClass, temporalRisk) {
    const roleWeight = this._getRoleComplexityWeight(worker.role);

    // Zone hazard multiplier
    const hazardWeight = {
      'Zone 0': 1.0,
      'Zone 1': 0.8,
      'Zone 2': 0.5,
    }[zoneHazardClass] ?? 0.3;

    const fatigueScore = worker.fatigueScore ?? 0;
    const log = this.workerFatigueLog.get(worker.id);
    const alertness = log ? log.alertnessScore : 0.7;

    // Cognitive load formula: high role complexity + high hazard + high fatigue
    // + high temporal risk + low alertness = high load
    const load =
      roleWeight * 0.25 +
      hazardWeight * 0.2 +
      fatigueScore * 0.2 +
      temporalRisk * 0.15 +
      (1 - alertness) * 0.2;

    return Math.min(1, Math.max(0, load));
  }

  // ── Break Compliance ───────────────────────────────────────────────

  /**
   * Checks whether a worker has exceeded mandatory break intervals and
   * generates appropriate alerts.
   *
   * @param {object}   worker
   * @param {object}   log
   * @param {number}   simulationClock
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _checkBreakCompliance(worker, log, simulationClock, now, messages, riskFactors) {
    const ticksSinceBreak = simulationClock - log.lastBreakTick;

    if (ticksSinceBreak >= this.criticalBreakInterval) {
      // Critical: worker has not taken a break in ~6h
      const overdueFactor = Math.min(1, (ticksSinceBreak - this.criticalBreakInterval) / 60 + 0.6);
      messages.push({
        agent: 'Fatigue',
        severity: 'critical',
        text: `BREAK VIOLATION: ${worker.name} (${worker.role}) has not taken a mandatory break ` +
              `in ${(ticksSinceBreak / 30).toFixed(1)} simulated hours. Exceeds 6-hour critical limit. ` +
              `IMMEDIATE rest period required.`,
        timestamp: now,
        zone: worker.currentZone,
      });
      riskFactors.push({
        sensorId: `fatigue-break-${worker.id}`,
        value: overdueFactor,
        weight: 0.75,
      });
    } else if (ticksSinceBreak >= this.breakInterval) {
      // Warning: worker approaching break limit (~4h)
      messages.push({
        agent: 'Fatigue',
        severity: 'warning',
        text: `BREAK OVERDUE: ${worker.name} (${worker.role}) has worked ` +
              `${(ticksSinceBreak / 30).toFixed(1)} simulated hours since last break. ` +
              `Mandatory rest period recommended.`,
        timestamp: now,
        zone: worker.currentZone,
      });
      riskFactors.push({
        sensorId: `fatigue-break-${worker.id}`,
        value: 0.4,
        weight: 0.5,
      });
    }

    // Simulate break taken if fatigue score drops (external reset signal)
    if (worker.fatigueScore < 0.2 && ticksSinceBreak > 30) {
      log.lastBreakTick = simulationClock;
    }
  }

  // ── Fatigue-Incident Correlation ───────────────────────────────────

  /**
   * Cross-references worker fatigue with zone risk levels.  Workers
   * showing high fatigue in high-risk zones receive escalated alerts.
   *
   * @param {object}   worker
   * @param {object}   log
   * @param {object}   zone
   * @param {number}   temporalRisk
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _correlateFatigueWithZoneRisk(worker, log, zone, temporalRisk, now, messages, riskFactors) {
    const fatigueScore = worker.fatigueScore ?? 0;
    const isHighRiskZone = zone.hazardClass === 'Zone 0' || zone.hazardClass === 'Zone 1';
    const combinedRisk = fatigueScore * 0.4 + temporalRisk * 0.3 + (1 - log.alertnessScore) * 0.3;

    if (isHighRiskZone && combinedRisk > 0.6) {
      const severity = combinedRisk > 0.8 ? 'emergency' : 'critical';
      messages.push({
        agent: 'Fatigue',
        severity,
        text: `FATIGUE-RISK CORRELATION: ${worker.name} (${worker.role}) showing high fatigue ` +
              `(${(fatigueScore * 100).toFixed(0)}%) in high-risk zone ${zone.id} (${zone.name}, ${zone.hazardClass}). ` +
              `Combined incident probability: ${(combinedRisk * 100).toFixed(0)}%. ` +
              `${severity === 'emergency' ? 'EVACUATE worker immediately.' : 'Immediate rotation recommended.'}`,
        timestamp: now,
        zone: zone.id,
      });
      riskFactors.push({
        sensorId: `fatigue-correlation-${worker.id}`,
        value: combinedRisk,
        weight: 0.85,
      });
    }
  }

  // ── Rotation Recommendations ───────────────────────────────────────

  /**
   * Analyses workers in each zone and generates specific rotation
   * recommendations when fatigue thresholds are exceeded.
   *
   * @param {{ worker: object, log: object }[]} zoneWorkers
   * @param {object}   zone
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _generateRotationRecommendations(zoneWorkers, zone, now, messages, riskFactors) {
    const isHighRisk = zone.hazardClass === 'Zone 0' || zone.hazardClass === 'Zone 1';
    const fatigueThreshold = isHighRisk ? 0.5 : 0.7;

    const fatigued = zoneWorkers.filter(({ worker, log }) => {
      const score = worker.fatigueScore ?? 0;
      return score > fatigueThreshold || log.hoursWorked > 8 || log.alertnessScore < 0.35;
    });

    if (fatigued.length === 0) return;

    // Find non-fatigued workers who could rotate in
    const available = zoneWorkers.filter(({ worker }) => {
      const score = worker.fatigueScore ?? 0;
      return score < 0.3;
    });

    for (const { worker, log } of fatigued) {
      if (log.rotationSuggested) continue; // Don't repeat suggestions
      log.rotationSuggested = true;

      const replacementNote = available.length > 0
        ? `${available.length} worker(s) available for relief.`
        : 'No immediate replacements available — request additional personnel.';

      messages.push({
        agent: 'Fatigue',
        severity: isHighRisk ? 'critical' : 'warning',
        text: `ROTATION RECOMMENDED: ${worker.name} (${worker.role}) in ${zone.id} (${zone.name}) — ` +
              `fatigue ${((worker.fatigueScore ?? 0) * 100).toFixed(0)}%, ` +
              `hours worked ${log.hoursWorked.toFixed(1)}, ` +
              `alertness ${(log.alertnessScore * 100).toFixed(0)}%. ` +
              `${replacementNote}`,
        timestamp: now,
        zone: zone.id,
      });

      riskFactors.push({
        sensorId: `fatigue-rotation-${worker.id}`,
        value: Math.min(1, (worker.fatigueScore ?? 0) + 0.2),
        weight: 0.5,
      });
    }
  }

  // ── Utility Methods ────────────────────────────────────────────────

  /**
   * Returns a complexity weight for each worker role.  Roles with higher
   * decision-making responsibility receive higher weights.
   *
   * @param {string} role - Worker role string.
   * @returns {number} Complexity weight 0-1.
   * @private
   */
  _getRoleComplexityWeight(role) {
    const weights = {
      'Control Room Operator': 0.95,
      'Safety Officer': 0.85,
      'Supervisor': 0.80,
      'Operator': 0.70,
      'Fire Watch': 0.60,
      'Contract Worker': 0.50,
      'Helper': 0.35,
    };
    return weights[role] ?? 0.5;
  }
}
