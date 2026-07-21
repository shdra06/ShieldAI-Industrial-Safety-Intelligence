// ============================================================================
// ShieldAI — Compliance Agent
// Checks current state against specific regulatory clauses and generates
// violation reports with citations. Enhanced with inspection schedule tracking.
// ============================================================================

import { GeminiAgent } from '../ai/GeminiAgent.js';

export class ComplianceAgent {
  constructor() {
    this.name = 'Compliance';
    // Track inspection schedule (simulation ticks since last check)
    this.lastInspectionTick = 0;
    this.inspectionInterval = 30; // Check every ~30 ticks (60 sim-seconds)
    this.tickCount = 0;
    /** @type {object[]} Stores the last 50 compliance timeline entries. */
    this.complianceTimeline = [];
    this.maxTimelineEntries = 50;

    this.geminiAgent = new GeminiAgent({
      agentName: 'ComplianceAI',
      callInterval: 20,  // Regulations don't change fast
      systemPrompt: `You are an Industrial Compliance AI specializing in Indian safety regulations.
You know:
- Factories Act 1948 (Sections 7A, 11-20, 36-42, 87-90)
- OISD Standards (116, 105, 144, 150, 154, 156, 169, 171, 206)
- DGMS Circulars on mining safety
- PESO Act for petroleum and explosives
- BIS Standards (IS 15656, IS 4209)

Given current sensor readings, permit status, and worker positions:
1. List ALL active regulatory violations with specific section numbers
2. Rate compliance severity: Minor/Moderate/Major/Critical
3. Suggest corrective actions with regulatory references
4. Identify UPCOMING compliance risks (proactive)
5. Calculate an overall compliance score (0-100)

Be precise about section numbers and penalty provisions.`,
    });
    this.lastAIAnalysis = null;
  }

