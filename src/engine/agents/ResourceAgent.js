// ============================================================================
// ShieldAI — Resource Agent
// Optimal allocation of safety-critical resources including personnel
// placement, equipment distribution, response team positioning, shift
// planning, bottleneck identification, and coverage analysis.
// ============================================================================

/** Minimum workers desired per zone when a work permit is active. */
const PERMIT_WORKER_MIN = 2;

/** Fatigue threshold (0–1) above which a worker is considered impaired. */
const FATIGUE_THRESHOLD = 0.6;

/** High-fatigue threshold for urgent rotation recommendations. */
const HIGH_FATIGUE_THRESHOLD = 0.8;

/**
 * Hazard-class weights determine baseline staffing requirements.
 * Higher class → more personnel needed.
 */
const HAZARD_CLASS_WEIGHTS = {
  'Class I':   1.0,
  'Class II':  1.5,
  'Class III': 2.0,
  'Class IV':  2.5,
};

/**
 * Zone adjacency graph for response-team positioning optimization.
 * @type {Map<string, string[]>}
 */
const ZONE_ADJACENCY = new Map([
  ['Z-A', ['Z-B']],
  ['Z-B', ['Z-A', 'Z-C']],
  ['Z-C', ['Z-B', 'Z-D']],
  ['Z-D', ['Z-C', 'Z-E']],
  ['Z-E', ['Z-D', 'Z-F']],
  ['Z-F', ['Z-E']],
]);

export class ResourceAgent {
  constructor() {
    this.name = 'Resource';

    /**
     * Snapshot of coverage from the previous evaluation for trend comparison.
     * @type {Map<string, object>}
     */
    this.previousCoverage = new Map();

    /** @type {object[]} History of recommendations for deduplication. */
    this.recommendationHistory = [];

    /** Maximum recommendation history entries retained. */
    this.maxHistory = 100;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Analyzes resource allocation and generates optimization recommendations.
   *
   * @param {object[]} workers   - Current worker roster.
   * @param {object[]} zones     - Zone definitions.
   * @param {object[]} sensors   - Current sensor array.
   * @param {number}   riskScore - Current compound risk score (0–1).
   * @param {object[]} permits   - Active work permits.
   * @returns {{ messages: object[], riskFactors: object[], recommendations: object[], coverageMap: object }}
   */
  evaluate(workers, zones, sensors, riskScore, permits) {
    const messages = [];
    const riskFactors = [];
    const recommendations = [];
    const coverageMap = {};
    const now = new Date();

    // ── 1. Build zone risk profiles ─────────────────────────────────────
    const zoneRiskMap = this._computeZoneRisks(sensors, zones);

    // ── 2. Compute worker distribution ──────────────────────────────────
    const workerDistribution = this._getWorkerDistribution(workers, zones);

    // ── 3. Calculate ideal staffing ─────────────────────────────────────
    const idealStaffing = this._calculateIdealStaffing(zones, zoneRiskMap, permits);

    // ── 4. Coverage analysis (populates coverageMap) ────────────────────
    for (const zone of zones) {
      const zoneWorkers = workerDistribution.get(zone.id) || [];
      const risk = zoneRiskMap.get(zone.id) || 0;
      const ideal = idealStaffing.get(zone.id) || 1;
      const actual = zoneWorkers.length;

      // PPE compliance rate for this zone
      const compliant = zoneWorkers.filter(w => w.ppeCompliant).length;
      const complianceRate = actual > 0 ? compliant / actual : 1;

      // Average fatigue in zone
      const avgFatigue = actual > 0
        ? zoneWorkers.reduce((sum, w) => sum + (w.fatigueScore || 0), 0) / actual
        : 0;

      // Coverage score: weighted combination of staffing ratio, compliance, and fatigue
      const staffingRatio = Math.min(1, actual / Math.max(1, ideal));
      const fatigueScore = 1 - avgFatigue;
      const coverage = staffingRatio * 0.5 + complianceRate * 0.3 + fatigueScore * 0.2;
      const gap = Math.max(0, ideal - actual);

      const status = coverage >= 0.75 ? 'adequate'
                   : coverage >= 0.45 ? 'understaffed'
                   : 'critical';

      coverageMap[zone.id] = {
        workers: actual,
        idealWorkers: ideal,
        riskLevel: risk,
        coverage: Math.round(coverage * 100) / 100,
        gap,
        complianceRate: Math.round(complianceRate * 100) / 100,
        avgFatigue: Math.round(avgFatigue * 100) / 100,
        status,
      };
    }

    // ── 5. Personnel optimization — generate relocation recommendations ─
    const personnelRecs = this._optimizePersonnel(
      zones, workerDistribution, idealStaffing, zoneRiskMap, coverageMap
    );
    for (const rec of personnelRecs) {
      recommendations.push(rec);
      const severity = rec.priority === 'critical' ? 'critical'
                     : rec.priority === 'high' ? 'warning' : 'info';
      messages.push({
        agent: this.name,
        severity,
        text: rec.details,
        timestamp: now,
        zone: rec.zone,
      });
    }

    // ── 6. Safety equipment allocation ──────────────────────────────────
    const equipmentRecs = this._analyzeEquipment(workers, zones, workerDistribution);
    for (const rec of equipmentRecs) {
      recommendations.push(rec);
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: rec.details,
        timestamp: now,
        zone: rec.zone,
      });
    }

