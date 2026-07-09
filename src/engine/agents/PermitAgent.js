// ============================================================================
// ShieldAI — Permit Agent
// Validates work permits: SIMOPS conflicts, expiry, hot-work-near-gas,
// and LOTO verification.
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
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(permits, sensors, zones) {
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
    const confinedSpacePermits = activePermits.filter((p) => p.type === 'Confined Space');

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

    return { messages, riskFactors };
  }
}
