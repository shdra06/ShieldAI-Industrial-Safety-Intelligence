/**
 * MetaAgent.js — Tier 3 Meta Agent
 *
 * Self-monitoring agent that watches the watchers:
 *  - Agent health monitoring (execution time, output count, error indicators)
 *  - Watchdog timer (detect silent/stalled agents)
 *  - System performance metrics (tick timing, throughput)
 *  - False positive tracking (excessive low-value alerts)
 *  - Agent calibration suggestions (threshold tuning)
 *  - Self-healing simulation (abnormal behavior detection)
 *  - Degraded mode detection (below-optimal capacity)
 *  - Diagnostic report generation
 */

// Canonical agent keys expected in agentResults
const AGENT_KEYS = [
  'scada', 'vision', 'permit', 'pattern', 'compliance',
  'emergency', 'environmental', 'fatigue', 'maintenance',
  'communication', 'audit', 'evacuation', 'training',
  'cascade', 'predictive', 'resource',
];

// Severity ordinal map
const SEVERITY_ORD = { info: 0, warning: 1, critical: 2, emergency: 3 };

// Thresholds for health monitoring
const DEFAULTS = {
  WATCHDOG_SILENT_TICKS: 5,          // Ticks with 0 messages before flagging an agent
  MAX_MESSAGES_PER_TICK: 30,         // Upper bound for "normal" message output per agent
  FALSE_POSITIVE_WINDOW: 20,         // Tick window for false-positive rate calculation
  INFO_RATIO_THRESHOLD: 0.85,        // If >85% of an agent's messages are 'info', flag as noisy
  TICK_DURATION_WARN_MS: 200,        // Warn if tick takes longer than this
  TICK_DURATION_CRITICAL_MS: 500,    // Critical if tick exceeds this
  DEGRADED_AGENT_THRESHOLD: 0.25,    // If >25% of agents are unhealthy → degraded mode
  CALIBRATION_INTERVAL: 15,          // Suggest calibration every N ticks
  HISTORY_DEPTH: 60,                 // Max history entries retained per agent
};

class MetaAgent {
  /**
   * @param {object} [options]  Override any DEFAULTS key via options
   */
  constructor(options = {}) {
    this.name = 'MetaAgent';

    // Tunables
    this.config = { ...DEFAULTS, ...options };

    // --- Internal state ---

    // Per-agent health tracking
    // { [agentKey]: { messageCountHistory: number[], severityHistory: number[][], lastActiveTick: number, silentTicks: number, abnormalFlags: number, totalErrors: number } }
    this.agentHealthState = {};
    AGENT_KEYS.forEach((key) => {
      this.agentHealthState[key] = {
        messageCountHistory: [],
        severityHistory: [],      // array of { info, warning, critical, emergency } counts per tick
        lastActiveTick: 0,
        silentTicks: 0,
        abnormalFlags: 0,
        totalErrors: 0,
        calibrationScore: 0,      // positive = too sensitive, negative = too quiet
      };
    });

    // System-level metrics history
    this.tickDurations = [];
    this.totalMessageVolumes = [];
    this.tickCounter = 0;

    // System health snapshot (updated each evaluate)
    this.systemHealthSnapshot = {
      overallStatus: 'healthy',
      healthyAgentCount: AGENT_KEYS.length,
      degradedAgents: [],
      silentAgents: [],
      overloadedAgents: [],
      avgTickDuration: 0,
      messagesThroughput: 0,
    };

    // Diagnostics accumulator
    this.diagnosticsLog = [];

    // Degraded mode tracking
    this.degradedModeTicks = 0;
    this.inDegradedMode = false;
  }

