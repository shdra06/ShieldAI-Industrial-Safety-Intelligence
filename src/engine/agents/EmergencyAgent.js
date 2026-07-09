// ============================================================================
// ShieldAI — Emergency Agent
// Generates and manages emergency protocol steps when risk exceeds 85%.
// ============================================================================

export class EmergencyAgent {
  constructor() {
    this.name = 'Emergency';
    this.protocolActive = false;
    this.protocolSteps = [];
    this.activationTime = null;
  }

  /**
   * Evaluates whether an emergency protocol should be activated.
   *
   * @param {number} riskScore    - Current compound risk score (0-1).
   * @param {object} currentState - Full simulation state.
   * @returns {{ messages: object[], riskFactors: object[], protocol: object[]|null }}
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

      messages.push({
        agent: 'Emergency',
        severity: 'emergency',
        text: `🚨 EMERGENCY PROTOCOL ACTIVATED — Compound risk score: ${(riskScore * 100).toFixed(1)}%. Initiating 8-step emergency response sequence.`,
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

      // Only de-escalate if risk has been low for a reasonable period
      if (timeSinceActivation > 30000) { // 30 seconds in simulation time
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

    return {
      messages,
      riskFactors,
      protocol: this.protocolActive ? [...this.protocolSteps] : null,
    };
  }

  /**
   * Generates the 8-step emergency protocol.
   * @param {object} state - Current simulation state.
   * @param {Date} now
   * @returns {object[]}
   */
  _generateProtocol(state, now) {
    // Identify affected zones
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
   * Progresses pending protocol steps over time (simulates execution).
   * @param {Date} now
   * @param {object[]} messages
   */
  _progressSteps(now, messages) {
    if (!this.activationTime) return;

    const elapsed = (now.getTime() - this.activationTime.getTime()) / 1000;

    // Each step takes approximately 4 seconds in simulation time
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
  }
}
