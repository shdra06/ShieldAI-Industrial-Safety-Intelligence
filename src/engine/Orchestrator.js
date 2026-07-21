// ============================================================================
// ShieldAI — Orchestrator (v2)
// Coordinates all 18 agents in a 3-tier hierarchy:
//   Tier 1 (Specialists) → Tier 2 (Coordinators) → Tier 3 (Meta)
// Aggregates risk factors, computes compound risk, runs the MessageBus
// and AgentBlackboard, and tracks per-agent performance profiling.
// ============================================================================

import { SCADAAgent } from './agents/SCADAAgent.js';
import { VisionAgent } from './agents/VisionAgent.js';
import { PermitAgent } from './agents/PermitAgent.js';
import { PatternAgent } from './agents/PatternAgent.js';
import { ComplianceAgent } from './agents/ComplianceAgent.js';
import { EmergencyAgent } from './agents/EmergencyAgent.js';
import { EnvironmentalAgent } from './agents/EnvironmentalAgent.js';
import { FatigueAgent } from './agents/FatigueAgent.js';
import { MaintenanceAgent } from './agents/MaintenanceAgent.js';
import { CommunicationAgent } from './agents/CommunicationAgent.js';
import { AuditAgent } from './agents/AuditAgent.js';
import { EvacuationAgent } from './agents/EvacuationAgent.js';
import { TrainingAgent } from './agents/TrainingAgent.js';
import { CascadeAgent } from './agents/CascadeAgent.js';
import { PredictiveAgent } from './agents/PredictiveAgent.js';
import { ResourceAgent } from './agents/ResourceAgent.js';
import { SupervisorAgent } from './agents/SupervisorAgent.js';
import { MetaAgent } from './agents/MetaAgent.js';

import { MessageBus } from './MessageBus.js';
import { AgentBlackboard } from './AgentBlackboard.js';

// ── AI Layer ─────────────────────────────────────────────────────────────────
import { AIManager } from './ai/AIManager.js';
import { GeminiAgent } from './ai/GeminiAgent.js';
import { NeuralAnomalyDetector } from './ai/NeuralAnomalyDetector.js';
import { RiskClassifier } from './ai/RiskClassifier.js';
import { DataPreprocessor } from './ai/DataPreprocessor.js';

// ── HuggingFace Transformers.js (browser-local neural models) ─────────────
import { HuggingFaceManager } from './ai/HuggingFaceManager.js';
import { NERExtractor } from './ai/NERExtractor.js';
import { SafetyClassifier } from './ai/SafetyClassifier.js';

// ── ML Layer ─────────────────────────────────────────────────────────────────
import { IsolationForest } from './ml/IsolationForest.js';
import { ExplainabilityEngine } from './ml/ExplainabilityEngine.js';

import {
  calculateCompoundRisk,
  calculateSingleSensorRisk,
  getRiskLabel,
} from '../utils/riskCalculator.js';
import { HISTORICAL_INCIDENTS } from '../data/incidents.js';

/**
 * System status tiers, determined by risk score.
 */
const STATUS_TIERS = [
  { max: 0.25, status: 'normal' },
  { max: 0.50, status: 'elevated' },
  { max: 0.75, status: 'warning' },
  { max: 0.90, status: 'critical' },
  { max: 1.00, status: 'emergency' },
];

