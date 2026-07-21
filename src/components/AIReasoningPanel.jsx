import React, { useEffect, useRef, useState } from 'react';
import {
  Brain, Cpu, Wifi, WifiOff, AlertTriangle, ShieldCheck,
  Activity, TrendingUp, ChevronRight, Loader2, Sparkles,
  Gauge, BarChart3, Target,
} from 'lucide-react';

/* ── Style Constants ─────────────────────────────────────────── */

const GLASS = {
  background: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(99, 102, 241, 0.15)',
  borderRadius: '16px',
  padding: '20px',
};

const GLASS_INNER = {
  background: 'rgba(30, 41, 59, 0.6)',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.08)',
  padding: '14px',
};

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
  emergency: '#a855f7',
};

const CLASS_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];
const CLASS_LABELS = ['Normal', 'Elevated', 'Warning', 'Critical', 'Emergency'];

function getSourceBadge(source) {
  switch (source) {
    case 'gemini':
      return { label: 'Gemini AI', color: '#818cf8', icon: Sparkles };
    case 'webllm':
      return { label: 'WebLLM', color: '#38bdf8', icon: Cpu };
    default:
      return { label: 'Offline', color: '#64748b', icon: WifiOff };
  }
}

function getSituationColor(situation) {
  const s = (situation || '').toLowerCase();
  if (s.includes('emergency') || s.includes('critical')) return '#ef4444';
  if (s.includes('warning') || s.includes('danger')) return '#f97316';
  if (s.includes('elevated') || s.includes('caution')) return '#eab308';
  return '#22c55e';
}

function anomalyColor(score) {
  if (score >= 0.8) return '#ef4444';
  if (score >= 0.5) return '#f97316';
  if (score >= 0.3) return '#eab308';
  return '#22c55e';
}

/* ── Main Component ──────────────────────────────────────────── */

