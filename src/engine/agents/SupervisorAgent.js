import { GeminiAgent } from '../ai/GeminiAgent.js';

/**
 * SupervisorAgent.js — Tier 3 Meta Agent
 *
 * The 'brain' of ShieldAI. Performs meta-reasoning over the entire agent fleet:
 *  - Weighted consensus arbitration across all agent risk assessments
 *  - Escalation decision-making (agent-level → system-wide emergencies)
 *  - Priority conflict resolution (contradictory agent recommendations)
 *  - Confidence-weighted risk aggregation using historical accuracy
 *  - Situation classification into operational states
 *  - Agent agreement scoring (0-1 consensus metric)
 */

// Canonical agent keys expected in agentResults
const AGENT_KEYS = [
  'scada', 'vision', 'permit', 'pattern', 'compliance',
  'emergency', 'environmental', 'fatigue', 'maintenance',
  'communication', 'audit', 'evacuation', 'training',
  'cascade', 'predictive', 'resource',
];

// Situation classification thresholds
const SITUATION_THRESHOLDS = {
  NORMAL:     0.15,
  ELEVATED:   0.35,
  DEVELOPING: 0.55,
  ACTIVE:     0.75,
  // Anything above ACTIVE → Post-Incident once risk drops back below ACTIVE
};

const SITUATION_LABELS = [
  'Normal Operations',
  'Elevated Monitoring',
  'Developing Incident',
  'Active Emergency',
  'Post-Incident',
];

// Severity ordinal map for numeric comparisons
const SEVERITY_ORD = { info: 0, warning: 1, critical: 2, emergency: 3 };

