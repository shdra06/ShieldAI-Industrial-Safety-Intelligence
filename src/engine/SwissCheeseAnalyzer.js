// ============================================================================
// ShieldAI — Swiss Cheese Analyzer
// Computational implementation of James Reason's Swiss Cheese Model.
// Analyzes 5 defense layers: Engineering Controls, Administrative Controls,
// Supervision, Human Factors, and PPE/Last Defense. Each layer has dynamic
// "holes" determined by real operational data.
// ============================================================================

/**
 * @typedef {Object} Hole
 * @property {number} x  - Normalized x position (0-1)
 * @property {number} y  - Normalized y position (0-1)
 * @property {number} radius - Normalized hole radius (0-0.5)
 */

/**
 * @typedef {Object} DefenseLayer
 * @property {string} name      - Layer name
 * @property {Hole[]} holes     - Current holes in the layer
 * @property {number} integrity - Layer integrity (0-1, 1 = fully intact)
 */

export class SwissCheeseAnalyzer {
  constructor() {
    this.name = 'SwissCheese';
  }

  /**
   * Analyzes all 5 defense layers and computes alignment score.
   *
   * @param {object} state - Current simulation state
   * @param {object[]} state.sensors  - Sensor readings
   * @param {object[]} state.permits  - Work permits
   * @param {object[]} state.workers  - Worker data
   * @param {object[]} state.zones    - Zone definitions
   * @param {object}   [state.temporalRisk] - Temporal risk data
   * @returns {{
   *   layers: DefenseLayer[],
   *   alignmentScore: number,
   *   trajectoryBlocked: boolean,
   * }}
   */
  analyze(state) {
    const { sensors, permits, workers, zones, temporalRisk } = state;

    const layers = [
      this._analyzeEngineeringControls(sensors, zones),
      this._analyzeAdministrativeControls(permits),
      this._analyzeSupervision(workers, temporalRisk),
      this._analyzeHumanFactors(workers, temporalRisk),
      this._analyzePPELastDefense(workers, zones),
    ];

    const alignmentScore = this._computeAlignment(layers);
    const trajectoryBlocked = alignmentScore < 0.35;

    return { layers, alignmentScore, trajectoryBlocked };
  }

  // ── Layer 1: Engineering Controls ──────────────────────────────────────

  /**
   * Holes appear when sensors are unhealthy, equipment degraded, or alarms
   * would be ineffective due to high readings across multiple sensors.
   */
  _analyzeEngineeringControls(sensors, zones) {
    const holes = [];
    let totalRisk = 0;
    let count = 0;

    for (const sensor of sensors) {
      const ratio = sensor.currentValue / sensor.criticalThreshold;
      count++;

      if (ratio > 0.5) {
        // Sensor approaching or exceeding limits = engineering control weakening
        const severity = Math.min(1, ratio);
        totalRisk += severity;

        holes.push({
          x: this._sensorPositionX(sensor),
          y: this._sensorPositionY(sensor),
          radius: Math.min(0.4, severity * 0.35),
        });
      }
    }

    // Check for zone-level alarm saturation (multiple sensors alarming in same zone)
    const zoneAlarmCounts = {};
    for (const sensor of sensors) {
      if (sensor.currentValue >= sensor.warningThreshold) {
        zoneAlarmCounts[sensor.zoneId] = (zoneAlarmCounts[sensor.zoneId] || 0) + 1;
      }
    }

    for (const [zoneId, alarmCount] of Object.entries(zoneAlarmCounts)) {
      if (alarmCount >= 2) {
        // Alarm saturation — operator may miss individual alarms
        holes.push({
          x: 0.5,
          y: this._zonePositionY(zoneId),
          radius: Math.min(0.45, alarmCount * 0.12),
        });
        totalRisk += alarmCount * 0.15;
      }
    }

    const avgRisk = count > 0 ? totalRisk / count : 0;
    const integrity = Math.max(0, Math.min(1, 1 - avgRisk));

    return { name: 'Engineering Controls', holes, integrity };
  }

  // ── Layer 2: Administrative Controls ──────────────────────────────────

  /**
   * Holes appear when permits are expired, LOTO not verified, or SIMOPS
   * conflicts exist.
   */
  _analyzeAdministrativeControls(permits) {
    const holes = [];
    let totalWeakness = 0;

    const activePermits = permits.filter((p) => p.status === 'active');
    const now = new Date();

    for (const permit of permits) {
      let weakness = 0;

      // Expired permit still active
      if (permit.status === 'active' && new Date(permit.expiresAt) < now) {
        weakness += 0.8;
        holes.push({
          x: 0.3,
          y: this._permitPositionY(permit),
          radius: 0.3,
        });
      }

      // LOTO required but not verified
      if (permit.lotoRequired && !permit.lotoVerified && permit.status === 'active') {
        weakness += 0.6;
        holes.push({
          x: 0.6,
          y: this._permitPositionY(permit),
          radius: 0.25,
        });
      }

      // Revoked permit = administrative control failure already happened
      if (permit.status === 'revoked') {
        weakness += 0.4;
        holes.push({
          x: 0.5,
          y: this._permitPositionY(permit),
          radius: 0.2,
        });
      }

      totalWeakness += weakness;
    }

    // SIMOPS conflicts — multiple active permits in same zone
    const permitsByZone = {};
    for (const p of activePermits) {
      if (!permitsByZone[p.zoneId]) permitsByZone[p.zoneId] = [];
      permitsByZone[p.zoneId].push(p);
    }

    for (const [, zonePermits] of Object.entries(permitsByZone)) {
      if (zonePermits.length > 1) {
        totalWeakness += 0.5;
        holes.push({
          x: 0.5,
          y: 0.5,
          radius: 0.3,
        });
      }
    }

    const integrity = Math.max(0, Math.min(1, 1 - totalWeakness / Math.max(1, permits.length)));

    return { name: 'Administrative Controls', holes, integrity };
  }

