// ============================================================================
// ShieldAI — Permit Agent
// Validates work permits: SIMOPS conflicts, expiry, hot-work-near-gas,
// LOTO verification, and temporal conflict detection.
// ============================================================================

export class PermitAgent {
  constructor() {
    this.name = 'Permit';
  }

  /**
   * Evaluates permit safety conditions.
   *
   * @param {object[]} permits - Current permits array.
   * @param {object[]} sensors - Current sensor readings.
   * @param {object[]} zones   - Zone definitions.
   * @param {object}   [temporalRisk] - Temporal risk data (optional).
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(permits, sensors, zones, temporalRisk = null) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();

    // Build sensor lookup by zone
    const sensorsByZone = new Map();
    for (const sensor of sensors) {
      if (!sensorsByZone.has(sensor.zoneId)) {
        sensorsByZone.set(sensor.zoneId, []);
      }
      sensorsByZone.get(sensor.zoneId).push(sensor);
    }

    // Build zone lookup
    const zoneMap = new Map();
    for (const zone of zones) {
      zoneMap.set(zone.id, zone);
    }

    const activePermits = permits.filter((p) => p.status === 'active');
    const hotWorkPermits = activePermits.filter((p) => p.type === 'Hot Work');

    // ── 1. SIMOPS Conflict Detection ─────────────────────────────────
    const permitsByZone = new Map();
    for (const permit of activePermits) {
      if (!permitsByZone.has(permit.zoneId)) {
        permitsByZone.set(permit.zoneId, []);
      }
      permitsByZone.get(permit.zoneId).push(permit);
    }

    for (const [zoneId, zonePermits] of permitsByZone.entries()) {
      if (zonePermits.length > 1) {
        const zone = zoneMap.get(zoneId);
        const types = zonePermits.map((p) => p.type).join(', ');
        const hasHotWork = zonePermits.some((p) => p.type === 'Hot Work');
        const hasColdWork = zonePermits.some((p) => p.type === 'Cold Work');
        const hasConfined = zonePermits.some((p) => p.type === 'Confined Space');

        const severity = hasHotWork && (hasColdWork || hasConfined) ? 'critical' : 'warning';

        messages.push({
          agent: 'Permit',
          severity,
          text: `SIMOPS CONFLICT: ${zonePermits.length} active permits in ${zone?.name || zoneId} — [${types}]. OISD-STD-105 Clause 5.5 requires SIMOPS risk assessment.`,
          timestamp: now,
          zone: zoneId,
        });

        riskFactors.push({
          sensorId: `permit-simops-${zoneId}`,
          value: severity === 'critical' ? 0.7 : 0.4,
          weight: 0.7,
        });
      }
    }

    // ── 2. Expired Permit Detection ──────────────────────────────────
    for (const permit of permits) {
      if (permit.status === 'expired') continue; // Already marked expired

      const expiresAt = new Date(permit.expiresAt);
      if (now > expiresAt && permit.status === 'active') {
        messages.push({
          agent: 'Permit',
          severity: 'critical',
          text: `EXPIRED PERMIT: ${permit.id} (${permit.type}) in Zone ${permit.zoneId} expired at ${expiresAt.toLocaleTimeString()}. Work must cease immediately. Ref: OISD-STD-105 Clause 8.1.`,
          timestamp: now,
          permitId: permit.id,
          zone: permit.zoneId,
        });

        riskFactors.push({
          sensorId: `permit-expired-${permit.id}`,
          value: 0.6,
          weight: 0.6,
        });
      }

      // Warn if expiring within 30 minutes
      const timeToExpiry = expiresAt.getTime() - now.getTime();
      if (permit.status === 'active' && timeToExpiry > 0 && timeToExpiry < 30 * 60 * 1000) {
        const minsLeft = Math.floor(timeToExpiry / 60000);
        messages.push({
          agent: 'Permit',
          severity: 'info',
          text: `Permit ${permit.id} (${permit.type}) expires in ${minsLeft} minutes. Plan for renewal or work completion.`,
          timestamp: now,
          permitId: permit.id,
          zone: permit.zoneId,
        });
      }
    }

    // ── 3. Hot Work Near Elevated Gas Levels ─────────────────────────
    for (const permit of hotWorkPermits) {
      const zoneSensors = sensorsByZone.get(permit.zoneId) || [];
      const gasSensors = zoneSensors.filter((s) =>
        ['CH4', 'CO', 'H2S', 'NH3'].includes(s.type),
      );

      for (const sensor of gasSensors) {
        if (sensor.currentValue >= sensor.criticalThreshold) {
          messages.push({
            agent: 'Permit',
            severity: 'emergency',
            text: `🚨 HOT WORK + CRITICAL GAS: ${permit.id} (Hot Work) active in Zone ${permit.zoneId} while ${sensor.label} at ${sensor.currentValue} ${sensor.unit} (critical: ${sensor.criticalThreshold}). IMMEDIATE STOP WORK REQUIRED. Ref: OISD-STD-105 Clause 5.2.`,
            timestamp: now,
            permitId: permit.id,
            sensorId: sensor.id,
            zone: permit.zoneId,
          });

          riskFactors.push({
            sensorId: `permit-hotwork-gas-${permit.id}-${sensor.id}`,
            value: 0.95,
            weight: 0.95,
          });
        } else if (sensor.currentValue >= sensor.warningThreshold) {
          messages.push({
            agent: 'Permit',
            severity: 'warning',
            text: `HOT WORK + ELEVATED GAS: ${permit.id} active in Zone ${permit.zoneId} while ${sensor.label} at ${sensor.currentValue} ${sensor.unit} (warning: ${sensor.warningThreshold}). Consider suspending work. Ref: OISD-STD-105 Clause 5.2.`,
            timestamp: now,
            permitId: permit.id,
            sensorId: sensor.id,
            zone: permit.zoneId,
          });

          riskFactors.push({
            sensorId: `permit-hotwork-gas-${permit.id}-${sensor.id}`,
            value: 0.6,
            weight: 0.7,
          });
        }
      }
    }

    // ── 4. LOTO Verification ─────────────────────────────────────────
    for (const permit of activePermits) {
      if (permit.lotoRequired && !permit.lotoVerified) {
        messages.push({
          agent: 'Permit',
          severity: 'critical',
          text: `LOTO NOT VERIFIED: ${permit.id} (${permit.type}) requires Lockout/Tagout but verification is INCOMPLETE. Work must not proceed. Ref: OISD-STD-105 Clause 7.1.`,
          timestamp: now,
          permitId: permit.id,
          zone: permit.zoneId,
        });

        riskFactors.push({
          sensorId: `permit-loto-${permit.id}`,
          value: 0.7,
          weight: 0.8,
        });
      }
    }

    // ── 5. Temporal Conflict Detection (NEW) ─────────────────────────
    if (temporalRisk) {
      this._checkTemporalConflicts(activePermits, temporalRisk, now, messages, riskFactors);
    }

    // ── 6. Permit Risk Scoring ───────────────────────────────────────
    const permitRiskScores = [];
    for (const permit of activePermits) {
      let riskScore = 0;
      const factors = [];

      // Factor 1: Zone sensor conditions (0-30 points)
      const zoneSensors = sensorsByZone.get(permit.zoneId) || [];
      const elevatedSensors = zoneSensors.filter(s => s.currentValue >= s.warningThreshold);
      const criticalSensors = zoneSensors.filter(s => s.currentValue >= s.criticalThreshold);
      const sensorScore = Math.min(30, criticalSensors.length * 15 + elevatedSensors.length * 5);
      riskScore += sensorScore;
      if (sensorScore > 0) factors.push(`Sensor conditions: ${sensorScore}/30`);

      // Factor 2: Permit type inherent risk (0-25 points)
      const typeRiskMap = { 'Hot Work': 25, 'Confined Space': 22, 'Electrical Isolation': 20, 'Cold Work': 10 };
      const typeScore = typeRiskMap[permit.type] || 10;
      riskScore += typeScore;
      factors.push(`Permit type (${permit.type}): ${typeScore}/25`);

      // Factor 3: LOTO status (0-20 points)
      if (permit.lotoRequired && !permit.lotoVerified) {
        riskScore += 20;
        factors.push('LOTO not verified: 20/20');
      }

      // Factor 4: Temporal factors (0-15 points)
      if (temporalRisk) {
        if (temporalRisk.shiftPhase === 'changeover') { riskScore += 10; factors.push('Shift changeover: 10/15'); }
        if (temporalRisk.fatigueLevel === 'high') { riskScore += 5; factors.push('High fatigue: 5/15'); }
      }

      // Factor 5: Expiry proximity (0-10 points)
      const expiresAt = new Date(permit.expiresAt);
      const timeToExpiry = expiresAt.getTime() - now.getTime();
      if (timeToExpiry < 15 * 60 * 1000 && timeToExpiry > 0) { riskScore += 10; factors.push('Expiring soon: 10/10'); }
      else if (timeToExpiry < 30 * 60 * 1000 && timeToExpiry > 0) { riskScore += 5; factors.push('Expiring within 30min: 5/10'); }

      permitRiskScores.push({
        permitId: permit.id,
        type: permit.type,
        zoneId: permit.zoneId,
        riskScore: Math.min(100, riskScore),
        factors,
      });
    }

    // ── 7. Dependency Chain Analysis ─────────────────────────────────
    const dependencyViolations = [];
    const PERMIT_DEPENDENCIES = {
      'Confined Space': ['Gas Test'],
      'Hot Work': ['Fire Watch Verification'],
      'Electrical Isolation': ['LOTO Verification'],
    };

    for (const permit of activePermits) {
      const deps = PERMIT_DEPENDENCIES[permit.type];
      if (!deps) continue;

      for (const dep of deps) {
        let satisfied = false;

        if (dep === 'Gas Test') {
          // Check if there's a sensor in the zone with recent readings
          const zoneSensors = sensorsByZone.get(permit.zoneId) || [];
          const gasSensors = zoneSensors.filter(s => ['CH4', 'CO', 'H2S', 'NH3'].includes(s.type));
          satisfied = gasSensors.length > 0 && gasSensors.every(s => s.currentValue < s.warningThreshold);
        } else if (dep === 'Fire Watch Verification') {
          satisfied = permit.fireWatchVerified || false;
        } else if (dep === 'LOTO Verification') {
          satisfied = permit.lotoVerified || false;
        }

        if (!satisfied) {
          dependencyViolations.push({
            permitId: permit.id,
            permitType: permit.type,
            zoneId: permit.zoneId,
            missingDependency: dep,
            severity: 'warning',
          });
          messages.push({
            agent: 'Permit',
            severity: 'warning',
            text: `DEPENDENCY CHAIN BROKEN: ${permit.id} (${permit.type}) requires "${dep}" which is not satisfied. Verify prerequisite conditions.`,
            timestamp: now,
            permitId: permit.id,
            zone: permit.zoneId,
          });
        }
      }
    }

    // ── 8. Automated Recommendations ─────────────────────────────────
    const recommendations = [];
    for (const prs of permitRiskScores) {
      if (prs.riskScore >= 70) {
        const rec = {
          permitId: prs.permitId,
          type: prs.type,
          action: 'SUSPEND',
          reason: `Risk score ${prs.riskScore}/100 exceeds safety threshold`,
          factors: prs.factors,
        };
        recommendations.push(rec);
        messages.push({
          agent: 'Permit',
          severity: 'critical',
          text: `RECOMMEND: Suspend permit ${prs.permitId} (${prs.type}) — risk score ${prs.riskScore}/100. Factors: ${prs.factors.join('; ')}.`,
          timestamp: now,
          permitId: prs.permitId,
          zone: prs.zoneId,
        });
      } else if (prs.riskScore >= 50) {
        recommendations.push({
          permitId: prs.permitId,
          type: prs.type,
          action: 'REVIEW',
          reason: `Risk score ${prs.riskScore}/100 warrants increased monitoring`,
          factors: prs.factors,
        });
        messages.push({
          agent: 'Permit',
          severity: 'warning',
          text: `RECOMMEND: Review permit ${prs.permitId} (${prs.type}) — risk score ${prs.riskScore}/100. Increased monitoring advised.`,
          timestamp: now,
          permitId: prs.permitId,
          zone: prs.zoneId,
        });
      }
    }

    return { messages, riskFactors, permitRiskScores, dependencyViolations, recommendations };
  }

  /**
   * Checks for temporal conflicts: active permits during high-risk time periods.
   * Shift changes + active high-risk permits = compounded danger.
   */
  _checkTemporalConflicts(activePermits, temporalRisk, now, messages, riskFactors) {
    if (temporalRisk.shiftPhase === 'changeover') {
      const highRiskPermits = activePermits.filter((p) =>
        ['Hot Work', 'Confined Space', 'Electrical Isolation'].includes(p.type),
      );

      if (highRiskPermits.length > 0) {
        const permitList = highRiskPermits.map((p) => `${p.id} (${p.type})`).join(', ');
        messages.push({
          agent: 'Permit',
          severity: 'warning',
          text: `TEMPORAL CONFLICT: ${highRiskPermits.length} high-risk permit(s) active during shift changeover [${permitList}]. Shift transitions have 3x higher incident rate. Ensure proper handover of permit conditions.`,
          timestamp: now,
        });

        riskFactors.push({
          sensorId: 'permit-temporal-shift-change',
          value: 0.45,
          weight: 0.5,
        });
      }
    }

    if (temporalRisk.fatigueLevel === 'high') {
      const confinedPermits = activePermits.filter((p) => p.type === 'Confined Space');
      if (confinedPermits.length > 0) {
        messages.push({
          agent: 'Permit',
          severity: 'warning',
          text: `FATIGUE + CONFINED SPACE: Confined space permits active during high-fatigue period (${temporalRisk.hoursIntoShift || 'N/A'}h into shift). Increased risk of impaired rescue response.`,
          timestamp: now,
        });

        riskFactors.push({
          sensorId: 'permit-temporal-fatigue-confined',
          value: 0.4,
          weight: 0.45,
        });
      }
    }
  }
}
