import React, { useMemo, useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */

function trendArrow(values) {
  if (!values || values.length < 2) return { arrow: '→', cls: 'text-muted' };
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const diff = last - prev;
  const pct = prev !== 0 ? (diff / prev) * 100 : 0;
  if (pct > 5)       return { arrow: '↑', cls: 'text-danger' };
  if (pct > 2)       return { arrow: '↗', cls: 'text-warning' };
  if (pct > -2)      return { arrow: '→', cls: 'text-safe' };
  if (pct > -5)      return { arrow: '↘', cls: 'text-safe' };
  return { arrow: '↓', cls: 'text-safe' };
}

function valueColor(value, warning, critical) {
  if (value >= critical) return 'var(--accent-danger)';
  if (value >= warning)  return 'var(--accent-warning)';
  return 'var(--accent-safe)';
}

function statusBadge(value, warning, critical) {
  if (value >= critical) return { label: 'Critical', cls: 'badge-critical' };
  if (value >= warning)  return { label: 'Warning',  cls: 'badge-warning' };
  return { label: 'Normal', cls: 'badge-safe' };
}

/* ── Sparkline SVG ────────────────────────────────────────── */

function Sparkline({ values = [], warning, critical, width = 200, height = 60 }) {
  const data = values.length > 30 ? values.slice(-30) : values;
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="sparkline-svg" viewBox={`0 0 ${width} ${height}`}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748B" fontSize="10">
          Awaiting data…
        </text>
      </svg>
    );
  }

  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data, critical * 1.1) || 1;
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return { x, y, v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  /* Threshold Y positions */
  const warnY = height - ((warning - min) / range) * height;
  const critY = height - ((critical - min) / range) * height;

  /* Line color based on latest value */
  const latest = data[data.length - 1];
  const lineColor = valueColor(latest, warning, critical);

  return (
    <svg width={width} height={height} className="sparkline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${warning}-${critical}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path d={areaPath} fill={`url(#grad-${warning}-${critical})`} />

      {/* Warning threshold */}
      <line x1={0} y1={warnY} x2={width} y2={warnY}
        stroke="var(--accent-warning)" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.5} />

      {/* Critical threshold */}
      <line x1={0} y1={critY} x2={width} y2={critY}
        stroke="var(--accent-danger)" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.5} />

      {/* Data line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Latest value dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3}
        fill={lineColor} stroke="var(--bg-primary)" strokeWidth={1.5} />
    </svg>
  );
}

/* ── Default sensor config — 6 sensors ────────────────────── */

const DEFAULT_SENSORS = [
  { key: 'ch4',         label: 'Methane (CH₄)',       unit: '% LEL', warning: 20,  critical: 40,  icon: '🔥' },
  { key: 'co',          label: 'Carbon Monoxide',     unit: 'ppm',   warning: 35,  critical: 100, icon: '💨' },
  { key: 'h2s',         label: 'Hydrogen Sulfide',    unit: 'ppm',   warning: 10,  critical: 20,  icon: '☠️' },
  { key: 'nh3',         label: 'Ammonia (NH₃)',       unit: 'ppm',   warning: 25,  critical: 50,  icon: '⚗️' },
  { key: 'pressure',    label: 'Vessel Pressure',     unit: 'bar',   warning: 8,   critical: 12,  icon: '🔧' },
  { key: 'temperature', label: 'Temperature',         unit: '°C',    warning: 200, critical: 350, icon: '🌡️' },
];

/* ── Main Component ───────────────────────────────────────── */

const SCADAMonitor = React.memo(function SCADAMonitor({
  sensorsByType = {},
  sensorHistory = {},
}) {
  const [expanded, setExpanded] = useState(false);

  const sensorConfigs = useMemo(() => {
    return DEFAULT_SENSORS.map((cfg) => {
      // BUG FIX: use sensorsByType object keyed by type instead of array
      const sensorData = sensorsByType[cfg.key];
      const current = sensorData?.currentValue ?? 0;
      const warning = sensorData?.warningThreshold ?? cfg.warning;
      const critical = sensorData?.criticalThreshold ?? cfg.critical;
      const sensorTrend = sensorData?.trend ?? null;

      // Use sensorHistory — keyed by sensor ID or type key
      const historyById = sensorData?.id ? sensorHistory[sensorData.id] : null;
      const history = historyById ?? sensorHistory[cfg.key] ?? [];

      const trend = trendArrow(history);
      const badge = statusBadge(current, warning, critical);
      const color = valueColor(current, warning, critical);
      const zoneId = sensorData?.zoneId ?? '—';

      return { ...cfg, current, history, trend, badge, color, warning, critical, zoneId, sensorTrend };
    });
  }, [sensorsByType, sensorHistory]);

  const critCount = sensorConfigs.filter(s => s.badge.cls === 'badge-critical').length;
  const warnCount = sensorConfigs.filter(s => s.badge.cls === 'badge-warning').length;
  const hasAlerts = critCount > 0 || warnCount > 0;
  const showFull = expanded || hasAlerts;

  // Auto-expand when alerts appear
  useEffect(() => {
    if (hasAlerts) setExpanded(true);
  }, [hasAlerts]);

  return (
    <>
      <style>{`
        @keyframes scada-pulse {
          0% { box-shadow: 0 0 2px var(--pulse-color, transparent); }
          50% { box-shadow: 0 0 12px var(--pulse-color, transparent); }
          100% { box-shadow: 0 0 2px var(--pulse-color, transparent); }
        }
        .sensor-row-alert {
          animation: scada-pulse 2s infinite;
          border-color: var(--pulse-color, transparent);
        }
      `}</style>
      <div className="card">
        {/* Status Bar */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', 
          background: 'rgba(0,0,0,0.15)', fontSize: '12px' 
        }}>
          <div style={{ fontWeight: '600', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="#38bdf8" /> SCADA Interface
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              Connected
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>2Hz</div>
            <div style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)' }}>OPC-UA</div>
          </div>
        </div>
        <div className="card-header" style={{ borderTop: 'none', paddingTop: '10px' }}>
          <span className="card-title">
            SCADA Live Monitor
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {critCount > 0 && <span className="badge badge-critical">{critCount} CRIT</span>}
          {warnCount > 0 && <span className="badge badge-warning">{warnCount} WARN</span>}
          {critCount === 0 && warnCount === 0 && <span className="badge badge-safe">ALL NORMAL</span>}
          {showFull && !hasAlerts && (
            <button onClick={() => setExpanded(false)} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b',
              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', marginLeft: '4px'
            }}>Collapse</button>
          )}
        </div>
      </div>

      {!showFull ? (
        /* ── Compact view: all sensors normal ── */
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>All sensors nominal</span>
            </div>
            <button onClick={() => setExpanded(true)} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b',
              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer'
            }}>Details</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {sensorConfigs.map((s) => (
              <div key={s.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '3px 6px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.02)', fontSize: '10px'
              }}>
                <span style={{ color: '#64748b' }}>{s.icon} {s.key.toUpperCase()}</span>
                <span style={{ color: s.color, fontFamily: 'monospace', fontWeight: 600 }}>
                  {typeof s.current === 'number' ? s.current.toFixed(1) : s.current}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Full sensor grid ── */
        <div className="sensor-grid">
          {sensorConfigs.map((s) => (
            <div 
              key={s.key} 
              className={`sensor-row ${s.badge.cls === 'badge-critical' ? 'sensor-row-critical' : ''} ${s.badge.cls !== 'badge-safe' ? 'sensor-row-alert' : ''}`}
              style={s.badge.cls !== 'badge-safe' ? { '--pulse-color': s.color } : {}}
            >
              {/* Left: info */}
              <div className="sensor-info" style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                <div className="sensor-label">
                  <span style={{ marginRight: '0.3rem' }}>{s.icon}</span>
                  {s.label}
                </div>
                <div className="sensor-value" style={{ color: s.color }}>
                  {typeof s.current === 'number' ? s.current.toFixed(1) : s.current}
                  <span className="sensor-unit">{s.unit}</span>
                  <span className={`sensor-trend ${s.trend.cls}`}>{s.trend.arrow}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginTop: '0.2rem' }}>
                  <span className={`badge ${s.badge.cls}`}>{s.badge.label}</span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Zone {s.zoneId}</span>
                </div>
                {/* Spark bar */}
                <div style={{ marginTop: '10px', width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(100, (s.current / s.critical) * 100)}%`, 
                    background: s.color,
                    transition: 'width 0.3s ease' 
                  }} />
                </div>
              </div>

              {/* Right: sparkline */}
              <div className="sparkline-container">
                <Sparkline
                  values={s.history}
                  warning={s.warning}
                  critical={s.critical}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
});

export default SCADAMonitor;
