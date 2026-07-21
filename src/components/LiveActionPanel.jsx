// ============================================================================
// ShieldAI — Live Action Panel
// Always-visible sensor controls + real-time agent reaction feed
// Shows the CAUSE → EFFECT chain that makes the dashboard feel alive
// ============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/* ── Agent reaction messages based on sensor states ─────────────────────── */

function generateReactions(sensors) {
  const reactions = [];
  const now = Date.now();

  for (const s of sensors) {
    const ratio = s.currentValue / (s.criticalThreshold || 100);
    
    if (ratio >= 1.0) {
      reactions.push({
        time: now, severity: 'critical', icon: '🚨',
        agent: 'Supervisor',
        msg: `CRITICAL: ${s.type} (${s.id}) at ${s.currentValue}${s.unit} — exceeds threshold!`,
      });
      reactions.push({
        time: now - 200, severity: 'critical', icon: '⚖️',
        agent: 'Compliance',
        msg: `OISD-116 violation — ${s.type} in ${s.zoneId} requires immediate shutdown`,
      });
      reactions.push({
        time: now - 400, severity: 'warning', icon: '🔗',
        agent: 'Cascade',
        msg: `Checking domino propagation from ${s.zoneId} to adjacent zones...`,
      });
    } else if (ratio >= 0.75) {
      reactions.push({
        time: now, severity: 'warning', icon: '📈',
        agent: 'Predictive',
        msg: `${s.type} trending up — forecast: breach in ${Math.round((1 - ratio) * 20)} min`,
      });
      reactions.push({
        time: now - 300, severity: 'info', icon: '📊',
        agent: 'Pattern',
        msg: `${s.type} pattern matches ${Math.round(ratio * 100)}% of historical incidents`,
      });
    } else if (ratio >= 0.5) {
      reactions.push({
        time: now, severity: 'info', icon: '📡',
        agent: 'SCADA',
        msg: `${s.type} elevated at ${s.currentValue}${s.unit} — monitoring closely`,
      });
    }
  }

  // Sort by time descending, limit to 8
  return reactions.sort((a, b) => b.time - a.time).slice(0, 8);
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function LiveActionPanel({
  sensors = [],
  onOverride,
  riskScore = 0,
  systemStatus = 'normal',
  agentResults = {},
}) {
  const [reactions, setReactions] = useState([]);
  const prevSensorsRef = useRef('');

  // Generate reactions whenever sensors change significantly
  useEffect(() => {
    const key = sensors.map(s => `${s.id}:${Math.round(s.currentValue * 10)}`).join(',');
    if (key !== prevSensorsRef.current) {
      prevSensorsRef.current = key;
      setReactions(generateReactions(sensors));
    }
  }, [sensors]);

  // Quick scenario presets
  const applyPreset = useCallback((preset) => {
    if (!onOverride) return;
    sensors.forEach(s => {
      switch (preset) {
        case 'safe':
          onOverride(s.id, +(s.warningThreshold * 0.1).toFixed(2));
          break;
        case 'gasLeak':
          if (s.type === 'CH4' || s.type === 'H2S') onOverride(s.id, s.criticalThreshold * 1.1);
          else onOverride(s.id, +(s.warningThreshold * 0.1).toFixed(2));
          break;
        case 'cascade':
          onOverride(s.id, s.criticalThreshold * 0.9);
          break;
        default: break;
      }
    });
  }, [sensors, onOverride]);

  const critCount = sensors.filter(s => s.currentValue >= s.criticalThreshold).length;
  const warnCount = sensors.filter(s => s.currentValue >= s.warningThreshold && s.currentValue < s.criticalThreshold).length;

  return (
    <div style={S.container}>
      {/* ── Quick Scenarios ────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>⚡ Quick Scenarios</div>
        <div style={S.presetRow}>
          <button style={S.preset('#10b981')} onClick={() => applyPreset('safe')}>✓ All Safe</button>
          <button style={S.preset('#f59e0b')} onClick={() => applyPreset('gasLeak')}>🔥 Gas Leak</button>
          <button style={S.preset('#ef4444')} onClick={() => applyPreset('cascade')}>💥 Cascade</button>
        </div>
      </div>

      {/* ── Sensor Sliders ─────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          🎛️ Sensor Controls
          <span style={{ fontSize: '9px', color: '#475569', fontWeight: 400, marginLeft: '6px' }}>
            Drag to simulate
          </span>
        </div>
        <div style={S.sensorList}>
          {sensors.slice(0, 13).map(sensor => {
            const max = sensor.criticalThreshold * 1.5 || 100;
            const ratio = sensor.currentValue / (sensor.criticalThreshold || 100);
            const color = ratio >= 1 ? '#ef4444' : ratio >= 0.5 ? '#f59e0b' : '#10b981';
            const barWidth = Math.min(100, (sensor.currentValue / max) * 100);

            return (
              <div key={sensor.id} style={{
                ...S.sensorRow,
                borderLeftColor: color,
                background: ratio >= 1 ? 'rgba(239,68,68,0.06)' : 'rgba(17,24,39,0.4)',
              }}>
                <div style={S.sensorHeader}>
                  <div>
                    <span style={{ color: '#e2e8f0', fontSize: '10.5px', fontWeight: 600 }}>{sensor.type}</span>
                    <span style={{ color: '#475569', fontSize: '9px', marginLeft: '6px' }}>{sensor.zoneId}</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color, transition: 'color 0.3s' }}>
                    {typeof sensor.currentValue === 'number' ? sensor.currentValue.toFixed(1) : sensor.currentValue}
                    <span style={{ fontSize: '9px', color: '#64748b', marginLeft: '2px' }}>{sensor.unit}</span>
                  </div>
                </div>
                {/* Slider */}
                <input
                  type="range" min={0} max={max}
                  step={max > 100 ? 1 : 0.1}
                  value={sensor.currentValue}
                  onChange={e => onOverride?.(sensor.id, +e.target.value)}
                  style={S.slider}
                />
                {/* Visual bar */}
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${barWidth}%`, background: color, transition: 'width 0.2s, background 0.3s' }} />
                  {/* Warning marker */}
                  <div style={{ position: 'absolute', left: `${(sensor.warningThreshold / max) * 100}%`, top: 0, bottom: 0, width: '1px', background: '#f59e0b' }} />
                  {/* Critical marker */}
                  <div style={{ position: 'absolute', left: `${(sensor.criticalThreshold / max) * 100}%`, top: 0, bottom: 0, width: '1px', background: '#ef4444' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Agent Reactions ────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          🤖 Agent Reactions
          {critCount > 0 && <span style={{ ...S.badge, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>{critCount} CRIT</span>}
          {warnCount > 0 && <span style={{ ...S.badge, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>{warnCount} WARN</span>}
        </div>
        <div style={S.reactionList}>
          {reactions.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#10b981', fontSize: '11px' }}>
              ✓ All sensors nominal — no agent alerts
            </div>
          ) : (
            reactions.map((r, i) => (
              <div key={i} style={{
                ...S.reaction,
                borderLeftColor: r.severity === 'critical' ? '#ef4444' : r.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                animation: `fadeIn 0.3s ease ${i * 60}ms both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px' }}>{r.icon}</span>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                    color: r.severity === 'critical' ? '#ef4444' : r.severity === 'warning' ? '#f59e0b' : '#60a5fa',
                  }}>{r.agent}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: 1.4 }}>{r.msg}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
        input[type="range"]::-webkit-slider-runnable-track { height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #a78bfa; margin-top: -4.5px; border: 2px solid #0a0e1a; cursor: grab; }
        input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; background: #c4b5fd; }
        input[type="range"]::-moz-range-track { height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; }
        input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #a78bfa; border: 2px solid #0a0e1a; cursor: grab; }
      `}</style>
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */

const S = {
  container: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    fontSize: '12px',
  },
  section: {
    background: 'rgba(17,24,39,0.5)',
    borderRadius: '8px',
    padding: '8px 10px',
    border: '1px solid rgba(148,163,184,0.06)',
  },
  sectionTitle: {
    fontSize: '10px', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.8px',
    marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
  },
  presetRow: {
    display: 'flex', gap: '4px',
  },
  preset: (color) => ({
    flex: 1, padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
    background: `${color}15`, border: `1px solid ${color}30`, color,
    fontSize: '10px', fontWeight: 600, fontFamily: 'inherit',
    transition: 'all 0.15s',
  }),
  sensorList: {
    display: 'flex', flexDirection: 'column', gap: '3px',
    maxHeight: '320px', overflowY: 'auto',
  },
  sensorRow: {
    padding: '6px 8px', borderRadius: '6px',
    borderLeft: '3px solid #10b981',
    transition: 'all 0.2s',
  },
  sensorHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '4px',
  },
  slider: {
    width: '100%', height: '3px', marginBottom: '3px',
  },
  barTrack: {
    width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px', position: 'relative', overflow: 'hidden',
  },
  barFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: '2px',
  },
  badge: {
    fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
    marginLeft: '6px',
  },
  reactionList: {
    display: 'flex', flexDirection: 'column', gap: '4px',
    maxHeight: '200px', overflowY: 'auto',
  },
  reaction: {
    padding: '6px 8px', borderRadius: '6px',
    background: 'rgba(17,24,39,0.6)',
    borderLeft: '3px solid #3b82f6',
  },
};