  /**
   * Evaluates regulatory compliance across all operational dimensions.
   *
   * @param {object[]} sensors - Current sensor readings.
   * @param {object[]} permits - Current permits.
   * @param {object[]} workers - Current worker data.
   * @param {object[]} zones   - Zone definitions.
   * @returns {{ messages: object[], riskFactors: object[], violations: object[] }}
   */
  evaluate(sensors, permits, workers, zones) {
    const messages = [];
    const riskFactors = [];
    const violations = [];
    const now = new Date();
    this.tickCount++;

    // Build lookups
    const zoneMap = new Map();
    for (const zone of zones) zoneMap.set(zone.id, zone);

    const sensorsByZone = new Map();
    for (const sensor of sensors) {
      if (!sensorsByZone.has(sensor.zoneId)) sensorsByZone.set(sensor.zoneId, []);
      sensorsByZone.get(sensor.zoneId).push(sensor);
    }

    const workersByZone = new Map();
    for (const worker of workers) {
      if (!workersByZone.has(worker.currentZone)) workersByZone.set(worker.currentZone, []);
      workersByZone.get(worker.currentZone).push(worker);
    }

    const activePermits = permits.filter((p) => p.status === 'active');

    // ── §36: Confined Space Entry Without Clearance ──────────────────
    this._checkSection36(activePermits, workers, zoneMap, workersByZone, now, messages, riskFactors, violations);

    // ── §37: Inflammable Gas + Open Ignition Sources ─────────────────
    this._checkSection37(sensors, activePermits, sensorsByZone, zoneMap, now, messages, riskFactors, violations);

    // ── §38: Fire Precautions ────────────────────────────────────────
    this._checkSection38(activePermits, workers, now, messages, riskFactors, violations);

    // ── OISD-STD-105: Permit Validity ────────────────────────────────
    this._checkPermitValidity(permits, now, messages, riskFactors, violations);

    // ── OISD-STD-105: LOTO Requirements ──────────────────────────────
    this._checkLOTO(activePermits, now, messages, riskFactors, violations);

    // ── DGMS: Personal Gas Monitors ──────────────────────────────────
    this._checkPersonalMonitors(workers, zoneMap, now, messages, riskFactors, violations);

    // ── Inspection Schedule Tracking (NEW) ───────────────────────────
    this._checkInspectionSchedule(sensors, workers, zoneMap, now, messages, riskFactors, violations);

    // ── Certification Compliance (NEW) ───────────────────────────────
    this._checkCertificationCompliance(workers, activePermits, now, messages, riskFactors, violations);

    // ── Compliance Score Calculation ─────────────────────────────────
    const complianceScores = {};
    const violationsByZone = new Map();
    for (const v of violations) {
      const zone = v.zone || 'unknown';
      if (!violationsByZone.has(zone)) violationsByZone.set(zone, []);
      violationsByZone.get(zone).push(v);
    }

    for (const zone of zones) {
      const zoneViolations = violationsByZone.get(zone.id) || [];
      // Deductions: critical = -25, warning = -10, emergency = -40
      let score = 100;
      for (const v of zoneViolations) {
        if (v.severity === 'emergency') score -= 40;
        else if (v.severity === 'critical') score -= 25;
        else if (v.severity === 'warning') score -= 10;
        else score -= 5;
      }
      complianceScores[zone.id] = {
        score: Math.max(0, score),
        violationCount: zoneViolations.length,
        zoneName: zone.name,
      };
    }

    // Overall compliance score (average of all zone scores)
    const zoneScoreValues = Object.values(complianceScores).map(s => s.score);
    const overallScore = zoneScoreValues.length > 0
      ? parseFloat((zoneScoreValues.reduce((a, b) => a + b, 0) / zoneScoreValues.length).toFixed(1))
      : 100;
    complianceScores._overall = overallScore;

    // ── Proactive Compliance Warnings ────────────────────────────────
    for (const sensor of sensors) {
      // Check if sensor is trending toward creating a violation
      const ratio = sensor.currentValue / sensor.warningThreshold;
      if (ratio > 0.85 && ratio < 1.0) {
        // Check if there are permits in this zone that would be violated
        const activeZonePermits = permits.filter(p =>
          p.status === 'active' && p.zoneId === sensor.zoneId
        );
        const hotWorkPermits = activeZonePermits.filter(p => p.type === 'Hot Work');
        const gasTypes = ['CH4', 'CO', 'H2S', 'NH3'];

        if (hotWorkPermits.length > 0 && gasTypes.includes(sensor.type)) {
          messages.push({
            agent: 'Compliance',
            severity: 'info',
            text: `PROACTIVE WARNING: ${sensor.label} at ${(ratio * 100).toFixed(0)}% of warning threshold. If trend continues, §37 violation will occur with active Hot Work permit(s) in zone ${sensor.zoneId}.`,
            timestamp: now,
            sensorId: sensor.id,
            zone: sensor.zoneId,
          });
        }
      }
    }

    // ── Compliance Timeline Entry ────────────────────────────────────
    const timelineEntry = {
      timestamp: now.toISOString(),
      tick: this.tickCount,
      zoneScores: { ...complianceScores },
      violationCount: violations.length,
      overallScore,
    };
    this.complianceTimeline.push(timelineEntry);
    if (this.complianceTimeline.length > this.maxTimelineEntries) {
      this.complianceTimeline.shift();
    }

    // ── Fire-and-forget AI Compliance Analysis ──────────────────────
    const sensorSummary = sensors
      .filter(s => s.currentValue >= s.warningThreshold * 0.8)
      .map(s => `${s.label} (${s.id}): ${s.currentValue}${s.unit} [warn:${s.warningThreshold}, crit:${s.criticalThreshold}]`)
      .join('\n');

    const violationSummary = violations
      .map(v => `[${v.severity}] ${v.regulation}: ${v.description}`)
      .join('\n');

    this.geminiAgent.analyze(
      `Overall Compliance Score: ${overallScore}/100\nTotal Violations: ${violations.length}\n\nActive Violations:\n${violationSummary || 'None'}\n\nSensor Readings Near/Above Thresholds:\n${sensorSummary || 'All normal'}\n\nZone Compliance Scores: ${JSON.stringify(complianceScores)}`
    ).then(result => {
      this.lastAIAnalysis = result;
    }).catch(() => {});

    return { messages, riskFactors, violations, complianceScores, complianceTimeline: [...this.complianceTimeline], aiComplianceAnalysis: this.lastAIAnalysis };
  }

