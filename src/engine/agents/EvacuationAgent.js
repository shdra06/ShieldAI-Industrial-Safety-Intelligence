// ============================================================================
// ShieldAI — Evacuation Agent
// Dynamic evacuation route planning and personnel accounting. Calculates
// optimal escape routes using zone adjacency BFS, detects blocked paths,
// assigns assembly points, tracks headcounts, and estimates muster times.
// ============================================================================

export class EvacuationAgent {
  constructor() {
    this.name = 'Evacuation';

    /**
     * Zone adjacency graph. Z-F is the safe assembly zone.
     * @type {Object<string, string[]>}
     */
    this.adjacency = {
      'Z-A': ['Z-B'],
      'Z-B': ['Z-A', 'Z-C'],
      'Z-C': ['Z-B', 'Z-D'],
      'Z-D': ['Z-C', 'Z-E'],
      'Z-E': ['Z-D', 'Z-F'],
      'Z-F': ['Z-E'],
    };

    /** @type {string} Primary safe assembly zone */
    this.ASSEMBLY_ZONE = 'Z-F';

    /** @type {number} Zone transition capacity per tick */
    this.ZONE_CAPACITY = 10;

    /** @type {number} Seconds per zone traversal */
    this.SECONDS_PER_ZONE = 15;

    /** @type {Set<string>} Zones blocked by hazardous conditions */
    this.blockedZones = new Set();

    /** @type {Map<string, {route: string[], distance: number}>} Zone → route to assembly */
    this.evacuationRoutes = new Map();

    /** @type {Map<string, {assemblyZone: string, route: string[], estimatedTime: number}>} Worker → assignment */
    this.assemblyAssignments = new Map();

    /** @type {Map<string, {total: number, workers: Array<{id: string, name: string}>}>} Zone → headcount */
    this.headcount = new Map();

    /** @type {Array<{zone: string, workerCount: number, capacity: number, delayTicks: number}>} */
    this.bottlenecks = [];

    /** @type {number} Estimated total muster time in seconds */
    this.estimatedMusterTime = 0;

    /** @type {number} Workers accounted for at assembly */
    this.accountedFor = 0;

    /** @type {number} Workers not yet at assembly */
    this.unaccounted = 0;

    /** @type {boolean} Whether evacuation mode is active */
    this.evacuationActive = false;
  }

