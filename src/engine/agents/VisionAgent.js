// ============================================================================
// ShieldAI — Vision Agent
// Simulates computer-vision-based monitoring: PPE compliance, zone access
// violations, and worker presence in restricted areas.
// ============================================================================

/**
 * Required PPE items per hazard class.
 */
const ZONE_PPE_REQUIREMENTS = {
  'Class I - Flammable Gas': ['Hard Hat', 'Safety Goggles', 'FR Coverall', 'Safety Boots', 'Gas Monitor'],
  'Class II - Toxic': ['Hard Hat', 'Safety Goggles', 'Respirator', 'Chemical Suit', 'Safety Boots', 'Gas Monitor'],
  'Class III - High Temp': ['Hard Hat', 'Safety Goggles', 'Heat-Resistant Jacket', 'Safety Boots', 'Gas Monitor'],
  'General': ['Hard Hat', 'Safety Boots'],
  'Safe Zone': ['Hard Hat'],
};

export class VisionAgent {
  constructor() {
    this.name = 'Vision';
  }

  /**
   * Evaluates worker PPE compliance and zone access.
   *
   * @param {object[]} workers - Current workers array.
   * @param {object[]} zones   - Zone definitions.
   * @param {object[]} [permits] - Active permits (optional, for restricted zone checks).
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(workers, zones, permits = []) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();

    // Build zone lookup
    const zoneMap = new Map();
    for (const zone of zones) {
      zoneMap.set(zone.id, zone);
    }

    // Build permit lookup by zone (active permits only)
    const activePermitsByZone = new Map();
    for (const permit of permits) {
      if (permit.status === 'active') {
        if (!activePermitsByZone.has(permit.zoneId)) {
          activePermitsByZone.set(permit.zoneId, []);
        }
        activePermitsByZone.get(permit.zoneId).push(permit);
      }
    }

    for (const worker of workers) {
      const zone = zoneMap.get(worker.currentZone);
      if (!zone) continue;

      // ── PPE Compliance Check ───────────────────────────────────────
      const requiredPPE = ZONE_PPE_REQUIREMENTS[zone.hazardClass] || [];
      const missingPPE = requiredPPE.filter(
        (item) => !worker.ppeItems.includes(item),
      );

      if (missingPPE.length > 0) {
        const severity = missingPPE.includes('Gas Monitor') || missingPPE.includes('Respirator')
          ? 'critical'
          : 'warning';

        messages.push({
          agent: 'Vision',
          severity,
          text: `PPE VIOLATION: ${worker.name} (${worker.role}) in ${zone.name} [${zone.hazardClass}] — missing: ${missingPPE.join(', ')}`,
          timestamp: now,
          workerId: worker.id,
          zone: worker.currentZone,
        });

        // Risk contribution: more missing items = higher risk
        const complianceRisk = Math.min(1, missingPPE.length / requiredPPE.length);
        riskFactors.push({
          sensorId: `vision-ppe-${worker.id}`,
          value: complianceRisk,
          weight: severity === 'critical' ? 0.8 : 0.5,
        });
      }

      // ── Zone Access Violation ──────────────────────────────────────
      // Workers in hazardous zones (Class I, II, III) need an active permit
      const isHazardous = zone.hazardClass.startsWith('Class');
      if (isHazardous) {
        const zonePermits = activePermitsByZone.get(worker.currentZone) || [];
        const hasRelatedPermit = zonePermits.some(
          (p) => p.receiver.includes(worker.name) || p.status === 'active',
        );

        if (!hasRelatedPermit && worker.role !== 'Safety Officer' && worker.role !== 'Supervisor') {
          // Workers in hazardous zones without any permit coverage
          // This is informational — not everyone needs their own permit
          // but we flag contract workers and helpers specifically
          if (worker.role === 'Contract Worker' || worker.role === 'Helper') {
            messages.push({
              agent: 'Vision',
              severity: 'warning',
              text: `ZONE ACCESS: ${worker.name} (${worker.role}) detected in ${zone.name} — no permit directly references this worker. Verify authorization.`,
              timestamp: now,
              workerId: worker.id,
              zone: worker.currentZone,
            });

            riskFactors.push({
              sensorId: `vision-access-${worker.id}`,
              value: 0.4,
              weight: 0.3,
            });
          }
        }
      }

      // ── Explicit PPE non-compliance flag ───────────────────────────
      if (!worker.ppeCompliant && missingPPE.length === 0) {
        // PPE flag is false but no items are technically missing — system override
        messages.push({
          agent: 'Vision',
          severity: 'info',
          text: `${worker.name} (${worker.role}) — PPE compliance flag is FALSE but required items appear present. Verify physical compliance.`,
          timestamp: now,
          workerId: worker.id,
          zone: worker.currentZone,
        });
      }
    }

    // ── Zone Crowding Check ──────────────────────────────────────────
    const workerCountByZone = new Map();
    for (const worker of workers) {
      const count = workerCountByZone.get(worker.currentZone) || 0;
      workerCountByZone.set(worker.currentZone, count + 1);
    }

    for (const [zoneId, count] of workerCountByZone.entries()) {
      const zone = zoneMap.get(zoneId);
      if (!zone) continue;

      // Flag crowding in hazardous zones (arbitrary safe limit: 5 workers)
      if (count > 5 && zone.hazardClass.startsWith('Class')) {
        messages.push({
          agent: 'Vision',
          severity: 'warning',
          text: `CROWDING: ${count} workers detected in ${zone.name} (${zone.hazardClass}). Maximum recommended: 5.`,
          timestamp: now,
          zone: zoneId,
        });

        riskFactors.push({
          sensorId: `vision-crowding-${zoneId}`,
          value: Math.min(1, (count - 5) / 5),
          weight: 0.3,
        });
      }
    }

    return { messages, riskFactors };
  }
}