  // ── Layer 3: Supervision ──────────────────────────────────────────────

  /**
   * Holes appear when supervision ratio is poor, during shift changes, or
   * when handover quality is low.
   */
  _analyzeSupervision(workers, temporalRisk) {
    const holes = [];

    const supervisors = workers.filter((w) =>
      w.role === 'Supervisor' || w.role === 'Safety Officer',
    );
    const nonSupervisors = workers.filter((w) =>
      w.role !== 'Supervisor' && w.role !== 'Safety Officer' && w.role !== 'Control Room Operator',
    );

    // Worker-to-supervisor ratio hole
    const ratio = supervisors.length > 0 ? nonSupervisors.length / supervisors.length : nonSupervisors.length;
    if (ratio > 6) {
      const severityRatio = Math.min(1, (ratio - 6) / 10);
      holes.push({
        x: 0.3,
        y: 0.4,
        radius: Math.min(0.4, severityRatio * 0.35),
      });
    }

    // Shift phase hole (shift transitions are riskier)
    if (temporalRisk) {
      if (temporalRisk.shiftPhase === 'changeover' || temporalRisk.shiftPhase === 'end') {
        holes.push({
          x: 0.6,
          y: 0.3,
          radius: temporalRisk.shiftPhase === 'changeover' ? 0.35 : 0.2,
        });
      }

      // Proximity to shift change
      if (temporalRisk.shiftChangeMinutes < 15) {
        holes.push({
          x: 0.7,
          y: 0.6,
          radius: Math.min(0.35, (15 - temporalRisk.shiftChangeMinutes) / 15 * 0.35),
        });
      }
    }

    // Check zones without any supervisor
    const supervisedZones = new Set(supervisors.map((s) => s.currentZone));
    const hazardousWorkerZones = new Set(
      nonSupervisors
        .filter((w) => w.currentZone !== 'Z-F' && w.currentZone !== 'Z-E')
        .map((w) => w.currentZone),
    );

    for (const zone of hazardousWorkerZones) {
      if (!supervisedZones.has(zone)) {
        holes.push({
          x: 0.4,
          y: 0.7,
          radius: 0.2,
        });
      }
    }

    const holeArea = holes.reduce((sum, h) => sum + Math.PI * h.radius * h.radius, 0);
    const integrity = Math.max(0, Math.min(1, 1 - Math.min(1, holeArea * 2)));

    return { name: 'Supervision', holes, integrity };
  }

  // ── Layer 4: Human Factors ────────────────────────────────────────────

  /**
   * Holes appear based on worker fatigue, PPE compliance flags, and training
   * currency. Uses temporal risk data for fatigue assessment.
   */
  _analyzeHumanFactors(workers, temporalRisk) {
    const holes = [];
    let totalWeakness = 0;

    for (const worker of workers) {
      let workerWeakness = 0;

      // PPE compliance flag
      if (!worker.ppeCompliant) {
        workerWeakness += 0.4;
      }

      // Fatigue assessment
      const fatigue = worker.fatigueScore || 0;
      if (fatigue > 0.5) {
        workerWeakness += fatigue * 0.4;
      }

      // Certification expiry check
      if (worker.certifications) {
        const now = new Date();
        for (const cert of worker.certifications) {
          if (new Date(cert.expiresAt) < now) {
            workerWeakness += 0.3;
          }
        }
      }

      if (workerWeakness > 0.2) {
        holes.push({
          x: Math.random() * 0.6 + 0.2, // Spread across layer
          y: Math.random() * 0.6 + 0.2,
          radius: Math.min(0.3, workerWeakness * 0.3),
        });
        totalWeakness += workerWeakness;
      }
    }

    // Global fatigue from temporal risk
    if (temporalRisk && temporalRisk.fatigueLevel === 'high') {
      holes.push({
        x: 0.5,
        y: 0.5,
        radius: 0.3,
      });
      totalWeakness += 0.4;
    }

    const integrity = Math.max(0, Math.min(1, 1 - totalWeakness / Math.max(1, workers.length)));

    return { name: 'Human Factors', holes, integrity };
  }

  // ── Layer 5: PPE / Last Defense ───────────────────────────────────────

