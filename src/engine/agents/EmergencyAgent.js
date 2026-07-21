// ============================================================================
// ShieldAI — Emergency Agent
// Generates and manages emergency protocol steps when risk exceeds 85%.
// Enhanced with structured incident report generation.
// ============================================================================

import { GeminiAgent } from '../ai/GeminiAgent.js';

export class EmergencyAgent {
  constructor() {
    this.name = 'Emergency';
    this.protocolActive = false;
    this.protocolSteps = [];
    this.activationTime = null;
    this.incidentReport = null;
    /** @type {string|null} Dynamically selected protocol type based on critical sensor analysis. */
    this.protocolType = null;
    /** @type {object} Simulated resource pool for emergency response. */
    this.resources = { fireTrucks: 2, medicalTeams: 2, hazmatUnits: 1 };
    /** @type {object} Tracks which resources are currently allocated. */
    this.allocatedResources = { fireTrucks: 0, medicalTeams: 0, hazmatUnits: 0 };

    this.geminiAgent = new GeminiAgent({
      agentName: 'EmergencyAI',
      callInterval: 5,  // More frequent during emergencies
      systemPrompt: `You are an Emergency Response AI for an industrial chemical plant.
When an emergency is declared, you generate:
1. Situation-specific emergency protocol (not generic — tailored to the exact sensors/zones/workers involved)
2. Evacuation priority order based on worker locations and gas dispersion direction
3. Resource deployment strategy (which teams go where first)
4. Communication script for the PA system
5. Regulatory notification checklist (DGMS/PESO/DISH/local authorities)

During pre-emergency (risk 65-85%), provide:
1. Precautionary actions to prevent escalation
2. Resource pre-positioning recommendations
3. Worker re-assignment suggestions

Be decisive. Lives depend on clear, actionable instructions.`,
    });
    this.lastAIAnalysis = null;
  }

  /**
   * Evaluates whether an emergency protocol should be activated.
   *
   * @param {number} riskScore    - Current compound risk score (0-1).
   * @param {object} currentState - Full simulation state.
   * @returns {{ messages: object[], riskFactors: object[], protocol: object[]|null, incidentReport: object|null }}
   */
  evaluate(riskScore, currentState) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();

    // ── Activate emergency protocol when risk > 85% ──────────────────
    if (riskScore > 0.85 && !this.protocolActive) {
      this.protocolActive = true;
      this.activationTime = now;
      this.protocolSteps = this._generateProtocol(currentState, now);
      this.incidentReport = this._generateIncidentReport(currentState, riskScore, now);

      messages.push({
        agent: 'Emergency',
        severity: 'emergency',
        text: `🚨 EMERGENCY PROTOCOL ACTIVATED — Compound risk score: ${(riskScore * 100).toFixed(1)}%. Initiating 8-step emergency response sequence. Incident report generated.`,
        timestamp: now,
      });

      riskFactors.push({
        sensorId: 'emergency-protocol-active',
        value: riskScore,
        weight: 1.0,
      });
    }

    // ── Progress protocol steps ──────────────────────────────────────
    if (this.protocolActive) {
      this._progressSteps(now, messages);
    }

    // ── De-escalation check ──────────────────────────────────────────
    if (this.protocolActive && riskScore < 0.5) {
      const timeSinceActivation = now.getTime() - this.activationTime.getTime();

      if (timeSinceActivation > 30000) {
        messages.push({
          agent: 'Emergency',
          severity: 'info',
          text: `Risk score has decreased to ${(riskScore * 100).toFixed(1)}%. Emergency protocol remains active pending final verification.`,
          timestamp: now,
        });
      }
    }

    // ── Warning zone (75-85%) ────────────────────────────────────────
    if (riskScore > 0.75 && riskScore <= 0.85 && !this.protocolActive) {
      messages.push({
        agent: 'Emergency',
        severity: 'critical',
        text: `⚠️ PRE-EMERGENCY: Risk score at ${(riskScore * 100).toFixed(1)}%. Emergency protocol will activate at 85%. Prepare for possible evacuation.`,
        timestamp: now,
      });
    }