export class Orchestrator {
  constructor() {
    // ── Infrastructure ────────────────────────────────────────────────
    this.messageBus = new MessageBus();
    this.blackboard = new AgentBlackboard();

    // ── Tier 1: Specialist Agents (13) ───────────────────────────────
    this.scadaAgent = new SCADAAgent();
    this.visionAgent = new VisionAgent();
    this.permitAgent = new PermitAgent();
    this.patternAgent = new PatternAgent();
    this.complianceAgent = new ComplianceAgent();
    this.emergencyAgent = new EmergencyAgent();
    this.environmentalAgent = new EnvironmentalAgent();
    this.fatigueAgent = new FatigueAgent();
    this.maintenanceAgent = new MaintenanceAgent();
    this.communicationAgent = new CommunicationAgent();
    this.auditAgent = new AuditAgent();
    this.evacuationAgent = new EvacuationAgent();
    this.trainingAgent = new TrainingAgent();

    // ── Tier 2: Coordinator Agents (3) ───────────────────────────────
    this.cascadeAgent = new CascadeAgent();
    this.predictiveAgent = new PredictiveAgent();
    this.resourceAgent = new ResourceAgent();

    // ── Tier 3: Meta Agents (2) ──────────────────────────────────────
    this.supervisorAgent = new SupervisorAgent();
    this.metaAgent = new MetaAgent();

    /** @type {object[]} Previous sensor readings for trend computation. */
    this.previousSensors = [];

    // ── Compound Lead Time Tracking ──────────────────────────────────
    this.compoundAlertTick = null;
    this.singleSensorAlertTick = null;
    this.compoundLeadTime = 0;

    // ── Agent Performance Profiling ──────────────────────────────────
    this.agentProfiles = {};

    // ══════════════════════════════════════════════════════════════════
    // AI LAYER — Neural Networks + LLM Reasoning
    // ══════════════════════════════════════════════════════════════════

    // Data preprocessor for converting sensor arrays to neural network input
    this.dataPreprocessor = new DataPreprocessor();

    // LSTM Autoencoder — detects anomalies by reconstruction error
    this.neuralDetector = new NeuralAnomalyDetector({
      sequenceLength: 20,  // 20 timesteps = 40 seconds of data
      features: 6,         // CH4, CO, H2S, NH3, Pressure, Temperature
      latentDim: 8,
      lstmUnits: 32,
    });

    // Feedforward NN — classifies risk into 5 categories
    this.riskClassifier = new RiskClassifier({
      inputFeatures: 24,
      hiddenUnits: [64, 32],
    });

    // ══════════════════════════════════════════════════════════════════
    // ML LAYER — Isolation Forest + Explainability
    // ══════════════════════════════════════════════════════════════════

    // Isolation Forest — complementary anomaly detection (pure JS, no TF)
    this.isolationForest = new IsolationForest({
      numTrees: 100,
      sampleSize: 256,
      contamination: 0.1,
    });
    this.isolationForestTrained = false;
    this.isolationForestBuffer = []; // Collects feature vectors for training
    this.lastIsolationResult = null;

    // Explainability Engine — SHAP-like feature attributions + audit trail
    this.explainabilityEngine = new ExplainabilityEngine();
    this.lastExplanation = null;

    // ══════════════════════════════════════════════════════════════════
    // HUGGINGFACE TRANSFORMERS.JS — Browser-local neural models
    // ══════════════════════════════════════════════════════════════════

    // NER Extractor — BERT-based named entity extraction from safety reports
    this.nerExtractor = new NERExtractor();
    this.lastNERResult = null;

    // Safety Classifier — Zero-shot incident classification
    this.safetyClassifier = new SafetyClassifier();
    this.lastClassificationResult = null;

    // HuggingFace model loading state
    this.hfModelsLoading = false;
    this.hfModelsLoaded = false;

    // Gemini AI agent for the Supervisor (deep reasoning)
    this.supervisorAI = new GeminiAgent({
      agentName: 'SupervisorAI',
      callInterval: 10,  // Every 10 ticks (~20 seconds)
      systemPrompt: `You are ShieldAI Supervisor — an AI Safety Supervisor for an integrated steel plant (coke oven + blast furnace complex).
You receive sensor data, worker positions, permit status, and outputs from 16 specialist AI agents.
You also have access to an INDUSTRIAL DATABASE containing equipment registries, maintenance records, chemical inventories, personnel records, and past incident histories via RAG retrieval.

Your job is to:
1. Analyze the overall plant safety situation
2. CROSS-REFERENCE sensor readings with EQUIPMENT AGE and CONDITION — a medium reading on old/damaged equipment is MORE dangerous than a high reading on new equipment
3. Check if equipment inspection is OVERDUE — this significantly increases risk
4. Identify the TOP 3 risk drivers and explain WHY they are dangerous, referencing specific equipment IDs, ages, and known defects
5. Resolve any conflicts between agents (always err toward safety)
6. Classify the situation: Normal / Elevated / Developing Incident / Emergency
7. Provide actionable recommendations for the safety officer

CRITICAL RULE: Equipment context matters. Example:
- Gas at 25% LEL on a new sensor with recent calibration → Elevated
- Gas at 25% LEL on a 20-year-old gas holder with corroded seals and overdue inspection → EMERGENCY (because equipment failure is imminent)

Think step-by-step. Show your reasoning. Be specific about sensor values, equipment IDs, ages, and conditions.`,
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          situation: { type: 'STRING', enum: ['Normal', 'Elevated', 'Developing Incident', 'Emergency'] },
          riskScore: { type: 'NUMBER' },
          reasoning: { type: 'STRING' },
          topRisks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                source: { type: 'STRING' },
                severity: { type: 'STRING' },
                explanation: { type: 'STRING' },
              },
            },
          },
          recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
          confidence: { type: 'NUMBER' },
        },
      },
    });

    // Gemini AI agent for Cascade (causal reasoning)
    this.cascadeAI = new GeminiAgent({
      agentName: 'CascadeAI',
      callInterval: 10,
      systemPrompt: `You are a Cascade Failure Analyst for an industrial plant.
Given current sensor readings and zone status, analyze:
1. Are these individual problems or a connected chain?
2. What is the most likely ROOT CAUSE?
3. What will happen NEXT if no action is taken?
4. What zones are at risk of downstream effects?

Use your knowledge of industrial accident chains (domino effects).
Think step-by-step about cause and effect.`,
    });

    // Track tick count for neural training scheduling
    this.tickCount = 0;
    this.neuralTrainingScheduled = false;
    this.lastNeuralResult = null;
    this.lastClassifierResult = null;
    this.lastAIReasoning = null;

    // Register neural models with AIManager
    const aiManager = AIManager.getInstance();
    aiManager.registerModel('anomalyDetector', this.neuralDetector);
    aiManager.registerModel('riskClassifier', this.riskClassifier);
    // Expose AIManager globally for the UI settings panel
    if (typeof window !== 'undefined') {
      window.__aiManager = aiManager;
    }

    // ── Agent Registry ───────────────────────────────────────────────
    this.agentRegistry = this._buildRegistry();
  }

  /**
   * Builds the agent registry with tier classification.
   */
  _buildRegistry() {
    return {
      // Tier 1 — Specialists
      scada:         { agent: this.scadaAgent,         tier: 1, name: 'SCADA' },
      vision:        { agent: this.visionAgent,        tier: 1, name: 'Vision' },
      permit:        { agent: this.permitAgent,        tier: 1, name: 'Permit' },
      pattern:       { agent: this.patternAgent,       tier: 1, name: 'Pattern' },
      compliance:    { agent: this.complianceAgent,    tier: 1, name: 'Compliance' },
      emergency:     { agent: this.emergencyAgent,     tier: 1, name: 'Emergency' },
      environmental: { agent: this.environmentalAgent, tier: 1, name: 'Environmental' },
      fatigue:       { agent: this.fatigueAgent,       tier: 1, name: 'Fatigue' },
      maintenance:   { agent: this.maintenanceAgent,   tier: 1, name: 'Maintenance' },
      communication: { agent: this.communicationAgent, tier: 1, name: 'Communication' },
      audit:         { agent: this.auditAgent,         tier: 1, name: 'Audit' },
      evacuation:    { agent: this.evacuationAgent,    tier: 1, name: 'Evacuation' },
      training:      { agent: this.trainingAgent,      tier: 1, name: 'Training' },
      // Tier 2 — Coordinators
      cascade:       { agent: this.cascadeAgent,       tier: 2, name: 'Cascade' },
      predictive:    { agent: this.predictiveAgent,    tier: 2, name: 'Predictive' },
      resource:      { agent: this.resourceAgent,      tier: 2, name: 'Resource' },
      // Tier 3 — Meta
      supervisor:    { agent: this.supervisorAgent,    tier: 3, name: 'Supervisor' },
      meta:          { agent: this.metaAgent,          tier: 3, name: 'Meta' },
    };
  }

  /**
   * Returns the total number of agents.
   */
  getAgentCount() {
    return Object.keys(this.agentRegistry).length;
  }

  /**
   * Runs one evaluation tick across all agents in tier order.
   *
   * Execution order:
   *   1. Tier 1 Specialist agents (13 agents)
   *   2. Tier 2 Coordinator agents (3 agents — receive Tier 1 results)
   *   3. Tier 3 Meta agents (2 agents — receive all results)
   *
   * @param {object} state - Full simulation state
   * @returns {object} Full result with risk scores, messages, agent results
   */
  tick(state) {
    const tickStart = performance.now();
    const { sensors, permits, workers, zones, temporalRisk, simulationClock } = state;
    const allMessages = [];
    const allRiskFactors = [];
    const agentResults = {};
    this.tickCount++;

    // ══════════════════════════════════════════════════════════════════
    // AI LAYER: NEURAL NETWORK INFERENCE (every tick — ~5ms)
    // ══════════════════════════════════════════════════════════════════

    // Feed sensor data to the LSTM autoencoder
    const sensorFeatures = this.dataPreprocessor.extractSensorFeatures(sensors);
    this.neuralDetector.addReading(sensorFeatures);

    // Run anomaly detection if model is trained
    if (this.neuralDetector.isTrained) {
      this.lastNeuralResult = this.neuralDetector.detect();
    }

    // Feed data to risk classifier
    if (this.riskClassifier.isTrained) {
      const classifierFeatures = this.riskClassifier.extractFeatures(state);
      this.lastClassifierResult = this.riskClassifier.classify(classifierFeatures);
    }

    // Auto-collect training data (first 100 ticks of "normal" operation)
    if (this.tickCount <= 100 && !this.neuralDetector.isTrained) {
      // Also collect labeled samples for the risk classifier
      const riskFeatures = this.riskClassifier.extractFeatures(state);
      const label = this.riskClassifier.autoLabel(state.riskScore || 0);
      this.riskClassifier.addSample(riskFeatures, label);

      // Collect features for Isolation Forest training
      this.isolationForestBuffer.push([...sensorFeatures]);
    }

    // Auto-train neural models after collecting enough data
    if (this.tickCount === 100 && !this.neuralTrainingScheduled) {
      this.neuralTrainingScheduled = true;
      this._trainNeuralModels();
    }

    // ══════════════════════════════════════════════════════════════════
    // ML LAYER: ISOLATION FOREST (complementary anomaly detection)
    // ══════════════════════════════════════════════════════════════════

    if (this.isolationForestTrained) {
      // Run Isolation Forest prediction every tick
      try {
        this.lastIsolationResult = this.isolationForest.predict(sensorFeatures);
      } catch (e) {
        // Silently continue if prediction fails
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // HUGGINGFACE: Lazy-load models + NER/Classification pipeline
    // ══════════════════════════════════════════════════════════════════

    // Fire-and-forget: start loading HF models after tick 20
    if (this.tickCount === 20 && !this.hfModelsLoading && !this.hfModelsLoaded) {
      this.hfModelsLoading = true;
      this._loadHuggingFaceModels().catch(() => {});
    }

    // Run NER + zero-shot classification every 10 ticks on critical messages
    if (this.hfModelsLoaded && this.tickCount % 10 === 0) {
      const criticalMessages = allMessages.filter(
        m => m.severity === 'critical' || m.severity === 'emergency'
      );
      if (criticalMessages.length > 0) {
        // Fire-and-forget async NER + classification
        this._runHuggingFaceAnalysis(criticalMessages).catch(() => {});
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // TIER 1: SPECIALIST AGENTS
    // ══════════════════════════════════════════════════════════════════

    // ── 1. SCADA Agent ─────────────────────────────────────────────
    const scadaResult = this._runAgent('scada', () =>
      this.scadaAgent.evaluate(sensors, this.previousSensors)
    );
    agentResults.scada = scadaResult;
    allMessages.push(...(scadaResult.messages || []));
    allRiskFactors.push(...(scadaResult.riskFactors || []));
    this.previousSensors = sensors.map((s) => ({ ...s }));

    // ── 2. Vision Agent ────────────────────────────────────────────
    const visionResult = this._runAgent('vision', () =>
      this.visionAgent.evaluate(workers, zones, permits)
    );
    agentResults.vision = visionResult;
    allMessages.push(...(visionResult.messages || []));
    allRiskFactors.push(...(visionResult.riskFactors || []));

    // ── 3. Permit Agent ────────────────────────────────────────────
    const permitResult = this._runAgent('permit', () =>
      this.permitAgent.evaluate(permits, sensors, zones, temporalRisk || null)
    );
    agentResults.permit = permitResult;
    allMessages.push(...(permitResult.messages || []));
    allRiskFactors.push(...(permitResult.riskFactors || []));

    // ── 4. Pattern Agent ───────────────────────────────────────────
    const currentConditions = {
      keywords: this._extractConditionKeywords(scadaResult, permitResult),
      activeSensors: sensors,
      activePermits: permits.filter((p) => p.status === 'active'),
      zones,
      driftAlerts: scadaResult.driftAlerts || [],
    };
    const patternResult = this._runAgent('pattern', () =>
      this.patternAgent.evaluate(currentConditions, HISTORICAL_INCIDENTS)
    );
    agentResults.pattern = patternResult;
    allMessages.push(...(patternResult.messages || []));
    allRiskFactors.push(...(patternResult.riskFactors || []));

    // ── 5. Compliance Agent ────────────────────────────────────────
    const complianceResult = this._runAgent('compliance', () =>
      this.complianceAgent.evaluate(sensors, permits, workers, zones)
    );
    agentResults.compliance = complianceResult;
    allMessages.push(...(complianceResult.messages || []));
    allRiskFactors.push(...(complianceResult.riskFactors || []));

    // ── 6. Environmental Agent ─────────────────────────────────────
    const environmentalResult = this._runAgent('environmental', () =>
      this.environmentalAgent.evaluate(sensors, zones, simulationClock || 0)
    );
    agentResults.environmental = environmentalResult;
    allMessages.push(...(environmentalResult.messages || []));
    allRiskFactors.push(...(environmentalResult.riskFactors || []));

    // ── 7. Fatigue Agent ───────────────────────────────────────────
    const fatigueResult = this._runAgent('fatigue', () =>
      this.fatigueAgent.evaluate(workers, zones, temporalRisk || null, simulationClock || 0)
    );
    agentResults.fatigue = fatigueResult;
    allMessages.push(...(fatigueResult.messages || []));
    allRiskFactors.push(...(fatigueResult.riskFactors || []));

    // ── 8. Maintenance Agent ───────────────────────────────────────
    const maintenanceResult = this._runAgent('maintenance', () =>
      this.maintenanceAgent.evaluate(sensors, simulationClock || 0)
    );
    agentResults.maintenance = maintenanceResult;
    allMessages.push(...(maintenanceResult.messages || []));
    allRiskFactors.push(...(maintenanceResult.riskFactors || []));

    // ── 9. Training Agent ──────────────────────────────────────────
    const trainingResult = this._runAgent('training', () =>
      this.trainingAgent.evaluate(
        workers, zones, permits,
        patternResult.matchedIncidents || [],
        simulationClock || 0
      )
    );
    agentResults.training = trainingResult;
    allMessages.push(...(trainingResult.messages || []));
    allRiskFactors.push(...(trainingResult.riskFactors || []));

    // ══════════════════════════════════════════════════════════════════
    // COMPUTE INTERMEDIATE RISK (for agents that need it)
    // ══════════════════════════════════════════════════════════════════
    const intermediateRisk = calculateCompoundRisk(allRiskFactors);
    const singleSensorRisk = calculateSingleSensorRisk(allRiskFactors);

    // ── 10. Emergency Agent ────────────────────────────────────────
    const emergencyResult = this._runAgent('emergency', () =>
      this.emergencyAgent.evaluate(intermediateRisk, {
        ...state,
        riskScore: intermediateRisk,
        status: this._getStatus(intermediateRisk),
      })
    );
    agentResults.emergency = emergencyResult;
    allMessages.push(...(emergencyResult.messages || []));
    allRiskFactors.push(...(emergencyResult.riskFactors || []));

    // ── 11. Evacuation Agent ───────────────────────────────────────
    const evacuationResult = this._runAgent('evacuation', () =>
      this.evacuationAgent.evaluate(workers, zones, sensors, intermediateRisk)
    );
    agentResults.evacuation = evacuationResult;
    allMessages.push(...(evacuationResult.messages || []));
    allRiskFactors.push(...(evacuationResult.riskFactors || []));

    // ── 12. Communication Agent (processes all messages so far) ────
    const communicationResult = this._runAgent('communication', () =>
      this.communicationAgent.evaluate([...allMessages], workers, simulationClock || 0)
    );
    agentResults.communication = communicationResult;
    // Communication agent produces enriched messages but don't double-add
    allRiskFactors.push(...(communicationResult.riskFactors || []));

    // ── 13. Audit Agent ────────────────────────────────────────────
    const auditResult = this._runAgent('audit', () =>
      this.auditAgent.evaluate(
        sensors, permits, workers, zones,
        complianceResult.violations || [],
        simulationClock || 0
      )
    );
    agentResults.audit = auditResult;
    allMessages.push(...(auditResult.messages || []));
    allRiskFactors.push(...(auditResult.riskFactors || []));

    // ══════════════════════════════════════════════════════════════════
    // TIER 2: COORDINATOR AGENTS
    // ══════════════════════════════════════════════════════════════════

    // ── 14. Cascade Agent ──────────────────────────────────────────
    const cascadeResult = this._runAgent('cascade', () =>
      this.cascadeAgent.evaluate(agentResults, sensors, zones)
    );
    agentResults.cascade = cascadeResult;
    allMessages.push(...(cascadeResult.messages || []));
    allRiskFactors.push(...(cascadeResult.riskFactors || []));

    // ── 15. Predictive Agent ───────────────────────────────────────
    const sensorHistory = this.scadaAgent.readingHistory || new Map();
    const predictiveResult = this._runAgent('predictive', () =>
      this.predictiveAgent.evaluate(
        sensors, intermediateRisk, sensorHistory, simulationClock || 0
      )
    );
    agentResults.predictive = predictiveResult;
    allMessages.push(...(predictiveResult.messages || []));
    allRiskFactors.push(...(predictiveResult.riskFactors || []));

    // ── 16. Resource Agent ─────────────────────────────────────────
    const resourceResult = this._runAgent('resource', () =>
      this.resourceAgent.evaluate(workers, zones, sensors, intermediateRisk, permits)
    );
    agentResults.resource = resourceResult;
    allMessages.push(...(resourceResult.messages || []));
    allRiskFactors.push(...(resourceResult.riskFactors || []));

    // ══════════════════════════════════════════════════════════════════
    // FINAL RISK CALCULATION
    // ══════════════════════════════════════════════════════════════════
    const riskScore = calculateCompoundRisk(allRiskFactors);
    const riskLabel = getRiskLabel(riskScore);
    const status = this._getStatus(riskScore);

    // Track compound lead time
    this._trackCompoundLeadTime(riskScore, singleSensorRisk, simulationClock);

    // ══════════════════════════════════════════════════════════════════
    // EXPLAINABILITY: SHAP-like feature attributions + audit trail
    // ══════════════════════════════════════════════════════════════════
    if (this.tickCount % 5 === 0 && allRiskFactors.length > 0) {
      try {
        // Convert risk factors into explainability features
        const features = allRiskFactors
          .filter(rf => rf.value > 0)
          .slice(0, 20) // Top 20 risk factors
          .map(rf => ({
            name: rf.source || rf.agent || 'Unknown',
            value: rf.rawValue ?? rf.value,
            weight: rf.weight || 1,
            contribution: rf.value * (rf.weight || 1),
          }));

        if (features.length > 0) {
          this.lastExplanation = this.explainabilityEngine.explain(riskScore, features);
        }
      } catch (e) {
        // Explainability is optional — don't block
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // TIER 3: META AGENTS
    // ══════════════════════════════════════════════════════════════════

    // ── 17. Supervisor Agent ───────────────────────────────────────
    const supervisorResult = this._runAgent('supervisor', () =>
      this.supervisorAgent.evaluate(agentResults, riskScore, status)
    );
    agentResults.supervisor = supervisorResult;
    allMessages.push(...(supervisorResult.messages || []));

    // ── AI Reasoning (Supervisor + Cascade) — async, non-blocking ──
    // Fire-and-forget: runs every 10 ticks, result cached for UI
    if (this.tickCount % 10 === 0) {
      const aiContext = {
        sensors: sensors.map(s => ({
          id: s.id, type: s.type, zone: s.zoneId,
          currentValue: s.currentValue, unit: s.unit,
          warningThreshold: s.warningThreshold,
          criticalThreshold: s.criticalThreshold,
        })),
        riskScore,
        alerts: allMessages.filter(m => m.severity === 'critical' || m.severity === 'emergency'),
        agentResults: Object.fromEntries(
          Object.entries(agentResults).map(([k, v]) => [
            k, { messages: (v.messages || []).slice(0, 5), riskFactors: v.riskFactors }
          ])
        ),
        neuralAnomalies: this.lastNeuralResult,
        riskClassification: this.lastClassifierResult,
        workers: workers.map(w => ({ id: w.id, name: w.name, zone: w.zoneId, ppe: w.ppe })),
        permits: permits.map(p => ({ type: p.type, status: p.status, zone: p.zoneId })),
      };
      // Non-blocking async call — result stored in this.lastAIReasoning
      this.supervisorAI.analyze(aiContext).then(result => {
        if (result?.success) this.lastAIReasoning = result;
      }).catch(() => {});
    }

    // ── 18. Meta Agent ─────────────────────────────────────────────
    const tickDuration = performance.now() - tickStart;
    const metaResult = this._runAgent('meta', () =>
      this.metaAgent.evaluate(agentResults, allMessages, tickDuration, simulationClock || 0)
    );
    agentResults.meta = metaResult;
    allMessages.push(...(metaResult.messages || []));

    // ══════════════════════════════════════════════════════════════════
    // SAFETY SANDWICH — Deterministic safety layer (non-overridable)
    // ══════════════════════════════════════════════════════════════════
    const safetySandwich = this._applySafetySandwich(state, riskScore, allMessages);
    const finalRiskScore = safetySandwich.deterministicOverride
      ? safetySandwich.finalRisk
      : riskScore;

    // Add safety interlock override messages
    for (const override of safetySandwich.overrides) {
      allMessages.push({
        agent: 'SafetySandwich',
        severity: 'emergency',
        text: override,
        timestamp: new Date(),
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // FLUSH MESSAGE BUS & PURGE BLACKBOARD
    // ══════════════════════════════════════════════════════════════════
    this.messageBus.flush();
    this.blackboard.purgeExpired();

    // ── Sort messages by severity ────────────────────────────────────
    const severityOrder = { emergency: 0, critical: 1, warning: 2, info: 3 };
    allMessages.sort(
      (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
    );

    // Recompute status/label with final risk (may be overridden by safety sandwich)
    const finalStatus = this._getStatus(finalRiskScore);
    const finalRiskLabel = getRiskLabel(finalRiskScore);

    return {
      riskScore: finalRiskScore,
      singleSensorRisk,
      status: finalStatus,
      riskLabel: finalRiskLabel,
      messages: allMessages,
      agentResults,
      emergencyProtocol: emergencyResult.protocol || null,
      incidentReport: emergencyResult.incidentReport || null,
      violations: complianceResult.violations || [],
      matchedIncidents: patternResult.matchedIncidents || [],
      driftAlerts: scadaResult.driftAlerts || [],
      compoundLeadTime: this.compoundLeadTime,

      // ── New agent outputs ──────────────────────────────────────────
      anomalies: scadaResult.anomalies || [],
      timeToBreachEstimates: scadaResult.timeToBreachEstimates || [],
      sensorHealth: scadaResult.sensorHealth || [],
      behaviorAlerts: visionResult.behaviorAlerts || [],
      heatMap: visionResult.heatMap || {},
      permitRiskScores: permitResult.permitRiskScores || [],
      nearMisses: patternResult.nearMisses || [],
      complianceScores: complianceResult.complianceScores || {},
      stagingActions: emergencyResult.stagingActions || [],
      protocolType: emergencyResult.protocolType || null,
      resourceStatus: emergencyResult.resourceStatus || {},
      cascadeChains: cascadeResult.cascadeChains || [],
      crossZoneCorrelations: cascadeResult.crossZoneCorrelations || [],
      predictions: predictiveResult.predictions || [],
      recommendations: resourceResult.recommendations || [],
      coverageMap: resourceResult.coverageMap || {},
      situationClass: supervisorResult.situationClass || 'Normal Operations',
      agentAgreement: supervisorResult.agentAgreement || 1,
      escalationLevel: supervisorResult.escalationLevel || 0,
      agentHealth: metaResult.agentHealth || {},
      systemHealth: metaResult.systemHealth || {},

      // ── Agent performance profiling ────────────────────────────────
      agentProfiles: { ...this.agentProfiles },
      agentCount: this.getAgentCount(),
      tierBreakdown: { tier1: 13, tier2: 3, tier3: 2 },

      // ── Infrastructure stats ───────────────────────────────────────
      messageBusStats: this.messageBus.getStats(),
      blackboardStats: this.blackboard.getStats(),

      // ── Safety Sandwich results ──────────────────────────────────────
      safetySandwich,

      // ── AI Layer results ────────────────────────────────────────────
      neuralAnomaly: this.lastNeuralResult || { isAnomaly: false, anomalyScore: 0, status: 'collecting_data' },
      riskClassification: this.lastClassifierResult || { class: 'Unknown', confidence: 0, status: 'not_trained' },
      aiReasoning: this.lastAIReasoning?.data || null,
      aiReasoningSource: this.lastAIReasoning?.source || 'none',
      aiStatus: AIManager.getInstance().getStatus(),
      neuralDetectorStatus: this.neuralDetector.getStatus(),
      riskClassifierStatus: this.riskClassifier.getStatus(),

      // ── Isolation Forest results ───────────────────────────────────────
      isolationForestResult: this.lastIsolationResult || { anomalyScore: 0, isAnomaly: false, status: 'collecting_data' },
      isolationForestTrained: this.isolationForestTrained,

      // ── Explainability results ────────────────────────────────────────
      explanation: this.lastExplanation || null,

      // ── HuggingFace Transformers.js results ───────────────────────────
      hfStatus: HuggingFaceManager.getInstance().getStatus(),
      hfModelsLoaded: this.hfModelsLoaded,
      nerResult: this.lastNERResult || null,
      safetyClassification: this.lastClassificationResult || null,
    };
  }

  /**
   * Auto-train neural models after collecting enough data.
   * Runs asynchronously to avoid blocking the tick pipeline.
   */
  async _trainNeuralModels() {
    console.log('[Orchestrator] Auto-training neural models...');
    
    // Train LSTM Autoencoder
    const anomalyResult = await this.neuralDetector.train({
      epochs: 20,
      batchSize: 16,
      onEpochEnd: (epoch, logs) => {
        console.log(`  [Anomaly Detector] Epoch ${epoch + 1}/20, Loss: ${logs.loss.toFixed(6)}`);
      },
    });
    console.log('[Orchestrator] Anomaly Detector training:', anomalyResult.success ? 'SUCCESS' : anomalyResult.error);

    // Train Risk Classifier
    const classifierResult = await this.riskClassifier.train({
      epochs: 30,
      batchSize: 16,
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 10 === 0) {
          console.log(`  [Risk Classifier] Epoch ${epoch + 1}/30, Acc: ${(logs.acc * 100).toFixed(1)}%`);
        }
      },
    });
    console.log('[Orchestrator] Risk Classifier training:', classifierResult.success ? 'SUCCESS' : classifierResult.error);

    // Train Isolation Forest (synchronous — pure JS, fast)
    if (this.isolationForestBuffer.length >= 50) {
      try {
        console.log(`[Orchestrator] Training Isolation Forest on ${this.isolationForestBuffer.length} samples...`);
        this.isolationForest.fit(this.isolationForestBuffer);
        this.isolationForestTrained = true;
        console.log('[Orchestrator] Isolation Forest training: SUCCESS');
      } catch (e) {
        console.error('[Orchestrator] Isolation Forest training failed:', e.message);
      }
    }
  }

  /**
   * Lazy-load HuggingFace Transformers.js models in the background.
   * Downloads ~322MB of models (cached in browser after first load).
   * Called once after tick 20 to avoid startup blocking.
   * @private
   */
  async _loadHuggingFaceModels() {
    console.log('[Orchestrator] Starting HuggingFace model downloads...');
    const hf = HuggingFaceManager.getInstance();

    try {
      // Load embeddings model first (smallest, needed for neural RAG)
      const embResult = await hf.loadModel('embeddings');
      if (embResult.success) {
        console.log('[Orchestrator] Embeddings model loaded — building neural RAG index...');
        // Build neural embeddings for the RAG knowledge base
        // Import the RAG singleton from GeminiAgent
        try {
          const { RAGEngine } = await import('./ai/RAGEngine.js');
          const { SAFETY_KNOWLEDGE_BASE } = await import('../data/rag/safety_knowledge_base.js');
          // Get or create RAG instance
          const rag = new RAGEngine();
          rag.addDocuments(SAFETY_KNOWLEDGE_BASE);
          rag.buildIndex();
          await rag.buildNeuralIndex(
            (text) => hf.embed(text),
            (current, total) => {
              if (current % 20 === 0) {
                console.log(`  [RAG Neural] Embedding ${current}/${total}...`);
              }
            }
          );
          console.log('[Orchestrator] Neural RAG index built successfully');
        } catch (e) {
          console.warn('[Orchestrator] Neural RAG index build failed:', e.message);
        }
      }

      // Load NER model
      const nerResult = await hf.loadModel('ner');
      if (nerResult.success) {
        this.nerExtractor.ready = true;
        console.log('[Orchestrator] NER model loaded');
      }

      // Load zero-shot classifier
      const zsResult = await hf.loadModel('zeroShot');
      if (zsResult.success) {
        this.safetyClassifier.ready = true;
        console.log('[Orchestrator] Zero-shot classifier loaded');
      }

      this.hfModelsLoaded = true;
      this.hfModelsLoading = false;
      console.log('[Orchestrator] All HuggingFace models loaded \u2713');
    } catch (e) {
      console.error('[Orchestrator] HuggingFace model loading failed:', e.message);
      this.hfModelsLoading = false;
    }
  }

  /**
   * Run NER + zero-shot classification on critical agent messages.
   * Called every 10 ticks when models are loaded.
   * @param {object[]} messages - Critical/emergency messages from agents
   * @private
   */
  async _runHuggingFaceAnalysis(messages) {
    const hf = HuggingFaceManager.getInstance();

    // NER extraction
    if (hf.isModelReady('ner')) {
      try {
        this.lastNERResult = await this.nerExtractor.extractFromMessages(messages);
      } catch (e) {
        // Non-blocking
      }
    }

    // Zero-shot classification
    if (hf.isModelReady('zeroShot')) {
      try {
        this.lastClassificationResult = await this.safetyClassifier.classifyAgentMessages(messages);
      } catch (e) {
        // Non-blocking
      }
    }
  }

  // ── Agent Execution Helper ──────────────────────────────────────────────

  /**
   * Runs an agent with error handling and performance profiling.
   * @param {string} agentKey - Registry key
   * @param {function} fn     - Evaluation function to execute
   * @returns {object} Agent result (or empty result on error)
   */
  _runAgent(agentKey, fn) {
    const start = performance.now();
    let result;

    try {
      result = fn();
    } catch (err) {
      console.error(`[Orchestrator] Agent "${agentKey}" error:`, err);
      result = { messages: [], riskFactors: [] };
    }

    const duration = performance.now() - start;

    // Update profiling
    if (!this.agentProfiles[agentKey]) {
      this.agentProfiles[agentKey] = {
        totalRuns: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastDuration: 0,
        errors: 0,
        messageCount: 0,
      };
    }
    const profile = this.agentProfiles[agentKey];
    profile.totalRuns++;
    profile.totalDuration += duration;
    profile.avgDuration = profile.totalDuration / profile.totalRuns;
    profile.lastDuration = duration;
    profile.messageCount = (result.messages || []).length;

    return result;
  }

  // ── Deterministic Safety Sandwich ─────────────────────────────────────────

  /**
   * Applies deterministic safety rules that CANNOT be overridden by AI agents.
   * These are hard-coded safety interlocks equivalent to safety PLC logic.
   *
   * @param {object} state        - Full simulation state.
   * @param {number} aiRiskScore  - Risk score computed by AI agents.
   * @param {object[]} allMessages - All messages generated this tick.
   * @returns {object} Safety sandwich result with overrides and forced actions.
   */
  _applySafetySandwich(state, aiRiskScore, allMessages) {
    const overrides = [];
    let finalRisk = aiRiskScore;
    let forcedActions = [];

    // Rule 1: Any gas sensor > critical threshold → MANDATORY evacuation
    const criticalGas = state.sensors?.filter(s =>
      ['CH4', 'CO', 'H2S', 'NH3'].includes(s.type) &&
      s.currentValue > s.criticalThreshold
    ) || [];
    if (criticalGas.length > 0) {
      finalRisk = Math.max(finalRisk, 0.95);
      forcedActions.push({ type: 'MANDATORY_EVACUATION', trigger: 'gas_critical', sensors: criticalGas.map(s => s.id) });
      overrides.push(`Safety Interlock: Gas critical in ${criticalGas.map(s => s.zoneId).join(', ')} — MANDATORY evacuation (AI override disabled)`);
    }

    // Rule 2: H2S > 10 ppm → IMMEDIATE toxic alarm (IDLH threshold)
    const h2sCritical = state.sensors?.filter(s => s.type === 'H2S' && s.currentValue > 10) || [];
    if (h2sCritical.length > 0) {
      finalRisk = Math.max(finalRisk, 0.98);
      forcedActions.push({ type: 'TOXIC_ALARM', trigger: 'h2s_idlh', sensors: h2sCritical.map(s => s.id) });
      overrides.push(`Safety Interlock: H2S IDLH exceeded — TOXIC ALARM activated (non-overridable)`);
    }

    // Rule 3: LOTO not verified on active electrical permit → BLOCK
    const unsafeLoto = state.permits?.filter(p =>
      p.status === 'active' && p.lotoRequired && !p.lotoVerified
    ) || [];
    if (unsafeLoto.length > 0) {
      forcedActions.push({ type: 'PERMIT_BLOCK', trigger: 'loto_not_verified', permits: unsafeLoto.map(p => p.id) });
      overrides.push(`Safety Interlock: LOTO not verified for ${unsafeLoto.map(p => p.id).join(', ')} — work BLOCKED`);
    }

    // Rule 4: >3 critical sensors in same zone → zone lockdown
    const zoneAlerts = {};
    for (const s of state.sensors || []) {
      if (s.currentValue > s.criticalThreshold) {
        zoneAlerts[s.zoneId] = (zoneAlerts[s.zoneId] || 0) + 1;
      }
    }
    for (const [zone, count] of Object.entries(zoneAlerts)) {
      if (count >= 3) {
        finalRisk = Math.max(finalRisk, 0.90);
        forcedActions.push({ type: 'ZONE_LOCKDOWN', trigger: 'multi_critical', zone, sensorCount: count });
        overrides.push(`Safety Interlock: ${count} critical sensors in ${zone} — ZONE LOCKDOWN`);
      }
    }

    // Rule 5: Emergency declared → all active permits auto-suspended
    if (finalRisk > 0.90) {
      const activePermits = state.permits?.filter(p => p.status === 'active') || [];
      if (activePermits.length > 0) {
        forcedActions.push({ type: 'PERMIT_SUSPEND_ALL', trigger: 'emergency_protocol', permits: activePermits.map(p => p.id) });
        overrides.push(`Safety Interlock: Emergency state — ${activePermits.length} permits auto-suspended`);
      }
    }

    return {
      finalRisk,
      overrides,
      forcedActions,
      aiRiskScore,  // Original AI assessment for comparison
      safetySandwichActive: overrides.length > 0,
      deterministicOverride: finalRisk > aiRiskScore,
    };
  }

  // ── Utility Methods ───────────────────────────────────────────────────────

  /**
   * Gets system status from risk score.
   */
  _getStatus(riskScore) {
    for (const tier of STATUS_TIERS) {
      if (riskScore <= tier.max) return tier.status;
    }
    return 'emergency';
  }

  /**
   * Tracks compound lead time.
   */
  _trackCompoundLeadTime(compoundRisk, singleSensorRisk, simulationClock) {
    const tick = simulationClock || 0;

    if (compoundRisk > 0.5 && this.compoundAlertTick === null) {
      this.compoundAlertTick = tick;
    }
    if (singleSensorRisk > 0.5 && this.singleSensorAlertTick === null) {
      this.singleSensorAlertTick = tick;
    }

    if (this.compoundAlertTick !== null && this.singleSensorAlertTick !== null) {
      this.compoundLeadTime = Math.max(0, this.singleSensorAlertTick - this.compoundAlertTick);
    } else if (this.compoundAlertTick !== null && this.singleSensorAlertTick === null) {
      this.compoundLeadTime = tick - this.compoundAlertTick;
    }
  }

  /**
   * Extracts condition keywords from agent results for pattern matching.
   */
  _extractConditionKeywords(scadaResult, permitResult) {
    const keywords = [];

    for (const msg of (scadaResult.messages || [])) {
      if (msg.severity === 'critical' || msg.severity === 'warning') {
        if (msg.text.includes('CH4') || msg.text.includes('Methane')) keywords.push('CH4', 'methane');
        if (msg.text.includes('CO') || msg.text.includes('Carbon Monoxide')) keywords.push('CO', 'carbon monoxide');
        if (msg.text.includes('H2S') || msg.text.includes('Hydrogen Sulfide')) keywords.push('H2S', 'hydrogen sulfide');
        if (msg.text.includes('NH3') || msg.text.includes('Ammonia')) keywords.push('NH3', 'ammonia');
        if (msg.text.includes('Pressure')) keywords.push('pressure excursion', 'overpressure');
        if (msg.text.includes('Temperature')) keywords.push('high temperature');
        if (msg.text.includes('DRIFT') || msg.text.includes('drift')) keywords.push('drift', 'normalization');
        if (msg.text.includes('CASCADE') || msg.text.includes('cascade')) keywords.push('cascade', 'multi-system');
      }
    }

    for (const msg of (permitResult.messages || [])) {
      if (msg.text.includes('SIMOPS')) keywords.push('SIMOPS', 'concurrent permits');
      if (msg.text.includes('HOT WORK')) keywords.push('hot work', 'welding', 'sparks');
      if (msg.text.includes('LOTO')) keywords.push('LOTO', 'lockout tagout');
      if (msg.text.includes('EXPIRED')) keywords.push('expired permit');
      if (msg.text.includes('TEMPORAL')) keywords.push('shift change', 'handover');
    }

    return [...new Set(keywords)];
  }

  /**
   * Resets all agent state for a new scenario.
   */
  reset() {
    // Reset infrastructure
    this.messageBus.reset();
    this.blackboard.reset();

    // Reset all agents via registry (single pass — no double-init)
    for (const entry of Object.values(this.agentRegistry)) {
      if (typeof entry.agent.reset === 'function') {
        entry.agent.reset();
      }
    }

    // Re-construct agents that need completely fresh state
    this.scadaAgent = new SCADAAgent();
    this.visionAgent = new VisionAgent();
    this.permitAgent = new PermitAgent();
    this.patternAgent = new PatternAgent();
    this.complianceAgent = new ComplianceAgent();
    this.emergencyAgent = new EmergencyAgent();
    this.environmentalAgent = new EnvironmentalAgent();
    this.fatigueAgent = new FatigueAgent();
    this.maintenanceAgent = new MaintenanceAgent();
    this.communicationAgent = new CommunicationAgent();
    this.auditAgent = new AuditAgent();
    this.evacuationAgent = new EvacuationAgent();
    this.trainingAgent = new TrainingAgent();
    this.cascadeAgent = new CascadeAgent();
    this.predictiveAgent = new PredictiveAgent();
    this.resourceAgent = new ResourceAgent();
    this.supervisorAgent = new SupervisorAgent();
    this.metaAgent = new MetaAgent();

    // Rebuild registry
    this.agentRegistry = this._buildRegistry();

    // Reset tracking
    this.previousSensors = [];
    this.compoundAlertTick = null;
    this.singleSensorAlertTick = null;
    this.compoundLeadTime = 0;
    this.agentProfiles = {};

    // Reset ML models
    this.isolationForestTrained = false;
    this.isolationForestBuffer = [];
    this.lastIsolationResult = null;
    this.lastExplanation = null;
    this.neuralTrainingScheduled = false;
    this.tickCount = 0;
  }
}