    // ── 7. Response team positioning ────────────────────────────────────
    const responseRecs = this._positionResponseTeams(zones, zoneRiskMap);
    for (const rec of responseRecs) {
      recommendations.push(rec);
      messages.push({
        agent: this.name,
        severity: rec.priority === 'critical' ? 'critical' : 'info',
        text: rec.details,
        timestamp: now,
        zone: rec.zone,
      });
    }

    // ── 8. Shift planning — fatigue and rotation analysis ───────────────
    const shiftRecs = this._analyzeShiftPlanning(workers, zones, workerDistribution);
    for (const rec of shiftRecs) {
      recommendations.push(rec);
      const severity = rec.priority === 'high' ? 'warning' : 'info';
      messages.push({
        agent: this.name,
        severity,
        text: rec.details,
        timestamp: now,
        zone: rec.zone,
      });
    }

    // ── 9. Bottleneck identification ────────────────────────────────────
    const bottlenecks = this._identifyBottlenecks(zones, coverageMap, zoneRiskMap, workerDistribution);
    for (const bn of bottlenecks) {
      recommendations.push(bn);
      messages.push({
        agent: this.name,
        severity: bn.priority === 'critical' ? 'critical' : 'warning',
        text: bn.details,
        timestamp: now,
        zone: bn.zone,
      });
    }

    // ── 10. Generate risk factors from coverage gaps ────────────────────
    for (const zone of zones) {
      const cov = coverageMap[zone.id];
      if (!cov) continue;
      if (cov.status === 'critical' || cov.status === 'understaffed') {
        riskFactors.push({
          sensorId: `resource-gap-${zone.id}`,
          value: Math.min(1, 1 - cov.coverage),
          weight: cov.status === 'critical' ? 0.8 : 0.5,
        });
      }
    }

    // ── 11. Overall resource risk ───────────────────────────────────────
    const criticalZones = Object.values(coverageMap).filter(c => c.status === 'critical');
    if (criticalZones.length > 0) {
      messages.push({
        agent: this.name,
        severity: 'critical',
        text: `Resource crisis: ${criticalZones.length} zone(s) at critical coverage levels. Immediate resource reallocation required.`,
        timestamp: now,
      });
      riskFactors.push({
        sensorId: 'resource-crisis',
        value: Math.min(1, criticalZones.length * 0.3),
        weight: 0.85,
      });
    }

    // ── 12. Coverage trend comparison ───────────────────────────────────
    for (const zone of zones) {
      const cov = coverageMap[zone.id];
      const prev = this.previousCoverage.get(zone.id);
      if (prev && cov) {
        const delta = cov.coverage - prev.coverage;
        if (delta < -0.2) {
          messages.push({
            agent: this.name,
            severity: 'warning',
            text: `Coverage degradation in zone ${zone.id}: dropped from ${(prev.coverage * 100).toFixed(0)}% to ${(cov.coverage * 100).toFixed(0)}%`,
            timestamp: now,
            zone: zone.id,
          });
        }
      }
    }

