// ============================================================================
// ShieldAI — Cascade Agent
// Cross-zone and cross-system correlation analysis. Receives outputs from all
// Tier 1 specialist agents and performs higher-order fusion: cascade-failure
// detection, domino-effect modeling, inter-dependency mapping, and compound
// threat assessment.
// ============================================================================

import { GeminiAgent } from '../ai/GeminiAgent.js';

/**
 * Adjacency graph for the six industrial zones.
 * Used for domino-effect propagation and cross-zone correlation.
 * @type {Map<string, string[]>}
 */
const ZONE_ADJACENCY = new Map([
  ['Z-A', ['Z-B']],
  ['Z-B', ['Z-A', 'Z-C']],
  ['Z-C', ['Z-B', 'Z-D']],
  ['Z-D', ['Z-C', 'Z-E']],
  ['Z-E', ['Z-D', 'Z-F']],
  ['Z-F', ['Z-E']],
]);

/**
 * Known causal chains that represent cascade-failure sequences.
 * Each chain maps a root cause sensor type to the ordered sequence
 * of downstream effects expected to follow.
 */
const CAUSAL_CHAINS = [
  { id: 'cooling-thermal-gas', root: 'Pressure',  sequence: ['Temperature', 'CH4'],     label: 'Cooling Fail → Temp Rise → Gas Release' },
  { id: 'pressure-rupture',    root: 'Pressure',  sequence: ['Temperature'],             label: 'Pressure Surge → Thermal Stress' },
  { id: 'gas-cascade',         root: 'CH4',       sequence: ['H2S', 'CO'],               label: 'Primary Gas Leak → Secondary Toxic Release' },
  { id: 'thermal-decomp',      root: 'Temperature', sequence: ['NH3', 'H2S'],            label: 'Thermal Decomposition → Toxic Byproducts' },
  { id: 'ammonia-toxic',       root: 'NH3',       sequence: ['CO'],                      label: 'Ammonia Release → CO Generation' },
];

/** Decay factor applied per adjacency hop in domino modeling. */
const DOMINO_DECAY = 0.55;

/** Threshold above which a zone is considered "at risk". */
const ZONE_RISK_THRESHOLD = 0.45;