    // ── Preemptive Staging (risk > 0.65) ─────────────────────────────
    const stagingActions = [];
    if (riskScore > 0.65 && !this.protocolActive) {
      // Determine which resources to stage based on sensor analysis
      const criticalSensors = (currentState.sensors || []).filter(
        s => s.currentValue >= s.warningThreshold,
      );
      const gasElevated = criticalSensors.some(s => ['CH4', 'H2S', 'NH3', 'CO'].includes(s.type));
      const tempElevated = criticalSensors.some(s => s.type === 'Temperature');
      const pressureElevated = criticalSensors.some(s => s.type === 'Pressure');

      if (gasElevated && this.resources.hazmatUnits - this.allocatedResources.hazmatUnits > 0) {
        stagingActions.push({
          resource: 'hazmatUnits',
          action: 'STAGE',
          reason: 'Elevated gas levels detected',
          location: 'Upwind staging area',
        });
        messages.push({
          agent: 'Emergency',
          severity: 'warning',
          text: `STAGING: Hazmat unit positioned at upwind staging area. Gas sensors elevated — risk score: ${(riskScore * 100).toFixed(1)}%.`,
          timestamp: now,
        });
      }

      if (tempElevated && this.resources.fireTrucks - this.allocatedResources.fireTrucks > 0) {
        stagingActions.push({
          resource: 'fireTrucks',
          action: 'STAGE',
          reason: 'Elevated temperature readings',
          location: 'Fire access road',
        });
        messages.push({
          agent: 'Emergency',
          severity: 'warning',
          text: `STAGING: Fire truck positioned at fire access road. Temperature elevated — risk score: ${(riskScore * 100).toFixed(1)}%.`,
          timestamp: now,
        });
      }

      if ((pressureElevated || riskScore > 0.75) && this.resources.medicalTeams - this.allocatedResources.medicalTeams > 0) {
        stagingActions.push({
          resource: 'medicalTeams',
          action: 'STAGE',
          reason: pressureElevated ? 'Pressure excursion risk' : 'Elevated compound risk',
          location: 'Medical staging point',
        });
        messages.push({
          agent: 'Emergency',
          severity: 'warning',
          text: `STAGING: Medical team on standby at medical staging point. Risk score: ${(riskScore * 100).toFixed(1)}%.`,
          timestamp: now,
        });
      }
    }

    // ── Dynamic Protocol Selection ───────────────────────────────────
    if (riskScore > 0.85 && !this.protocolType) {
      const sensors = currentState.sensors || [];
      const critSensors = sensors.filter(s => s.currentValue >= s.criticalThreshold);
      const hasCriticalGas = critSensors.some(s => ['CH4', 'H2S', 'CO'].includes(s.type));
      const hasCriticalNH3 = critSensors.some(s => s.type === 'NH3');
      const hasCriticalTemp = critSensors.some(s => s.type === 'Temperature');
      const hasCriticalPressure = critSensors.some(s => s.type === 'Pressure');

      if (hasCriticalNH3 || (hasCriticalGas && critSensors.filter(s => ['CH4', 'H2S', 'CO', 'NH3'].includes(s.type)).length > 2)) {
        this.protocolType = 'TOXIC_RELEASE';
      } else if (hasCriticalTemp) {
        this.protocolType = 'FIRE';
      } else if (hasCriticalPressure) {
        this.protocolType = 'STRUCTURAL';
      } else if (hasCriticalGas) {
        this.protocolType = 'GAS_LEAK';
      } else {
        this.protocolType = 'GAS_LEAK'; // Default
      }

      messages.push({
        agent: 'Emergency',
        severity: 'emergency',
        text: `PROTOCOL TYPE: ${this.protocolType} — Selected based on critical sensor analysis. ${critSensors.map(s => `${s.label}: ${s.currentValue}${s.unit}`).join(', ')}.`,
        timestamp: now,
      });
    }

    // ── Resource Allocation on Protocol Activation ───────────────────
    if (this.protocolActive && this.allocatedResources.fireTrucks === 0) {
      // Allocate all resources on first protocol activation tick
      this.allocatedResources = {
        fireTrucks: this.resources.fireTrucks,
        medicalTeams: this.resources.medicalTeams,
        hazmatUnits: this.resources.hazmatUnits,
      };
      messages.push({
        agent: 'Emergency',
        severity: 'emergency',
        text: `RESOURCES DEPLOYED: ${this.resources.fireTrucks} fire truck(s), ${this.resources.medicalTeams} medical team(s), ${this.resources.hazmatUnits} hazmat unit(s) — all resources committed.`,
        timestamp: now,
      });
    }

