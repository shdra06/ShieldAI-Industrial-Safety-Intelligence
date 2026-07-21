import React, { useState, useMemo, useCallback } from 'react';
import { Sliders, RotateCcw, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */

const TYPE_GROUPS = [
  { key: 'gas',         label: 'Gas Sensors',  icon: '🔥', match: t => ['CH4', 'CO', 'H2S', 'VOC', 'SO2'].includes(t) },
  { key: 'pressure',    label: 'Pressure',     icon: '⏲️', match: t => t === 'Pressure' },
  { key: 'temperature', label: 'Temperature',  icon: '🌡️', match: t => t === 'Temperature' },
  { key: 'other',       label: 'Other',        icon: '📡', match: () => true },
];

function severityColor(value, warn, crit) {
  if (value >= crit) return '#ef4444';
  if (value >= warn) return '#f59e0b';
  return '#10b981';
}

function sliderGradient(warn, crit) {
  const max = crit * 1.5;
  const wPct = (warn / max) * 100;
  const cPct = (crit / max) * 100;
  return `linear-gradient(to right, #10b981 0%, #10b981 ${wPct}%, #f59e0b ${wPct}%, #f59e0b ${cPct}%, #ef4444 ${cPct}%, #ef4444 100%)`;
}

/* ── Styles ───────────────────────────────────────────────── */

const S = {
  panel: {
    background: 'rgba(10, 14, 26, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#e2e8f0',
    width: 420,
    maxHeight: '85vh',
    overflowY: 'auto',
    fontSize: 12,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
    cursor: 'pointer', userSelect: 'none',
  },
  headerTitle: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  body: { padding: '6px 10px 10px' },
  scenarioBar: {
    display: 'flex', gap: 6, flexWrap: 'wrap',
    padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.08)', marginBottom: 6,
  },
  scenarioBtn: (accent) => ({
    padding: '4px 10px', borderRadius: 6,
    background: `${accent}22`, border: `1px solid ${accent}44`, color: accent,
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
  }),
  resetBtn: {
    padding: '4px 10px', borderRadius: 6,
    background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)',
    color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto',
  },
  groupLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, fontWeight: 700, letterSpacing: 1,
    color: '#64748b', textTransform: 'uppercase',
    padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 6,
  },
  row: {
    display: 'grid', gridTemplateColumns: '1fr auto',
    gap: '2px 8px', alignItems: 'center',
    padding: '6px 8px', borderRadius: 8, marginBottom: 2,
    background: 'rgba(17, 24, 39, 0.55)',
    border: '1px solid rgba(148,163,184,0.06)',
    transition: 'background .15s',
  },
  sensorName: { fontSize: 11, fontWeight: 600, color: '#e2e8f0' },
  zone: {
    fontSize: 9, fontWeight: 600, letterSpacing: 0.8,
    color: '#64748b', marginLeft: 6,
    background: 'rgba(148,163,184,0.08)', padding: '1px 5px', borderRadius: 4,
  },
  value: (color) => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, fontWeight: 700, color, textAlign: 'right',
  }),
  controls: {
    gridColumn: '1 / -1',
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
  },
  slider: (warn, crit) => ({
    flex: 1, height: 4, appearance: 'none', WebkitAppearance: 'none',
    background: sliderGradient(warn, crit),
    borderRadius: 2, outline: 'none', cursor: 'pointer',
  }),
  numInput: {
    width: 56, padding: '2px 4px', borderRadius: 4, textAlign: 'center',
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(148,163,184,0.15)',
    color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, outline: 'none',
  },
  presetBtn: (active) => ({
    padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
    cursor: 'pointer', transition: 'all .12s', border: 'none',
    background: active ? 'rgba(59,130,246,0.25)' : 'rgba(148,163,184,0.08)',
    color: active ? '#3b82f6' : '#64748b',
  }),
};

/* ── Component ───────────────────────────────────────────── */