    // ── 13. Store coverage snapshot for next tick ────────────────────────
    for (const zone of zones) {
      if (coverageMap[zone.id]) {
        this.previousCoverage.set(zone.id, { ...coverageMap[zone.id] });
      }
    }

    // Persist recommendations
    for (const rec of recommendations) {
      this.recommendationHistory.push({ ...rec, timestamp: now });
    }
    if (this.recommendationHistory.length > this.maxHistory) {
      this.recommendationHistory.splice(0, this.recommendationHistory.length - this.maxHistory);
    }

    return { messages, riskFactors, recommendations, coverageMap };
  }

  /**
   * Clears all internal state for a fresh simulation run.
   */
  reset() {
    this.previousCoverage.clear();
    this.recommendationHistory = [];
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Computes per-zone risk from sensor readings.
   * @param {object[]} sensors
   * @param {object[]} zones
   * @returns {Map<string, number>}
   */
  _computeZoneRisks(sensors, zones) {
    const zoneRisk = new Map();
    const zoneCounts = new Map();

    for (const zone of zones) {
      zoneRisk.set(zone.id, 0);
      zoneCounts.set(zone.id, 0);
    }

    for (const sensor of sensors) {
      if (!zoneRisk.has(sensor.zoneId)) continue;

      const range = (sensor.criticalThreshold ?? 100) - (sensor.normalRange?.min ?? 0);
      const normalized = range > 0
        ? Math.max(0, Math.min(1, (sensor.currentValue - (sensor.normalRange?.min ?? 0)) / range))
        : 0;

      zoneRisk.set(sensor.zoneId, zoneRisk.get(sensor.zoneId) + normalized);
      zoneCounts.set(sensor.zoneId, zoneCounts.get(sensor.zoneId) + 1);
    }

    for (const [zoneId, total] of zoneRisk.entries()) {
      const count = zoneCounts.get(zoneId) || 1;
      zoneRisk.set(zoneId, total / count);
    }

    return zoneRisk;
  }

  /**
   * Groups workers by their current zone.
   * @param {object[]} workers
   * @param {object[]} zones
   * @returns {Map<string, object[]>}
   */
  _getWorkerDistribution(workers, zones) {
    const dist = new Map();
    for (const zone of zones) {
      dist.set(zone.id, []);
    }
    for (const worker of workers) {
      if (dist.has(worker.currentZone)) {
        dist.get(worker.currentZone).push(worker);
      }
    }
    return dist;
  }

  /**
   * Calculates ideal staffing per zone based on risk, hazard class, and
   * active permits.
   * @param {object[]} zones
   * @param {Map<string, number>} zoneRiskMap
   * @param {object[]} permits
   * @returns {Map<string, number>}
   */
  _calculateIdealStaffing(zones, zoneRiskMap, permits) {
    const ideal = new Map();

    // Count active permits per zone
    const permitCounts = new Map();
    for (const permit of permits) {
      if (permit.status === 'active' || permit.status === 'approved') {
        permitCounts.set(permit.zoneId, (permitCounts.get(permit.zoneId) || 0) + 1);
      }
    }

    for (const zone of zones) {
      const risk = zoneRiskMap.get(zone.id) || 0;
      const hazardWeight = HAZARD_CLASS_WEIGHTS[zone.hazardClass] || 1.0;
      const activePermits = permitCounts.get(zone.id) || 0;

      // Base: 1 worker. Scales with risk, hazard class, and permits.
      let needed = 1;
      needed += Math.ceil(risk * 3 * hazardWeight);
      needed += activePermits * PERMIT_WORKER_MIN;

      // Cap at reasonable maximum
      ideal.set(zone.id, Math.min(needed, 10));
    }

    return ideal;
  }

  /**
   * Generates personnel relocation recommendations by comparing actual
   * vs ideal staffing.
   * @returns {object[]}
   */
  _optimizePersonnel(zones, workerDistribution, idealStaffing, zoneRiskMap, coverageMap) {
    const recs = [];

    // Find over-staffed and under-staffed zones
    const overStaffed = [];
    const underStaffed = [];

    for (const zone of zones) {
      const actual = (workerDistribution.get(zone.id) || []).length;
      const ideal = idealStaffing.get(zone.id) || 1;
      const risk = zoneRiskMap.get(zone.id) || 0;

      if (actual > ideal + 1 && risk < 0.3) {
        overStaffed.push({ zone: zone.id, excess: actual - ideal, risk });
      } else if (actual < ideal) {
        underStaffed.push({ zone: zone.id, deficit: ideal - actual, risk });
      }
    }

    // Sort understaffed by risk (highest first) for priority assignment
    underStaffed.sort((a, b) => b.risk - a.risk);

    for (const us of underStaffed) {
      const priority = us.risk > 0.7 ? 'critical'
                     : us.risk > 0.4 ? 'high'
                     : 'medium';

      // Suggest sourcing from overstaffed zones
      const source = overStaffed.find(os => os.excess > 0);
      const sourceText = source
        ? ` Consider relocating from zone ${source.zone} (${source.excess} excess).`
        : '';

      if (source) source.excess--;

      recs.push({
        type: 'personnel',
        zone: us.zone,
        action: 'increase_staffing',
        priority,
        details: `Zone ${us.zone} is understaffed by ${us.deficit} worker(s) at risk level ${(us.risk * 100).toFixed(0)}%.${sourceText}`,
      });
    }

    return recs;
  }

  /**
   * Analyzes PPE compliance per zone and generates equipment recommendations.
   * @returns {object[]}
   */
  _analyzeEquipment(workers, zones, workerDistribution) {
    const recs = [];

    for (const zone of zones) {
      const zoneWorkers = workerDistribution.get(zone.id) || [];
      if (zoneWorkers.length === 0) continue;

      const nonCompliant = zoneWorkers.filter(w => !w.ppeCompliant);
      if (nonCompliant.length === 0) continue;

      const complianceRate = (zoneWorkers.length - nonCompliant.length) / zoneWorkers.length;
      const priority = complianceRate < 0.5 ? 'critical'
                     : complianceRate < 0.8 ? 'high'
                     : 'medium';

      // Identify missing PPE types across non-compliant workers
      const missingItems = new Set();
      for (const worker of nonCompliant) {
        // If ppeItems is sparse, flag it
        if (worker.ppeItems && worker.ppeItems.length < 3) {
          missingItems.add('standard safety kit');
        }
      }

      recs.push({
        type: 'equipment',
        zone: zone.id,
        action: 'deploy_ppe',
        priority,
        details: `Zone ${zone.id}: ${nonCompliant.length}/${zoneWorkers.length} workers non-compliant with PPE requirements (${(complianceRate * 100).toFixed(0)}% compliance). Deploy additional safety equipment.`,
      });
    }

    return recs;
  }

  /**
   * Recommends emergency response team positioning based on the current
   * risk map. Uses a greedy approach to find zones that maximize coverage
   * of high-risk areas considering adjacency.
   * @returns {object[]}
   */
  _positionResponseTeams(zones, zoneRiskMap) {
    const recs = [];

    // Score each zone as a response-team location by summing its own risk
    // plus the risk of its neighbors (weighted by adjacency).
    const positionScores = [];
    for (const zone of zones) {
      const ownRisk = zoneRiskMap.get(zone.id) || 0;
      const neighbors = ZONE_ADJACENCY.get(zone.id) || [];
      let neighborRisk = 0;
      for (const n of neighbors) {
        neighborRisk += zoneRiskMap.get(n) || 0;
      }

      // Score: own risk + 0.6 * average neighbor risk
      const avgNeighborRisk = neighbors.length > 0 ? neighborRisk / neighbors.length : 0;
      const score = ownRisk + 0.6 * avgNeighborRisk;

      positionScores.push({ zoneId: zone.id, score, ownRisk, neighborCount: neighbors.length });
    }

    // Sort by score descending
    positionScores.sort((a, b) => b.score - a.score);

    // Recommend top position(s)
    if (positionScores.length > 0 && positionScores[0].score > 0.3) {
      const best = positionScores[0];
      recs.push({
        type: 'response_team',
        zone: best.zoneId,
        action: 'position_team',
        priority: best.score > 0.7 ? 'critical' : 'high',
        details: `Optimal response team position: Zone ${best.zoneId} (risk score ${(best.score * 100).toFixed(0)}%, covers ${best.neighborCount} adjacent zone(s)). Provides fastest response to highest-risk areas.`,
      });

      // If overall risk is high, recommend a secondary position
      if (positionScores.length > 2 && positionScores[1].score > 0.4) {
        const second = positionScores[1];
        recs.push({
          type: 'response_team',
          zone: second.zoneId,
          action: 'position_backup_team',
          priority: 'medium',
          details: `Secondary response team recommended at Zone ${second.zoneId} (score ${(second.score * 100).toFixed(0)}%) for distributed coverage.`,
        });
      }
    }

    return recs;
  }

  /**
   * Analyzes worker fatigue levels and generates shift rotation
   * recommendations.
   * @returns {object[]}
   */
  _analyzeShiftPlanning(workers, zones, workerDistribution) {
    const recs = [];

    for (const zone of zones) {
      const zoneWorkers = workerDistribution.get(zone.id) || [];
      if (zoneWorkers.length === 0) continue;

      const avgFatigue = zoneWorkers.reduce((sum, w) => sum + (w.fatigueScore || 0), 0) / zoneWorkers.length;
      const highFatigueWorkers = zoneWorkers.filter(w => (w.fatigueScore || 0) > HIGH_FATIGUE_THRESHOLD);
      const fatiguedWorkers = zoneWorkers.filter(w => (w.fatigueScore || 0) > FATIGUE_THRESHOLD);

      if (highFatigueWorkers.length > 0) {
        const names = highFatigueWorkers.map(w => w.name || w.id).join(', ');
        recs.push({
          type: 'shift',
          zone: zone.id,
          action: 'immediate_rotation',
          priority: 'high',
          details: `Zone ${zone.id}: ${highFatigueWorkers.length} worker(s) at HIGH fatigue (>${(HIGH_FATIGUE_THRESHOLD * 100).toFixed(0)}%): ${names}. Immediate rotation recommended for safety.`,
        });
      } else if (avgFatigue > FATIGUE_THRESHOLD) {
        recs.push({
          type: 'shift',
          zone: zone.id,
          action: 'plan_rotation',
          priority: 'medium',
          details: `Zone ${zone.id}: Average fatigue level ${(avgFatigue * 100).toFixed(0)}% exceeds threshold. Schedule shift rotation within next period.`,
        });
      }
    }

    return recs;
  }

  /**
   * Identifies resource bottlenecks that constrain safety response
   * capability.
   * @returns {object[]}
   */
  _identifyBottlenecks(zones, coverageMap, zoneRiskMap, workerDistribution) {
    const bottlenecks = [];

    for (const zone of zones) {
      const cov = coverageMap[zone.id];
      if (!cov) continue;

      const risk = zoneRiskMap.get(zone.id) || 0;
      const workers = workerDistribution.get(zone.id) || [];

      // Single-point-of-failure: only 1 worker in a zone with elevated risk
      if (workers.length === 1 && risk > 0.4) {
        bottlenecks.push({
          type: 'bottleneck',
          zone: zone.id,
          action: 'add_redundancy',
          priority: 'critical',
          details: `Single-point-of-failure: Zone ${zone.id} has only 1 worker (${workers[0].name || workers[0].id}) at risk level ${(risk * 100).toFixed(0)}%. No backup available for emergencies.`,
        });
      }

      // High risk + low coverage
      if (risk > 0.6 && cov.coverage < 0.5) {
        bottlenecks.push({
          type: 'bottleneck',
          zone: zone.id,
          action: 'resource_surge',
          priority: 'critical',
          details: `Resource bottleneck: Zone ${zone.id} has high risk (${(risk * 100).toFixed(0)}%) but only ${(cov.coverage * 100).toFixed(0)}% coverage. Safety response capability severely limited.`,
        });
      }

      // Zero-worker zone with any risk
      if (workers.length === 0 && risk > 0.2) {
        bottlenecks.push({
          type: 'bottleneck',
          zone: zone.id,
          action: 'deploy_personnel',
          priority: risk > 0.5 ? 'critical' : 'high',
          details: `Unattended zone: Zone ${zone.id} has NO workers present despite risk level ${(risk * 100).toFixed(0)}%. Deploy personnel immediately.`,
        });
      }
    }

    return bottlenecks;
  }
}