  /**
   * Factories Act §36 — Confined Space.
   */
  _checkSection36(activePermits, workers, zoneMap, workersByZone, now, messages, riskFactors, violations) {
    const confinedPermits = activePermits.filter((p) => p.type === 'Confined Space');

    for (const permit of confinedPermits) {
      const zoneWorkers = workersByZone.get(permit.zoneId) || [];
      const zone = zoneMap.get(permit.zoneId);

      if (permit.lotoRequired && !permit.lotoVerified) {
        const violation = {
          id: `V-S36-LOTO-${permit.id}`,
          regulation: 'Factories Act 1948 §36',
          description: `Confined space entry under ${permit.id} in ${zone?.name || permit.zoneId}: LOTO required but NOT verified. No person shall enter until all practicable measures have been taken.`,
          severity: 'critical',
          permitId: permit.id,
          zone: permit.zoneId,
        };
        violations.push(violation);
        messages.push({
          agent: 'Compliance',
          severity: 'critical',
          text: `§36 VIOLATION: ${violation.description}`,
          timestamp: now,
          zone: permit.zoneId,
        });
        riskFactors.push({
          sensorId: `compliance-s36-${permit.id}`,
          value: 0.75,
          weight: 0.8,
        });
      }

      for (const worker of zoneWorkers) {
        const hasRespirator = worker.ppeItems.includes('Respirator') || worker.ppeItems.includes('SCBA');
        const hasGasMonitor = worker.ppeItems.includes('Gas Monitor');

        if (!hasRespirator || !hasGasMonitor) {
          const missing = [];
          if (!hasRespirator) missing.push('Respirator/SCBA');
          if (!hasGasMonitor) missing.push('Gas Monitor');

          const violation = {
            id: `V-S36-PPE-${worker.id}`,
            regulation: 'Factories Act 1948 §36',
            description: `${worker.name} in confined space zone ${zone?.name || permit.zoneId} without ${missing.join(' and ')}. Certificate of safety clearance must be obtained before entry.`,
            severity: 'critical',
            workerId: worker.id,
            zone: permit.zoneId,
          };
          violations.push(violation);
          messages.push({
            agent: 'Compliance',
            severity: 'critical',
            text: `§36 VIOLATION: ${violation.description}`,
            timestamp: now,
            zone: permit.zoneId,
          });
          riskFactors.push({
            sensorId: `compliance-s36-ppe-${worker.id}`,
            value: 0.7,
            weight: 0.7,
          });
        }
      }
    }
  }

  /**
   * Factories Act §37 — Inflammable Gas.
   */
  _checkSection37(sensors, activePermits, sensorsByZone, zoneMap, now, messages, riskFactors, violations) {
    const hotWorkPermits = activePermits.filter((p) => p.type === 'Hot Work');

    for (const permit of hotWorkPermits) {
      const zone = zoneMap.get(permit.zoneId);
      if (!zone || !zone.hazardClass.includes('Flammable')) continue;

      const zoneSensors = sensorsByZone.get(permit.zoneId) || [];
      const flamGas = zoneSensors.filter((s) => ['CH4', 'H2S'].includes(s.type));

      for (const sensor of flamGas) {
        if (sensor.currentValue >= sensor.warningThreshold) {
          const violation = {
            id: `V-S37-${permit.id}-${sensor.id}`,
            regulation: 'Factories Act 1948 §37',
            description: `Hot work (${permit.id}) active in ${zone.name} while ${sensor.label} at ${sensor.currentValue} ${sensor.unit} (warning: ${sensor.warningThreshold}). §37 requires exclusion of all ignition sources when explosive gas is present.`,
            severity: sensor.currentValue >= sensor.criticalThreshold ? 'emergency' : 'critical',
            permitId: permit.id,
            sensorId: sensor.id,
            zone: permit.zoneId,
          };
          violations.push(violation);
          messages.push({
            agent: 'Compliance',
            severity: violation.severity,
            text: `§37 VIOLATION: ${violation.description}`,
            timestamp: now,
            zone: permit.zoneId,
          });
          riskFactors.push({
            sensorId: `compliance-s37-${permit.id}-${sensor.id}`,
            value: sensor.currentValue >= sensor.criticalThreshold ? 0.95 : 0.7,
            weight: 0.9,
          });
        }
      }
    }
  }

