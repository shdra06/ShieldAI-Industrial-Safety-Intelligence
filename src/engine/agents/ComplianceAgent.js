// ============================================================================
// ShieldAI — Compliance Agent
// Checks current state against specific regulatory clauses and generates
// violation reports with citations.
// ============================================================================

export class ComplianceAgent {
  constructor() {
    this.name = 'Compliance';
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

    return { messages, riskFactors, violations };
  }

  /**
   * Factories Act §36 — Confined Space.
   * Checks that workers in zones with confined space permits have proper atmosphere clearance.
   */
  _checkSection36(activePermits, workers, zoneMap, workersByZone, now, messages, riskFactors, violations) {
    const confinedPermits = activePermits.filter((p) => p.type === 'Confined Space');

    for (const permit of confinedPermits) {
      const zoneWorkers = workersByZone.get(permit.zoneId) || [];
      const zone = zoneMap.get(permit.zoneId);

      // Check if LOTO is required but not verified
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

      // Check for workers without proper PPE in confined space zones
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
   * Checks for ignition sources (hot work) near elevated flammable gas readings.
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
   * Checks that hot work permits have fire watch coverage.
   */
  _checkSection38(activePermits, workers, now, messages, riskFactors, violations) {
    const hotWorkPermits = activePermits.filter((p) => p.type === 'Hot Work');

    for (const permit of hotWorkPermits) {
      // Check if there's a fire watch in the same zone
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
   * Checks for work continuing under expired permits.
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
   * Checks that all permits requiring LOTO have verified isolation.
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
   * Checks that workers in gas-hazard zones carry personal monitors.
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
}