export function AIReasoningPanel({
  aiReasoning,
  aiReasoningSource = 'none',
  neuralAnomaly,
  riskClassification,
}) {
  const [pulse, setPulse] = useState(false);
  const reasoningRef = useRef(null);
  const prevDataRef = useRef(null);

  /* Pulse animation when new data arrives */
  useEffect(() => {
    const key = JSON.stringify(aiReasoning?.situation);
    if (key !== prevDataRef.current) {
      prevDataRef.current = key;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(t);
    }
  }, [aiReasoning]);

  /* Auto-scroll reasoning box */
  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [aiReasoning?.reasoning]);

  const source = getSourceBadge(aiReasoningSource);
  const SourceIcon = source.icon;
  const isWaiting = !aiReasoning || aiReasoningSource === 'none';

  return (
    <div style={{
      ...GLASS,
      transition: 'box-shadow 0.3s ease',
      boxShadow: pulse
        ? '0 0 30px rgba(99, 102, 241, 0.3), inset 0 0 30px rgba(99, 102, 241, 0.05)'
        : '0 4px 24px rgba(0, 0, 0, 0.3)',
    }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Brain size={20} color="#818cf8" />
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            AI REASONING
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: `${source.color}18`, border: `1px solid ${source.color}40`,
          borderRadius: '20px', padding: '4px 12px',
        }}>
          <SourceIcon size={13} color={source.color} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: source.color }}>{source.label}</span>
        </div>
      </div>

      {/* ── Waiting State ──────────────────────────────── */}
      {isWaiting ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px', gap: '12px',
        }}>
          <Loader2 size={32} color="#818cf8" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Waiting for AI analysis...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* ── Situation Classification ────────────────── */}
          <div style={{ ...GLASS_INNER, marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={14} color={getSituationColor(aiReasoning.situation)} />
                <span style={{
                  fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                  color: getSituationColor(aiReasoning.situation), letterSpacing: '0.8px',
                }}>
                  {aiReasoning.situation || 'Analyzing...'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Risk: {typeof aiReasoning.riskScore === 'number' ? `${(aiReasoning.riskScore * 100).toFixed(0)}%` : '—'}
              </span>
            </div>

            {/* Confidence Bar */}
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Confidence</span>
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>
                  {((aiReasoning.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(30, 41, 59, 0.8)' }}>
                <div style={{
                  width: `${(aiReasoning.confidence || 0) * 100}%`,
                  height: '100%', borderRadius: '3px',
                  background: `linear-gradient(90deg, #818cf8, #6366f1)`,
                  transition: 'width 0.6s ease',
                  boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
                }} />
              </div>
            </div>
          </div>

          {/* ── Reasoning Text ──────────────────────────── */}
          <div style={{ ...GLASS_INNER, marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Activity size={13} color="#94a3b8" />
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Chain of Thought</span>
            </div>
            <div ref={reasoningRef} style={{
              maxHeight: '120px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.7',
              color: '#cbd5e1', fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              whiteSpace: 'pre-wrap', scrollbarWidth: 'thin',
              scrollbarColor: '#334155 transparent',
            }}>
              {aiReasoning.reasoning || 'No reasoning data available.'}
            </div>
          </div>

          {/* ── Top Risks ──────────────────────────────── */}
          {aiReasoning.topRisks?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle size={13} color="#f97316" />
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Top Risks</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {aiReasoning.topRisks.slice(0, 3).map((risk, i) => {
                  const severity = (risk.severity || 'medium').toLowerCase();
                  const sevColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
                  return (
                    <div key={i} style={{
                      ...GLASS_INNER, padding: '10px 12px',
                      borderLeft: `3px solid ${sevColor}`,
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: sevColor, boxShadow: `0 0 6px ${sevColor}60`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
                          {risk.title || risk.name || `Risk ${i + 1}`}
                        </div>
                        {risk.description && (
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {risk.description}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, color: sevColor, textTransform: 'uppercase',
                        background: `${sevColor}15`, padding: '2px 8px', borderRadius: '10px',
                      }}>
                        {severity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Recommendations ────────────────────────── */}
          {aiReasoning.recommendations?.length > 0 && (
            <div style={{ ...GLASS_INNER, marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ShieldCheck size={13} color="#22c55e" />
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Recommendations</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.8' }}>
                {aiReasoning.recommendations.map((rec, i) => (
                  <li key={i} style={{ paddingLeft: '4px' }}>
                    <span>{typeof rec === 'string' ? rec : rec.text || rec.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {/* ── Neural Anomaly Score ────────────────────────── */}
      {neuralAnomaly && neuralAnomaly.status !== 'not_ready' && (
        <div style={{ ...GLASS_INNER, marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gauge size={13} color="#38bdf8" />
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Anomaly Score</span>
            </div>
            {neuralAnomaly.isAnomaly && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase',
                background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '10px',
                animation: 'pulse-anomaly 1.5s ease-in-out infinite',
              }}>
                ⚠ Anomaly
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'rgba(30, 41, 59, 0.8)', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, (neuralAnomaly.anomalyScore || 0) * 100)}%`,
              height: '100%', borderRadius: '5px',
              background: `linear-gradient(90deg, #22c55e, ${anomalyColor(neuralAnomaly.anomalyScore || 0)})`,
              transition: 'width 0.5s ease, background 0.5s ease',
              boxShadow: `0 0 10px ${anomalyColor(neuralAnomaly.anomalyScore || 0)}40`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Normal</span>
            <span style={{ fontSize: '11px', color: anomalyColor(neuralAnomaly.anomalyScore || 0), fontWeight: 600 }}>
              {((neuralAnomaly.anomalyScore || 0) * 100).toFixed(1)}%
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Anomalous</span>
          </div>
          {neuralAnomaly.reconstructionError != null && (
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
              Reconstruction Error: {neuralAnomaly.reconstructionError.toFixed(4)}
            </div>
          )}
          <style>{`@keyframes pulse-anomaly { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
      )}

      {/* ── Risk Classification ────────────────────────── */}
      {riskClassification && riskClassification.status !== 'not_ready' && (
        <div style={{ ...GLASS_INNER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <BarChart3 size={13} color="#a78bfa" />
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Risk Classification</span>
          </div>
          {riskClassification.probabilities?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {CLASS_LABELS.map((label, i) => {
                const prob = riskClassification.probabilities[i] || 0;
                const isActive = riskClassification.classIndex === i;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '70px', fontSize: '10px', textAlign: 'right',
                      color: isActive ? CLASS_COLORS[i] : '#64748b',
                      fontWeight: isActive ? 700 : 400,
                    }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(30, 41, 59, 0.8)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${prob * 100}%`, height: '100%', borderRadius: '4px',
                        background: isActive
                          ? `linear-gradient(90deg, ${CLASS_COLORS[i]}99, ${CLASS_COLORS[i]})`
                          : `${CLASS_COLORS[i]}40`,
                        transition: 'width 0.5s ease',
                        boxShadow: isActive ? `0 0 8px ${CLASS_COLORS[i]}50` : 'none',
                      }} />
                    </div>
                    <span style={{
                      width: '38px', fontSize: '10px', textAlign: 'right',
                      color: isActive ? CLASS_COLORS[i] : '#64748b', fontWeight: 600,
                    }}>
                      {(prob * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '8px' }}>
              Classification: <span style={{ color: CLASS_COLORS[riskClassification.classIndex || 0], fontWeight: 700 }}>
                {riskClassification.class || 'Unknown'}
              </span>
              {' — '}
              <span style={{ color: '#cbd5e1' }}>
                {((riskClassification.confidence || 0) * 100).toFixed(0)}% confidence
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