  /**
   * Factories Act §38 — Fire Precautions.
   */
  _checkSection38(activePermits, workers, now, messages, riskFactors, violations) {
    const hotWorkPermits = activePermits.filter((p) => p.type === 'Hot Work');

    for (const permit of hotWorkPermits) {
      const fireWatchPresent = workers.some(
        (w) => w.currentZone === permit.zoneId && w.role === 'Fire Watch',
      );

      if (!fireWatchPresent) {
        const violation = {
          id: `V-S38-FW-${permit.id}`,
          regulation: 'Factories Act 1948 §38',
          description: `No fire watch personnel detected in zone for active hot work permit ${permit.id}. §38 requires adequate fire prevention and extinguishing facilities.`,
          severity: 'warning',
          permitId: permit.id,
          zone: permit.zoneId,
        };
        violations.push(violation);
        messages.push({
          agent: 'Compliance',
          severity: 'warning',
          text: `§38 ADVISORY: ${violation.description}`,
          timestamp: now,
          zone: permit.zoneId,
        });
        riskFactors.push({
          sensorId: `compliance-s38-${permit.id}`,
          value: 0.3,
          weight: 0.4,
        });
      }
    }
  }

  /**
   * OISD-STD-105 Clause 8.1 — Permit Validity.
   */
  _checkPermitValidity(permits, now, messages, riskFactors, violations) {
    for (const permit of permits) {
      if (permit.status !== 'active') continue;
      const expiresAt = new Date(permit.expiresAt);

      if (now > expiresAt) {
        const violation = {
          id: `V-OISD-105-8.1-${permit.id}`,
          regulation: 'OISD-STD-105 Clause 8.1',
          description: `Permit ${permit.id} (${permit.type}) has expired at ${expiresAt.toLocaleTimeString()} but status remains 'active'. Work under expired permit constitutes a safety violation.`,
          severity: 'critical',
          permitId: permit.id,
          zone: permit.zoneId,
        };
        violations.push(violation);
        messages.push({
          agent: 'Compliance',
          severity: 'critical',
          text: `OISD-105 VIOLATION: ${violation.description}`,
          timestamp: now,
          zone: permit.zoneId,
        });
        riskFactors.push({
          sensorId: `compliance-oisd-expired-${permit.id}`,
          value: 0.6,
          weight: 0.6,
        });
      }
    }
  }

  /**
   * OISD-STD-105 Clause 7.1 — LOTO.
   */
  _checkLOTO(activePermits, now, messages, riskFactors, violations) {
    for (const permit of activePermits) {
      if (permit.lotoRequired && !permit.lotoVerified) {
        const violation = {
          id: `V-OISD-105-7.1-${permit.id}`,
          regulation: 'OISD-STD-105 Clause 7.1',
          description: `Permit ${permit.id} (${permit.type}) requires LOTO but zero-energy verification not completed. All energy sources must be positively isolated before work begins.`,
          severity: 'critical',
          permitId: permit.id,
          zone: permit.zoneId,
        };
        violations.push(violation);
        messages.push({
          agent: 'Compliance',
          severity: 'critical',
          text: `OISD-105 LOTO VIOLATION: ${violation.description}`,
          timestamp: now,
          zone: permit.zoneId,
        });
        riskFactors.push({
          sensorId: `compliance-oisd-loto-${permit.id}`,
          value: 0.7,
          weight: 0.75,
        });
      }
    }
  }

