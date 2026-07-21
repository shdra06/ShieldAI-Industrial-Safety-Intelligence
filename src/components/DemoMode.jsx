// ============================================================================
// ShieldAI — Demo Mode: PPT-Style Presentation Walkthrough
// Full-screen slides with cinematic transitions, keyboard nav, progress dots
// Based on: Vizag Steel Plant Coke Oven Explosion (Jan 2025)
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Slide Data ──────────────────────────────────────────────────────────────

const SLIDES = [
  // ──────────── TITLE ────────────
  {
    id: 'title',
    render: () => (
      <div style={S.centered}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
        <h1 style={S.heroTitle}>ShieldAI</h1>
        <div style={S.heroSub}>AI-Powered Industrial Safety Intelligence</div>
        <div style={S.heroTag}>for Zero-Harm Operations</div>
        <div style={{ marginTop: '48px', display: 'flex', gap: '32px', justifyContent: 'center' }}>
          {[
            { n: '18', l: 'AI Agents' }, { n: '3', l: 'ML Models' },
            { n: '130+', l: 'RAG Docs' }, { n: '13', l: 'Live Sensors' },
          ].map((s, i) => (
            <div key={i} style={S.statPill}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>{s.n}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '40px', fontSize: '12px', color: '#475569' }}>Press → or click to continue</div>
      </div>
    ),
  },

  // ──────────── THE PROBLEM ────────────
  {
    id: 'problem',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>THE PROBLEM</div>
        <h2 style={S.slideTitle}>6,500+ Fatal Workplace Accidents in India (FY2023)</h2>
        <div style={{ ...S.slideBody, maxWidth: '700px', textAlign: 'center' }}>
          And that figure <strong style={{ color: '#ef4444' }}>excludes</strong> most mining and construction sectors.
        </div>
        <div style={{ marginTop: '48px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          {[
            { icon: '📡', t: 'Sensors exist', s: 'Gas detectors were functional' },
            { icon: '📋', t: 'Permits exist', s: 'Safety documentation was in place' },
            { icon: '🖥️', t: 'SCADA exists', s: 'Monitoring was operational' },
          ].map((c, i) => (
            <div key={i} style={S.problemCard}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 700 }}>{c.t}</div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{c.s}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '40px', padding: '20px 32px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', maxWidth: '600px' }}>
          <div style={{ color: '#fbbf24', fontSize: '18px', fontWeight: 700, lineHeight: 1.5 }}>
            "Data was present, but unacted upon."
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
            No system connected the dots between sensors, permits, equipment age, and human factors.
          </div>
        </div>
      </div>
    ),
  },

  // ──────────── VIZAG INCIDENT ────────────
  {
    id: 'vizag',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>CASE STUDY</div>
        <h2 style={S.slideTitle}>Visakhapatnam Steel Plant</h2>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>January 20, 2025 — Coke Oven Battery Explosion</div>
        <div style={{ display: 'flex', gap: '48px', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '96px', fontWeight: 900, color: '#ef4444', lineHeight: 1, textShadow: '0 0 60px rgba(239,68,68,0.3)' }}>8</div>
            <div style={{ fontSize: '18px', color: '#ef4444', fontWeight: 600, marginTop: '8px' }}>Workers Killed</div>
          </div>
          <div style={{ width: '1px', height: '120px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ maxWidth: '400px', textAlign: 'left' }}>
            <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.8 }}>
              Entrapped gases in the coke oven battery ignited during routine maintenance.
            </div>
            <div style={{ marginTop: '16px', color: '#f59e0b', fontSize: '13px', lineHeight: 1.8 }}>
              Gas detectors were functioning. SCADA was operational. Permit-to-work controls existed.
            </div>
            <div style={{ marginTop: '16px', color: '#ef4444', fontSize: '14px', fontWeight: 700 }}>
              But no system correlated the signals.
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ──────────── OUR SOLUTION ────────────
  {
    id: 'solution',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>OUR SOLUTION</div>
        <h2 style={S.slideTitle}>A Unified Intelligence Layer</h2>
        <div style={{ ...S.slideBody, maxWidth: '600px', textAlign: 'center', marginBottom: '40px' }}>
          ShieldAI fuses sensor data + equipment age + permit status + shift patterns + regulatory knowledge into a single predictive layer.
        </div>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px' }}>
          {[
            { icon: '🧠', t: 'Gemini 2.5 Flash', s: 'Supervisor reasoning & RAG', c: '#a78bfa' },
            { icon: '🤖', t: '18 Specialist Agents', s: '3-tier hierarchy, consensus', c: '#60a5fa' },
            { icon: '📚', t: 'RAG Engine', s: 'TF-IDF + Neural + RRF fusion', c: '#10b981' },
            { icon: '🔬', t: 'Transformers.js', s: 'NER + Classification in browser', c: '#f59e0b' },
            { icon: '🏭', t: '3D Digital Twin', s: 'Physics-based simulation', c: '#06b6d4' },
            { icon: '📊', t: 'Isolation Forest', s: 'ML anomaly detection', c: '#ec4899' },
          ].map((c, i) => (
            <div key={i} style={{ ...S.techCard, borderColor: c.c + '30' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{c.icon}</div>
              <div style={{ color: c.c, fontSize: '12px', fontWeight: 700 }}>{c.t}</div>
              <div style={{ color: '#64748b', fontSize: '10px', marginTop: '3px' }}>{c.s}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ──────────── DETECTION FLOW ────────────
  {
    id: 'detection',
    render: (anim) => (
      <div style={S.centered}>
        <div style={S.slideLabel}>LIVE WALKTHROUGH</div>
        <h2 style={S.slideTitle}>Step 1: Sensor Detects Anomaly</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '40px', justifyContent: 'center' }}>
          {/* Sensor */}
          <div style={S.flowNode}>
            <div style={{ fontSize: '32px' }}>📡</div>
            <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 700 }}>GAS-001</div>
            <div style={{ color: '#64748b', fontSize: '10px' }}>Coke Oven Battery</div>
            <div style={{ marginTop: '12px', fontSize: '36px', fontWeight: 900, fontFamily: 'monospace', color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.4)' }}>
              28.5
            </div>
            <div style={{ color: '#ef4444', fontSize: '11px' }}>% LEL (CH₄)</div>
            <div style={{ marginTop: '10px', width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '71%', height: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b 50%, #ef4444 85%)', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '8px', color: '#475569', marginTop: '3px' }}>
              <span>0</span><span style={{ color: '#f59e0b' }}>⚠20</span><span style={{ color: '#ef4444' }}>🔴40</span>
            </div>
          </div>

          {/* Arrow */}
          <div style={S.flowArrow}>
            <div style={{ fontSize: '28px', color: '#60a5fa', animation: 'pulse 1.5s infinite' }}>→→→</div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>Real-time stream</div>
          </div>

          {/* SCADA Agent */}
          <div style={{ ...S.flowNode, borderColor: 'rgba(96,165,250,0.3)' }}>
            <div style={{ fontSize: '32px' }}>🤖</div>
            <div style={{ color: '#60a5fa', fontSize: '13px', fontWeight: 700 }}>SCADA Agent</div>
            <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '8px' }}>Tier 1 Specialist</div>
            <div style={{ color: '#e2e8f0', fontSize: '11px', lineHeight: 1.6, textAlign: 'left', padding: '8px', background: 'rgba(96,165,250,0.06)', borderRadius: '6px' }}>
              <div>✓ Rising trend detected</div>
              <div>✓ Rate: +3.6% LEL/min</div>
              <div style={{ color: '#f59e0b' }}>⚠ Pattern match: 87%</div>
              <div style={{ color: '#ef4444', fontWeight: 700 }}>→ Dispatching to 17 agents</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ──────────── AGENT ANALYSIS ────────────
  {
    id: 'agents',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>LIVE WALKTHROUGH</div>
        <h2 style={S.slideTitle}>Step 2: Multi-Agent Intelligence</h2>
        <div style={{ ...S.slideBody, textAlign: 'center', marginBottom: '24px' }}>Each agent analyzes the threat from a different angle — then they vote.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', maxWidth: '900px' }}>
          {[
            { n: 'SCADA', i: '📡', f: 'CH₄ rising fast', t: 1, c: '#60a5fa' },
            { n: 'Pattern', i: '📊', f: 'Matches explosion sig.', t: 1, c: '#60a5fa' },
            { n: 'Predictive', i: '📈', f: 'Breach in 14.5 min', t: 1, c: '#60a5fa' },
            { n: 'Permit', i: '📋', f: 'Hot-work CONFLICT', t: 1, c: '#f59e0b' },
            { n: 'Equipment', i: '🔧', f: '32yr old, overdue', t: 1, c: '#ef4444' },
            { n: 'Compliance', i: '⚖️', f: 'OISD-116 violated', t: 1, c: '#ef4444' },
            { n: 'Temporal', i: '🕐', f: 'Shift change soon', t: 1, c: '#f59e0b' },
            { n: 'Cascade', i: '🔗', f: 'Domino risk: BF line', t: 2, c: '#a78bfa' },
            { n: 'Swiss Cheese', i: '🧀', f: '3/5 barriers aligned', t: 2, c: '#a78bfa' },
            { n: 'SUPERVISOR', i: '🧠', f: 'VERDICT: ESCALATE', t: 3, c: '#ef4444' },
          ].map((a, i) => (
            <div key={i} style={{
              padding: '10px', borderRadius: '10px',
              background: a.t === 3 ? 'rgba(239,68,68,0.1)' : 'rgba(17,24,39,0.8)',
              border: `1px solid ${a.c}30`,
              textAlign: 'center',
              animation: `fadeInUp 0.4s ease ${i * 80}ms both`,
            }}>
              <div style={{ fontSize: '20px' }}>{a.i}</div>
              <div style={{ color: a.c, fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>{a.n}</div>
              <div style={{ color: '#94a3b8', fontSize: '9px', marginTop: '4px', lineHeight: 1.4 }}>{a.f}</div>
              <div style={{ fontSize: '7px', color: '#475569', marginTop: '4px', padding: '1px 4px', background: `${a.c}15`, borderRadius: '3px', display: 'inline-block' }}>
                Tier {a.t}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>
          Agent Agreement: <span style={{ color: '#ef4444', fontSize: '18px' }}>94%</span> — Unanimous escalation
        </div>
      </div>
    ),
  },

  // ──────────── COMPOUND RISK ────────────
  {
    id: 'compound',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>KEY INNOVATION</div>
        <h2 style={S.slideTitle}>Compound Risk vs Single Sensor</h2>
        <div style={{ ...S.slideBody, textAlign: 'center', marginBottom: '36px' }}>This is why traditional monitoring fails — and why ShieldAI saves lives.</div>
        <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-end', justifyContent: 'center' }}>
          {/* Single sensor bar */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '100px', height: '105px',
              background: 'linear-gradient(to top, #334155, #64748b)',
              borderRadius: '8px 8px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: '#e2e8f0' }}>35%</span>
            </div>
            <div style={{ padding: '12px', background: 'rgba(17,24,39,0.8)', borderRadius: '0 0 8px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>Single Sensor</div>
              <div style={{ color: '#10b981', fontSize: '11px', marginTop: '4px' }}>"Within normal range"</div>
              <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>No action taken ❌</div>
            </div>
          </div>

          <div style={{ color: '#475569', fontSize: '24px', fontWeight: 800, paddingBottom: '40px' }}>VS</div>

          {/* Compound risk bar */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '100px', height: '246px',
              background: 'linear-gradient(to top, #dc2626, #ef4444)',
              borderRadius: '8px 8px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(239,68,68,0.3)',
              animation: 'pulse 2s infinite',
            }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: '#fff' }}>82%</span>
            </div>
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '0 0 8px 8px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>Compound Risk</div>
              <div style={{ color: '#fbbf24', fontSize: '11px', marginTop: '4px' }}>Gas + Age + Permits + Fatigue</div>
              <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '2px', fontWeight: 700 }}>EVACUATE NOW ✓</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '32px', padding: '16px 28px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px' }}>
          <span style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 700 }}>
            ⏱️ Detected <span style={{ color: '#ef4444' }}>14.5 minutes</span> before any single sensor crossed threshold
          </span>
        </div>
      </div>
    ),
  },

  // ──────────── EMERGENCY RESPONSE ────────────
  {
    id: 'emergency',
    render: () => (
      <div style={S.centered}>
        <div style={{ ...S.slideLabel, color: '#ef4444' }}>AUTOMATED RESPONSE</div>
        <h2 style={S.slideTitle}>Emergency Protocol — 8 Steps in 12 Seconds</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '700px', marginTop: '32px' }}>
          {[
            { icon: '🚨', a: 'Gas isolation valves CLOSED', t: '0.0s' },
            { icon: '📢', a: 'Emergency alarm in Zone Z-A, Z-B', t: '0.8s' },
            { icon: '🚫', a: 'Hot-work permit REVOKED', t: '1.2s' },
            { icon: '👷', a: '12 workers evacuated', t: '2.5s' },
            { icon: '🚒', a: 'Fire brigade dispatched', t: '3.0s' },
            { icon: '🏥', a: 'Medical team on standby', t: '3.5s' },
            { icon: '📄', a: 'DGMS Form-M auto-generated', t: '8.0s' },
            { icon: '✅', a: 'All personnel accounted — ZERO casualties', t: '12.0s' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', borderRadius: '10px',
              background: i === 7 ? 'rgba(16,185,129,0.1)' : 'rgba(17,24,39,0.8)',
              border: `1px solid ${i === 7 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              animation: `fadeInUp 0.3s ease ${i * 100}ms both`,
            }}>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
              <div>
                <div style={{ color: i === 7 ? '#10b981' : '#e2e8f0', fontSize: '12px', fontWeight: 600 }}>{s.a}</div>
                <div style={{ color: '#475569', fontSize: '10px', fontFamily: 'monospace' }}>T+{s.t}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ──────────── RESULT ────────────
  {
    id: 'result',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>OUTCOME</div>
        <h2 style={{ ...S.slideTitle, marginBottom: '40px' }}>What Would Have Changed</h2>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'stretch', justifyContent: 'center' }}>
          <div style={{ ...S.outcomeCard, borderColor: 'rgba(239,68,68,0.3)' }}>
            <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>❌ Reality (Jan 2025)</div>
            <div style={{ fontSize: '80px', fontWeight: 900, color: '#ef4444', lineHeight: 1, margin: '16px 0', textShadow: '0 0 40px rgba(239,68,68,0.3)' }}>8</div>
            <div style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>Lives Lost</div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '12px', lineHeight: 1.6 }}>
              Single sensor: 35% — "normal range"<br/>
              No cross-system correlation<br/>
              Alert went unacted upon
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '24px', color: '#475569', fontWeight: 800 }}>→</div>
          </div>

          <div style={{ ...S.outcomeCard, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' }}>
            <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>✅ With ShieldAI</div>
            <div style={{ fontSize: '80px', fontWeight: 900, color: '#10b981', lineHeight: 1, margin: '16px 0', textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>0</div>
            <div style={{ color: '#10b981', fontSize: '16px', fontWeight: 600 }}>Casualties</div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '12px', lineHeight: 1.6 }}>
              Compound risk: 82% — "EVACUATE"<br/>
              14.5 min early warning<br/>
              Auto-response in 12 seconds
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ──────────── SCALABILITY ────────────
  {
    id: 'scale',
    render: () => (
      <div style={S.centered}>
        <div style={S.slideLabel}>SCALABILITY</div>
        <h2 style={S.slideTitle}>Ready for Every Steel Plant in India</h2>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '40px' }}>
          {[
            { n: 'N', l: 'Plants', s: 'Horizontally scalable', c: '#60a5fa' },
            { n: '10K+', l: 'Sensors/Plant', s: 'Real-time streaming', c: '#10b981' },
            { n: '18→N', l: 'Plug-in Agents', s: 'Domain-specific modules', c: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '28px 36px', borderRadius: '16px', background: 'rgba(17,24,39,0.8)', border: `1px solid ${s.c}30`, textAlign: 'center', minWidth: '160px' }}>
              <div style={{ fontSize: '40px', fontWeight: 900, color: s.c }}>{s.n}</div>
              <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{s.l}</div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{s.s}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '36px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '700px' }}>
          {['Edge nodes at each plant', 'Cloud aggregation layer', 'Data-driven config (JSON)', 'Modular agent plugins', 'RAG scales with docs', 'WebSocket-ready for SCADA'].map((t, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#94a3b8' }}>
              • {t}
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ──────────── THANK YOU ────────────
  {
    id: 'end',
    render: () => (
      <div style={S.centered}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
        <h1 style={{ ...S.heroTitle, fontSize: '42px' }}>Thank You</h1>
        <div style={{ color: '#94a3b8', fontSize: '16px', marginTop: '12px', maxWidth: '500px', textAlign: 'center', lineHeight: 1.7 }}>
          ShieldAI: Because no worker should die when the data to save them already exists.
        </div>
        <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
          <div style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', fontSize: '12px', fontWeight: 600 }}>
            Live Dashboard →
          </div>
          <div style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
            GitHub Repository →
          </div>
        </div>
      </div>
    ),
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function DemoMode({ onExit }) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const [animKey, setAnimKey] = useState(0);

  const next = useCallback(() => {
    if (slide < SLIDES.length - 1) {
      setDirection(1);
      setSlide(s => s + 1);
      setAnimKey(k => k + 1);
    }
  }, [slide]);

  const prev = useCallback(() => {
    if (slide > 0) {
      setDirection(-1);
      setSlide(s => s - 1);
      setAnimKey(k => k + 1);
    }
  }, [slide]);

  const goTo = useCallback((i) => {
    setDirection(i > slide ? 1 : -1);
    setSlide(i);
    setAnimKey(k => k + 1);
  }, [slide]);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); prev(); }
      if (e.key === 'Escape') { e.preventDefault(); onExit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onExit]);

  const current = SLIDES[slide];

  return (
    <div style={S.overlay} onClick={next}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(${direction * 60}px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>

      {/* Slide content */}
      <div key={animKey} style={S.slideContainer}>
        {current.render()}
      </div>

      {/* Bottom bar: dots + nav */}
      <div style={S.bottomBar} onClick={(e) => e.stopPropagation()}>
        <button onClick={onExit} style={S.navBtn}>
          ESC Exit
        </button>

        <div style={S.dots}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              ...S.dot,
              background: i === slide ? '#a78bfa' : i < slide ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.15)',
              width: i === slide ? '24px' : '8px',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={prev} disabled={slide === 0} style={{ ...S.navBtn, opacity: slide === 0 ? 0.3 : 1 }}>
            ← Prev
          </button>
          <span style={{ color: '#475569', fontSize: '11px', padding: '6px 8px' }}>
            {slide + 1}/{SLIDES.length}
          </span>
          <button onClick={next} disabled={slide === SLIDES.length - 1} style={{ ...S.navBtn, opacity: slide === SLIDES.length - 1 ? 0.3 : 1 }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'radial-gradient(ellipse at 50% 30%, #111827, #0a0e1a 70%)',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex', flexDirection: 'column',
    cursor: 'pointer', userSelect: 'none',
  },
  slideContainer: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 60px', overflow: 'auto',
    animation: 'slideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  centered: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', maxWidth: '1100px',
  },
  bottomBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px',
    background: 'rgba(10,14,26,0.9)',
    borderTop: '1px solid rgba(148,163,184,0.08)',
  },
  dots: {
    display: 'flex', gap: '6px', alignItems: 'center',
  },
  dot: {
    height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
    transition: 'all 0.3s ease', padding: 0,
  },
  navBtn: {
    padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  // Slide typography
  slideLabel: {
    fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
    textTransform: 'uppercase', color: '#a78bfa', marginBottom: '12px',
  },
  slideTitle: {
    fontSize: '32px', fontWeight: 800, color: '#f8fafc',
    margin: '0 0 12px 0', lineHeight: 1.2, textAlign: 'center',
  },
  slideBody: {
    fontSize: '14px', color: '#94a3b8', lineHeight: 1.7,
  },
  heroTitle: {
    fontSize: '56px', fontWeight: 900, color: '#f8fafc',
    margin: 0, letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #e2e8f0, #a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    fontSize: '20px', color: '#94a3b8', marginTop: '12px', fontWeight: 400,
  },
  heroTag: {
    fontSize: '14px', color: '#64748b', marginTop: '4px',
  },
  statPill: {
    padding: '12px 20px', borderRadius: '12px',
    background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
    textAlign: 'center', minWidth: '80px',
  },
  problemCard: {
    padding: '20px', borderRadius: '12px', textAlign: 'center', width: '180px',
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(255,255,255,0.08)',
  },
  techCard: {
    padding: '16px', borderRadius: '10px', textAlign: 'center', width: '140px',
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(255,255,255,0.08)',
  },
  flowNode: {
    padding: '24px', borderRadius: '14px', textAlign: 'center', width: '220px',
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(239,68,68,0.2)',
  },
  flowArrow: {
    textAlign: 'center', padding: '0 8px',
  },
  outcomeCard: {
    padding: '32px', borderRadius: '16px', textAlign: 'center', width: '240px',
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(255,255,255,0.08)',
  },
};
