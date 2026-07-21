import React, { useState, useMemo } from 'react';
import {
  Activity, Brain, Shield, Eye, Flame, Wind, Radio, Users,
  Zap, AlertTriangle, ChevronDown, ChevronRight, Clock,
  MessageSquare, TrendingUp, Cpu, Network, Layers, Target,
  Gauge, BarChart3, Workflow,
} from 'lucide-react';

/**
 * AgentNetworkPanel — Interactive 3-tier agent network visualization.
 *
 * Displays all 20 ShieldAI agents organized into:
 *   • Tier 3 (Meta)         — 2 agents: Orchestrator, Predictive
 *   • Tier 2 (Coordinators) — 5 agents: Compound Risk, Emergency, Resource, etc.
 *   • Tier 1 (Specialists)  — 13 agents: SCADA, Vision, Gas, Weather, etc.
 *
 * Features:
 *   - Glassmorphism agent cards with health dots & pulse animations
 *   - Animated data-flow lines between tiers
 *   - Situation banner, consensus gauge, escalation indicator
 *   - Click-to-expand agent cards showing latest messages
 *   - Collapsible tier sections
 */

/* ── Agent taxonomy ────────────────────────────────────────── */
const AGENT_TIERS = {
  tier3: {
    label: 'Meta Agents',
    color: 'var(--accent-purple)',
    glow: 'rgba(139, 92, 246, 0.35)',
    agents: [
      { key: 'orchestrator', name: 'Orchestrator', icon: Brain },
      { key: 'predictive', name: 'Predictive', icon: TrendingUp },
    ],
  },
  tier2: {
    label: 'Coordinator Agents',
    color: 'var(--accent-cyan)',
    glow: 'rgba(6, 182, 212, 0.30)',
    agents: [
      { key: 'compoundRisk', name: 'Compound Risk', icon: Layers },
      { key: 'emergency', name: 'Emergency', icon: AlertTriangle },
      { key: 'resource', name: 'Resource Mgr', icon: Gauge },
      { key: 'cascade', name: 'Cascade Detector', icon: Workflow },
      { key: 'coverage', name: 'Coverage Monitor', icon: Target },
    ],
  },
  tier1: {
    label: 'Specialist Agents',
    color: 'var(--accent-info)',
    glow: 'rgba(59, 130, 246, 0.25)',
    agents: [
      { key: 'scada', name: 'SCADA', icon: Cpu },
      { key: 'vision', name: 'Vision', icon: Eye },
      { key: 'gas', name: 'Gas Detection', icon: Wind },
      { key: 'weather', name: 'Weather', icon: Wind },
      { key: 'worker', name: 'Worker Safety', icon: Users },
      { key: 'fire', name: 'Fire', icon: Flame },
      { key: 'electrical', name: 'Electrical', icon: Zap },
      { key: 'radiation', name: 'Radiation', icon: Radio },
      { key: 'structural', name: 'Structural', icon: Shield },
      { key: 'acoustic', name: 'Acoustic', icon: Activity },
      { key: 'chemical', name: 'Chemical', icon: Activity },
      { key: 'compliance', name: 'Compliance', icon: Shield },
      { key: 'historical', name: 'Historical', icon: BarChart3 },
    ],
  },
};

/* ── Situation class → styling map ─────────────────────────── */
const SITUATION_STYLES = {
  'Normal Operations': { bg: 'var(--accent-safe)', text: '#064e3b', emoji: '✅' },
  'Elevated Monitoring': { bg: 'var(--accent-warning)', text: '#78350f', emoji: '⚡' },
  'High Alert': { bg: '#f97316', text: '#7c2d12', emoji: '🔶' },
  'Critical Emergency': { bg: 'var(--accent-danger)', text: '#fff', emoji: '🚨' },
  'Cascade Failure': { bg: '#dc2626', text: '#fff', emoji: '💥' },
};