export function SensorOverridePanel({ sensors = [], onOverride }) {
  const [collapsed, setCollapsed] = useState(false);

  /* Group sensors by type category */
  const grouped = useMemo(() => {
    const result = TYPE_GROUPS.map(g => ({ ...g, sensors: [] }));
    sensors.forEach(s => {
      const group = result.find(g => g.match(s.type)) || result[result.length - 1];
      group.sensors.push(s);
    });
    return result.filter(g => g.sensors.length > 0);
  }, [sensors]);

  /* ── Scenario handlers ──────────────────────────────── */
  const setAllSafe = useCallback(() => {
    sensors.forEach(s => onOverride(s.id, +(s.warningThreshold * 0.1).toFixed(2)));
  }, [sensors, onOverride]);

  const setGasLeak = useCallback(() => {
    sensors.forEach(s => {
      if (s.type === 'CH4' || s.type === 'H2S') {
        onOverride(s.id, s.criticalThreshold);
      } else {
        onOverride(s.id, +(s.warningThreshold * 0.1).toFixed(2));
      }
    });
  }, [sensors, onOverride]);

  const setOverpressure = useCallback(() => {
    sensors.forEach(s => {
      if (s.type === 'Pressure') {
        onOverride(s.id, s.criticalThreshold);
      } else {
        onOverride(s.id, +(s.warningThreshold * 0.1).toFixed(2));
      }
    });
  }, [sensors, onOverride]);

  const setMultiFailure = useCallback(() => {
    let critCount = 0;
    sensors.forEach(s => {
      if (critCount < 3) {
        onOverride(s.id, s.criticalThreshold);
        critCount++;
      } else {
        onOverride(s.id, +(s.warningThreshold * 0.1).toFixed(2));
      }
    });
  }, [sensors, onOverride]);

  return (
    <div style={S.panel}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={S.header} onClick={() => setCollapsed(c => !c)}>
        <div style={S.headerTitle}>
          <Sliders size={14} style={{ color: '#3b82f6' }} />
          <span>🎛️ Sensor Control</span>
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </div>

      {!collapsed && (
        <div style={S.body}>
          {/* ── Scenario bar ───────────────────────────── */}
          <div style={S.scenarioBar}>
            <button style={S.scenarioBtn('#10b981')} onClick={setAllSafe}>
              <Zap size={10} /> All Safe
            </button>
            <button style={S.scenarioBtn('#f59e0b')} onClick={setGasLeak}>
              <AlertTriangle size={10} /> Gas Leak
            </button>
            <button style={S.scenarioBtn('#ef4444')} onClick={setOverpressure}>
              <AlertTriangle size={10} /> Overpressure
            </button>
            <button style={S.scenarioBtn('#dc2626')} onClick={setMultiFailure}>
              <Zap size={10} /> Multi-Failure
            </button>
            <button style={S.resetBtn} onClick={setAllSafe}>
              <RotateCcw size={10} /> Reset All
            </button>
          </div>

          {/* ── Sensor groups ──────────────────────────── */}
          {grouped.map(group => (
            <div key={group.key}>
              <div style={S.groupLabel}>
                <span>{group.icon}</span>
                <span>{group.label}</span>
                <span style={{ color: '#3b82f6' }}>({group.sensors.length})</span>
              </div>

              {group.sensors.map(sensor => {
                const max = sensor.criticalThreshold * 1.5;
                const color = severityColor(sensor.currentValue, sensor.warningThreshold, sensor.criticalThreshold);
                const normalVal = +(sensor.warningThreshold * 0.1).toFixed(2);

                return (
                  <div
                    key={sensor.id}
                    style={S.row}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(17,24,39,0.85)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(17,24,39,0.55)'; }}
                  >
                    {/* Name + zone */}
                    <div>
                      <span style={S.sensorName}>{sensor.label}</span>
                      <span style={S.zone}>{sensor.zoneId || sensor.zone}</span>
                    </div>

                    {/* Current value */}
                    <div style={S.value(color)}>
                      {sensor.currentValue}{sensor.unit}
                    </div>

                    {/* Controls row */}
                    <div style={S.controls}>
                      {/* Range slider */}
                      <input
                        type="range"
                        min={0}
                        max={max}
                        step={max > 100 ? 1 : 0.1}
                        value={sensor.currentValue}
                        onChange={e => onOverride(sensor.id, +e.target.value)}
                        style={S.slider(sensor.warningThreshold, sensor.criticalThreshold)}
                      />
                      {/* Number input */}
                      <input
                        type="number"
                        min={0}
                        max={max}
                        step={max > 100 ? 1 : 0.1}
                        value={sensor.currentValue}
                        onChange={e => onOverride(sensor.id, +e.target.value)}
                        style={S.numInput}
                      />
                    </div>

                    {/* Preset buttons */}
                    <div style={{ ...S.controls, gap: 4 }}>
                      <button
                        style={S.presetBtn(sensor.currentValue <= normalVal)}
                        onClick={() => onOverride(sensor.id, normalVal)}
                      >Normal</button>
                      <button
                        style={S.presetBtn(Math.abs(sensor.currentValue - sensor.warningThreshold) < 0.1)}
                        onClick={() => onOverride(sensor.id, sensor.warningThreshold)}
                      >Warning</button>
                      <button
                        style={S.presetBtn(Math.abs(sensor.currentValue - sensor.criticalThreshold) < 0.1)}
                        onClick={() => onOverride(sensor.id, sensor.criticalThreshold)}
                      >Critical</button>
                      <button
                        style={S.presetBtn(Math.abs(sensor.currentValue - max) < 0.1)}
                        onClick={() => onOverride(sensor.id, max)}
                      >Max</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