export class CascadeAgent {
  constructor() {
    this.name = 'Cascade';

    /** @type {Map<string, number>} Previous tick's per-zone risk scores. */
    this.previousZoneRisks = new Map();

    /** @type {object[]} History of detected cascade chains for trend analysis. */
    this.cascadeHistory = [];

    /** Maximum cascade history entries retained. */
    this.maxHistory = 50;

    /** @type {object} Dynamic Bayesian Network for causal reasoning. */
    this.bayesianNetwork = this._initBayesianNetwork();

    /** @type {object[]} Track co-occurrences to update probabilities. */
    this.observationHistory = [];

    /** How fast CPTs adapt via online learning. */
    this.learningRate = 0.05;

    // Gemini AI Reasoning
    this.geminiAgent = new GeminiAgent({
      agentName: 'CascadeAI',
      callInterval: 10,
      systemPrompt: `You are a Cascade Failure Analyst for an industrial chemical plant.
Given sensor data and zone risk levels, analyze:
1. Are elevated readings connected (common root cause) or independent?
2. What is the most likely failure cascade sequence?
3. What is the ROOT CAUSE driving the cascade?
4. Which zones are at HIGHEST risk of downstream effects?
5. What intervention would break the cascade chain?

Use industrial accident knowledge (domino theory, Swiss cheese model).
Think step-by-step about physical cause and effect.`,
    });
    this.lastAIAnalysis = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Correlates all Tier 1 agent outputs, detects cascade failures, and
   * performs cross-zone risk analysis.
   *
   * @param {object} agentResults - Combined Tier 1 outputs.
   * @param {object[]} sensors    - Current sensor array.
   * @param {object[]} zones      - Zone definitions.
   * @returns {{ messages: object[], riskFactors: object[], cascadeChains: object[], crossZoneCorrelations: object[] }}
   */
  evaluate(agentResults, sensors, zones) {
    const messages = [];
    const riskFactors = [];
    const cascadeChains = [];
    const crossZoneCorrelations = [];
    const now = new Date();

    // ── 1. Build per-zone risk profiles ─────────────────────────────────
    const zoneRiskMap = this._buildZoneRiskMap(agentResults, sensors, zones);

    // ── 2. Cascade failure detection ────────────────────────────────────
    const detectedChains = this._detectCascadeFailures(sensors, agentResults);
    for (const chain of detectedChains) {
      cascadeChains.push(chain);
      this.cascadeHistory.push({ ...chain, detectedAt: now });
      if (this.cascadeHistory.length > this.maxHistory) {
        this.cascadeHistory.shift();
      }

      const severity = chain.activatedSteps >= chain.totalSteps ? 'emergency' : 'critical';
      messages.push({
        agent: this.name,
        severity,
        text: `Cascade chain detected: ${chain.label} — ${chain.activatedSteps}/${chain.totalSteps} stages active in zone ${chain.originZone}`,
        timestamp: now,
        zone: chain.originZone,
      });
      riskFactors.push({
        sensorId: `cascade-${chain.id}`,
        value: Math.min(1, chain.activatedSteps / chain.totalSteps),
        weight: 0.9,
      });
    }

    // ── 3. Cross-zone risk correlation ──────────────────────────────────
    const correlations = this._analyzeZoneCorrelations(zoneRiskMap, zones);
    for (const corr of correlations) {
      crossZoneCorrelations.push(corr);
      if (corr.isSystemic) {
        messages.push({
          agent: this.name,
          severity: 'critical',
          text: `Systemic risk detected: ${corr.affectedZones.length} zones show correlated degradation (r=${corr.correlation.toFixed(2)}). Possible common-cause failure.`,
          timestamp: now,
        });
        riskFactors.push({
          sensorId: 'cross-zone-systemic',
          value: corr.correlation,
          weight: 0.85,
        });
      }
    }

    // ── 4. Domino effect modeling ────────────────────────────────────────
    const dominoRisks = this._modelDominoEffect(zoneRiskMap);
    for (const domino of dominoRisks) {
      if (domino.propagatedRisk > 0.3) {
        const sev = domino.propagatedRisk > 0.7 ? 'critical' : 'warning';
        messages.push({
          agent: this.name,
          severity: sev,
          text: `Domino risk: Zone ${domino.targetZone} faces propagated risk ${(domino.propagatedRisk * 100).toFixed(0)}% from incident in ${domino.sourceZone} (${domino.hops} hop${domino.hops > 1 ? 's' : ''} away)`,
          timestamp: now,
          zone: domino.targetZone,
        });
        riskFactors.push({
          sensorId: `domino-${domino.targetZone}`,
          value: domino.propagatedRisk,
          weight: 0.65,
        });
      }
    }

    // ── 5. Inter-dependency mapping ─────────────────────────────────────
    const depIssues = this._checkDependencies(sensors);
    for (const issue of depIssues) {
      messages.push({
        agent: this.name,
        severity: 'warning',
        text: `Dependency anomaly: ${issue.description}`,
        timestamp: now,
        zone: issue.zone,
      });
    }

    // ── 6. Compound threat assessment ───────────────────────────────────
    const compound = this._assessCompoundThreats(agentResults);
    if (compound.multiplier > 1.0) {
      const sev = compound.multiplier > 2.0 ? 'emergency'
               : compound.multiplier > 1.5 ? 'critical' : 'warning';
      messages.push({
        agent: this.name,
        severity: sev,
        text: `Compound threat: ${compound.criticalAgents} Tier-1 agents report elevated risk (multiplier ×${compound.multiplier.toFixed(1)}). ${compound.related ? 'Threats appear CORRELATED.' : 'Threats appear INDEPENDENT.'}`,
        timestamp: now,
      });
      riskFactors.push({
        sensorId: 'compound-threat',
        value: Math.min(1, compound.multiplier / 3),
        weight: 0.88,
      });
    }

    // ── 7. Data fusion summary ──────────────────────────────────────────
    const fusionSummary = this._fuseData(agentResults);
    if (fusionSummary.totalCritical > 0 || fusionSummary.totalEmergency > 0) {
      messages.push({
        agent: this.name,
        severity: fusionSummary.totalEmergency > 0 ? 'emergency' : 'critical',
        text: `Fused threat picture: ${fusionSummary.totalEmergency} emergency, ${fusionSummary.totalCritical} critical, ${fusionSummary.totalWarning} warning alerts across all subsystems`,
        timestamp: now,
      });
    }

    // ── 8. Update previous zone risks for next tick ─────────────────────
    for (const [zoneId, risk] of zoneRiskMap.entries()) {
      this.previousZoneRisks.set(zoneId, risk);
    }

    // ── 9. Dynamic Bayesian Network inference ───────────────────────────
    const evidence = this._buildEvidence(sensors, agentResults);
    const bayesianPosteriors = this._inferBayesianNetwork(evidence);

    // Generate messages for high-posterior nodes not directly observed
    for (const [node, posterior] of Object.entries(bayesianPosteriors)) {
      if (posterior > 0.5 && evidence[node] === undefined) {
        const sev = posterior > 0.8 ? 'emergency' : posterior > 0.65 ? 'critical' : 'warning';
        messages.push({
          agent: this.name,
          severity: sev,
          text: `BAYESIAN: P(${node}) = ${posterior.toFixed(2)} given ${Object.entries(evidence).filter(([, v]) => v === true).map(([k]) => k).join(' + ')} evidence`,
          timestamp: now,
        });
        riskFactors.push({
          sensorId: `bayesian-${node}`,
          value: posterior,
          weight: 0.75,
        });
      }
    }

    // Online learning: adapt CPTs based on current evidence as outcomes
    this._updateCPTs(evidence, evidence);

    // Fire-and-forget AI analysis (non-blocking)
    const aiContext = {
      sensorSummary: Object.fromEntries(
        [...new Set(sensors.map(s => s.type))].map(type => [
          type,
          sensors.filter(s => s.type === type).map(s => ({
            id: s.id,
            zone: s.zoneId,
            value: s.currentValue,
            warning: s.warningThreshold,
            critical: s.criticalThreshold,
            inAlarm: s.currentValue >= s.warningThreshold,
          })),
        ])
      ),
      zoneRiskMap: Object.fromEntries(zoneRiskMap.entries()),
      detectedCascades: cascadeChains.map(c => ({ id: c.id, label: c.label, zone: c.originZone, stages: `${c.activatedSteps}/${c.totalSteps}` })),
      compoundThreat: { multiplier: compound.multiplier, correlated: compound.related },
      dominoRisks: dominoRisks.filter(d => d.propagatedRisk > 0.3).map(d => ({ from: d.sourceZone, to: d.targetZone, risk: d.propagatedRisk })),
    };
    this.geminiAgent.analyze(aiContext).then(result => {
      if (result?.success) this.lastAIAnalysis = result.data;
    }).catch(() => {});

    return { messages, riskFactors, cascadeChains, crossZoneCorrelations, bayesianPosteriors, aiCascadeAnalysis: this.lastAIAnalysis };
  }

  /**
   * Clears all internal state for a fresh simulation run.
   */
  reset() {
    this.previousZoneRisks.clear();
    this.cascadeHistory = [];
    this.bayesianNetwork = this._initBayesianNetwork();
    this.observationHistory = [];
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Builds a per-zone aggregate risk score from all Tier 1 risk factors.
   * @param {object} agentResults
   * @param {object[]} sensors
   * @param {object[]} zones
   * @returns {Map<string, number>}
   */
  _buildZoneRiskMap(agentResults, sensors, zones) {
    const zoneRisk = new Map();
    for (const zone of zones) {
      zoneRisk.set(zone.id, 0);
    }

    // Build sensor → zone lookup
    const sensorZone = new Map();
    for (const s of sensors) {
      sensorZone.set(s.id, s.zoneId);
    }

    // Aggregate risk factors from every Tier 1 agent
    const allFactors = [];
    for (const key of Object.keys(agentResults)) {
      const result = agentResults[key];
      if (result && Array.isArray(result.riskFactors)) {
        allFactors.push(...result.riskFactors);
      }
    }

    // Accumulate weighted risk per zone
    const zoneCounts = new Map();
    for (const factor of allFactors) {
      const zone = sensorZone.get(factor.sensorId);
      if (zone && zoneRisk.has(zone)) {
        zoneRisk.set(zone, zoneRisk.get(zone) + factor.value * factor.weight);
        zoneCounts.set(zone, (zoneCounts.get(zone) || 0) + 1);
      }
    }

    // Normalize to [0,1]
    for (const [zoneId, total] of zoneRisk.entries()) {
      const count = zoneCounts.get(zoneId) || 1;
      zoneRisk.set(zoneId, Math.min(1, total / count));
    }

    return zoneRisk;
  }

  /**
   * Detects known cascade-failure chains by checking if root cause and
   * downstream sensors are simultaneously in alarm state.
   * @param {object[]} sensors
   * @param {object} agentResults
   * @returns {object[]}
   */
  _detectCascadeFailures(sensors, agentResults) {
    const detected = [];

    // Group sensors by zone and type for fast lookup
    const byZoneType = new Map();
    for (const s of sensors) {
      const key = `${s.zoneId}|${s.type}`;
      if (!byZoneType.has(key)) byZoneType.set(key, []);
      byZoneType.get(key).push(s);
    }

    // Collect all zones present in the sensor data
    const activeZones = new Set(sensors.map(s => s.zoneId));

    for (const zone of activeZones) {
      for (const chain of CAUSAL_CHAINS) {
        // Check root sensor
        const rootSensors = byZoneType.get(`${zone}|${chain.root}`) || [];
        const rootInAlarm = rootSensors.some(s =>
          s.currentValue >= s.warningThreshold
        );

        if (!rootInAlarm) continue;

        // Check downstream steps
        let activatedSteps = 1; // root is active
        const activatedTypes = [chain.root];

        for (const stepType of chain.sequence) {
          const stepSensors = byZoneType.get(`${zone}|${stepType}`) || [];
          const stepActive = stepSensors.some(s =>
            s.currentValue >= s.warningThreshold
          );
          if (stepActive) {
            activatedSteps++;
            activatedTypes.push(stepType);
          }
        }

        // Only report if at least 2 stages are active (root + 1 downstream)
        if (activatedSteps >= 2) {
          detected.push({
            id: chain.id,
            label: chain.label,
            originZone: zone,
            rootType: chain.root,
            activatedSteps,
            totalSteps: 1 + chain.sequence.length,
            activatedTypes,
            fullyRealized: activatedSteps === 1 + chain.sequence.length,
          });
        }
      }
    }

    return detected;
  }

  /**
   * Analyzes correlation between zone risk scores to distinguish systemic
   * failures from localized incidents.
   * @param {Map<string, number>} zoneRiskMap
   * @param {object[]} zones
   * @returns {object[]}
   */
  _analyzeZoneCorrelations(zoneRiskMap, zones) {
    const correlations = [];
    const riskValues = Array.from(zoneRiskMap.values());
    const elevatedZones = [];

    for (const [zoneId, risk] of zoneRiskMap.entries()) {
      if (risk > ZONE_RISK_THRESHOLD) {
        elevatedZones.push(zoneId);
      }
    }

    if (elevatedZones.length < 2) return correlations;

    // Calculate pairwise correlation with previous tick
    const prevValues = [];
    const currValues = [];
    for (const zoneId of elevatedZones) {
      const prev = this.previousZoneRisks.get(zoneId) ?? 0;
      prevValues.push(prev);
      currValues.push(zoneRiskMap.get(zoneId));
    }

    const correlation = this._pearsonCorrelation(prevValues, currValues);

    // Mean risk across elevated zones
    const meanRisk = riskValues.reduce((a, b) => a + b, 0) / riskValues.length;

    // Standard deviation
    const variance = riskValues.reduce((sum, v) => sum + (v - meanRisk) ** 2, 0) / riskValues.length;
    const stdDev = Math.sqrt(variance);

    // If many zones are above threshold and variance is low → systemic
    const isSystemic = elevatedZones.length >= 3 && stdDev < 0.15;

    correlations.push({
      affectedZones: elevatedZones,
      correlation: Math.abs(correlation),
      meanRisk,
      stdDev,
      isSystemic,
      type: isSystemic ? 'systemic' : 'localized',
    });

    return correlations;
  }

  /**
   * Models domino-effect propagation using BFS through the adjacency graph.
   * Applies decay per hop to estimate propagated risk to neighboring zones.
   * @param {Map<string, number>} zoneRiskMap
   * @returns {object[]}
   */
  _modelDominoEffect(zoneRiskMap) {
    const dominoRisks = [];

    for (const [sourceZone, sourceRisk] of zoneRiskMap.entries()) {
      if (sourceRisk < ZONE_RISK_THRESHOLD) continue;

      // BFS propagation from this zone
      const visited = new Set([sourceZone]);
      const queue = [{ zone: sourceZone, risk: sourceRisk, hops: 0 }];

      while (queue.length > 0) {
        const { zone, risk, hops } = queue.shift();
        const neighbors = ZONE_ADJACENCY.get(zone) || [];

        for (const neighbor of neighbors) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);

          const propagatedRisk = risk * DOMINO_DECAY;
          const neighborOwnRisk = zoneRiskMap.get(neighbor) || 0;
          const combinedRisk = Math.min(1, neighborOwnRisk + propagatedRisk * 0.5);

          dominoRisks.push({
            sourceZone,
            targetZone: neighbor,
            sourceRisk,
            propagatedRisk,
            combinedRisk,
            hops: hops + 1,
          });

          // Continue BFS if propagated risk is still significant
          if (propagatedRisk > 0.15) {
            queue.push({ zone: neighbor, risk: propagatedRisk, hops: hops + 1 });
          }
        }
      }
    }

    return dominoRisks;
  }