  // ------------------------------------------------------------------ evaluate
  /**
   * @param {object}  agentResults      Keyed by agent name, each { messages: [], riskFactors: [] }
   * @param {Array}   allMessages       All messages from current tick (flat array)
   * @param {number}  tickDuration      How long the tick took in milliseconds
   * @param {number}  [simulationClock] Simulation clock value (tick number or timestamp)
   * @returns {{ messages: object[], riskFactors: object[], agentHealth: object, systemHealth: object, diagnostics: object }}
   */
  evaluate(agentResults = {}, allMessages = [], tickDuration = 0, simulationClock = 0) {
    this.tickCounter++;
    const now = new Date();
    const messages = [];
    const riskFactors = [];

    // ========== A. PER-AGENT HEALTH MONITORING ==========
    const agentHealth = {}; // exported per-agent health report

    AGENT_KEYS.forEach((key) => {
      const result = agentResults[key];
      const state = this.agentHealthState[key];
      const msgs = result && Array.isArray(result.messages) ? result.messages : [];
      const msgCount = msgs.length;

      // --- Track message counts ---
      state.messageCountHistory.push(msgCount);
      if (state.messageCountHistory.length > this.config.HISTORY_DEPTH) {
        state.messageCountHistory.shift();
      }

      // --- Track severity distribution ---
      const sevDist = { info: 0, warning: 0, critical: 0, emergency: 0 };
      msgs.forEach((m) => { if (sevDist[m.severity] !== undefined) sevDist[m.severity]++; });
      state.severityHistory.push(sevDist);
      if (state.severityHistory.length > this.config.HISTORY_DEPTH) {
        state.severityHistory.shift();
      }

      // --- Watchdog: detect silence ---
      if (msgCount > 0) {
        state.lastActiveTick = this.tickCounter;
        state.silentTicks = 0;
      } else {
        state.silentTicks++;
      }

      // --- Compute agent health status ---
      let agentStatus = 'healthy';
      const issues = [];

      // Watchdog alarm
      if (state.silentTicks >= this.config.WATCHDOG_SILENT_TICKS) {
        agentStatus = 'silent';
        issues.push(`No output for ${state.silentTicks} ticks`);
      }

      // Overload detection
      if (msgCount > this.config.MAX_MESSAGES_PER_TICK) {
        agentStatus = agentStatus === 'healthy' ? 'overloaded' : agentStatus;
        issues.push(`Excessive output: ${msgCount} messages`);
      }

      // Abnormal behavior: sudden spike (>3x rolling average)
      const avgMsgs = this._rollingAverage(state.messageCountHistory);
      if (avgMsgs > 0 && msgCount > avgMsgs * 3 && msgCount > 3) {
        state.abnormalFlags++;
        agentStatus = 'abnormal';
        issues.push(`Output spike: ${msgCount} vs avg ${avgMsgs.toFixed(1)}`);
      }

      // Error indicators: messages containing "error" or "fail" in text
      const errorMsgs = msgs.filter((m) =>
        typeof m.text === 'string' && /\b(error|fail|exception|fault)\b/i.test(m.text)
      );
      state.totalErrors += errorMsgs.length;
      if (errorMsgs.length > 0) {
        issues.push(`${errorMsgs.length} error-related message(s)`);
      }

      agentHealth[key] = {
        status: agentStatus,
        messagesThisTick: msgCount,
        averageMessages: Math.round(avgMsgs * 10) / 10,
        silentTicks: state.silentTicks,
        abnormalFlags: state.abnormalFlags,
        totalErrors: state.totalErrors,
        issues,
      };

      // Generate messages for unhealthy agents
      if (agentStatus === 'silent') {
        messages.push({
          agent: this.name,
          severity: 'warning',
          text: `WATCHDOG: Agent "${key}" has been silent for ${state.silentTicks} consecutive ticks. Possible stall or crash.`,
          timestamp: now,
        });
      }
      if (agentStatus === 'abnormal') {
        messages.push({
          agent: this.name,
          severity: 'warning',
          text: `ANOMALY: Agent "${key}" output spike (${msgCount} messages, avg ${avgMsgs.toFixed(1)}). Abnormal behavior flag #${state.abnormalFlags}.`,
          timestamp: now,
        });
      }
      if (agentStatus === 'overloaded') {
        messages.push({
          agent: this.name,
          severity: 'warning',
          text: `OVERLOAD: Agent "${key}" produced ${msgCount} messages this tick (threshold: ${this.config.MAX_MESSAGES_PER_TICK}).`,
          timestamp: now,
        });
      }
    });

    // ========== B. FALSE POSITIVE TRACKING ==========
    const noisyAgents = this._detectNoisyAgents();
    noisyAgents.forEach((entry) => {
      messages.push({
        agent: this.name,
        severity: 'info',
        text: `FALSE POSITIVE RISK: Agent "${entry.agent}" has ${(entry.infoRatio * 100).toFixed(0)}% info-only messages over last ${this.config.FALSE_POSITIVE_WINDOW} ticks. Consider raising thresholds.`,
        timestamp: now,
      });
    });

    riskFactors.push({
      sensorId: 'meta-false-positive-rate',
      value: Math.min(1, noisyAgents.length / Math.max(1, AGENT_KEYS.length)),
      weight: 0.3,
    });

    // ========== C. AGENT CALIBRATION SUGGESTIONS ==========
    if (this.tickCounter % this.config.CALIBRATION_INTERVAL === 0 && this.tickCounter > 0) {
      const suggestions = this._generateCalibrationSuggestions();
      suggestions.forEach((s) => {
        messages.push({
          agent: this.name,
          severity: 'info',
          text: `CALIBRATION: ${s.text}`,
          timestamp: now,
        });
      });
    }

    // ========== D. SYSTEM PERFORMANCE METRICS ==========
    this.tickDurations.push(tickDuration);
    if (this.tickDurations.length > this.config.HISTORY_DEPTH) this.tickDurations.shift();

    const totalMsgs = Array.isArray(allMessages) ? allMessages.length : 0;
    this.totalMessageVolumes.push(totalMsgs);
    if (this.totalMessageVolumes.length > this.config.HISTORY_DEPTH) this.totalMessageVolumes.shift();

    const avgTickDuration = this._rollingAverage(this.tickDurations);
    const avgThroughput = this._rollingAverage(this.totalMessageVolumes);

    // Tick timing alerts
    if (tickDuration > this.config.TICK_DURATION_CRITICAL_MS) {
      messages.push({
        agent: this.name,
        severity: 'critical',
        text: `PERFORMANCE: Tick took ${tickDuration}ms (critical threshold: ${this.config.TICK_DURATION_CRITICAL_MS}ms). System may be overloaded.`,
        timestamp: now,
      });
    } else if (tickDuration > this.config.TICK_DURATION_WARN_MS) {
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `PERFORMANCE: Tick took ${tickDuration}ms (warning threshold: ${this.config.TICK_DURATION_WARN_MS}ms). Monitoring for degradation.`,
        timestamp: now,
      });
    }

    riskFactors.push({
      sensorId: 'meta-tick-duration',
      value: Math.min(1, tickDuration / (this.config.TICK_DURATION_CRITICAL_MS * 2)),
      weight: 0.4,
    });

    riskFactors.push({
      sensorId: 'meta-message-throughput',
      value: Math.min(1, totalMsgs / (AGENT_KEYS.length * this.config.MAX_MESSAGES_PER_TICK)),
      weight: 0.2,
    });

    // ========== E. SELF-HEALING SIMULATION ==========
    const selfHealingActions = this._runSelfHealing(agentHealth);
    selfHealingActions.forEach((action) => {
      messages.push({
        agent: this.name,
        severity: action.severity,
        text: `SELF-HEAL: ${action.text}`,
        timestamp: now,
      });
    });

    // ========== F. DEGRADED MODE DETECTION ==========
    const unhealthyCount = AGENT_KEYS.filter((k) => agentHealth[k]?.status !== 'healthy').length;
    const degradedRatio = unhealthyCount / AGENT_KEYS.length;
    const wasDegraded = this.inDegradedMode;

    this.inDegradedMode = degradedRatio >= this.config.DEGRADED_AGENT_THRESHOLD;
    if (this.inDegradedMode) {
      this.degradedModeTicks++;
    } else {
      this.degradedModeTicks = 0;
    }

    if (this.inDegradedMode && !wasDegraded) {
      messages.push({
        agent: this.name,
        severity: 'critical',
        text: `DEGRADED MODE ENTERED: ${unhealthyCount}/${AGENT_KEYS.length} agents (${(degradedRatio * 100).toFixed(0)}%) are unhealthy. System operating below optimal capacity.`,
        timestamp: now,
      });
    } else if (!this.inDegradedMode && wasDegraded) {
      messages.push({
        agent: this.name,
        severity: 'info',
        text: `DEGRADED MODE EXITED: All agent health indicators returning to normal.`,
        timestamp: now,
      });
    } else if (this.inDegradedMode && this.degradedModeTicks % 10 === 0) {
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `DEGRADED MODE PERSISTING: ${this.degradedModeTicks} ticks in degraded mode. ${unhealthyCount} agents unhealthy.`,
        timestamp: now,
      });
    }

    riskFactors.push({
      sensorId: 'meta-degraded-mode',
      value: degradedRatio,
      weight: 0.7,
    });

    // ========== G. SYSTEM HEALTH SNAPSHOT ==========
    const silentAgents = AGENT_KEYS.filter((k) => agentHealth[k]?.status === 'silent');
    const overloadedAgents = AGENT_KEYS.filter((k) => agentHealth[k]?.status === 'overloaded');
    const abnormalAgents = AGENT_KEYS.filter((k) => agentHealth[k]?.status === 'abnormal');
    const degradedAgents = [...silentAgents, ...overloadedAgents, ...abnormalAgents];

    const systemHealth = {
      overallStatus: this.inDegradedMode ? 'degraded' : (degradedAgents.length > 0 ? 'impaired' : 'healthy'),
      healthyAgentCount: AGENT_KEYS.length - degradedAgents.length,
      totalAgentCount: AGENT_KEYS.length,
      degradedAgents,
      silentAgents,
      overloadedAgents,
      abnormalAgents,
      avgTickDuration: Math.round(avgTickDuration * 100) / 100,
      currentTickDuration: tickDuration,
      messagesThroughput: totalMsgs,
      avgMessagesThroughput: Math.round(avgThroughput * 10) / 10,
      degradedModeTicks: this.degradedModeTicks,
      tickNumber: this.tickCounter,
    };
    this.systemHealthSnapshot = systemHealth;

    // ========== H. DIAGNOSTIC REPORT ==========
    const diagnostics = this._generateDiagnostics(agentHealth, systemHealth, noisyAgents, selfHealingActions);
    this.diagnosticsLog.push({ tick: this.tickCounter, summary: diagnostics.summary });
    if (this.diagnosticsLog.length > this.config.HISTORY_DEPTH) this.diagnosticsLog.shift();

    // Periodic full diagnostic summary message
    if (this.tickCounter % 10 === 0) {
      messages.push({
        agent: this.name,
        severity: 'info',
        text: `DIAGNOSTIC REPORT: ${diagnostics.summary}`,
        timestamp: now,
      });
    }

    // ========== I. OVERALL META-RISK ==========
    const metaRisk = this._computeMetaRisk(degradedRatio, tickDuration, noisyAgents.length);
    riskFactors.push({
      sensorId: 'meta-overall-health',
      value: metaRisk,
      weight: 0.8,
    });

    return {
      messages,
      riskFactors,
      agentHealth,
      systemHealth,
      diagnostics,
    };
  }

  // ------------------------------------------------------------------ reset
  reset() {
    AGENT_KEYS.forEach((key) => {
      this.agentHealthState[key] = {
        messageCountHistory: [],
        severityHistory: [],
        lastActiveTick: 0,
        silentTicks: 0,
        abnormalFlags: 0,
        totalErrors: 0,
        calibrationScore: 0,
      };
    });
    this.tickDurations = [];
    this.totalMessageVolumes = [];
    this.tickCounter = 0;
    this.systemHealthSnapshot = {
      overallStatus: 'healthy',
      healthyAgentCount: AGENT_KEYS.length,
      degradedAgents: [],
      silentAgents: [],
      overloadedAgents: [],
      avgTickDuration: 0,
      messagesThroughput: 0,
    };
    this.diagnosticsLog = [];
    this.degradedModeTicks = 0;
    this.inDegradedMode = false;
  }

  // =========================================================== PRIVATE HELPERS

  /**
   * Compute rolling average of an array of numbers.
   */
  _rollingAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  /**
   * Detect agents with excessively high info-only message ratios (potential false positives).
   */
  _detectNoisyAgents() {
    const noisy = [];
    AGENT_KEYS.forEach((key) => {
      const state = this.agentHealthState[key];
      const window = state.severityHistory.slice(-this.config.FALSE_POSITIVE_WINDOW);
      if (window.length < 3) return; // not enough data

      let totalInfo = 0;
      let totalAll = 0;
      window.forEach((dist) => {
        totalInfo += dist.info;
        totalAll += dist.info + dist.warning + dist.critical + dist.emergency;
      });

      if (totalAll === 0) return;
      const infoRatio = totalInfo / totalAll;
      if (infoRatio >= this.config.INFO_RATIO_THRESHOLD && totalAll > 5) {
        noisy.push({ agent: key, infoRatio, totalMessages: totalAll });
        state.calibrationScore += 0.1; // bump "too sensitive" score
      }
    });
    return noisy;
  }

  /**
   * Generate calibration suggestions for agents that are too noisy or too quiet.
   */
  _generateCalibrationSuggestions() {
    const suggestions = [];
    AGENT_KEYS.forEach((key) => {
      const state = this.agentHealthState[key];
      const avgMsgs = this._rollingAverage(state.messageCountHistory);
      const recentSev = state.severityHistory.slice(-10);

      // Too sensitive: high output, mostly info
      if (state.calibrationScore > 0.5 && avgMsgs > 5) {
        suggestions.push({
          agent: key,
          direction: 'decrease_sensitivity',
          text: `Agent "${key}" appears over-sensitive (cal score: ${state.calibrationScore.toFixed(2)}). Recommend raising alert thresholds to reduce noise.`,
        });
        state.calibrationScore *= 0.7; // decay after suggesting
      }

      // Too quiet: agent rarely produces anything
      if (state.messageCountHistory.length >= 10 && avgMsgs < 0.3) {
        suggestions.push({
          agent: key,
          direction: 'increase_sensitivity',
          text: `Agent "${key}" is unusually quiet (avg ${avgMsgs.toFixed(2)} msgs/tick). Recommend lowering alert thresholds or verifying sensor connectivity.`,
        });
      }

      // Severity imbalance: lots of critical but no info (may be too aggressive)
      if (recentSev.length >= 5) {
        const totalCritical = recentSev.reduce((s, d) => s + d.critical + d.emergency, 0);
        const totalInfo = recentSev.reduce((s, d) => s + d.info, 0);
        if (totalCritical > 10 && totalInfo < 2) {
          suggestions.push({
            agent: key,
            direction: 'rebalance_severity',
            text: `Agent "${key}" may be over-classifying severity (${totalCritical} critical/emergency vs ${totalInfo} info in last 10 ticks). Review classification thresholds.`,
          });
        }
      }
    });
    return suggestions;
  }

  /**
   * Simulate self-healing by detecting and reporting on agents exhibiting sustained abnormal behavior.
   */
  _runSelfHealing(agentHealth) {
    const actions = [];
    AGENT_KEYS.forEach((key) => {
      const state = this.agentHealthState[key];
      const health = agentHealth[key];
      if (!health) return;

      // Recommend restart for agents with repeated abnormal flags
      if (state.abnormalFlags >= 3) {
        actions.push({
          agent: key,
          action: 'recommend_restart',
          severity: 'warning',
          text: `Agent "${key}" has ${state.abnormalFlags} abnormal behavior flags. Recommend agent restart or re-initialization.`,
        });
        // Reset flag count after recommending (simulated heal)
        state.abnormalFlags = Math.max(0, state.abnormalFlags - 2);
      }

      // Recommend reconnect for prolonged silence
      if (state.silentTicks >= this.config.WATCHDOG_SILENT_TICKS * 2) {
        actions.push({
          agent: key,
          action: 'recommend_reconnect',
          severity: 'critical',
          text: `Agent "${key}" unresponsive for ${state.silentTicks} ticks (2x watchdog threshold). Recommend sensor reconnection and agent restart.`,
        });
      }

      // Excessive errors
      if (state.totalErrors > 20) {
        actions.push({
          agent: key,
          action: 'recommend_review',
          severity: 'warning',
          text: `Agent "${key}" has accumulated ${state.totalErrors} error-related messages. Recommend configuration review.`,
        });
        state.totalErrors = Math.max(0, state.totalErrors - 10); // decay
      }
    });
    return actions;
  }

  /**
   * Generate a comprehensive diagnostics object.
   */
  _generateDiagnostics(agentHealth, systemHealth, noisyAgents, selfHealingActions) {
    const agentStatuses = {};
    AGENT_KEYS.forEach((key) => {
      agentStatuses[key] = agentHealth[key]?.status ?? 'unknown';
    });

    // Compute tick duration trend
    const recentTicks = this.tickDurations.slice(-10);
    const tickTrend = recentTicks.length >= 2
      ? recentTicks[recentTicks.length - 1] - recentTicks[0]
      : 0;

    // Message volume trend
    const recentVols = this.totalMessageVolumes.slice(-10);
    const volTrend = recentVols.length >= 2
      ? recentVols[recentVols.length - 1] - recentVols[0]
      : 0;

    const summary = [
      `Tick #${this.tickCounter}`,
      `Status: ${systemHealth.overallStatus}`,
      `Healthy: ${systemHealth.healthyAgentCount}/${systemHealth.totalAgentCount}`,
      `Tick: ${systemHealth.currentTickDuration}ms (avg ${systemHealth.avgTickDuration}ms)`,
      `Msgs: ${systemHealth.messagesThroughput} (avg ${systemHealth.avgMessagesThroughput})`,
      this.inDegradedMode ? `DEGRADED (${this.degradedModeTicks} ticks)` : '',
    ].filter(Boolean).join(' | ');

    return {
      summary,
      agentStatuses,
      noisyAgentCount: noisyAgents.length,
      noisyAgents: noisyAgents.map((n) => n.agent),
      selfHealingActionsThisTick: selfHealingActions.length,
      tickDurationTrend: tickTrend > 0 ? 'increasing' : tickTrend < 0 ? 'decreasing' : 'stable',
      messageVolumeTrend: volTrend > 0 ? 'increasing' : volTrend < 0 ? 'decreasing' : 'stable',
      degradedMode: this.inDegradedMode,
      degradedModeDuration: this.degradedModeTicks,
      uptimeTicks: this.tickCounter,
    };
  }

  /**
   * Compute an overall meta-risk value representing system health risk.
   */
  _computeMetaRisk(degradedRatio, tickDuration, noisyCount) {
    // Weighted combination of system health indicators
    const degradedRisk = degradedRatio;                                               // 0-1
    const perfRisk = Math.min(1, tickDuration / (this.config.TICK_DURATION_CRITICAL_MS * 2)); // 0-1
    const noiseRisk = Math.min(1, noisyCount / Math.max(1, AGENT_KEYS.length));       // 0-1

    const metaRisk = degradedRisk * 0.5 + perfRisk * 0.3 + noiseRisk * 0.2;
    return Math.min(1, Math.max(0, metaRisk));
  }
}

export { MetaAgent };