    // Build resource status
    const resourceStatus = {
      total: { ...this.resources },
      allocated: { ...this.allocatedResources },
      available: {
        fireTrucks: this.resources.fireTrucks - this.allocatedResources.fireTrucks,
        medicalTeams: this.resources.medicalTeams - this.allocatedResources.medicalTeams,
        hazmatUnits: this.resources.hazmatUnits - this.allocatedResources.hazmatUnits,
      },
    };

    // ── Fire-and-forget AI Analysis (only when risk is elevated) ────
    if (riskScore > 0.5) {
      const criticalSensorSummary = (currentState.sensors || [])
        .filter(s => s.currentValue >= s.warningThreshold)
        .map(s => `${s.label} (${s.id}): ${s.currentValue}${s.unit} [warn:${s.warningThreshold}, crit:${s.criticalThreshold}]`)
        .join('\n');

      const workerSummary = (currentState.workers || [])
        .map(w => `${w.name} (${w.role}) in zone ${w.currentZone}`)
        .join('\n');

      this.geminiAgent.analyze(
        `Risk Score: ${(riskScore * 100).toFixed(1)}%\nProtocol Active: ${this.protocolActive}\nProtocol Type: ${this.protocolType || 'N/A'}\n\nElevated Sensors:\n${criticalSensorSummary || 'None'}\n\nWorker Positions:\n${workerSummary || 'None'}\n\nStaging Actions: ${stagingActions.length}, Resource Status: ${JSON.stringify(resourceStatus.available)}`
      ).then(result => {
        this.lastAIAnalysis = result;
      }).catch(() => {});
    }

