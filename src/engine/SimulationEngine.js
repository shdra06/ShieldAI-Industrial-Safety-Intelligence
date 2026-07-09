// ============================================================================
// ShieldAI — Simulation Engine
// Drives the time-stepped simulation: applies scenario events, adds sensor
// noise, runs the orchestrator, and emits state updates to the UI.
// ============================================================================

import { Orchestrator } from './Orchestrator.js';
import { SENSORS } from '../data/sensorConfig.js';
import { INITIAL_PERMITS } from '../data/permits.js';
import { WORKERS } from '../data/workers.js';
import { ZONES } from '../data/plantLayout.js';
import { SCENARIOS } from '../data/scenarios.js';

export class SimulationEngine {
  /**
   * @param {string} [scenarioId='normal'] - Initial scenario to load.
   */
  constructor(scenarioId = 'normal') {
    this.orchestrator = new Orchestrator();
    this.intervalId = null;
    this.tickInterval = 2000; // 2-second ticks
    this.callbacks = [];

    // ── Simulation state ─────────────────────────────────────────────
    this.simulationClock = 0; // Seconds elapsed in simulation
    this.isRunning = false;
    this.scenario = null;
    this.pendingEvents = [];

    // ── Deep-clone initial data so we can mutate without side effects ─
    this.sensors = [];
    this.permits = [];
    this.workers = [];
    this.zones = JSON.parse(JSON.stringify(ZONES));

    // ── Result state ─────────────────────────────────────────────────
    this.lastResult = null;
    this.messageLog = [];

    // Load initial scenario
    this.setScenario(scenarioId);
  }

