// ============================================================================
// ShieldAI — Orchestrator
// Coordinates all 6 agents, aggregates risk factors, computes compound risk,
// and determines overall system status.
// ============================================================================

import { SCADAAgent } from './agents/SCADAAgent.js';
import { VisionAgent } from './agents/VisionAgent.js';
import { PermitAgent } from './agents/PermitAgent.js';
import { PatternAgent } from './agents/PatternAgent.js';
import { ComplianceAgent } from './agents/ComplianceAgent.js';
import { EmergencyAgent } from './agents/EmergencyAgent.js';
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
    this.scadaAgent = new SCADAAgent();
    this.visionAgent = new VisionAgent();
    this.permitAgent = new PermitAgent();
    this.patternAgent = new PatternAgent();
    this.complianceAgent = new ComplianceAgent();
    this.emergencyAgent = new EmergencyAgent();

    /** @type {object[]} Previous sensor readings for trend computation. */
    this.previousSensors = [];
  }

  /**
   * Runs one evaluation tick across all agents.
   *
   * @param {object} state - Full simulation state:
   *   { sensors, permits, workers, zones }
   * @returns {{
   *   riskScore: number,
   *   singleSensorRisk: number,
   *   status: string,
   *   riskLabel: { label: string, color: string, level: number },
   *   messages: object[],
   *   agentResults: object,
   *   emergencyProtocol: object[]|null,
   *   violations: object[],
   *   matchedIncidents: object[],
   * }}
   */
  tick(state) {
    const { sensors, permits, workers, zones } = state;
    const allMessages = [];
    const allRiskFactors = [];

    // ── 1. SCADA Agent — Sensor monitoring & trends ──────────────────
    const scadaResult = this.scadaAgent.evaluate(sensors, this.previousSensors);
    allMessages.push(...scadaResult.messages);
    allRiskFactors.push(...scadaResult.riskFactors);

    // Save current readings for next tick's trend computation
    this.previousSensors = sensors.map((s) => ({ ...s }));

    // ── 2. Vision Agent — PPE & zone compliance ──────────────────────
    const visionResult = this.visionAgent.evaluate(workers, zones, permits);
    allMessages.push(...visionResult.messages);
    allRiskFactors.push(...visionResult.riskFactors);

    // ── 3. Permit Agent — Permit validity & conflicts ────────────────
    const permitResult = this.permitAgent.evaluate(permits, sensors, zones);
    allMessages.push(...permitResult.messages);
    allRiskFactors.push(...permitResult.riskFactors);

    // ── 4. Pattern Agent — Historical incident matching ──────────────
    const currentConditions = {
      keywords: this._extractConditionKeywords(scadaResult, permitResult),
      activeSensors: sensors,
      activePermits: permits.filter((p) => p.status === 'active'),
      zones,
    };
    const patternResult = this.patternAgent.evaluate(currentConditions, HISTORICAL_INCIDENTS);
    allMessages.push(...patternResult.messages);
    allRiskFactors.push(...patternResult.riskFactors);

    // ── 5. Compliance Agent — Regulatory checks ──────────────────────
    const complianceResult = this.complianceAgent.evaluate(sensors, permits, workers, zones);
    allMessages.push(...complianceResult.messages);
    allRiskFactors.push(...complianceResult.riskFactors);

    // ── 6. Compute Compound Risk ─────────────────────────────────────
    const riskScore = calculateCompoundRisk(allRiskFactors);
    const singleSensorRisk = calculateSingleSensorRisk(allRiskFactors);
    const riskLabel = getRiskLabel(riskScore);

    // Determine system status
    let status = 'normal';
    for (const tier of STATUS_TIERS) {
      if (riskScore <= tier.max) {
        status = tier.status;
        break;
      }
    }

    // ── 7. Emergency Agent — Protocol activation ─────────────────────
    const emergencyResult = this.emergencyAgent.evaluate(riskScore, {
      ...state,
      riskScore,
      status,
    });
    allMessages.push(...emergencyResult.messages);
    // Emergency risk factors are additive to reinforce the emergency state
    allRiskFactors.push(...emergencyResult.riskFactors);

    // ── Sort messages by severity (emergency first) ──────────────────
    const severityOrder = { emergency: 0, critical: 1, warning: 2, info: 3 };
    allMessages.sort(
      (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
    );

    return {
      riskScore,
      singleSensorRisk,
      status,
      riskLabel,
      messages: allMessages,
      agentResults: {
        scada: scadaResult,
        vision: visionResult,
        permit: permitResult,
        pattern: patternResult,
        compliance: complianceResult,
        emergency: emergencyResult,
      },
      emergencyProtocol: emergencyResult.protocol,
      violations: complianceResult.violations || [],
      matchedIncidents: patternResult.matchedIncidents || [],
    };
  }

  /**
   * Extracts condition keywords from agent results for pattern matching.
   * @param {object} scadaResult
   * @param {object} permitResult
   * @returns {string[]}
   */
  _extractConditionKeywords(scadaResult, permitResult) {
    const keywords = [];

    // Extract keywords from SCADA alerts
    for (const msg of scadaResult.messages) {
      if (msg.severity === 'critical' || msg.severity === 'warning') {
        // Extract sensor type from the message
        if (msg.text.includes('CH4') || msg.text.includes('Methane')) keywords.push('CH4', 'methane');
        if (msg.text.includes('CO') || msg.text.includes('Carbon Monoxide')) keywords.push('CO', 'carbon monoxide');
        if (msg.text.includes('H2S') || msg.text.includes('Hydrogen Sulfide')) keywords.push('H2S', 'hydrogen sulfide');
        if (msg.text.includes('NH3') || msg.text.includes('Ammonia')) keywords.push('NH3', 'ammonia');
        if (msg.text.includes('Pressure')) keywords.push('pressure excursion', 'overpressure');
        if (msg.text.includes('Temperature')) keywords.push('high temperature');
      }
    }

    // Extract keywords from permit issues
    for (const msg of permitResult.messages) {
      if (msg.text.includes('SIMOPS')) keywords.push('SIMOPS', 'concurrent permits');
      if (msg.text.includes('HOT WORK')) keywords.push('hot work', 'welding', 'sparks');
      if (msg.text.includes('LOTO')) keywords.push('LOTO', 'lockout tagout');
      if (msg.text.includes('EXPIRED')) keywords.push('expired permit');
    }

    return [...new Set(keywords)];
  }

  /**
   * Resets all agent state for a new scenario.
   */
  reset() {
    this.scadaAgent = new SCADAAgent();
    this.visionAgent = new VisionAgent();
    this.permitAgent = new PermitAgent();
    this.patternAgent = new PatternAgent();
    this.complianceAgent = new ComplianceAgent();
    this.emergencyAgent = new EmergencyAgent();
    this.previousSensors = [];
  }
}