/* ── Escalation level config ───────────────────────────────── */
const ESCALATION_LEVELS = [
  { label: 'Green', color: '#10b981' },
  { label: 'Blue', color: '#3b82f6' },
  { label: 'Yellow', color: '#f59e0b' },
  { label: 'Orange', color: '#f97316' },
  { label: 'Red', color: '#ef4444' },
];

/* ── Helper: get health status for an agent ────────────────── */
function getHealthStatus(agentKey, agentHealth) {
  if (!agentHealth) return 'unknown';
  const h = agentHealth[agentKey];
  if (!h) return 'unknown';
  if (h.healthy === false) return 'critical';
  if (h.avgDuration > 2000) return 'degraded';
  return 'healthy';
}

function getHealthColor(status) {
  switch (status) {
    case 'healthy': return 'var(--accent-safe)';
    case 'degraded': return 'var(--accent-warning)';
    case 'critical': return 'var(--accent-danger)';
    default: return 'var(--text-muted)';
  }
}

/* ── Main Component ────────────────────────────────────────── */
export default function AgentNetworkPanel({
  agentResults = {},
  agentHealth = {},
  agentProfiles = {},
  situationClass = 'Normal Operations',
  agentAgreement = 1,
  escalationLevel = 0,
  tierBreakdown = { tier1: 13, tier2: 5, tier3: 2 },
  agentCount = 20,
  cascadeChains = [],
  predictions = [],
  recommendations = [],
  coverageMap = {},
}) {
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [collapsedTiers, setCollapsedTiers] = useState({});

  const sitStyle = SITUATION_STYLES[situationClass] || SITUATION_STYLES['Normal Operations'];

  const toggleTier = (tierKey) =>
    setCollapsedTiers((prev) => ({ ...prev, [tierKey]: !prev[tierKey] }));

  const toggleAgent = (agentKey) =>
    setExpandedAgent((prev) => (prev === agentKey ? null : agentKey));

  /* Gather messages for an agent */
  const getAgentMessages = (agentKey) => {
    const result = agentResults[agentKey];
    if (!result) return [];
    if (Array.isArray(result.messages)) return result.messages.slice(-4);
    if (result.message) return [{ text: result.message }];
    return [];
  };

  /* Consensus gauge arc computation */
  const agreementPct = Math.round(agentAgreement * 100);


  return (
    <div className="agent-network-panel">
      {/* ── Situation Banner ── */}
      <div
        className="situation-banner"
        style={{
          '--sit-bg': sitStyle.bg,
          '--sit-text': sitStyle.text,
        }}
      >
        <span className="sit-emoji">{sitStyle.emoji}</span>
        <span className="sit-label">{situationClass}</span>
        <span className="sit-count">
          <Network size={12} /> {agentCount} agents
        </span>
      </div>

      {/* ── Metrics Strip ── */}
      <div className="anp-metrics-strip">
        {/* Consensus Gauge */}
        <div className="consensus-gauge" title={`Agent agreement: ${agreementPct}%`}>
          <svg viewBox="0 0 100 55" className="gauge-svg">
            <path
              d="M10 50 A40 40 0 0 1 90 50"
              fill="none"
              stroke="rgba(148,163,184,0.15)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M10 50 A40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${agentAgreement * 126} 126`}
            />
            <defs>
              <linearGradient id="gaugeGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="var(--accent-danger)" />
                <stop offset="50%" stopColor="var(--accent-warning)" />
                <stop offset="100%" stopColor="var(--accent-safe)" />
              </linearGradient>
            </defs>
            <text x="50" y="48" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700">
              {agreementPct}%
            </text>
          </svg>
          <span className="gauge-label">Consensus</span>
        </div>

        {/* Escalation Level */}
        <div className="escalation-indicator">
          <span className="esc-title">Escalation</span>
          <div className="esc-steps">
            {ESCALATION_LEVELS.map((lvl, i) => (
              <div
                key={i}
                className={`esc-step ${i <= escalationLevel ? 'active' : ''}`}
                style={{
                  '--step-color': lvl.color,
                }}
                title={`Level ${i}: ${lvl.label}`}
              />
            ))}
          </div>
          <span className="esc-label">{ESCALATION_LEVELS[escalationLevel]?.label ?? 'Unknown'}</span>
        </div>

        {/* Tier Breakdown */}
        <div className="tier-breakdown-strip">
          {Object.entries(tierBreakdown).map(([key, val]) => (
            <span key={key} className={`tier-badge tier-badge-${key}`}>
              {key.toUpperCase().replace('TIER', 'T')}: {val}
            </span>
          ))}
        </div>

        {/* Cascade Warning */}
        {cascadeChains.length > 0 && (
          <div className="cascade-warning">
            <AlertTriangle size={12} />
            <span>{cascadeChains.length} cascade chain{cascadeChains.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Tier Sections ── */}
      <div className="anp-tiers-container">
        {/* Animated flow lines between tiers */}
        <div className="tier-flow-lines">
          <div className="tier-flow-line line-t3-t2" />
          <div className="tier-flow-line line-t2-t1" />
        </div>

        {Object.entries(AGENT_TIERS).map(([tierKey, tier]) => {
          const isCollapsed = collapsedTiers[tierKey];

          return (
            <div key={tierKey} className={`agent-tier-section ${tierKey}`}>
              <button
                className="tier-header"
                onClick={() => toggleTier(tierKey)}
                style={{ '--tier-color': tier.color, '--tier-glow': tier.glow }}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span className="tier-label">{tier.label}</span>
                <span className="tier-count">{tier.agents.length}</span>
              </button>

              {!isCollapsed && (
                <div className="tier-agents-grid">
                  {tier.agents.map((agent) => {
                    const health = getHealthStatus(agent.key, agentHealth);
                    const healthColor = getHealthColor(health);
                    const profile = agentProfiles[agent.key] || {};
                    const isExpanded = expandedAgent === agent.key;
                    const Icon = agent.icon;
                    const msgs = getAgentMessages(agent.key);

                    return (
                      <div
                        key={agent.key}
                        className={`agent-card ${isExpanded ? 'agent-card-expanded' : ''} ${health}`}
                        style={{ '--health-color': healthColor, '--tier-color': tier.color }}
                        onClick={() => toggleAgent(agent.key)}
                      >
                        <div className="agent-card-header">
                          <div className={`agent-health-dot ${health}`} />
                          <Icon size={14} className="agent-icon" />
                          <span className="agent-name">{agent.name}</span>
                        </div>

                        <div className="agent-card-stats">
                          <span title="Messages">
                            <MessageSquare size={10} /> {profile.messageCount ?? 0}
                          </span>
                          <span title="Last duration">
                            <Clock size={10} /> {profile.lastDuration ? `${profile.lastDuration}ms` : '—'}
                          </span>
                          {(profile.errors ?? 0) > 0 && (
                            <span className="agent-errors" title="Errors">
                              ⚠ {profile.errors}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="agent-detail-expand">
                            <div className="agent-detail-row">
                              <span>Total Runs</span>
                              <strong>{profile.totalRuns ?? 0}</strong>
                            </div>
                            <div className="agent-detail-row">
                              <span>Avg Duration</span>
                              <strong>{profile.avgDuration ? `${Math.round(profile.avgDuration)}ms` : '—'}</strong>
                            </div>

                            {msgs.length > 0 && (
                              <div className="agent-messages-list">
                                <span className="agent-msg-title">Latest Messages</span>
                                {msgs.map((m, i) => (
                                  <div key={i} className={`agent-msg-item ${m.severity ?? ''}`}>
                                    {m.text || m.message || JSON.stringify(m).slice(0, 80)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Predictions & Recommendations footer ── */}
      {(predictions.length > 0 || recommendations.length > 0) && (
        <div className="anp-footer">
          {predictions.length > 0 && (
            <div className="anp-footer-section">
              <TrendingUp size={12} />
              <span>{predictions.length} prediction{predictions.length !== 1 ? 's' : ''} active</span>
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="anp-footer-section">
              <Gauge size={12} />
              <span>{recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