class SupervisorAgent {
  /**
   * @param {object} [options]
   * @param {number} [options.historyDepth=50]        Max ticks of history to retain per agent
   * @param {number} [options.escalationCooldown=5]   Min ticks between re-escalation
   * @param {number} [options.conflictSeverityGap=1]  Severity ordinal gap to consider a conflict
   */
  constructor(options = {}) {
    this.name = 'SupervisorAgent';

    // Tunables
    this.historyDepth = options.historyDepth ?? 50;
    this.escalationCooldown = options.escalationCooldown ?? 5;
    this.conflictSeverityGap = options.conflictSeverityGap ?? 1;

    // --- Internal state ---

    // Per-agent performance history: { [agentKey]: { messageCounts: number[], riskContributions: number[], accuracy: number } }
    this.agentHistory = {};
    AGENT_KEYS.forEach((key) => {
      this.agentHistory[key] = {
        messageCounts: [],
        riskContributions: [],
        accuracy: 0.5, // prior — neutral confidence
        emergencyFlags: 0,
        totalTicks: 0,
      };
    });

    // Situation tracking
    this.currentSituation = 'Normal Operations';
    this.previousSituation = 'Normal Operations';
    this.situationEnteredTick = 0;
    this.tickCounter = 0;

    // Escalation tracking
    this.escalationLevel = 0;           // 0-4 matching SITUATION_LABELS
    this.lastEscalationTick = -Infinity;

    // Consensus history
    this.agreementHistory = [];

    // Conflict log (last N resolutions)
    this.conflictLog = [];

    // SHAP-like Decision Explainability
    this.decisionAuditTrail = [];  // Last 200 decisions
    this.maxAuditEntries = 200;

    // Gemini AI Reasoning
    this.geminiAgent = new GeminiAgent({
      agentName: 'SupervisorAI',
      callInterval: 10,
      systemPrompt: `You are the AI Safety Supervisor for an industrial chemical plant with 6 zones and 20 monitoring agents.
Analyze the complete plant state and provide:
1. Overall situation classification (Normal/Elevated/Warning/Critical/Emergency)
2. Top 3 risk drivers with root cause reasoning
3. Any agent conflicts and how to resolve them (always err toward safety)
4. Specific actionable recommendations for the safety officer
5. Confidence level in your assessment

Think step-by-step. Reference specific sensor values and thresholds. Be concise but thorough.`,
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          situation: { type: 'STRING' },
          reasoning: { type: 'STRING' },
          topRisks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { source: { type: 'STRING' }, severity: { type: 'STRING' }, explanation: { type: 'STRING' } } } },
          recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
          confidence: { type: 'NUMBER' },
        },
      },
    });
    this.lastAIAnalysis = null;
  }

  // ------------------------------------------------------------------ evaluate
  /**
   * @param {object} agentResults  Keyed by agent name, each { messages: [], riskFactors: [] }
   * @param {number} riskScore     Global composite risk score (0-1)
   * @param {string} status        Current system status string
   * @returns {{ messages: object[], riskFactors: object[], situationClass: string, agentAgreement: number, escalationLevel: number, conflictResolutions: object[] }}
   */
  evaluate(agentResults = {}, riskScore = 0, status = 'normal') {
    this.tickCounter++;
    const now = new Date();
    const messages = [];
    const riskFactors = [];
    const conflictResolutions = [];

    // ---- 1. Collect per-agent risk summaries ----
    const agentRiskMap = {}; // { [key]: averageRisk }
    const agentSeverityMap = {}; // { [key]: highestSeverityOrdinal }

    AGENT_KEYS.forEach((key) => {
      const result = agentResults[key];
      if (!result) {
        agentRiskMap[key] = 0;
        agentSeverityMap[key] = 0;
        this._recordHistory(key, 0, 0);
        return;
      }
      const factors = Array.isArray(result.riskFactors) ? result.riskFactors : [];
      const msgs = Array.isArray(result.messages) ? result.messages : [];

      // Average risk value across all factors
      const avgRisk = factors.length > 0
        ? factors.reduce((s, f) => s + (f.value ?? 0), 0) / factors.length
        : 0;
      agentRiskMap[key] = avgRisk;

      // Highest severity
      const maxSev = msgs.reduce((m, msg) => Math.max(m, SEVERITY_ORD[msg.severity] ?? 0), 0);
      agentSeverityMap[key] = maxSev;

      this._recordHistory(key, msgs.length, avgRisk);
    });

    // ---- 2. Confidence-weighted risk aggregation ----
    let weightedRiskSum = 0;
    let weightSum = 0;
    AGENT_KEYS.forEach((key) => {
      const confidence = this._getAgentConfidence(key);
      const risk = agentRiskMap[key];
      weightedRiskSum += risk * confidence;
      weightSum += confidence;
    });
    const aggregatedRisk = weightSum > 0 ? weightedRiskSum / weightSum : riskScore;

    riskFactors.push({
      sensorId: 'supervisor-aggregated-risk',
      value: Math.min(1, Math.max(0, aggregatedRisk)),
      weight: 1.0,
    });

    // ---- 3. Agent agreement score ----
    const agentAgreement = this._computeAgreementScore(agentRiskMap, agentSeverityMap);
    this.agreementHistory.push(agentAgreement);
    if (this.agreementHistory.length > this.historyDepth) this.agreementHistory.shift();

    riskFactors.push({
      sensorId: 'supervisor-agreement',
      value: 1 - agentAgreement,  // low agreement → higher risk signal
      weight: 0.4,
    });

    // ---- 4. Conflict detection & resolution ----
    const conflicts = this._detectConflicts(agentResults, agentSeverityMap);
    conflicts.forEach((conflict) => {
      const resolution = this._resolveConflict(conflict, agentRiskMap);
      conflictResolutions.push(resolution);
      this.conflictLog.push({ ...resolution, tick: this.tickCounter });
      if (this.conflictLog.length > 100) this.conflictLog.shift();

      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `Conflict resolved between ${conflict.agentA} and ${conflict.agentB}: "${resolution.resolution}" (confidence ${(resolution.confidence * 100).toFixed(0)}%)`,
        timestamp: now,
      });
    });

    // ---- 5. Situation classification ----
    const situationClass = this._classifySituation(aggregatedRisk, agentSeverityMap, agentAgreement);
    const situationChanged = situationClass !== this.currentSituation;
    this.previousSituation = this.currentSituation;
    this.currentSituation = situationClass;
    if (situationChanged) this.situationEnteredTick = this.tickCounter;

    // ---- 6. Escalation decision-making ----
    const escalationLevel = this._determineEscalation(aggregatedRisk, agentSeverityMap, agentAgreement);
    const escalated = escalationLevel > this.escalationLevel;
    const deescalated = escalationLevel < this.escalationLevel;
    this.escalationLevel = escalationLevel;

    if (escalated) {
      this.lastEscalationTick = this.tickCounter;
      messages.push({
        agent: this.name,
        severity: escalationLevel >= 3 ? 'emergency' : 'critical',
        text: `ESCALATION to level ${escalationLevel}: System transitioning to "${situationClass}". Aggregated risk: ${(aggregatedRisk * 100).toFixed(1)}%, agent agreement: ${(agentAgreement * 100).toFixed(0)}%.`,
        timestamp: now,
      });
    } else if (deescalated) {
      messages.push({
        agent: this.name,
        severity: 'info',
        text: `De-escalation to level ${escalationLevel}: System returning to "${situationClass}".`,
        timestamp: now,
      });
    }

    riskFactors.push({
      sensorId: 'supervisor-escalation',
      value: escalationLevel / 4,
      weight: 0.6,
    });

    // ---- 7. Supervisory summary message ----
    const activeAgentCount = AGENT_KEYS.filter((k) => agentResults[k]).length;
    const totalMessages = AGENT_KEYS.reduce((sum, k) => {
      const r = agentResults[k];
      return sum + (r && Array.isArray(r.messages) ? r.messages.length : 0);
    }, 0);

    const criticalAgents = AGENT_KEYS.filter((k) => agentSeverityMap[k] >= SEVERITY_ORD.critical);
    const emergencyAgents = AGENT_KEYS.filter((k) => agentSeverityMap[k] >= SEVERITY_ORD.emergency);

    messages.push({
      agent: this.name,
      severity: this._summaryMessageSeverity(escalationLevel),
      text: this._buildSummaryText({
        situationClass,
        aggregatedRisk,
        agentAgreement,
        activeAgentCount,
        totalMessages,
        criticalAgents,
        emergencyAgents,
        escalationLevel,
        conflictCount: conflictResolutions.length,
      }),
      timestamp: now,
    });

    // ---- 8. Low-agreement advisory ----
    if (agentAgreement < 0.4) {
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `Low agent consensus detected (${(agentAgreement * 100).toFixed(0)}%). Conflicting assessments may reduce decision reliability. Manual review recommended.`,
        timestamp: now,
      });
    }

    // ---- 9. Stale situation warning ----
    const ticksInSituation = this.tickCounter - this.situationEnteredTick;
    if (situationClass !== 'Normal Operations' && ticksInSituation > 20) {
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `System has been in "${situationClass}" for ${ticksInSituation} ticks. Consider manual intervention or reassessment.`,
        timestamp: now,
      });
    }

    // ---- 10. Per-agent confidence report (periodic, every 10 ticks) ----
    if (this.tickCounter % 10 === 0 && this.tickCounter > 0) {
      const lowConfidenceAgents = AGENT_KEYS.filter((k) => this._getAgentConfidence(k) < 0.35);
      if (lowConfidenceAgents.length > 0) {
        messages.push({
          agent: this.name,
          severity: 'info',
          text: `Agents with low confidence scores: ${lowConfidenceAgents.map((a) => `${a}(${(this._getAgentConfidence(a) * 100).toFixed(0)}%)`).join(', ')}. Their risk contributions are down-weighted.`,
          timestamp: now,
        });
      }
    }

    // ---- 11. SHAP-like Decision Explainability ----
    const explanation = this._explainDecision(agentResults, riskScore, situationClass);
    messages.push({
      agent: this.name,
      severity: 'info',
      text: explanation.narrative,
      timestamp: now,
    });

    // Fire-and-forget AI analysis (non-blocking)
    const aiContext = {
      riskScore,
      status,
      agentResults: Object.fromEntries(
        Object.entries(agentResults).map(([k, v]) => [
          k, {
            msgCount: (v.messages || []).length,
            criticals: (v.messages || []).filter(m => m.severity === 'critical' || m.severity === 'emergency').length,
            maxRisk: (v.riskFactors || []).length > 0 ? Math.max(...(v.riskFactors || []).map(r => (r.value || 0) * (r.weight || 0))) : 0,
          }
        ])
      ),
      situationClass,
      agentAgreement,
      escalationLevel,
    };
    this.geminiAgent.analyze(aiContext).then(result => {
      if (result?.success) this.lastAIAnalysis = result.data;
    }).catch(() => {});

    return {
      messages,
      riskFactors,
      situationClass,
      agentAgreement,
      escalationLevel,
      conflictResolutions,
      explanation,
      aiAnalysis: this.lastAIAnalysis,
    };
  }

  // ------------------------------------------------------------------ reset
  reset() {
    AGENT_KEYS.forEach((key) => {
      this.agentHistory[key] = {
        messageCounts: [],
        riskContributions: [],
        accuracy: 0.5,
        emergencyFlags: 0,
        totalTicks: 0,
      };
    });
    this.currentSituation = 'Normal Operations';
    this.previousSituation = 'Normal Operations';
    this.situationEnteredTick = 0;
    this.tickCounter = 0;
    this.escalationLevel = 0;
    this.lastEscalationTick = -Infinity;
    this.agreementHistory = [];
    this.conflictLog = [];
    this.decisionAuditTrail = [];
  }

  // =========================================================== PRIVATE HELPERS

  /**
   * Generate SHAP-like decision explanation with feature contributions,
   * counterfactual reasoning, and narrative summary.
   *
   * @param {object} agentResults  - All agent evaluation results.
   * @param {number} riskScore     - Current global risk score.
   * @param {string} situationClass - Current situation classification.
   * @returns {object} Decision explanation with contributions, counterfactual, and narrative.
   */
  _explainDecision(agentResults, riskScore, situationClass) {
    // Calculate feature contributions (simplified Shapley values)
    const contributions = [];
    const agentKeys = Object.keys(agentResults);

    for (const key of agentKeys) {
      const result = agentResults[key];
      if (!result?.riskFactors?.length) continue;

      // Agent's marginal contribution = max risk factor × weight
      const maxRisk = Math.max(...result.riskFactors.map(rf => (rf.value || 0) * (rf.weight || 0)), 0);
      const messageWeight = (result.messages?.length || 0) * 0.02;  // More messages = more concern
      const severityWeight = (result.messages || []).reduce((s, m) => {
        if (m.severity === 'emergency') return s + 0.15;
        if (m.severity === 'critical') return s + 0.10;
        if (m.severity === 'warning') return s + 0.05;
        return s + 0.01;
      }, 0);

      const contribution = Math.min(maxRisk + messageWeight + severityWeight, 1);

      contributions.push({
        agent: key,
        contribution: Math.round(contribution * 100) / 100,
        maxRiskFactor: Math.round(maxRisk * 100) / 100,
        messageCount: result.messages?.length || 0,
        topMessage: result.messages?.[0]?.text || null,
      });
    }

    // Sort by contribution
    contributions.sort((a, b) => b.contribution - a.contribution);

    // Generate counterfactual
    const topContributor = contributions[0];
    const counterfactual = topContributor
      ? `Risk would drop to ~${Math.round((riskScore - topContributor.contribution * 0.4) * 100)}% if ${topContributor.agent} concerns were resolved`
      : null;

    // Generate narrative
    const topN = contributions.slice(0, 3).filter(c => c.contribution > 0.05);
    const narrative = topN.length > 0
      ? `${situationClass}: Risk at ${Math.round(riskScore * 100)}% driven by ${topN.map(c => `${c.agent} (${Math.round(c.contribution * 100)}%)`).join(', ')}.`
      : `${situationClass}: All systems nominal.`;

    const decision = {
      timestamp: new Date(),
      riskScore,
      situationClass,
      contributions,
      counterfactual,
      narrative,
      agentCount: agentKeys.length,
    };

    // Add to audit trail
    this.decisionAuditTrail.push(decision);
    if (this.decisionAuditTrail.length > this.maxAuditEntries) {
      this.decisionAuditTrail.shift();
    }

    return decision;
  }

  /**
   * Record per-agent message count and risk contribution for confidence tracking.
   */
  _recordHistory(agentKey, messageCount, avgRisk) {
    const h = this.agentHistory[agentKey];
    if (!h) return;
    h.messageCounts.push(messageCount);
    h.riskContributions.push(avgRisk);
    h.totalTicks++;
    if (h.messageCounts.length > this.historyDepth) h.messageCounts.shift();
    if (h.riskContributions.length > this.historyDepth) h.riskContributions.shift();
  }

  /**
   * Derive a confidence/accuracy score for an agent based on its historical behavior.
   * Agents with highly volatile outputs or extreme output counts get lower confidence.
   */
  _getAgentConfidence(agentKey) {
    const h = this.agentHistory[agentKey];
    if (!h || h.riskContributions.length < 3) return 0.5; // neutral prior

    // Stability: low standard-deviation in risk → higher confidence
    const risks = h.riskContributions;
    const mean = risks.reduce((s, v) => s + v, 0) / risks.length;
    const variance = risks.reduce((s, v) => s + (v - mean) ** 2, 0) / risks.length;
    const stdDev = Math.sqrt(variance);
    const stabilityScore = Math.max(0, 1 - stdDev * 2); // stdDev > 0.5 → 0

    // Activity: neither silent nor flooding
    const msgCounts = h.messageCounts;
    const avgMsgs = msgCounts.reduce((s, v) => s + v, 0) / msgCounts.length;
    const activityScore = avgMsgs === 0 ? 0.2 : avgMsgs > 20 ? 0.3 : 0.8;

    // Blend into a composite confidence
    const confidence = stabilityScore * 0.6 + activityScore * 0.3 + h.accuracy * 0.1;
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Compute how much agents agree (0 = total disagreement, 1 = full consensus).
   * Uses both risk level and severity level dispersion.
   */
  _computeAgreementScore(agentRiskMap, agentSeverityMap) {
    const activeKeys = AGENT_KEYS.filter((k) => agentRiskMap[k] !== undefined);
    if (activeKeys.length <= 1) return 1;

    // Risk agreement: 1 − normalized std-dev of risk values
    const risks = activeKeys.map((k) => agentRiskMap[k]);
    const rMean = risks.reduce((s, v) => s + v, 0) / risks.length;
    const rVar = risks.reduce((s, v) => s + (v - rMean) ** 2, 0) / risks.length;
    const riskAgreement = Math.max(0, 1 - Math.sqrt(rVar) * 3);

    // Severity agreement: 1 − normalized std-dev of severity ordinals
    const sevs = activeKeys.map((k) => agentSeverityMap[k] ?? 0);
    const sMean = sevs.reduce((s, v) => s + v, 0) / sevs.length;
    const sVar = sevs.reduce((s, v) => s + (v - sMean) ** 2, 0) / sevs.length;
    const sevAgreement = Math.max(0, 1 - Math.sqrt(sVar) / 1.5);

    return riskAgreement * 0.6 + sevAgreement * 0.4;
  }

  /**
   * Detect pairs of agents whose outputs meaningfully conflict.
   */
  _detectConflicts(agentResults, agentSeverityMap) {
    const conflicts = [];
    const keys = AGENT_KEYS.filter((k) => agentResults[k]);

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i];
        const b = keys[j];
        const sevGap = Math.abs((agentSeverityMap[a] ?? 0) - (agentSeverityMap[b] ?? 0));
        if (sevGap >= this.conflictSeverityGap) {
          // Check if one is recommending action while another is calm
          const aHigh = (agentSeverityMap[a] ?? 0) >= SEVERITY_ORD.critical;
          const bHigh = (agentSeverityMap[b] ?? 0) >= SEVERITY_ORD.critical;
          if (aHigh !== bHigh) {
            conflicts.push({
              agentA: a,
              agentB: b,
              severityA: agentSeverityMap[a],
              severityB: agentSeverityMap[b],
              sevGap,
            });
          }
        }
      }
    }
    return conflicts;
  }

  /**
   * Resolve a detected conflict by weighting agent confidence and risk contribution.
   */
  _resolveConflict(conflict, agentRiskMap) {
    const confA = this._getAgentConfidence(conflict.agentA);
    const confB = this._getAgentConfidence(conflict.agentB);
    const riskA = agentRiskMap[conflict.agentA] ?? 0;
    const riskB = agentRiskMap[conflict.agentB] ?? 0;

    // Weighted score: higher → more trust in that agent's assessment
    const scoreA = confA * 0.6 + riskA * 0.4;
    const scoreB = confB * 0.6 + riskB * 0.4;

    // In safety-critical systems, bias toward the more cautious (higher severity) agent
    const cautiousBias = 0.15;
    const adjustedA = conflict.severityA > conflict.severityB ? scoreA + cautiousBias : scoreA;
    const adjustedB = conflict.severityB > conflict.severityA ? scoreB + cautiousBias : scoreB;

    const winner = adjustedA >= adjustedB ? conflict.agentA : conflict.agentB;
    const winnerScore = Math.max(adjustedA, adjustedB);
    const totalScore = adjustedA + adjustedB;
    const confidence = totalScore > 0 ? winnerScore / totalScore : 0.5;

    let resolution;
    if (winner === conflict.agentA) {
      resolution = `Favoring ${conflict.agentA} (confidence ${(confA * 100).toFixed(0)}%) over ${conflict.agentB} (${(confB * 100).toFixed(0)}%)`;
    } else {
      resolution = `Favoring ${conflict.agentB} (confidence ${(confB * 100).toFixed(0)}%) over ${conflict.agentA} (${(confA * 100).toFixed(0)}%)`;
    }

    return {
      agentA: conflict.agentA,
      agentB: conflict.agentB,
      winner,
      confidence: Math.round(confidence * 100) / 100,
      resolution,
    };
  }

  /**
   * Classify the overall situation based on aggregated risk, severities, and agreement.
   */
  _classifySituation(aggregatedRisk, agentSeverityMap, agentAgreement) {
    const emergencyCount = AGENT_KEYS.filter((k) => (agentSeverityMap[k] ?? 0) >= SEVERITY_ORD.emergency).length;
    const criticalCount = AGENT_KEYS.filter((k) => (agentSeverityMap[k] ?? 0) >= SEVERITY_ORD.critical).length;

    // Post-Incident: previously in Active Emergency but risk is dropping
    if (
      this.currentSituation === 'Active Emergency' &&
      aggregatedRisk < SITUATION_THRESHOLDS.ACTIVE &&
      emergencyCount === 0
    ) {
      return 'Post-Incident';
    }

    // Post-Incident → Normal only when risk fully subsides
    if (this.currentSituation === 'Post-Incident') {
      if (aggregatedRisk < SITUATION_THRESHOLDS.NORMAL && criticalCount === 0) {
        return 'Normal Operations';
      }
      return 'Post-Incident';
    }

    // Standard classification
    if (emergencyCount >= 2 || aggregatedRisk >= SITUATION_THRESHOLDS.ACTIVE) {
      return 'Active Emergency';
    }
    if (criticalCount >= 3 || aggregatedRisk >= SITUATION_THRESHOLDS.DEVELOPING) {
      return 'Developing Incident';
    }
    if (criticalCount >= 1 || aggregatedRisk >= SITUATION_THRESHOLDS.ELEVATED) {
      return 'Elevated Monitoring';
    }
    if (aggregatedRisk >= SITUATION_THRESHOLDS.NORMAL) {
      return 'Elevated Monitoring';
    }
    return 'Normal Operations';
  }

  /**
   * Determine escalation level (0-4) with cooldown logic.
   */
  _determineEscalation(aggregatedRisk, agentSeverityMap, agentAgreement) {
    const emergencyCount = AGENT_KEYS.filter((k) => (agentSeverityMap[k] ?? 0) >= SEVERITY_ORD.emergency).length;
    const criticalCount = AGENT_KEYS.filter((k) => (agentSeverityMap[k] ?? 0) >= SEVERITY_ORD.critical).length;

    let desiredLevel = 0;
    if (aggregatedRisk >= 0.85 || emergencyCount >= 3) {
      desiredLevel = 4;
    } else if (aggregatedRisk >= 0.65 || emergencyCount >= 1) {
      desiredLevel = 3;
    } else if (aggregatedRisk >= 0.45 || criticalCount >= 2) {
      desiredLevel = 2;
    } else if (aggregatedRisk >= 0.25 || criticalCount >= 1) {
      desiredLevel = 1;
    }

    // Low agreement amplifies perceived risk
    if (agentAgreement < 0.3 && desiredLevel < 2) {
      desiredLevel = Math.min(4, desiredLevel + 1);
    }

    // Cooldown: prevent rapid re-escalation
    const ticksSinceEscalation = this.tickCounter - this.lastEscalationTick;
    if (desiredLevel > this.escalationLevel && ticksSinceEscalation < this.escalationCooldown) {
      // Allow only if it's an extreme jump (≥2 levels)
      if (desiredLevel - this.escalationLevel < 2) {
        return this.escalationLevel;
      }
    }

    return desiredLevel;
  }

  /**
   * Pick a severity for the periodic summary message.
   */
  _summaryMessageSeverity(escalationLevel) {
    if (escalationLevel >= 4) return 'emergency';
    if (escalationLevel >= 3) return 'critical';
    if (escalationLevel >= 1) return 'warning';
    return 'info';
  }

  /**
   * Build a human-readable situation summary.
   */
  _buildSummaryText({
    situationClass,
    aggregatedRisk,
    agentAgreement,
    activeAgentCount,
    totalMessages,
    criticalAgents,
    emergencyAgents,
    escalationLevel,
    conflictCount,
  }) {
    const parts = [
      `Situation: ${situationClass} | Escalation Level: ${escalationLevel}/4`,
      `Aggregated Risk: ${(aggregatedRisk * 100).toFixed(1)}% | Consensus: ${(agentAgreement * 100).toFixed(0)}%`,
      `Active Agents: ${activeAgentCount}/${AGENT_KEYS.length} | Messages This Tick: ${totalMessages}`,
    ];

    if (emergencyAgents.length > 0) {
      parts.push(`EMERGENCY agents: ${emergencyAgents.join(', ')}`);
    }
    if (criticalAgents.length > 0) {
      parts.push(`Critical agents: ${criticalAgents.join(', ')}`);
    }
    if (conflictCount > 0) {
      parts.push(`Conflicts resolved: ${conflictCount}`);
    }

    return parts.join(' | ');
  }
}

export { SupervisorAgent };