  /**
   * Evaluates evacuation readiness, calculates routes, and tracks personnel.
   *
   * @param {object[]} workers   - Worker roster with currentZone, fatigueScore, etc.
   * @param {object[]} zones     - Zone definitions.
   * @param {object[]} sensors   - All sensor readings.
   * @param {number}   riskScore - Current compound risk score (0-1).
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(workers = [], zones = [], sensors = [], riskScore = 0) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();

    // ── 1. Detect blocked zones ───────────────────────────────────────
    const previousBlocked = new Set(this.blockedZones);
    this.blockedZones.clear();
    this._detectBlockedZones(sensors);

    // Report newly blocked zones
    for (const zone of this.blockedZones) {
      if (!previousBlocked.has(zone)) {
        messages.push({
          agent: 'Evacuation', severity: 'critical',
          text: `🚫 Zone ${zone} BLOCKED — hazardous gas levels exceed critical threshold. Route recalculation triggered.`,
          timestamp: now, zone,
        });
      }
    }

    // ── 2. Calculate evacuation routes ─────────────────────────────────
    this.evacuationRoutes.clear();
    const allZoneIds = Object.keys(this.adjacency);
    for (const zoneId of allZoneIds) {
      if (zoneId === this.ASSEMBLY_ZONE) continue;
      const route = this._calculateRoute(zoneId, this.blockedZones);
      if (route) {
        this.evacuationRoutes.set(zoneId, { route, distance: route.length - 1 });
      } else {
        this.evacuationRoutes.set(zoneId, { route: [], distance: Infinity });
        messages.push({
          agent: 'Evacuation', severity: 'emergency',
          text: `🆘 NO VIABLE ROUTE from zone ${zoneId} to assembly! All paths blocked. Rescue team required.`,
          timestamp: now, zone: zoneId,
        });
      }
    }

    // ── 3. Headcount tracking ─────────────────────────────────────────
    this.headcount.clear();
    for (const zoneId of allZoneIds) {
      this.headcount.set(zoneId, { total: 0, workers: [] });
    }
    for (const w of workers) {
      const entry = this.headcount.get(w.currentZone);
      if (entry) {
        entry.total++;
        entry.workers.push({ id: w.id, name: w.name });
      }
    }

    const assemblyEntry = this.headcount.get(this.ASSEMBLY_ZONE);
    this.accountedFor = assemblyEntry ? assemblyEntry.total : 0;
    this.unaccounted = workers.length - this.accountedFor;

    // ── 4. Assembly point assignment & muster time ─────────────────────
    this.assemblyAssignments.clear();
    let maxTime = 0;
    for (const w of workers) {
      if (w.currentZone === this.ASSEMBLY_ZONE) {
        this.assemblyAssignments.set(w.id, {
          assemblyZone: this.ASSEMBLY_ZONE, route: [this.ASSEMBLY_ZONE], estimatedTime: 0,
        });
        continue;
      }
      const routeInfo = this.evacuationRoutes.get(w.currentZone);
      const route = routeInfo?.route || [];
      const zonesToTraverse = Math.max(0, route.length - 1);
      const baseTime = zonesToTraverse * this.SECONDS_PER_ZONE;
      const fatiguePenalty = (w.fatigueScore || 0) * 5;
      const estTime = baseTime + fatiguePenalty;
      this.assemblyAssignments.set(w.id, {
        assemblyZone: this.ASSEMBLY_ZONE, route, estimatedTime: estTime,
      });
      if (estTime > maxTime) maxTime = estTime;
    }
    this.estimatedMusterTime = maxTime;

    // ── 5. Bottleneck detection ───────────────────────────────────────
    this.bottlenecks = [];
    for (const [zoneId, entry] of this.headcount) {
      if (zoneId === this.ASSEMBLY_ZONE) continue;
      if (entry.total > this.ZONE_CAPACITY) {
        const delay = Math.ceil(entry.total / this.ZONE_CAPACITY) - 1;
        this.bottlenecks.push({
          zone: zoneId, workerCount: entry.total,
          capacity: this.ZONE_CAPACITY, delayTicks: delay,
        });
      }
    }

    // ── 6. Evacuation activation at riskScore > 0.7 ───────────────────
    if (riskScore > 0.7 && !this.evacuationActive) {
      this.evacuationActive = true;
      const routeSummary = this._formatRouteSummary();
      messages.push({
        agent: 'Evacuation', severity: 'emergency',
        text: `🚨 EVACUATION ACTIVATED — Risk ${(riskScore * 100).toFixed(1)}%. Muster time: ${this.estimatedMusterTime.toFixed(0)}s. Routes: ${routeSummary}`,
        timestamp: now,
      });
    }

    if (this.evacuationActive) {
      // Per-zone headcount messages
      for (const [zoneId, entry] of this.headcount) {
        if (zoneId === this.ASSEMBLY_ZONE || entry.total === 0) continue;
        messages.push({
          agent: 'Evacuation', severity: 'warning',
          text: `👥 Zone ${zoneId}: ${entry.total} personnel awaiting evacuation.`,
          timestamp: now, zone: zoneId,
        });
      }

      // Bottleneck alerts
      for (const bn of this.bottlenecks) {
        messages.push({
          agent: 'Evacuation', severity: 'warning',
          text: `⚠️ Bottleneck at zone ${bn.zone}: ${bn.workerCount} workers exceed capacity of ${bn.capacity}. Est. delay: ${bn.delayTicks} ticks.`,
          timestamp: now, zone: bn.zone,
        });
      }

      // All accounted for
      if (this.unaccounted === 0 && workers.length > 0) {
        messages.push({
          agent: 'Evacuation', severity: 'info',
          text: `✅ All ${workers.length} personnel accounted for at assembly zone ${this.ASSEMBLY_ZONE}.`,
          timestamp: now, zone: this.ASSEMBLY_ZONE,
        });
      } else if (this.unaccounted > 0) {
        messages.push({
          agent: 'Evacuation', severity: 'critical',
          text: `🔍 Headcount discrepancy: ${this.unaccounted} of ${workers.length} personnel NOT at assembly. Unaccounted zones: ${this._unaccountedZones()}.`,
          timestamp: now,
        });
      }
    }

    // De-escalation
    if (this.evacuationActive && riskScore < 0.5) {
      this.evacuationActive = false;
      messages.push({
        agent: 'Evacuation', severity: 'info',
        text: `✅ Evacuation stood down — risk score dropped to ${(riskScore * 100).toFixed(1)}%.`,
        timestamp: now,
      });
    }

    // ── 7. Risk factors ───────────────────────────────────────────────
    const totalBnWorkers = this.bottlenecks.reduce((s, b) => s + b.workerCount, 0);
    riskFactors.push({
      sensorId: 'evac-blocked-routes',
      value: Math.min(1, this.blockedZones.size / 6),
      weight: 0.7,
    });
    riskFactors.push({
      sensorId: 'evac-muster-time',
      value: Math.min(1, this.estimatedMusterTime / 300),
      weight: 0.5,
    });
    riskFactors.push({
      sensorId: 'evac-bottleneck-severity',
      value: Math.min(1, totalBnWorkers / 30),
      weight: 0.6,
    });
    riskFactors.push({
      sensorId: 'evac-unaccounted',
      value: workers.length > 0 ? Math.min(1, this.unaccounted / workers.length) : 0,
      weight: 0.8,
    });

    return { messages, riskFactors };
  }

  // ── Private: BFS Route Calculation ──────────────────────────────────────

  /**
   * Calculates the shortest path from a zone to Z-F using BFS,
   * avoiding blocked zones.
   *
   * @param {string}      fromZone     - Starting zone ID.
   * @param {Set<string>} blockedZones - Zones to avoid.
   * @returns {string[]|null} Ordered array of zone IDs, or null if no path.
   * @private
   */
  _calculateRoute(fromZone, blockedZones) {
    if (fromZone === this.ASSEMBLY_ZONE) return [this.ASSEMBLY_ZONE];
    const queue = [[fromZone]];
    const visited = new Set([fromZone]);
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === this.ASSEMBLY_ZONE) return path;
      for (const neighbor of (this.adjacency[current] || [])) {
        if (!visited.has(neighbor) && !blockedZones.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }

  // ── Private: Blocked Zone Detection ─────────────────────────────────────

  /**
   * Scans sensors for gas readings exceeding critical thresholds and
   * marks those zones as blocked.
   *
   * @param {object[]} sensors
   * @private
   */
  _detectBlockedZones(sensors) {
    for (const s of sensors) {
      const isGas = s.type && (
        s.type.includes('gas') || s.type.includes('methane') || s.type.includes('co')
      );
      if (isGas && s.currentValue >= s.criticalThreshold) {
        // Don't block the assembly zone — it's always reachable
        if (s.zoneId !== this.ASSEMBLY_ZONE) {
          this.blockedZones.add(s.zoneId);
        }
      }
    }
  }

  // ── Private: Formatting Helpers ─────────────────────────────────────────

  /**
   * Formats a compact summary of all evacuation routes.
   * @returns {string}
   * @private
   */
  _formatRouteSummary() {
    const parts = [];
    for (const [zone, info] of this.evacuationRoutes) {
      if (info.route.length > 0) {
        parts.push(`${zone}→${info.route.join('→')}`);
      } else {
        parts.push(`${zone}→BLOCKED`);
      }
    }
    return parts.join(' | ');
  }

  /**
   * Lists zones with unaccounted personnel.
   * @returns {string}
   * @private
   */
  _unaccountedZones() {
    const zones = [];
    for (const [zoneId, entry] of this.headcount) {
      if (zoneId !== this.ASSEMBLY_ZONE && entry.total > 0) {
        zones.push(`${zoneId}(${entry.total})`);
      }
    }
    return zones.join(', ') || 'unknown';
  }

  /**
   * Resets all evacuation agent state to initial values.
   */
  reset() {
    this.blockedZones.clear();
    this.evacuationRoutes.clear();
    this.assemblyAssignments.clear();
    this.headcount.clear();
    this.bottlenecks = [];
    this.estimatedMusterTime = 0;
    this.accountedFor = 0;
    this.unaccounted = 0;
    this.evacuationActive = false;
  }
}