  /**
   * DGMS — Personal Gas Monitors.
   */
  _checkPersonalMonitors(workers, zoneMap, now, messages, riskFactors, violations) {
    for (const worker of workers) {
      const zone = zoneMap.get(worker.currentZone);
      if (!zone) continue;

      const isGasZone = zone.hazardClass.includes('Flammable') || zone.hazardClass.includes('Toxic');
      if (!isGasZone) continue;

      const hasGasMonitor = worker.ppeItems.includes('Gas Monitor');
      if (!hasGasMonitor) {
        const violation = {
          id: `V-DGMS-MONITOR-${worker.id}`,
          regulation: 'DGMS Circular 5/2010',
          description: `${worker.name} (${worker.role}) in ${zone.name} [${zone.hazardClass}] without personal gas monitor. DGMS requires all workers in toxic/flammable zones to carry CO/H2S monitors.`,
          severity: 'warning',
          workerId: worker.id,
          zone: worker.currentZone,
        };
        violations.push(violation);
        messages.push({
          agent: 'Compliance',
          severity: 'warning',
          text: `DGMS VIOLATION: ${violation.description}`,
          timestamp: now,
          zone: worker.currentZone,
        });
        riskFactors.push({
          sensorId: `compliance-dgms-${worker.id}`,
          value: 0.4,
          weight: 0.5,
        });
      }
    }
  }

  /**
   * NEW: Inspection schedule tracking.
   * Periodically checks if equipment inspection schedules are being met.
   */
  _checkInspectionSchedule(sensors, workers, zoneMap, now, messages, riskFactors, violations) {
    // Only run inspection checks periodically (not every tick)
    if (this.tickCount - this.lastInspectionTick < this.inspectionInterval) return;
    this.lastInspectionTick = this.tickCount;

    // Check for sensors with sustained high readings (indicates possible calibration issue)
    for (const sensor of sensors) {
      const ratio = sensor.currentValue / sensor.warningThreshold;
      if (ratio > 0.8 && ratio < 1.0) {
        messages.push({
          agent: 'Compliance',
          severity: 'info',
          text: `INSPECTION ADVISORY: ${sensor.label} (${sensor.id}) reading at ${(ratio * 100).toFixed(0)}% of warning threshold. Recommend calibration verification per DGMS Circular 10/2014 (monthly calibration requirement).`,
          timestamp: now,
          sensorId: sensor.id,
          zone: sensor.zoneId,
        });
      }
    }

    // Check worker certification coverage for the zone
    const hazardousZoneIds = ['Z-A', 'Z-B', 'Z-C', 'Z-D'];
    for (const zoneId of hazardousZoneIds) {
      const zone = zoneMap.get(zoneId);
      if (!zone) continue;

      const hasSafetyOfficer = workers.some(
        (w) => w.currentZone === zoneId && (w.role === 'Safety Officer' || w.role === 'Supervisor'),
      );

      if (!hasSafetyOfficer) {
        messages.push({
          agent: 'Compliance',
          severity: 'info',
          text: `INSPECTION NOTE: No safety officer or supervisor currently present in ${zone.name} (${zoneId}). Factories Act §40B recommends safety officer coverage for all hazardous zones.`,
          timestamp: now,
          zone: zoneId,
        });
      }
    }
  }

  /**
   * NEW: Certification compliance check.
   * Verifies workers performing permitted tasks have valid certifications.
   */
  _checkCertificationCompliance(workers, activePermits, now, messages, riskFactors, violations) {
    for (const permit of activePermits) {
      // Find the worker named in the permit
      const permitWorker = workers.find((w) =>
        permit.receiver && permit.receiver.includes(w.name),
      );

      if (permitWorker && permitWorker.certifications) {
        const expiredCerts = permitWorker.certifications.filter(
          (cert) => new Date(cert.expiresAt) < now,
        );

        if (expiredCerts.length > 0) {
          const certNames = expiredCerts.map((c) => `"${c.name}" (expired ${c.expiresAt})`).join(', ');
          const violation = {
            id: `V-CERT-${permitWorker.id}-${permit.id}`,
            regulation: 'Factories Act 1948 §41A',
            description: `${permitWorker.name} working under permit ${permit.id} has expired certification(s): ${certNames}. Worker competency validation required.`,
            severity: 'warning',
            workerId: permitWorker.id,
            permitId: permit.id,
            zone: permit.zoneId,
          };
          violations.push(violation);
          messages.push({
            agent: 'Compliance',
            severity: 'warning',
            text: `CERTIFICATION VIOLATION: ${violation.description}`,
            timestamp: now,
            zone: permit.zoneId,
          });
          riskFactors.push({
            sensorId: `compliance-cert-${permitWorker.id}`,
            value: 0.35,
            weight: 0.4,
          });
        }
      }
    }
  }
}