  /**
   * Checks inter-sensor dependencies within zones. When physically linked
   * quantities (e.g., pressure ↔ temperature) diverge beyond expected
   * ratios, flag an anomaly.
   * @param {object[]} sensors
   * @returns {object[]}
   */
  _checkDependencies(sensors) {
    const issues = [];

    // Known dependency pairs: if one is high and the other is low, something is wrong
    const dependencyPairs = [
      { typeA: 'Pressure', typeB: 'Temperature', label: 'Pressure-Temperature coupling' },
      { typeA: 'CH4', typeB: 'Temperature', label: 'Methane-Temperature coupling' },
    ];

    // Group sensors by zone
    const byZone = new Map();
    for (const s of sensors) {
      if (!byZone.has(s.zoneId)) byZone.set(s.zoneId, []);
      byZone.get(s.zoneId).push(s);
    }

    for (const [zone, zoneSensors] of byZone.entries()) {
      for (const pair of dependencyPairs) {
        const sensorsA = zoneSensors.filter(s => s.type === pair.typeA);
        const sensorsB = zoneSensors.filter(s => s.type === pair.typeB);

        for (const sa of sensorsA) {
          for (const sb of sensorsB) {
            const normA = this._normalize(sa);
            const normB = this._normalize(sb);
            const divergence = Math.abs(normA - normB);

            // If one sensor is highly elevated and the linked one isn't, flag it
            if (divergence > 0.5 && (normA > 0.7 || normB > 0.7)) {
              issues.push({
                zone,
                sensorA: sa.id,
                sensorB: sb.id,
                description: `${pair.label} divergence in zone ${zone}: ${sa.label} at ${(normA * 100).toFixed(0)}% vs ${sb.label} at ${(normB * 100).toFixed(0)}% — possible sensor fault or unexpected process state`,
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Assesses whether multiple Tier 1 agents reporting high risk indicates
   * a compound threat (correlated) or independent issues.
   * @param {object} agentResults
   * @returns {{ criticalAgents: number, multiplier: number, related: boolean }}
   */
  _assessCompoundThreats(agentResults) {
    const agentNames = Object.keys(agentResults);
    let criticalAgents = 0;
    const agentMaxRisks = [];
    const zonesPerAgent = new Map();

    for (const name of agentNames) {
      const result = agentResults[name];
      if (!result || !Array.isArray(result.riskFactors)) continue;

      const maxRisk = result.riskFactors.reduce((max, rf) => Math.max(max, rf.value), 0);
      agentMaxRisks.push(maxRisk);
      if (maxRisk > 0.6) criticalAgents++;

      // Track which zones each agent flags
      const flaggedZones = new Set();
      if (Array.isArray(result.messages)) {
        for (const msg of result.messages) {
          if (msg.zone) flaggedZones.add(msg.zone);
        }
      }
      zonesPerAgent.set(name, flaggedZones);
    }

    // Calculate overlap in flagged zones → indicates correlation
    let zoneOverlap = 0;
    let pairCount = 0;
    const names = Array.from(zonesPerAgent.keys());
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const zonesA = zonesPerAgent.get(names[i]);
        const zonesB = zonesPerAgent.get(names[j]);
        const overlap = [...zonesA].filter(z => zonesB.has(z)).length;
        const union = new Set([...zonesA, ...zonesB]).size;
        if (union > 0) zoneOverlap += overlap / union;
        pairCount++;
      }
    }

    const avgOverlap = pairCount > 0 ? zoneOverlap / pairCount : 0;
    const related = avgOverlap > 0.3;

    // Compound multiplier: more critical agents + correlation = higher multiplier
    const multiplier = criticalAgents <= 1 ? 1.0
      : related
        ? 1.0 + criticalAgents * 0.4
        : 1.0 + criticalAgents * 0.2;

    return { criticalAgents, multiplier, related };
  }

  /**
   * Fuses data from all Tier 1 agents into a unified alert count summary.
   * @param {object} agentResults
   * @returns {{ totalEmergency: number, totalCritical: number, totalWarning: number, totalInfo: number }}
   */
  _fuseData(agentResults) {
    let totalEmergency = 0;
    let totalCritical = 0;
    let totalWarning = 0;
    let totalInfo = 0;

    for (const key of Object.keys(agentResults)) {
      const result = agentResults[key];
      if (!result || !Array.isArray(result.messages)) continue;
      for (const msg of result.messages) {
        switch (msg.severity) {
          case 'emergency': totalEmergency++; break;
          case 'critical':  totalCritical++;  break;
          case 'warning':   totalWarning++;   break;
          case 'info':      totalInfo++;      break;
        }
      }
    }

    return { totalEmergency, totalCritical, totalWarning, totalInfo };
  }

  /**
   * Normalizes a sensor value to [0, 1] based on its normal range and
   * critical threshold.
   * @param {object} sensor
   * @returns {number}
   */
  _normalize(sensor) {
    const { currentValue, normalRange, criticalThreshold } = sensor;
    const min = normalRange?.min ?? 0;
    const max = criticalThreshold ?? normalRange?.max ?? 100;
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (currentValue - min) / (max - min)));
  }

  /**
   * Computes Pearson correlation coefficient between two equal-length arrays.
   * Returns 0 if inputs are degenerate.
   * @param {number[]} xs
   * @param {number[]} ys
   * @returns {number}
   */
  _pearsonCorrelation(xs, ys) {
    const n = xs.length;
    if (n < 2) return 0;

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  // ── Dynamic Bayesian Network ──────────────────────────────────────────

  /**
   * Initialises the Dynamic Bayesian Network with nodes representing
   * industrial failure modes and their conditional probability tables.
   *
   * @returns {object} Network definition with nodes and CPTs.
   * @private
   */
  _initBayesianNetwork() {
    // Conditional Probability Tables
    // P(effect | cause) — prior probabilities based on industrial safety knowledge
    return {
      nodes: {
        'cooling_failure':   { prior: 0.05, parents: [] },
        'power_failure':     { prior: 0.03, parents: [] },
        'valve_failure':     { prior: 0.04, parents: [] },
        'corrosion':         { prior: 0.06, parents: [] },
        'operator_error':    { prior: 0.08, parents: [] },
        'temp_rise':         { prior: 0.10, parents: ['cooling_failure', 'power_failure'], cpt: { '11': 0.95, '10': 0.80, '01': 0.60, '00': 0.10 } },
        'pressure_rise':     { prior: 0.08, parents: ['temp_rise', 'valve_failure'], cpt: { '11': 0.90, '10': 0.70, '01': 0.65, '00': 0.08 } },
        'gas_release':       { prior: 0.06, parents: ['pressure_rise', 'corrosion'], cpt: { '11': 0.92, '10': 0.60, '01': 0.45, '00': 0.06 } },
        'toxic_exposure':    { prior: 0.04, parents: ['gas_release', 'operator_error'], cpt: { '11': 0.88, '10': 0.65, '01': 0.30, '00': 0.04 } },
        'fire':              { prior: 0.02, parents: ['gas_release', 'temp_rise'], cpt: { '11': 0.85, '10': 0.35, '01': 0.20, '00': 0.02 } },
        'explosion':         { prior: 0.01, parents: ['fire', 'pressure_rise'], cpt: { '11': 0.80, '10': 0.25, '01': 0.15, '00': 0.01 } },
      }
    };
  }

  /**
   * Performs inference on the Bayesian Network given observed evidence.
   * Uses forward propagation with soft evidence weighting.
   *
   * @param {object} evidence - Map of node names to boolean observations.
   * @returns {object} Posterior probabilities for all nodes.
   * @private
   */
  _inferBayesianNetwork(evidence) {
    // Evidence = { 'temp_rise': true, 'pressure_rise': true, ... }
    // Use variable elimination / forward sampling to compute posteriors

    const posteriors = {};
    const nodes = this.bayesianNetwork.nodes;

    for (const [nodeName, node] of Object.entries(nodes)) {
      if (evidence[nodeName] !== undefined) {
        posteriors[nodeName] = evidence[nodeName] ? 1.0 : 0.0;
        continue;
      }

      if (node.parents.length === 0) {
        posteriors[nodeName] = node.prior;
        continue;
      }

      // Compute P(node | parents) using CPT
      const parentStates = node.parents.map(p => (posteriors[p] ?? evidence[p] ?? node.prior) > 0.5 ? '1' : '0').join('');
      const cpProb = node.cpt?.[parentStates] ?? node.prior;

      // Weight by parent certainty (soft evidence)
      const parentCertainty = node.parents.reduce((prod, p) => {
        const pProb = posteriors[p] ?? evidence[p] ?? nodes[p]?.prior ?? 0.5;
        return prod * (2 * Math.abs(pProb - 0.5));  // 0 = uncertain, 1 = certain
      }, 1);

      posteriors[nodeName] = cpProb * parentCertainty + node.prior * (1 - parentCertainty);
    }

    return posteriors;
  }

  /**
   * Maps live sensor readings to Bayesian network evidence nodes.
   *
   * @param {object[]} sensors      - Current sensor array.
   * @param {object}   agentResults - Combined Tier 1 outputs.
   * @returns {object} Evidence map { nodeName: boolean }.
   * @private
   */
  _buildEvidence(sensors, agentResults) {
    // Map sensor readings to Bayesian network evidence
    const evidence = {};

    // Temperature sensors above warning → temp_rise evidence
    const tempSensors = sensors.filter(s => s.type === 'Temperature');
    evidence.temp_rise = tempSensors.some(s => s.currentValue > s.warningThreshold);

    // Pressure sensors above warning → pressure_rise
    const pressureSensors = sensors.filter(s => s.type === 'Pressure');
    evidence.pressure_rise = pressureSensors.some(s => s.currentValue > s.warningThreshold);

    // Gas sensors (CH4, CO, H2S, NH3) above warning → gas_release
    const gasSensors = sensors.filter(s => ['CH4', 'CO', 'H2S', 'NH3'].includes(s.type));
    evidence.gas_release = gasSensors.some(s => s.currentValue > s.warningThreshold);

    // If temp is high AND gas is present → potential fire
    evidence.fire = evidence.temp_rise && evidence.gas_release;

    // Toxic gases specifically
    const toxicSensors = sensors.filter(s => ['H2S', 'NH3', 'CO'].includes(s.type));
    evidence.toxic_exposure = toxicSensors.some(s => s.currentValue > s.warningThreshold);

    return evidence;
  }

  /**
   * Online learning: adjusts CPTs based on observed co-occurrences using
   * an exponential moving average update.
   *
   * @param {object} evidence - Current evidence map.
   * @param {object} outcomes - Observed outcomes map.
   * @private
   */
  _updateCPTs(evidence, outcomes) {
    // Online learning: adjust CPTs based on observed co-occurrences
    const nodes = this.bayesianNetwork.nodes;
    for (const [nodeName, node] of Object.entries(nodes)) {
      if (!node.cpt || !node.parents.length) continue;
      const parentKey = node.parents.map(p => evidence[p] ? '1' : '0').join('');
      if (node.cpt[parentKey] !== undefined) {
        const observed = outcomes[nodeName] ? 1 : 0;
        // Exponential moving average update
        node.cpt[parentKey] = node.cpt[parentKey] * (1 - this.learningRate) + observed * this.learningRate;
      }
    }
  }
}
