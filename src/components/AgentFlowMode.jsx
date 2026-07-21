import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Cpu, Eye, Shield, AlertTriangle, Activity, Brain, Wind, Radio,
  Users, Zap, Clock, TrendingUp, Layers, Target, Gauge, Workflow,
  BarChart3, FileText, Wrench, GraduationCap, Route, MessageSquare,
  ClipboardCheck, X, ChevronRight, ArrowUpRight, Sparkles, Network,
  HeartPulse, Flame, Search, BookOpen, CircleDot,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AGENT FLOW MODE — Crown Jewel Visualization
   20-agent tiered architecture with real-time SVG data flow
   ═══════════════════════════════════════════════════════════════ */

// ── Keyframe Animations ──────────────────────────────────────────
const KEYFRAMES = `
@keyframes agentPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}
@keyframes statusGlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}
@keyframes statusGlowFast {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.6); }
}
@keyframes flowParticle {
  0% { offset-distance: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
@keyframes bannerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes cardHighlight {
  0% { border-color: rgba(99, 102, 241, 0.5); }
  100% { border-color: rgba(99, 102, 241, 0.1); }
}
@keyframes riskBarFill {
  from { width: 0%; }
}
@keyframes slideDown {
  from { max-height: 0; opacity: 0; }
  to { max-height: 600px; opacity: 1; }
}
@keyframes messageSlide {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes particleFlow {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}
@keyframes bgShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// ── Agent Definitions ────────────────────────────────────────────
const AGENT_ICONS = {
  scada: Cpu, vision: Eye, permit: ClipboardCheck, pattern: Search,
  compliance: Shield, environmental: Wind, fatigue: HeartPulse,
  maintenance: Wrench, training: GraduationCap, emergency: AlertTriangle,
  evacuation: Route, communication: Radio, audit: FileText,
  cascade: Workflow, predictive: TrendingUp, resource: Gauge,
  supervisor: Brain, meta: Network,
};

const AI_AGENTS = new Set(['scada', 'supervisor', 'cascade', 'pattern', 'emergency', 'compliance']);

const TIER_DEFS = {
  tier3: {
    label: 'Tier 3 — Meta Intelligence',
    keys: ['supervisor', 'meta'],
    glow: 'rgba(139, 92, 246, 0.3)',
    border: 'rgba(139, 92, 246, 0.25)',
    accent: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.06)',
  },
  tier2: {
    label: 'Tier 2 — Coordinators',
    keys: ['cascade', 'predictive', 'resource'],
    glow: 'rgba(6, 182, 212, 0.3)',
    border: 'rgba(6, 182, 212, 0.25)',
    accent: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.05)',
  },
  tier1: {
    label: 'Tier 1 — Specialists',
    keys: [
      'scada', 'vision', 'permit', 'pattern', 'compliance',
      'environmental', 'fatigue', 'maintenance', 'training',
      'emergency', 'evacuation', 'communication', 'audit',
    ],
    glow: 'rgba(59, 130, 246, 0.2)',
    border: 'rgba(59, 130, 246, 0.18)',
    accent: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.04)',
  },
};

const SITUATION_COLORS = {
  'Normal Operations': '#10b981',
  'Elevated': '#f59e0b',
  'Warning': '#f97316',
  'Critical': '#ef4444',
  'Emergency': '#dc2626',
};

const SEVERITY_COLORS = {
  low: '#10b981', info: '#38bdf8', medium: '#f59e0b',
  high: '#f97316', critical: '#ef4444', emergency: '#dc2626',
};

const getSeverityColor = (sev) => SEVERITY_COLORS[sev] || '#64748b';

const getSituationColor = (sit) => {
  if (!sit) return '#10b981';
  for (const [k, v] of Object.entries(SITUATION_COLORS)) {
    if (sit.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#10b981';
};

// ── Helper Functions ─────────────────────────────────────────────
function getAgentStatus(health) {
  if (!health) return { color: '#475569', label: 'Idle', speed: '0s' };
  if (!health.healthy) return { color: '#ef4444', label: 'Critical', speed: '0.5s' };
  if (health.avgDuration > 500) return { color: '#f59e0b', label: 'Degraded', speed: '1.2s' };
  return { color: '#10b981', label: 'Healthy', speed: '2s' };
}

function getMaxRisk(riskFactors) {
  if (!riskFactors || !riskFactors.length) return 0;
  return Math.max(...riskFactors.map(r => (r.value || 0) * (r.weight || 1)));
}

function riskToColor(val) {
  if (val >= 0.8) return '#ef4444';
  if (val >= 0.6) return '#f97316';
  if (val >= 0.4) return '#f59e0b';
  if (val >= 0.2) return '#38bdf8';
  return '#10b981';
}

function getCriticalMessage(messages) {
  if (!messages || !messages.length) return null;
  const order = ['emergency', 'critical', 'high', 'medium', 'info', 'low'];
  const sorted = [...messages].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  return sorted[0];
}

function truncate(str, n = 48) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function getAIAnalysis(key, agentResults) {
  const r = agentResults[key];
  if (!r) return null;
  return r.aiAnalysis || r.aiSCADAAnalysis || r.aiCascadeAnalysis ||
    r.aiPatternAnalysis || r.aiEmergencyAnalysis || r.aiComplianceAnalysis || null;
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

// ── Situation Banner ─────────────────────────────────────────────
function SituationBanner({ situationClass, riskScore, agentAgreement, escalationLevel, neuralAnomaly }) {
  const sitColor = getSituationColor(situationClass);
  const isEmergency = situationClass?.toLowerCase().includes('emergency');
  const riskPct = Math.round((riskScore || 0) * 100);
  const agreePct = Math.round((agentAgreement || 0) * 100);

  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, ${sitColor}15 100%)`,
      borderRadius: 16, padding: '16px 24px',
      border: `1px solid ${sitColor}40`,
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      animation: isEmergency ? 'bannerPulse 1.2s ease-in-out infinite' : 'none',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Shimmer overlay for emergencies */}
      {isEmergency && <div style={{
        position: 'absolute', inset: 0, opacity: 0.08,
        background: `linear-gradient(90deg, transparent, ${sitColor}, transparent)`,
        backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite',
      }} />}

      {/* Situation class badge */}
      <div style={{
        background: sitColor + '22', border: `1px solid ${sitColor}55`,
        borderRadius: 10, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <CircleDot size={14} style={{ color: sitColor }} />
        <span style={{ color: sitColor, fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>
          {situationClass || 'Normal Operations'}
        </span>
      </div>

      {/* Risk gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Risk</span>
        <div style={{
          width: 80, height: 6, borderRadius: 3,
          background: 'rgba(30,41,59,0.8)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${riskPct}%`, height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, #10b981, #f59e0b, #ef4444)`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <span style={{ color: riskToColor(riskScore), fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
          {riskPct}%
        </span>
      </div>

      {/* Agent agreement */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={13} style={{ color: '#94a3b8' }} />
        <span style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Consensus
        </span>
        <span style={{
          color: agreePct >= 80 ? '#10b981' : agreePct >= 50 ? '#f59e0b' : '#ef4444',
          fontWeight: 700, fontSize: 13, fontFamily: 'monospace',
        }}>
          {agreePct}%
        </span>
      </div>

      {/* Escalation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={13} style={{ color: escalationLevel >= 3 ? '#ef4444' : '#94a3b8' }} />
        <span style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Escalation
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 2,
              background: i <= escalationLevel
                ? (escalationLevel >= 3 ? '#ef4444' : escalationLevel >= 2 ? '#f59e0b' : '#10b981')
                : 'rgba(51,65,85,0.5)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Neural anomaly */}
      {neuralAnomaly && (
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          background: neuralAnomaly.isAnomaly ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${neuralAnomaly.isAnomaly ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)'}`,
          borderRadius: 8, padding: '5px 12px',
        }}>
          <Activity size={12} style={{ color: neuralAnomaly.isAnomaly ? '#ef4444' : '#10b981' }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: neuralAnomaly.isAnomaly ? '#ef4444' : '#10b981',
          }}>
            {neuralAnomaly.isAnomaly ? `Anomaly ${Math.round((neuralAnomaly.anomalyScore || 0) * 100)}%` : 'Neural OK'}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Agent Card ───────────────────────────────────────────────────
function AgentCard({ agentKey, tierDef, agentResults, agentHealth, agentProfiles, isExpanded, onToggle, isAnyExpanded }) {
  const result = agentResults[agentKey];
  const health = agentHealth[agentKey];
  const profile = agentProfiles[agentKey];
  const Icon = AGENT_ICONS[agentKey] || Cpu;
  const isAI = AI_AGENTS.has(agentKey);
  const status = getAgentStatus(health);
  const messages = result?.messages || [];
  const riskFactors = result?.riskFactors || [];
  const maxRisk = getMaxRisk(riskFactors);
  const critMsg = getCriticalMessage(messages);
  const isIdle = !result;
  const agentName = profile?.name || agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
  const isTier3 = tierDef.keys.length <= 2 && tierDef.accent === '#8b5cf6';
  const isTier2 = tierDef.keys.length === 3 && tierDef.accent === '#06b6d4';

  const cardMinWidth = isTier3 ? 320 : isTier2 ? 260 : 200;

  return (
    <div
      onClick={() => onToggle(agentKey)}
      style={{
        background: isIdle
          ? 'rgba(30, 41, 59, 0.4)'
          : `linear-gradient(145deg, rgba(30,41,59,0.85), rgba(30,41,59,0.65))`,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isExpanded ? tierDef.accent + '60' : isIdle ? 'rgba(51,65,85,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        padding: isTier3 ? '16px 20px' : isTier2 ? '14px 16px' : '12px 14px',
        minWidth: cardMinWidth,
        flex: isTier3 ? '1 1 320px' : isTier2 ? '1 1 260px' : '1 1 200px',
        maxWidth: isTier3 ? 480 : isTier2 ? 380 : 280,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        opacity: isAnyExpanded && !isExpanded ? 0.5 : 1,
        boxShadow: isExpanded
          ? `0 0 24px ${tierDef.glow}, 0 8px 32px rgba(0,0,0,0.3)`
          : `0 2px 12px rgba(0,0,0,0.15)`,
        animation: messages.length > 0 && !isIdle ? 'fadeIn 0.4s ease' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: isIdle ? 'transparent' : `linear-gradient(90deg, transparent, ${tierDef.accent}80, transparent)`,
      }} />

      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {/* Icon */}
        <div style={{
          width: isTier3 ? 38 : 32, height: isTier3 ? 38 : 32,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${tierDef.accent}18`, border: `1px solid ${tierDef.accent}30`,
        }}>
          <Icon size={isTier3 ? 20 : 16} style={{ color: isIdle ? '#475569' : tierDef.accent }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              color: isIdle ? '#64748b' : '#e2e8f0', fontWeight: 700,
              fontSize: isTier3 ? 14 : 12.5, letterSpacing: 0.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {agentName}
            </span>
            {isAI && (
              <span style={{
                background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 700,
                color: '#a78bfa', letterSpacing: 0.5, whiteSpace: 'nowrap',
              }}>
                🧠 AI
              </span>
            )}
          </div>
          {/* Description for tier 3 */}
          {isTier3 && profile?.description && (
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.description}
            </div>
          )}
        </div>

        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: status.color,
            animation: status.speed !== '0s' ? `statusGlow${status.color === '#ef4444' ? 'Fast' : ''} ${status.speed} ease-in-out infinite` : 'none',
            boxShadow: `0 0 6px ${status.color}60`,
          }} />
          {/* Msg count badge */}
          {messages.length > 0 && (
            <span style={{
              background: tierDef.accent + '25', color: tierDef.accent,
              borderRadius: 6, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              minWidth: 18, textAlign: 'center',
            }}>
              {messages.length}
            </span>
          )}
        </div>
      </div>

      {/* Risk bar */}
      <div style={{
        width: '100%', height: 3, borderRadius: 2,
        background: 'rgba(51,65,85,0.5)', marginBottom: 6, overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(maxRisk * 100, 100)}%`, height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, #10b981, ${riskToColor(maxRisk)})`,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      {/* Footer: critical msg + duration */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{
          flex: 1, fontSize: 10, color: critMsg ? getSeverityColor(critMsg.severity) : '#475569',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
          fontStyle: isIdle ? 'italic' : 'normal',
        }}>
          {isIdle ? 'Idle — no data' : critMsg ? truncate(critMsg.text, isTier3 ? 60 : 40) : 'No messages'}
        </div>
        {health?.avgDuration != null && (
          <span style={{
            fontSize: 9, color: '#475569', fontFamily: 'monospace',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {Math.round(health.avgDuration)}ms
          </span>
        )}
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 12, paddingTop: 12,
            borderTop: `1px solid ${tierDef.accent}25`,
            animation: 'slideDown 0.35s ease',
            overflow: 'hidden',
          }}
        >
          <ExpandedDetails
            agentKey={agentKey}
            agentResults={agentResults}
            riskFactors={riskFactors}
            messages={messages}
            health={health}
            tierDef={tierDef}
            onClose={() => onToggle(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Expanded Details Panel ───────────────────────────────────────
function ExpandedDetails({ agentKey, agentResults, riskFactors, messages, health, tierDef, onClose }) {
  const aiData = getAIAnalysis(agentKey, agentResults);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Close button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(100,116,139,0.3)',
            borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Health Stats */}
      {health && (
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap',
          background: 'rgba(15,23,42,0.4)', borderRadius: 8, padding: '8px 12px',
        }}>
          <MiniStat label="Avg Duration" value={`${Math.round(health.avgDuration || 0)}ms`} icon={<Clock size={10} />} />
          <MiniStat label="Calls" value={health.callCount || 0} icon={<Activity size={10} />} />
          <MiniStat label="Status" value={health.healthy ? 'Healthy' : 'Unhealthy'} icon={<HeartPulse size={10} />}
            color={health.healthy ? '#10b981' : '#ef4444'} />
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Messages ({messages.length})
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.slice(0, 12).map((msg, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                background: 'rgba(15,23,42,0.3)', borderRadius: 6, padding: '5px 8px',
                borderLeft: `2px solid ${getSeverityColor(msg.severity)}`,
              }}>
                <span style={{
                  fontSize: 8, fontWeight: 700, color: getSeverityColor(msg.severity),
                  textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', marginTop: 1,
                  background: getSeverityColor(msg.severity) + '15', padding: '1px 4px', borderRadius: 3,
                }}>
                  {msg.severity || 'info'}
                </span>
                <span style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.3, flex: 1, wordBreak: 'break-word' }}>
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Risk Factors ({riskFactors.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {riskFactors.slice(0, 8).map((rf, i) => {
              const val = (rf.value || 0) * (rf.weight || 1);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(15,23,42,0.3)', borderRadius: 6, padding: '4px 8px',
                }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rf.factor}
                  </span>
                  {rf.zone && (
                    <span style={{ fontSize: 8, color: '#64748b', background: 'rgba(51,65,85,0.5)', padding: '1px 4px', borderRadius: 3 }}>
                      {rf.zone}
                    </span>
                  )}
                  <div style={{ width: 50, height: 3, borderRadius: 2, background: 'rgba(51,65,85,0.5)', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{
                      width: `${Math.min(val * 100, 100)}%`, height: '100%', borderRadius: 2,
                      background: riskToColor(val),
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: riskToColor(val), fontFamily: 'monospace', fontWeight: 600, width: 30, textAlign: 'right' }}>
                    {(val * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {aiData && (
        <div style={{
          background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: 8, padding: '8px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Sparkles size={11} style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              AI Analysis
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: '#c4b5fd', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {typeof aiData === 'string' ? aiData : JSON.stringify(aiData, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: '#475569' }}>{icon}</span>
      <span style={{ fontSize: 9, color: '#64748b', letterSpacing: 0.3 }}>{label}</span>
      <span style={{ fontSize: 10, color: color || '#94a3b8', fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

// ── Data Flow SVG ────────────────────────────────────────────────
function DataFlowSVG({ riskScore, escalationLevel }) {
  const isCritical = riskScore > 0.6;
  const particleColor = isCritical ? '#ef4444' : '#22d3ee';
  const glowColor = isCritical ? 'rgba(239,68,68,0.5)' : 'rgba(34,211,238,0.4)';
  const speed = isCritical ? '1.5s' : '3s';
  const nodeCount = 5;

  // Create flow paths from bottom to top
  const paths = useMemo(() => {
    const result = [];
    // T1 → T2 connections (left, center-left, center, center-right, right)
    const t1Xs = [80, 200, 320, 440, 560, 680, 800];
    const t2Xs = [200, 420, 640];
    const t3Xs = [320, 540];

    // T1 to T2
    t1Xs.forEach((x1, i) => {
      const x2 = t2Xs[Math.min(Math.floor(i / 2.5), 2)];
      result.push({
        d: `M${x1},90 C${x1},60 ${x2},50 ${x2},20`,
        id: `t1t2-${i}`,
      });
    });
    // T2 to T3
    t2Xs.forEach((x1, i) => {
      const x2 = t3Xs[Math.min(i, 1)];
      result.push({
        d: `M${x1},90 C${x1},55 ${x2},45 ${x2},15`,
        id: `t2t3-${i}`,
      });
    });
    return result;
  }, []);

  return (
    <svg width="100%" height="100" viewBox="0 0 860 100" style={{ overflow: 'visible', opacity: 0.7 }}>
      <defs>
        <filter id="flowGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="particleGrad">
          <stop offset="0%" stopColor={particleColor} stopOpacity="1" />
          <stop offset="100%" stopColor={particleColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {paths.map(({ d, id }) => (
        <g key={id}>
          {/* Path line */}
          <path d={d} fill="none" stroke={particleColor} strokeWidth="0.5" strokeOpacity="0.15" />
          {/* Animated particles */}
          {[0, 0.33, 0.66].map((offset, pi) => (
            <circle key={pi} r="2" fill={particleColor} filter="url(#flowGlow)">
              <animateMotion dur={speed} repeatCount="indefinite" begin={`${offset * parseFloat(speed)}s`}>
                <mpath href={`#path-${id}`} />
              </animateMotion>
            </circle>
          ))}
          {/* Define actual path for mpath reference */}
          <path id={`path-${id}`} d={d} fill="none" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

// ── Tier Flow Connector ──────────────────────────────────────────
function TierFlowConnector({ riskScore, label }) {
  const isCritical = riskScore > 0.6;
  const color = isCritical ? '#ef4444' : '#22d3ee';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 0', position: 'relative', overflow: 'hidden',
    }}>
      {/* Flowing line */}
      <div style={{
        width: '80%', height: 1,
        background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
      }} />
      {/* Center label */}
      <div style={{
        position: 'absolute', background: 'rgba(15,23,42,0.9)',
        padding: '2px 12px', borderRadius: 8,
        border: `1px solid ${color}20`, fontSize: 9, color: `${color}90`,
        letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600,
      }}>
        <ArrowUpRight size={9} style={{ marginRight: 4, verticalAlign: 'middle' }} />
        {label}
      </div>
      {/* Animated particles along the line */}
      <svg width="100%" height="8" style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
        {[0, 1, 2].map(i => (
          <circle key={i} r="1.5" fill={color} opacity="0.6">
            <animate attributeName="cx" from="10%" to="90%" dur={isCritical ? '1.5s' : '3s'} begin={`${i * (isCritical ? 0.5 : 1)}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values="4;4" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.8;0.8;0" dur={isCritical ? '1.5s' : '3s'} begin={`${i * (isCritical ? 0.5 : 1)}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}

// ── Message Bus Timeline ─────────────────────────────────────────
function MessageBusTimeline({ agentResults, agentProfiles }) {
  const scrollRef = useRef(null);

  const recentMessages = useMemo(() => {
    const all = [];
    if (!agentResults) return all;
    Object.entries(agentResults).forEach(([key, result]) => {
      if (result?.messages) {
        result.messages.forEach(msg => {
          all.push({ ...msg, agentKey: key, agentName: agentProfiles?.[key]?.name || key });
        });
      }
    });
    // Sort by timestamp descending, take last 20
    all.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    return all.slice(0, 20);
  }, [agentResults, agentProfiles]);

  // Auto-scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [recentMessages.length]);

  if (recentMessages.length === 0) {
    return (
      <div style={{
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
        padding: '12px 16px', textAlign: 'center',
      }}>
        <span style={{ color: '#475569', fontSize: 11, fontStyle: 'italic' }}>
          <MessageSquare size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          No messages yet — waiting for agent activity
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
      padding: '10px 0',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <MessageSquare size={12} style={{ color: '#64748b' }} />
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Message Bus — Last {recentMessages.length} Events
        </span>
      </div>
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 14px 6px',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(100,116,139,0.3) transparent',
        }}
      >
        {recentMessages.map((msg, i) => (
          <div
            key={`${msg.agentKey}-${i}`}
            style={{
              flexShrink: 0, minWidth: 200, maxWidth: 260,
              background: 'rgba(30,41,59,0.6)',
              border: `1px solid ${getSeverityColor(msg.severity)}15`,
              borderLeft: `3px solid ${getSeverityColor(msg.severity)}`,
              borderRadius: 8, padding: '7px 10px',
              animation: i === 0 ? 'messageSlide 0.4s ease' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {msg.agentName}
              </span>
              <ChevronRight size={8} style={{ color: '#475569' }} />
              <span style={{
                fontSize: 8, fontWeight: 700, color: getSeverityColor(msg.severity),
                textTransform: 'uppercase', background: getSeverityColor(msg.severity) + '15',
                padding: '0px 4px', borderRadius: 3,
              }}>
                {msg.severity || 'info'}
              </span>
            </div>
            <div style={{
              fontSize: 10, color: '#cbd5e1', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export function AgentFlowMode({
  agentResults = {},
  agentHealth = {},
  agentProfiles = {},
  situationClass = 'Normal Operations',
  agentAgreement = 1,
  escalationLevel = 0,
  cascadeChains = [],
  riskScore = 0,
  neuralAnomaly = {},
  riskClassification = {},
  aiReasoning = null,
  sensors = [],
}) {
  const [expandedAgent, setExpandedAgent] = useState(null);

  const handleToggle = useCallback((key) => {
    setExpandedAgent(prev => prev === key ? null : key);
  }, []);

  // ── Compute tier data ──────────────────────────────────────
  const tierData = useMemo(() => ({
    tier3: TIER_DEFS.tier3,
    tier2: TIER_DEFS.tier2,
    tier1: TIER_DEFS.tier1,
  }), []);

  // ── Active agent count ──────────────────────────────────────
  const activeCount = useMemo(() => {
    return Object.keys(agentResults).filter(k => agentResults[k]).length;
  }, [agentResults]);

  const totalMessages = useMemo(() => {
    let count = 0;
    Object.values(agentResults).forEach(r => {
      if (r?.messages) count += r.messages.length;
    });
    return count;
  }, [agentResults]);

  // ── Background hue shift based on risk ──────────────────────
  const bgTint = useMemo(() => {
    if (riskScore > 0.8) return 'rgba(220, 38, 38, 0.04)';
    if (riskScore > 0.6) return 'rgba(239, 68, 68, 0.03)';
    if (riskScore > 0.4) return 'rgba(245, 158, 11, 0.02)';
    return 'rgba(16, 185, 129, 0.01)';
  }, [riskScore]);

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        width: '100%', minHeight: '100%',
        background: `linear-gradient(180deg, rgba(15,23,42,0.95) 0%, ${bgTint} 50%, rgba(15,23,42,0.98) 100%)`,
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        transition: 'background 1s ease',
        position: 'relative',
      }}>
        {/* ── Situation Banner ─────────────────────────────────── */}
        <SituationBanner
          situationClass={situationClass}
          riskScore={riskScore}
          agentAgreement={agentAgreement}
          escalationLevel={escalationLevel}
          neuralAnomaly={neuralAnomaly}
        />

        {/* ── Quick Stats Row ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <QuickStat icon={<Network size={12} />} label="Active Agents" value={`${activeCount}/20`} color="#8b5cf6" />
          <QuickStat icon={<MessageSquare size={12} />} label="Total Messages" value={totalMessages} color="#06b6d4" />
          <QuickStat icon={<Workflow size={12} />} label="Cascade Chains" value={cascadeChains?.length || 0}
            color={cascadeChains?.length > 0 ? '#f59e0b' : '#64748b'} />
          {riskClassification?.class != null && (
            <QuickStat icon={<Target size={12} />} label="Risk Class" value={riskClassification.class}
              color={riskClassification.class >= 3 ? '#ef4444' : '#10b981'} />
          )}
          {aiReasoning && (
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }} title={typeof aiReasoning === 'string' ? aiReasoning : 'AI reasoning available'}>
              <Sparkles size={11} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>Gemini Reasoning Active</span>
            </div>
          )}
        </div>

        {/* ══════════ TIER 3 — Meta Intelligence ══════════════ */}
        <TierSection
          tierDef={tierData.tier3}
          agentResults={agentResults}
          agentHealth={agentHealth}
          agentProfiles={agentProfiles}
          expandedAgent={expandedAgent}
          onToggle={handleToggle}
        />

        {/* Flow connector T3 → T2 */}
        <TierFlowConnector riskScore={riskScore} label="Data Flow ↑ T2 → T3" />

        {/* ══════════ TIER 2 — Coordinators ═══════════════════ */}
        <TierSection
          tierDef={tierData.tier2}
          agentResults={agentResults}
          agentHealth={agentHealth}
          agentProfiles={agentProfiles}
          expandedAgent={expandedAgent}
          onToggle={handleToggle}
        />

        {/* Flow connector T2 → T1 */}
        <TierFlowConnector riskScore={riskScore} label="Data Flow ↑ T1 → T2" />

        {/* ══════════ TIER 1 — Specialists ════════════════════ */}
        <TierSection
          tierDef={tierData.tier1}
          agentResults={agentResults}
          agentHealth={agentHealth}
          agentProfiles={agentProfiles}
          expandedAgent={expandedAgent}
          onToggle={handleToggle}
        />

        {/* ── Message Bus Timeline ─────────────────────────────── */}
        <div style={{ marginTop: 4 }}>
          <MessageBusTimeline agentResults={agentResults} agentProfiles={agentProfiles} />
        </div>
      </div>
    </>
  );
}

// ── Tier Section Wrapper ─────────────────────────────────────────
function TierSection({ tierDef, agentResults, agentHealth, agentProfiles, expandedAgent, onToggle }) {
  const isAnyExpanded = expandedAgent !== null;

  return (
    <div style={{
      background: tierDef.bg,
      border: `1px solid ${tierDef.border}`,
      borderRadius: 14,
      padding: '12px 16px',
    }}>
      {/* Tier header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10, paddingBottom: 8,
        borderBottom: `1px solid ${tierDef.accent}12`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: tierDef.accent,
          boxShadow: `0 0 8px ${tierDef.glow}`,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 700, color: tierDef.accent,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          {tierDef.label}
        </span>
        <span style={{
          fontSize: 10, color: '#475569', marginLeft: 'auto',
          fontFamily: 'monospace',
        }}>
          {tierDef.keys.length} agents
        </span>
      </div>

      {/* Agent cards grid */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        justifyContent: tierDef.keys.length <= 3 ? 'center' : 'flex-start',
      }}>
        {tierDef.keys.map(key => (
          <AgentCard
            key={key}
            agentKey={key}
            tierDef={tierDef}
            agentResults={agentResults}
            agentHealth={agentHealth}
            agentProfiles={agentProfiles}
            isExpanded={expandedAgent === key}
            onToggle={handleToggleAgent(onToggle)}
            isAnyExpanded={isAnyExpanded}
          />
        ))}
      </div>
    </div>
  );
}

// Small utility to avoid creating new function references each render
function handleToggleAgent(onToggle) {
  return onToggle;
}

// ── Quick Stat Chip ──────────────────────────────────────────────
function QuickStat({ icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 8, padding: '5px 12px',
    }}>
      <span style={{ color: color || '#64748b' }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.3 }}>{label}</span>
      <span style={{ fontSize: 11, color: color || '#94a3b8', fontWeight: 700, fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  );
}


