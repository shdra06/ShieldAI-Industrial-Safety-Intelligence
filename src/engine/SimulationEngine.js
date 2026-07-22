// ============================================================================
// ShieldAI — Simulation Engine
// Drives the time-stepped simulation: applies scenario events, adds sensor
// noise, runs the orchestrator, and emits state updates to the UI.
// Enhanced with Swiss Cheese Model, Temporal Engine, sensorsByType
// aggregation, compound lead time, worker proximity alerts, and process
// drift detection.
// ============================================================================

import { Orchestrator } from './Orchestrator.js';
import { SwissCheeseAnalyzer } from './SwissCheeseAnalyzer.js';
import { TemporalEngine } from './TemporalEngine.js';
import { DigitalTwin } from './DigitalTwin.js';
import { AIManager } from './ai/AIManager.js';
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
    this.swissCheese = new SwissCheeseAnalyzer();
    this.temporalEngine = new TemporalEngine();
    this.intervalId = null;
    this.tickInterval = 2000; // 2-second ticks
    this.callbacks = [];

    // ── Simulation state ─────────────────────────────────────────────
    this.simulationClock = 0; // Seconds elapsed in simulation
    this.isRunning = false;
    this.scenario = null;
    this.pendingEvents = [];
    this.scenarioComplete = false;

    // ── Deep-clone initial data so we can mutate without side effects ─
    this.sensors = [];
    this.permits = [];
    this.workers = [];
    this.zones = JSON.parse(JSON.stringify(ZONES));

    // ── Result state ─────────────────────────────────────────────────
    this.lastResult = null;
    this.messageLog = [];

    // ── Swiss Cheese & Temporal state ────────────────────────────────
    this.swissCheeseData = null;
    this.temporalRiskData = null;

    // ── Digital Twin (physics-based simulation) ─────────────────────
    this.digitalTwin = null; // Initialized after scenario load

    // Load initial scenario
    this.setScenario(scenarioId);

    // ── Auto-initialize Gemini API ──────────────────────────────────
    this._autoInitAI();
  }

  /**
   * Auto-initialize the Gemini API using env var or localStorage.
   * Runs asynchronously, non-blocking.
   */
  async _autoInitAI() {
    const aiManager = AIManager.getInstance();
    // Priority: 1) Vite env var, 2) localStorage, 3) skip
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY)
      || (typeof localStorage !== 'undefined' && localStorage.getItem('shieldai_gemini_api_key'))
      || null;

    if (apiKey) {
      console.log('[SimulationEngine] Auto-initializing Gemini API...');
      const result = await aiManager.initGemini(apiKey);
      if (result.success) {
        console.log('[SimulationEngine] ✅ Gemini API ready!');
      } else {
        console.warn('[SimulationEngine] ⚠️ Gemini init failed:', result.error);
      }
    } else {
      console.log('[SimulationEngine] No API key found. Go to AI Brain tab to configure.');
    }
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
   * @param {string} scenarioId - One of: 'vizag', 'confined', 'normal', 'deviance', 'cascade'.
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
    this.scenarioComplete = false;
    this.swissCheeseData = null;
    this.temporalRiskData = null;

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

    // Initialize Digital Twin with zone geometries
    try {
      const twinZones = this.zones.map((z, i) => ({
        id: z.id,
        name: z.name,
        centroid: { x: z.x ?? i * 20, y: 0, z: z.y ?? 0 },
        volume: (z.width ?? 20) * (z.height ?? 20) * 10,
        isConfined: z.hazardClass?.includes('Confined') ?? false,
      }));
      this.digitalTwin = new DigitalTwin(twinZones, this.sensors);
    } catch (e) {
      console.warn('[SimulationEngine] DigitalTwin init failed:', e.message);
      this.digitalTwin = null;
    }

    // Emit initial state
    this._emitState();

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Manually set a sensor's value (from UI slider).
   * Pins the value for several ticks so noise/drift don't overwrite it.
   * @param {string} sensorId
   * @param {number} newValue
   */
  setSensorValue(sensorId, newValue) {
    const sensor = this.sensors.find((s) => s.id === sensorId);
    if (!sensor) return;
    sensor.currentValue = newValue;
    // Store the manual target so noise drifts around this value
    sensor._manualTarget = newValue;
    // Pin this sensor: skip noise for 5 ticks so slider feels responsive
    if (!this._manualPins) this._manualPins = {};
    this._manualPins[sensorId] = 5;
    // Immediately re-emit so UI updates
    this._emitState();
  }

  /**
   * Advances the simulation by one tick.
   * 1. Advance clock
   * 2. Apply scenario timeline events
   * 3. Add sensor noise
   * 4. Compute temporal risk
   * 5. Compute Swiss Cheese analysis
   * 6. Run orchestrator
   * 7. Compute worker proximity alerts
   * 8. Update zone colors based on risk
   * 9. Check scenario completion
   * 10. Emit state update
   */
  tick() {
    // ── 1. Advance simulation clock ──────────────────────────────────
    this.simulationClock += 2; // Each tick = 2 simulation seconds

    // ── 2. Apply scenario timeline events ────────────────────────────
    this._applyTimelineEvents();

    // ── 3. Add sensor noise ──────────────────────────────────────────
    this._addSensorNoise();

    // ── 3b. Digital Twin physics step ────────────────────────────────
    this._runDigitalTwin();

    // ── 4. Compute temporal risk ─────────────────────────────────────
    this.temporalRiskData = this.temporalEngine.calculate(this.simulationClock);

    // ── 5. Compute Swiss Cheese analysis ─────────────────────────────
    this.swissCheeseData = this.swissCheese.analyze({
      sensors: this.sensors,
      permits: this.permits,
      workers: this.workers,
      zones: this.zones,
      temporalRisk: this.temporalRiskData,
    });

    // ── 6. Run orchestrator ──────────────────────────────────────────
    const result = this.orchestrator.tick({
      sensors: this.sensors,
      permits: this.permits,
      workers: this.workers,
      zones: this.zones,
      simulationClock: this.simulationClock,
      temporalRisk: this.temporalRiskData,
    });

    this.lastResult = result;

    // Accumulate messages (keep last 100)
    this.messageLog.push(...result.messages);
    if (this.messageLog.length > 100) {
      this.messageLog = this.messageLog.slice(-100);
    }

    // ── 7. Update zone colors based on risk ──────────────────────────
    this._updateZoneColors(result);

    // ── 8. Check scenario completion ─────────────────────────────────
    if (this.scenario && this.simulationClock >= this.scenario.duration && !this.scenarioComplete) {
      this.scenarioComplete = true;
    }

    // ── 9. Emit state update ─────────────────────────────────────────
    this._emitState();
  }

  /**
   * Returns the full current simulation state.
   * Includes all new fields required by the data contract.
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
      scenarioComplete: this.scenarioComplete,

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
      incidentReport: this.lastResult?.incidentReport ?? null,
      violations: this.lastResult?.violations ?? [],
      matchedIncidents: this.lastResult?.matchedIncidents ?? [],
      driftAlerts: this.lastResult?.driftAlerts ?? [],

      // ── NEW: Swiss Cheese data for visualization ───────────────────
      swissCheese: this.swissCheeseData || {
        layers: [
          { name: 'Engineering Controls', holes: [], integrity: 1 },
          { name: 'Administrative Controls', holes: [], integrity: 1 },
          { name: 'Supervision', holes: [], integrity: 1 },
          { name: 'Human Factors', holes: [], integrity: 1 },
          { name: 'PPE / Last Defense', holes: [], integrity: 1 },
        ],
        alignmentScore: 0,
        trajectoryBlocked: true,
      },

      // ── NEW: Temporal risk factors ─────────────────────────────────
      temporalRisk: this.temporalRiskData || {
        shiftPhase: 'start',
        shiftChangeMinutes: 240,
        timeOfDayFactor: 0.2,
        fatigueLevel: 'low',
      },

      // ── NEW: Compound lead time metric ─────────────────────────────
      compoundLeadTime: this.lastResult?.compoundLeadTime ?? 0,

      // ── NEW: Worker proximity alerts ───────────────────────────────
      workerAlerts: this._computeWorkerAlerts(),

      // ── NEW: Sensor data aggregated by type (for SCADAMonitor) ─────
      sensorsByType: this._aggregateSensorsByType(),

      // ══════════════════════════════════════════════════════════════════
      // 20-AGENT ARCHITECTURE: New State Fields
      // ══════════════════════════════════════════════════════════════════

      // ── Enhanced SCADA outputs ─────────────────────────────────────
      anomalies: this.lastResult?.anomalies ?? [],
      timeToBreachEstimates: this.lastResult?.timeToBreachEstimates ?? [],
      sensorHealth: this.lastResult?.sensorHealth ?? [],

      // ── Enhanced Vision outputs ────────────────────────────────────
      behaviorAlerts: this.lastResult?.behaviorAlerts ?? [],
      heatMap: this.lastResult?.heatMap ?? {},

      // ── Enhanced Permit outputs ────────────────────────────────────
      permitRiskScores: this.lastResult?.permitRiskScores ?? [],

      // ── Enhanced Pattern outputs ───────────────────────────────────
      nearMisses: this.lastResult?.nearMisses ?? [],

      // ── Enhanced Compliance outputs ────────────────────────────────
      complianceScores: this.lastResult?.complianceScores ?? {},

      // ── Enhanced Emergency outputs ─────────────────────────────────
      stagingActions: this.lastResult?.stagingActions ?? [],
      protocolType: this.lastResult?.protocolType ?? null,
      resourceStatus: this.lastResult?.resourceStatus ?? {},

      // ── Cascade Agent outputs ──────────────────────────────────────
      cascadeChains: this.lastResult?.cascadeChains ?? [],
      crossZoneCorrelations: this.lastResult?.crossZoneCorrelations ?? [],

      // ── Predictive Agent outputs ───────────────────────────────────
      predictions: this.lastResult?.predictions ?? [],

      // ── Resource Agent outputs ─────────────────────────────────────
      recommendations: this.lastResult?.recommendations ?? [],
      coverageMap: this.lastResult?.coverageMap ?? {},

      // ── Supervisor Agent outputs ───────────────────────────────────
      situationClass: this.lastResult?.situationClass ?? 'Normal Operations',
      agentAgreement: this.lastResult?.agentAgreement ?? 1,
      escalationLevel: this.lastResult?.escalationLevel ?? 0,

      // ── Meta Agent outputs ─────────────────────────────────────────
      agentHealth: this.lastResult?.agentHealth ?? {},
      systemHealth: this.lastResult?.systemHealth ?? {},

      // ── Agent system metadata ──────────────────────────────────────
      agentCount: this.lastResult?.agentCount ?? 18,
      agentProfiles: this.lastResult?.agentProfiles ?? {},
      tierBreakdown: this.lastResult?.tierBreakdown ?? { tier1: 13, tier2: 3, tier3: 2 },
      messageBusStats: this.lastResult?.messageBusStats ?? {},
      blackboardStats: this.lastResult?.blackboardStats ?? {},

      // ══════════════════════════════════════════════════════════════════
      // ML UPGRADES: Industry-Grade Algorithm Outputs
      // ══════════════════════════════════════════════════════════════════

      // ── EWMA + CUSUM statistical process control ───────────────────
      statisticalAlerts: this.lastResult?.statisticalAlerts ?? [],
      multiVariateAlerts: this.lastResult?.multiVariateAlerts ?? [],

      // ── Holt-Winters adaptive forecasting ──────────────────────────
      modelSelection: this.lastResult?.modelSelection ?? {},
      trendAcceleration: this.lastResult?.trendAcceleration ?? null,

      // ── Dynamic Bayesian Network ───────────────────────────────────
      bayesianPosteriors: this.lastResult?.bayesianPosteriors ?? {},

      // ── Weibull RUL estimation ─────────────────────────────────────
      weibullEstimates: this.lastResult?.weibullEstimates ?? [],

      // ── IEC 62682 alarm management KPIs ────────────────────────────
      alarmKPIs: this.lastResult?.alarmKPIs ?? {},

      // ── SHAP-like explainability ───────────────────────────────────
      explanation: this.lastResult?.explanation ?? null,

      // ── Safety Sandwich (deterministic overrides) ──────────────────
      safetySandwich: this.lastResult?.safetySandwich ?? {
        safetySandwichActive: false,
        overrides: [],
        forcedActions: [],
        deterministicOverride: false,
      },

      // ══════════════════════════════════════════════════════════════════
      // AI LAYER: Neural Networks + LLM Reasoning
      // ══════════════════════════════════════════════════════════════════
      neuralAnomaly: this.lastResult?.neuralAnomaly ?? { isAnomaly: false, anomalyScore: 0, status: 'collecting_data' },
      riskClassification: this.lastResult?.riskClassification ?? { class: 'Unknown', confidence: 0, status: 'not_trained' },
      aiReasoning: this.lastResult?.aiReasoning ?? null,
      aiReasoningSource: this.lastResult?.aiReasoningSource ?? 'none',
      aiStatus: this.lastResult?.aiStatus ?? {},
      neuralDetectorStatus: this.lastResult?.neuralDetectorStatus ?? {},
      riskClassifierStatus: this.lastResult?.riskClassifierStatus ?? {},

      // ── Isolation Forest results ───────────────────────────────────
      isolationForestResult: this.lastResult?.isolationForestResult ?? { anomalyScore: 0, isAnomaly: false, status: 'collecting_data' },
      isolationForestTrained: this.lastResult?.isolationForestTrained ?? false,

      // ── HuggingFace Transformers.js results ───────────────────────────
      hfStatus: this.lastResult?.hfStatus ?? { models: {}, readyCount: 0, totalModels: 3 },
      hfModelsLoaded: this.lastResult?.hfModelsLoaded ?? false,
      nerResult: this.lastResult?.nerResult ?? null,
      safetyClassification: this.lastResult?.safetyClassification ?? null,
    };
  }

  // ── Private Methods ────────────────────────────────────────────────────

  /**
   * Aggregates sensors by type, using the WORST (highest risk) reading for each type.
   * @returns {object} Keyed by lowercase sensor type
   */
  _aggregateSensorsByType() {
    const byType = {};
    const typeKeys = ['ch4', 'co', 'h2s', 'nh3', 'pressure', 'temperature'];

    for (const sensor of this.sensors) {
      const typeKey = sensor.type.toLowerCase();

      // Compute the trend from the orchestrator's SCADA history
      const history = this.orchestrator.scadaAgent.readingHistory.get(sensor.id) || [];
      let trend = 'stable';
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        if (last > prev * 1.02) trend = 'rising';
        else if (last < prev * 0.98) trend = 'falling';
      }

      if (!byType[typeKey]) {
        byType[typeKey] = {
          currentValue: sensor.currentValue,
          warningThreshold: sensor.warningThreshold,
          criticalThreshold: sensor.criticalThreshold,
          trend,
          zoneId: sensor.zoneId,
          sensorId: sensor.id,
          label: sensor.label,
          unit: sensor.unit,
        };
      } else {
        // Keep the worst (highest) reading
        const ratio = sensor.currentValue / sensor.criticalThreshold;
        const existingRatio = byType[typeKey].currentValue / byType[typeKey].criticalThreshold;
        if (ratio > existingRatio) {
          byType[typeKey] = {
            currentValue: sensor.currentValue,
            warningThreshold: sensor.warningThreshold,
            criticalThreshold: sensor.criticalThreshold,
            trend,
            zoneId: sensor.zoneId,
            sensorId: sensor.id,
            label: sensor.label,
            unit: sensor.unit,
          };
        }
      }
    }

    return byType;
  }

  /**
   * Computes worker proximity alerts.
   * Flags workers who are close to high-risk zones or sensors in alarm state.
   * @returns {object[]}
   */
  _computeWorkerAlerts() {
    const alerts = [];

    // Find zones with sensors in warning or critical state
    const dangerousZones = new Map();
    for (const sensor of this.sensors) {
      if (sensor.currentValue >= sensor.warningThreshold) {
        const severity = sensor.currentValue >= sensor.criticalThreshold ? 'critical' : 'warning';
        const existing = dangerousZones.get(sensor.zoneId);
        if (!existing || severity === 'critical') {
          dangerousZones.set(sensor.zoneId, {
            severity,
            sensorId: sensor.id,
            sensorLabel: sensor.label,
            value: sensor.currentValue,
            unit: sensor.unit,
          });
        }
      }
    }

    // Check each worker against dangerous zones
    for (const worker of this.workers) {
      const danger = dangerousZones.get(worker.currentZone);
      if (danger) {
        // Worker is IN a dangerous zone
        alerts.push({
          workerId: worker.id,
          workerName: worker.name,
          zoneId: worker.currentZone,
          alertType: danger.severity === 'critical' ? 'IMMEDIATE_DANGER' : 'ELEVATED_RISK',
          distance: 0,
          severity: danger.severity,
          detail: `${worker.name} is in zone with ${danger.sensorLabel} at ${danger.value} ${danger.unit}`,
        });
      }

      // Check PPE compliance in dangerous zones
      if (danger && !worker.ppeCompliant) {
        alerts.push({
          workerId: worker.id,
          workerName: worker.name,
          zoneId: worker.currentZone,
          alertType: 'PPE_VIOLATION_IN_DANGER_ZONE',
          distance: 0,
          severity: 'critical',
          detail: `${worker.name} has PPE violations while in dangerous zone ${worker.currentZone}`,
        });
      }
    }

    return alerts;
  }

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
   * Uses mean-reverting noise to prevent upward drift accumulation.
   * In Normal scenario, clamps values within normal range.
   */
  _addSensorNoise() {
    const isNormal = (this.scenario?.id === 'normal');
    for (const sensor of this.sensors) {
      // Skip noise for manually-pinned sensors (short lock after manual override)
      if (this._manualPins?.[sensor.id] > 0) {
        this._manualPins[sensor.id]--;
        continue;
      }

      const seed = this._hashCode(`${sensor.id}-${this.simulationClock}`);
      const range = sensor.normalRange.max - sensor.normalRange.min;

      if (isNormal) {
        // In Normal mode: gentle visible fluctuation around current value
        // Sensors drift naturally ±1.5% of range, with occasional larger bumps
        const baseNoise = ((seed % 100) - 50) / 3333 * range; // ±1.5% of range
        // Occasional larger micro-fluctuation every ~20 ticks
        const bigBump = (seed % 20 === 0) ? ((seed % 200 - 100) / 3333 * range) : 0;
        const noise = baseNoise + bigBump;

        // Gentle reversion toward a safe baseline (very slow, so manual values persist)
        const baseline = sensor._manualTarget ?? sensor.driftBaseline ?? sensor.normalRange.min + range * 0.3;
        const reversion = (baseline - sensor.currentValue) * 0.02; // Very gentle pull

        sensor.currentValue = Math.max(0, sensor.currentValue + noise + reversion);
        sensor.currentValue = Math.round(sensor.currentValue * 100) / 100;
        // Only clamp to prevent negative values, allow user-set values above normal range
        sensor.currentValue = Math.max(0, sensor.currentValue);
      } else {
        // In scenario modes: normal noise for drama
        const noiseFraction = ((seed % 100) - 50) / 500;
        const noise = noiseFraction * range;
        const baseline = sensor.driftBaseline ?? sensor.normalRange.min + range * 0.5;
        const reversion = (baseline - sensor.currentValue) * 0.05;
        sensor.currentValue = Math.max(0, sensor.currentValue + noise + reversion);
        sensor.currentValue = Math.round(sensor.currentValue * 100) / 100;
      }
    }
  }

  /**
   * Runs the Digital Twin physics step to apply realistic gas dispersion,
   * heat transfer, and pressure dynamics to sensor readings.
   */
  _runDigitalTwin() {
    if (!this.digitalTwin) return;
    // In normal mode, skip physics blending to keep sensors rock-stable
    if (this.scenario?.id === 'normal') return;
    try {
      // Build current state map from sensors
      const currentState = {};
      for (const s of this.sensors) {
        currentState[s.id] = s.currentValue;
      }

      // Get environmental data from EnvironmentalAgent blackboard or defaults
      const envData = {
        windSpeed: 3 + Math.sin(this.simulationClock * 0.01) * 2,
        windDirection: (this.simulationClock * 0.5) % 360,
        ambientTemp: 30 + Math.sin(this.simulationClock * 0.005) * 5,
      };

      const twinResult = this.digitalTwin.tick(currentState, envData, this.simulationClock);

      // Blend twin predictions with sensor readings (10% physics influence)
      // This gives physically-realistic correlations without overriding scenario events
      if (twinResult) {
        const BLEND = 0.1;
        for (const sensor of this.sensors) {
          const gasVal = twinResult.gasConcentrations?.[sensor.zoneId];
          const tempVal = twinResult.temperatures?.[sensor.zoneId];
          const presVal = twinResult.pressures?.[sensor.zoneId];

          if (sensor.type === 'gas' && gasVal != null) {
            sensor.currentValue += gasVal * BLEND;
          } else if (sensor.type === 'temperature' && tempVal != null) {
            sensor.currentValue += (tempVal - sensor.currentValue) * BLEND;
          } else if (sensor.type === 'pressure' && presVal != null) {
            sensor.currentValue += (presVal - sensor.currentValue) * BLEND * 0.5;
          }
          sensor.currentValue = Math.max(0, Math.round(sensor.currentValue * 100) / 100);
        }
      }
    } catch (e) {
      // Silently continue — twin is enhancement, not critical
    }
  }

  /**
   * Updates zone colors based on the worst sensor risk in each zone.
   */
  _updateZoneColors(result) {
    const STATUS_COLORS = {
      normal: '#10B981',
      elevated: '#F59E0B',
      warning: '#F97316',
      critical: '#EF4444',
      emergency: '#7F1D1D',
    };

    for (const zone of this.zones) {
      zone.color = STATUS_COLORS.normal;
    }

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
   */
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