  /**
   * Registers a callback for state updates.
   * @param {(state: object) => void} callback
   * @returns {() => void} Unsubscribe function.
   */
  onUpdate(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Starts the simulation loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run first tick immediately
    this.tick();

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.tickInterval);
  }

  /**
   * Stops the simulation loop.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Resets and loads a new scenario.
   * @param {string} scenarioId - One of: 'vizag', 'confined', 'normal'.
   */
  setScenario(scenarioId) {
    const wasRunning = this.isRunning;
    this.stop();

    // Reset orchestrator
    this.orchestrator.reset();

    // Reset clock
    this.simulationClock = 0;
    this.messageLog = [];
    this.lastResult = null;

    // Load scenario
    this.scenario = SCENARIOS[scenarioId] || SCENARIOS.normal;

    // Deep clone base data
    this.sensors = JSON.parse(JSON.stringify(SENSORS));
    this.permits = JSON.parse(JSON.stringify(INITIAL_PERMITS));
    this.workers = JSON.parse(JSON.stringify(WORKERS));
    this.zones = JSON.parse(JSON.stringify(ZONES));

    // Apply scenario initial permit overrides
    if (this.scenario.initialPermits) {
      for (const [permitId, overrides] of Object.entries(this.scenario.initialPermits)) {
        const permit = this.permits.find((p) => p.id === permitId);
        if (permit) {
          Object.assign(permit, overrides);
        }
      }
    }

    // Load timeline events (sorted by time)
    this.pendingEvents = [...this.scenario.timeline].sort((a, b) => a.time - b.time);

    // Emit initial state
    this._emitState();

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Advances the simulation by one tick.
   * 1. Advance clock
   * 2. Apply scenario timeline events
   * 3. Add sensor noise
   * 4. Run orchestrator
   * 5. Update zone colors based on risk
   * 6. Emit state update
   */
  tick() {
    // ── 1. Advance simulation clock ──────────────────────────────────
    this.simulationClock += 2; // Each tick = 2 simulation seconds

    // Check if scenario has ended
    if (this.scenario && this.simulationClock > this.scenario.duration) {
      // Loop or stop — keep running but no more events
    }

    // ── 2. Apply scenario timeline events ────────────────────────────
    this._applyTimelineEvents();

    // ── 3. Add sensor noise ──────────────────────────────────────────
    this._addSensorNoise();

    // ── 4. Run orchestrator ──────────────────────────────────────────
    const result = this.orchestrator.tick({
      sensors: this.sensors,
      permits: this.permits,
      workers: this.workers,
      zones: this.zones,
    });

    this.lastResult = result;

    // Accumulate messages (keep last 100)
    this.messageLog.push(...result.messages);
    if (this.messageLog.length > 100) {
      this.messageLog = this.messageLog.slice(-100);
    }

    // ── 5. Update zone colors based on risk ──────────────────────────
    this._updateZoneColors(result);

    // ── 6. Emit state update ─────────────────────────────────────────
    this._emitState();
  }

  /**
   * Returns the full current simulation state.
   * @returns {object}
   */
  getState() {
    return {
      // Simulation metadata
      simulationClock: this.simulationClock,
      isRunning: this.isRunning,
      scenarioId: this.scenario?.id || 'normal',
      scenarioName: this.scenario?.name || 'Normal Operations',
      scenarioDuration: this.scenario?.duration || 120,

      // Core data
      sensors: this.sensors.map((s) => ({ ...s })),
      permits: this.permits.map((p) => ({ ...p })),
      workers: this.workers.map((w) => ({ ...w })),
      zones: this.zones.map((z) => ({ ...z })),

      // Risk & analysis
      riskScore: this.lastResult?.riskScore ?? 0,
      singleSensorRisk: this.lastResult?.singleSensorRisk ?? 0,
      status: this.lastResult?.status ?? 'normal',
      riskLabel: this.lastResult?.riskLabel ?? { label: 'Normal', color: '#10B981', level: 0 },

      // Agent outputs
      messages: this.lastResult?.messages ?? [],
      messageLog: [...this.messageLog],
      agentResults: this.lastResult?.agentResults ?? {},
      emergencyProtocol: this.lastResult?.emergencyProtocol ?? null,
      violations: this.lastResult?.violations ?? [],
      matchedIncidents: this.lastResult?.matchedIncidents ?? [],
    };
  }

  // ── Private Methods ────────────────────────────────────────────────────

  /**
   * Applies all timeline events whose time has been reached.
   */
  _applyTimelineEvents() {
    while (
      this.pendingEvents.length > 0 &&
      this.pendingEvents[0].time <= this.simulationClock
    ) {
      const event = this.pendingEvents.shift();
      this._applyEvent(event);
    }
  }

  /**
   * Applies a single timeline event.
   * @param {object} event
   */
  _applyEvent(event) {
    switch (event.type) {
      case 'sensor_change': {
        const sensor = this.sensors.find((s) => s.id === event.target);
        if (sensor) {
          sensor.currentValue = event.value;
        }
        break;
      }

      case 'permit_event': {
        const permit = this.permits.find((p) => p.id === event.target);
        if (permit && event.data) {
          Object.assign(permit, event.data);
        }
        break;
      }

      case 'worker_event': {
        const worker = this.workers.find((w) => w.id === event.target);
        if (worker && event.data) {
          Object.assign(worker, event.data);
        }
        break;
      }

      case 'agent_override': {
        // Special event type: system-level overrides (e.g., emergency permit revocation)
        const target = this.permits.find((p) => p.id === event.target);
        if (target && event.data) {
          Object.assign(target, event.data);
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Adds small deterministic noise to sensor values to simulate real-world jitter.
   * Uses a simple seeded approach based on simulation clock for reproducibility.
   */
  _addSensorNoise() {
    for (const sensor of this.sensors) {
      // Compute a deterministic but varied noise factor
      const seed = this._hashCode(`${sensor.id}-${this.simulationClock}`);
      const noiseFraction = ((seed % 100) - 50) / 500; // ±0.1 (10% noise)

      // Scale noise by the sensor's normal range
      const range = sensor.normalRange.max - sensor.normalRange.min;
      const noise = noiseFraction * range;

      sensor.currentValue = Math.max(0, sensor.currentValue + noise);

      // Round to reasonable precision
      sensor.currentValue = Math.round(sensor.currentValue * 100) / 100;
    }
  }

  /**
   * Updates zone colors based on the worst sensor risk in each zone.
   * @param {object} result - Orchestrator result.
   */
  _updateZoneColors(result) {
    const STATUS_COLORS = {
      normal: '#10B981',    // Green
      elevated: '#F59E0B',  // Yellow
      warning: '#F97316',   // Orange
      critical: '#EF4444',  // Red
      emergency: '#7F1D1D', // Dark Red
    };

    // Reset all zones to normal
    for (const zone of this.zones) {
      zone.color = STATUS_COLORS.normal;
    }

    // Color zones by worst sensor status
    if (result.agentResults?.scada?.riskFactors) {
      for (const rf of result.agentResults.scada.riskFactors) {
        const sensor = this.sensors.find((s) => s.id === rf.sensorId);
        if (!sensor) continue;

        const zone = this.zones.find((z) => z.id === sensor.zoneId);
        if (!zone) continue;

        let zoneStatus = 'normal';
        if (rf.value > 0.9) zoneStatus = 'emergency';
        else if (rf.value > 0.75) zoneStatus = 'critical';
        else if (rf.value > 0.5) zoneStatus = 'warning';
        else if (rf.value > 0.25) zoneStatus = 'elevated';

        // Only upgrade zone color (don't downgrade from a worse state)
        const currentPriority = Object.keys(STATUS_COLORS).indexOf(
          Object.keys(STATUS_COLORS).find((k) => STATUS_COLORS[k] === zone.color) || 'normal',
        );
        const newPriority = Object.keys(STATUS_COLORS).indexOf(zoneStatus);
        if (newPriority > currentPriority) {
          zone.color = STATUS_COLORS[zoneStatus];
        }
      }
    }
  }

  /**
   * Emits the current state to all registered callbacks.
   */
  _emitState() {
    const state = this.getState();
    for (const callback of this.callbacks) {
      try {
        callback(state);
      } catch (err) {
        console.error('[SimulationEngine] Callback error:', err);
      }
    }
  }

  /**
   * Simple deterministic hash for generating reproducible noise.
   * @param {string} str
   * @returns {number}
   */
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