  /**
   * Holes appear when workers lack required PPE for their zone's hazard class.
   * This is the last line of defense.
   */
  _analyzePPELastDefense(workers, zones) {
    const holes = [];
    let totalDeficiency = 0;
    let workersInHazardZones = 0;

    const ZONE_PPE = {
      'Class I - Flammable Gas': ['Hard Hat', 'Safety Goggles', 'FR Coverall', 'Safety Boots', 'Gas Monitor'],
      'Class II - Toxic': ['Hard Hat', 'Safety Goggles', 'Respirator', 'Chemical Suit', 'Safety Boots', 'Gas Monitor'],
      'Class III - High Temp': ['Hard Hat', 'Safety Goggles', 'Heat-Resistant Jacket', 'Safety Boots', 'Gas Monitor'],
    };

    const zoneMap = new Map(zones.map((z) => [z.id, z]));

    for (const worker of workers) {
      const zone = zoneMap.get(worker.currentZone);
      if (!zone) continue;

      const required = ZONE_PPE[zone.hazardClass];
      if (!required) continue; // General or Safe Zone

      workersInHazardZones++;
      const missing = required.filter((item) => !worker.ppeItems.includes(item));

      if (missing.length > 0) {
        const deficiency = missing.length / required.length;
        totalDeficiency += deficiency;

        const isCriticalMissing = missing.includes('Gas Monitor') || missing.includes('Respirator');

        holes.push({
          x: this._workerPositionHash(worker.id, 'x'),
          y: this._workerPositionHash(worker.id, 'y'),
          radius: Math.min(0.4, deficiency * (isCriticalMissing ? 0.45 : 0.3)),
        });
      }
    }

    const integrity = workersInHazardZones > 0
      ? Math.max(0, Math.min(1, 1 - totalDeficiency / workersInHazardZones))
      : 1;

    return { name: 'PPE / Last Defense', holes, integrity };
  }

  // ── Alignment Computation ─────────────────────────────────────────────

  /**
   * Computes how aligned the holes are across all 5 layers.
   * Higher score = holes are more aligned = more dangerous.
   * Uses a grid-sampling approach to detect "trajectories" through all layers.
   *
   * @param {DefenseLayer[]} layers
   * @returns {number} Alignment score in [0, 1]
   */
  _computeAlignment(layers) {
    if (layers.length === 0) return 0;

    const gridSize = 10;
    let totalTrajectories = 0;
    let passedTrajectories = 0;

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        totalTrajectories++;
        const px = (gx + 0.5) / gridSize;
        const py = (gy + 0.5) / gridSize;

        // Check if this trajectory passes through a hole in every layer
        let passesAll = true;
        for (const layer of layers) {
          if (layer.holes.length === 0) {
            passesAll = false;
            break;
          }

          const inHole = layer.holes.some((hole) => {
            const dx = px - hole.x;
            const dy = py - hole.y;
            return Math.sqrt(dx * dx + dy * dy) <= hole.radius;
          });

          if (!inHole) {
            passesAll = false;
            break;
          }
        }

        if (passesAll) {
          passedTrajectories++;
        }
      }
    }

    // Also consider integrity-based alignment
    const avgIntegrity = layers.reduce((s, l) => s + l.integrity, 0) / layers.length;
    const minIntegrity = Math.min(...layers.map((l) => l.integrity));

    // Combine geometric alignment with integrity weakness
    const geometricScore = passedTrajectories / totalTrajectories;
    const integrityScore = 1 - avgIntegrity;
    const worstLayerScore = 1 - minIntegrity;

    // Weighted combination: geometric matters most but integrity amplifies
    return Math.min(1, geometricScore * 3 + integrityScore * 0.3 + worstLayerScore * 0.15);
  }

  // ── Helper Methods ────────────────────────────────────────────────────

  _sensorPositionX(sensor) {
    const typeMap = { CH4: 0.2, CO: 0.35, H2S: 0.5, NH3: 0.65, Temperature: 0.8, Pressure: 0.9 };
    return typeMap[sensor.type] || 0.5;
  }

  _sensorPositionY(sensor) {
    const zoneMap = { 'Z-A': 0.2, 'Z-B': 0.35, 'Z-C': 0.5, 'Z-D': 0.65, 'Z-E': 0.8, 'Z-F': 0.9 };
    return zoneMap[sensor.zoneId] || 0.5;
  }

  _zonePositionY(zoneId) {
    const map = { 'Z-A': 0.2, 'Z-B': 0.35, 'Z-C': 0.5, 'Z-D': 0.65, 'Z-E': 0.8, 'Z-F': 0.9 };
    return map[zoneId] || 0.5;
  }

  _permitPositionY(permit) {
    const typeMap = { 'Hot Work': 0.2, 'Confined Space': 0.4, 'Electrical Isolation': 0.6, 'Cold Work': 0.8 };
    return typeMap[permit.type] || 0.5;
  }

  _workerPositionHash(workerId, axis) {
    let hash = 0;
    const str = workerId + axis;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return 0.15 + (Math.abs(hash) % 70) / 100; // 0.15 to 0.85
  }
}