    return {
      messages,
      riskFactors,
      protocol: this.protocolActive ? [...this.protocolSteps] : null,
      incidentReport: this.incidentReport,
      stagingActions,
      protocolType: this.protocolType,
      resourceStatus,
      aiEmergencyAnalysis: this.lastAIAnalysis,
    };
  }

  /**
   * Generates the 8-step emergency protocol.
   */
  _generateProtocol(state, now) {
    const affectedZones = [];
    if (state.sensors) {
      const criticalSensors = state.sensors.filter(
        (s) => s.currentValue >= s.criticalThreshold,
      );
      for (const sensor of criticalSensors) {
        if (!affectedZones.includes(sensor.zoneId)) {
          affectedZones.push(sensor.zoneId);
        }
      }
    }

    const zoneStr = affectedZones.length > 0
      ? affectedZones.join(', ')
      : 'All zones';

    return [
      {
        step: 1,
        title: 'Revoke All Active Permits',
        description: `Immediately revoke all active work permits in affected zones (${zoneStr}). Cease all hot work, confined space entry, and maintenance operations.`,
        status: 'executing',
        timestamp: now,
      },
      {
        step: 2,
        title: 'Isolate Energy Sources',
        description: 'Emergency shutdown of all non-essential energy sources. Activate emergency isolation valves on gas mains, fuel lines, and electrical feeds to affected areas.',
        status: 'pending',
        timestamp: null,
      },
      {
        step: 3,
        title: 'Activate Emergency Ventilation',
        description: 'Engage emergency ventilation systems in all affected zones. Open emergency vents and activate forced-draft fans to disperse accumulated gases.',
        status: 'pending',
        timestamp: null,
      },
      {
        step: 4,
        title: 'Sound Evacuation Alarm',
        description: 'Activate facility-wide evacuation alarm (Siren Code: 3 long blasts). Initiate PA announcement directing all personnel to nearest assembly point.',
        status: 'pending',
        timestamp: null,
      },
      {
        step: 5,
        title: 'Notify Emergency Response Teams',
        description: 'Alert on-site fire brigade, medical team, and hazmat response unit. Notify external agencies: Fire Department, PESO, District Administration, DGMS.',
        status: 'pending',
        timestamp: null,
      },
      {
        step: 6,
        title: 'Guide Evacuation Routes',
        description: `Activate illuminated evacuation route indicators for zones ${zoneStr}. Deploy marshals at route junctions. Account for all personnel via headcount at assembly points.`,
        status: 'pending',
        timestamp: null,
      },
      {
        step: 7,
        title: 'Preserve Sensor Evidence',
        description: 'Lock all sensor data logs from T-30 minutes to present. Capture system state snapshot for regulatory investigation. Do not reset or recalibrate sensors.',
        status: 'pending',
        timestamp: null,
      },
      {
        step: 8,
        title: 'Generate Regulatory Report',
        description: 'Compile incident notification per Factories Act §88A. Prepare DGMS Form-M report. Document timeline, sensor readings, permit status, and personnel locations.',
        status: 'pending',
        timestamp: null,
      },
    ];
  }

  /**
   * Generates a structured incident report for regulatory purposes.
   * @param {object} state - Current simulation state
   * @param {number} riskScore - Current risk score
   * @param {Date} now - Current timestamp
   * @returns {object} Structured incident report
   */
  _generateIncidentReport(state, riskScore, now) {
    // Identify critical sensors
    const criticalSensors = (state.sensors || []).filter(
      (s) => s.currentValue >= s.criticalThreshold,
    );
    const warningSensors = (state.sensors || []).filter(
      (s) => s.currentValue >= s.warningThreshold && s.currentValue < s.criticalThreshold,
    );

    // Identify affected zones
    const affectedZoneIds = [...new Set(criticalSensors.map((s) => s.zoneId))];

    // Identify workers at risk
    const workersAtRisk = (state.workers || []).filter((w) =>
      affectedZoneIds.includes(w.currentZone),
    );

    // Identify active permits in affected zones
    const affectedPermits = (state.permits || []).filter(
      (p) => p.status === 'active' && affectedZoneIds.includes(p.zoneId),
    );

    // Build sensor snapshot
    const sensorSnapshot = criticalSensors.map((s) => ({
      id: s.id,
      label: s.label,
      type: s.type,
      zoneId: s.zoneId,
      value: s.currentValue,
      unit: s.unit,
      warningThreshold: s.warningThreshold,
      criticalThreshold: s.criticalThreshold,
      exceedancePercent: ((s.currentValue / s.criticalThreshold) * 100).toFixed(1),
    }));

    return {
      reportId: `IR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`,
      generatedAt: now.toISOString(),
      classification: riskScore > 0.95 ? 'CRITICAL EMERGENCY' : 'EMERGENCY',
      riskScore: (riskScore * 100).toFixed(1),

      summary: {
        affectedZones: affectedZoneIds,
        criticalSensorCount: criticalSensors.length,
        warningSensorCount: warningSensors.length,
        workersAtRisk: workersAtRisk.length,
        activePermitsAffected: affectedPermits.length,
      },

      sensorData: sensorSnapshot,

      personnelAtRisk: workersAtRisk.map((w) => ({
        id: w.id,
        name: w.name,
        role: w.role,
        zone: w.currentZone,
        ppeCompliant: w.ppeCompliant,
        shift: w.shift,
      })),

      permitsAffected: affectedPermits.map((p) => ({
        id: p.id,
        type: p.type,
        zone: p.zoneId,
        status: p.status,
        receiver: p.receiver,
        recommendedAction: 'IMMEDIATE REVOCATION',
      })),

      regulatoryNotifications: [
        { authority: 'DGMS (Directorate General of Mines Safety)', form: 'Form-M', deadline: '24 hours' },
        { authority: 'Factory Inspector', form: 'Factories Act §88A', deadline: '12 hours' },
        { authority: 'PESO (Petroleum & Explosives Safety)', form: 'Incident Report', deadline: '48 hours' },
        { authority: 'District Administration', form: 'Emergency Notification', deadline: 'Immediate' },
      ],

      timeline: [
        { time: now.toISOString(), event: 'Emergency protocol activated', riskScore: (riskScore * 100).toFixed(1) },
      ],
    };
  }

  /**
   * Progresses pending protocol steps over time (simulates execution).
   */
  _progressSteps(now, messages) {
    if (!this.activationTime) return;

    const elapsed = (now.getTime() - this.activationTime.getTime()) / 1000;

    for (const step of this.protocolSteps) {
      const stepStartTime = (step.step - 1) * 4;
      const stepEndTime = step.step * 4;

      if (step.status === 'pending' && elapsed >= stepStartTime) {
        step.status = 'executing';
        step.timestamp = now;

        messages.push({
          agent: 'Emergency',
          severity: 'emergency',
          text: `STEP ${step.step}/8: ${step.title} — ${step.description}`,
          timestamp: now,
        });
      }

      if (step.status === 'executing' && elapsed >= stepEndTime) {
        step.status = 'complete';
      }
    }
  }

  /**
   * Resets the emergency agent state.
   */
  reset() {
    this.protocolActive = false;
    this.protocolSteps = [];
    this.activationTime = null;
    this.incidentReport = null;
    this.protocolType = null;
    this.allocatedResources = { fireTrucks: 0, medicalTeams: 0, hazmatUnits: 0 };
  }
}
