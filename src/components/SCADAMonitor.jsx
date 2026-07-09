import React, { useMemo } from 'react';
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

/* ── Default sensor config ────────────────────────────────── */

const DEFAULT_SENSORS = [
  { key: 'ch4',      label: 'Methane (CH₄)', unit: '% LEL', warning: 20, critical: 40 },
  { key: 'co',       label: 'Carbon Monoxide', unit: 'ppm',  warning: 35, critical: 100 },
  { key: 'pressure', label: 'Vessel Pressure', unit: 'bar',  warning: 8,  critical: 12 },
];

/* ── Main Component ───────────────────────────────────────── */

const SCADAMonitor = React.memo(function SCADAMonitor({
  sensors = {},
  sensorHistory = {},
}) {
  const sensorConfigs = useMemo(() => {
    return DEFAULT_SENSORS.map((cfg) => {
      const current = sensors[cfg.key] ?? 0;
      const history = sensorHistory[cfg.key] ?? [];
      const trend = trendArrow(history);
      const badge = statusBadge(current, cfg.warning, cfg.critical);
      const color = valueColor(current, cfg.warning, cfg.critical);
      return { ...cfg, current, history, trend, badge, color };
    });
  }, [sensors, sensorHistory]);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <Activity size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          SCADA Live Monitor
        </span>
      </div>

      <div className="sensor-grid">
        {sensorConfigs.map((s) => (
          <div key={s.key} className="sensor-row">
            {/* Left: info */}
            <div className="sensor-info">
              <div className="sensor-label">{s.label}</div>
              <div className="sensor-value" style={{ color: s.color }}>
                {typeof s.current === 'number' ? s.current.toFixed(1) : s.current}
                <span className="sensor-unit">{s.unit}</span>
                <span className={`sensor-trend ${s.trend.cls}`}>{s.trend.arrow}</span>
              </div>
              <span className={`badge ${s.badge.cls}`} style={{ marginTop: '0.2rem' }}>{s.badge.label}</span>
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
    </div>
  );
});

export default SCADAMonitor;
