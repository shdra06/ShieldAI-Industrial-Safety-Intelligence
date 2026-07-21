// ============================================================================
// ShieldAI — Vision Agent
// Simulates computer-vision-based monitoring: PPE compliance, zone access
// violations, worker presence in restricted areas, and fatigue indicators.
// Fixed: Hazard class string matching normalized to handle dash variants.
// ============================================================================

/**
 * Normalizes a string by replacing all dash/hyphen variants with standard hyphen.
 * Fixes Bug #6: different dash characters (—, –, -, −) causing mismatches.
 * @param {string} str
 * @returns {string}
 */
function normalizeDashes(str) {
  return str.replace(/[\u2014\u2013\u2012\u2011\u2010\u00AD\u2212\uFE58\uFE63\uFF0D]/g, '-');
}

/**
 * Required PPE items per hazard class.
 * Keys use standard ASCII hyphens for consistent matching.
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
    /** @type {Map<string, string[]>} Tracks recent zone changes per worker for behavioral analysis. */
    this.workerZoneHistory = new Map();
  }

  /**
   * Evaluates worker PPE compliance, zone access, and fatigue indicators.
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

      // ── PPE Compliance Check (with normalized dash matching) ────────
      const normalizedHazardClass = normalizeDashes(zone.hazardClass);
      const requiredPPE = this._getRequiredPPE(normalizedHazardClass);
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
      const isHazardous = normalizedHazardClass.startsWith('Class');
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

      // ── Fatigue Indicator Detection ────────────────────────────────
      if (worker.fatigueScore && worker.fatigueScore > 0.5) {
        const fatigueSeverity = worker.fatigueScore > 0.7 ? 'warning' : 'info';
        messages.push({
          agent: 'Vision',
          severity: fatigueSeverity,
          text: `FATIGUE INDICATOR: ${worker.name} (${worker.role}) — fatigue score ${(worker.fatigueScore * 100).toFixed(0)}%. ${worker.fatigueScore > 0.7 ? 'High risk of impaired judgment. Consider rotation.' : 'Monitor for signs of reduced alertness.'}`,
          timestamp: now,
          workerId: worker.id,
          zone: worker.currentZone,
        });

        if (worker.fatigueScore > 0.7) {
          riskFactors.push({
            sensorId: `vision-fatigue-${worker.id}`,
            value: worker.fatigueScore * 0.6,
            weight: 0.4,
          });
        }
      }

      // ── Certification Expiry Check ────────────────────────────────
      if (worker.certifications) {
        for (const cert of worker.certifications) {
          const expiryDate = new Date(cert.expiresAt);
          if (expiryDate < now) {
            messages.push({
              agent: 'Vision',
              severity: 'warning',
              text: `EXPIRED CERTIFICATION: ${worker.name} — "${cert.name}" expired on ${cert.expiresAt}. Worker should not perform certified tasks.`,
              timestamp: now,
              workerId: worker.id,
              zone: worker.currentZone,
            });

            riskFactors.push({
              sensorId: `vision-cert-${worker.id}-${cert.name.replace(/\s+/g, '-')}`,
              value: 0.35,
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
      const normalizedClass = normalizeDashes(zone.hazardClass);
      if (count > 5 && normalizedClass.startsWith('Class')) {
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

    // ── Worker Zone History Tracking ─────────────────────────────────
    for (const worker of workers) {
      if (!this.workerZoneHistory.has(worker.id)) {
        this.workerZoneHistory.set(worker.id, []);
      }
      const zoneHist = this.workerZoneHistory.get(worker.id);
      if (zoneHist.length === 0 || zoneHist[zoneHist.length - 1] !== worker.currentZone) {
        zoneHist.push(worker.currentZone);
        if (zoneHist.length > 20) zoneHist.shift();
      }
    }

    // ── Behavioral Analysis: Rapid Zone Changes ─────────────────────
    const behaviorAlerts = [];
    for (const worker of workers) {
      const zoneHist = this.workerZoneHistory.get(worker.id) || [];
      // Check last 10 entries for unique zone changes
      const recentHistory = zoneHist.slice(-10);
      let zoneChanges = 0;
      for (let i = 1; i < recentHistory.length; i++) {
        if (recentHistory[i] !== recentHistory[i - 1]) zoneChanges++;
      }
      if (zoneChanges > 3) {
        behaviorAlerts.push({
          workerId: worker.id,
          workerName: worker.name,
          role: worker.role,
          currentZone: worker.currentZone,
          zoneChanges,
          recentZones: [...recentHistory],
          flag: 'RAPID_ZONE_CHANGES',
        });
        messages.push({
          agent: 'Vision',
          severity: 'warning',
          text: `BEHAVIOR ALERT: ${worker.name} (${worker.role}) has changed zones ${zoneChanges} times recently (${recentHistory.join(' → ')}). May indicate confusion or distress.`,
          timestamp: now,
          workerId: worker.id,
          zone: worker.currentZone,
        });
        riskFactors.push({
          sensorId: `vision-behavior-${worker.id}`,
          value: Math.min(1, zoneChanges * 0.15),
          weight: 0.35,
        });
      }
    }

    // ── Zone Occupancy Heat Map ──────────────────────────────────────
    const heatMap = {};
    for (const zone of zones) {
      heatMap[zone.id] = workerCountByZone.get(zone.id) || 0;
    }

    // ── Worker Proximity to Hazards ──────────────────────────────────
    const proximityRisks = [];
    for (const worker of workers) {
      const zone = zoneMap.get(worker.currentZone);
      if (!zone) continue;
      const normalizedClass = normalizeDashes(zone.hazardClass);
      if (normalizedClass.startsWith('Class')) {
        // Workers in hazardous zones get a proximity risk score based on zone classification and worker count
        const zoneWorkerCount = workerCountByZone.get(worker.currentZone) || 1;
        let baseRisk = 0.3; // Class I
        if (normalizedClass.includes('Toxic')) baseRisk = 0.5;
        if (normalizedClass.includes('High Temp')) baseRisk = 0.4;
        // Higher density increases proximity risk
        const densityFactor = Math.min(1.5, 1 + (zoneWorkerCount - 1) * 0.1);
        // Fatigue increases risk
        const fatigueFactor = worker.fatigueScore ? (1 + worker.fatigueScore * 0.3) : 1;
        const proximityScore = parseFloat(Math.min(1, baseRisk * densityFactor * fatigueFactor).toFixed(3));

        proximityRisks.push({
          workerId: worker.id,
          workerName: worker.name,
          zoneId: worker.currentZone,
          zoneName: zone.name,
          hazardClass: zone.hazardClass,
          proximityScore,
        });
      }
    }

    return { messages, riskFactors, behaviorAlerts, heatMap, proximityRisks };
  }

  /**
   * Gets required PPE for a hazard class, with normalized dash matching.
   * @param {string} normalizedHazardClass - Hazard class with normalized dashes
   * @returns {string[]}
   */
  _getRequiredPPE(normalizedHazardClass) {
    // Direct lookup first
    if (ZONE_PPE_REQUIREMENTS[normalizedHazardClass]) {
      return ZONE_PPE_REQUIREMENTS[normalizedHazardClass];
    }

    // Fuzzy match: normalize both sides and compare
    for (const [key, value] of Object.entries(ZONE_PPE_REQUIREMENTS)) {
      if (normalizeDashes(key) === normalizedHazardClass) {
        return value;
      }
    }

    // Fallback: partial match
    for (const [key, value] of Object.entries(ZONE_PPE_REQUIREMENTS)) {
      const normalizedKey = normalizeDashes(key);
      if (normalizedHazardClass.includes(normalizedKey) || normalizedKey.includes(normalizedHazardClass)) {
        return value;
      }
    }

    return [];
  }

  /**
   * Resets internal tracking state.
   */
  reset() {
    this.workerZoneHistory.clear();
  }
}
