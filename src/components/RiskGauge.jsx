import React, { useMemo } from 'react';
import { Gauge } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */

function riskColor(pct) {
  if (pct >= 75) return 'var(--accent-critical)';
  if (pct >= 50) return 'var(--accent-danger)';
  if (pct >= 30) return 'var(--accent-warning)';
  return 'var(--accent-safe)';
}

function riskLabel(pct) {
  if (pct >= 75) return 'CRITICAL';
  if (pct >= 50) return 'HIGH';
  if (pct >= 30) return 'ELEVATED';
  return 'NORMAL';
}

function riskLabelClass(pct) {
  if (pct >= 75) return 'text-critical';
  if (pct >= 50) return 'text-danger';
  if (pct >= 30) return 'text-warning';
  return 'text-safe';
}

/* ── Arc path builder ─────────────────────────────────────── */

function describeArc(cx, cy, r, startAngle, endAngle) {
  const rad = (a) => ((a - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/* ── Main Component ───────────────────────────────────────── */

const RiskGauge = React.memo(function RiskGauge({
  compoundRisk = 0,
  singleSensorRisk = 0,
  status,
}) {
  const pct = Math.min(100, Math.max(0, compoundRisk));
  const singlePct = Math.min(100, Math.max(0, singleSensorRisk));
  const color = riskColor(pct);
  const label = status || riskLabel(pct);
  const labelCls = riskLabelClass(pct);

  /* Gauge geometry */
  const cx = 120, cy = 110, r = 85;
  const startAngle = -90; // 9 o'clock
  const endAngle = 90;    // 3 o'clock (180° arc)
  const valueAngle = startAngle + (pct / 100) * (endAngle - startAngle);

  const bgArc = describeArc(cx, cy, r, startAngle, endAngle);
  const valueArc = pct > 0 ? describeArc(cx, cy, r, startAngle, valueAngle) : '';

  /* Needle */
  const needleRad = ((valueAngle - 90) * Math.PI) / 180;
  const needleLen = r - 12;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  /* Compound advantage */
  const advantage = pct - singlePct;
  const showCallout = advantage > 15;

  /* Glow animation when high */
  const glowStyle = pct >= 65 ? { animation: 'glow 2s ease-in-out infinite' } : {};

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <Gauge size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          Compound Risk Gauge
        </span>
        <span className={`badge ${pct >= 50 ? 'badge-danger' : pct >= 30 ? 'badge-warning' : 'badge-safe'}`}>
          {label}
        </span>
      </div>

      {/* SVG Gauge */}
      <svg viewBox="0 0 240 140" className="risk-gauge-svg" style={glowStyle}>
        {/* Background arc */}
        <path d={bgArc} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={14} strokeLinecap="round" />

        {/* Value arc */}
        {pct > 0 && (
          <path
            d={valueArc}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            style={{ transition: 'all 0.8s ease' }}
          />
        )}

        {/* Needle */}
        <line
          x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={color} strokeWidth={2} strokeLinecap="round"
          style={{ transition: 'all 0.8s ease' }}
        />
        <circle cx={cx} cy={cy} r={4} fill={color} style={{ transition: 'fill 0.8s ease' }} />

        {/* Center text */}
        <text x={cx} y={cy + 28} textAnchor="middle" className="gauge-center-text" fontSize="28">
          {Math.round(pct)}
        </text>
        <text x={cx + 20} y={cy + 20} textAnchor="start" fill="#64748B" fontSize="10" fontFamily="var(--font-mono)">
          %
        </text>
      </svg>

      {/* Status label */}
      <div className={`gauge-status-label ${labelCls}`}>{label}</div>

      {/* Mini metrics */}
      <div className="gauge-metrics">
        <div className="gauge-metric-box">
          <div className="gauge-metric-label">AI Compound Score</div>
          <div className="gauge-metric-value" style={{ color }}>{Math.round(pct)}%</div>
        </div>
        <div className="gauge-metric-box">
          <div className="gauge-metric-label">Single Sensor Max</div>
          <div className="gauge-metric-value" style={{ color: riskColor(singlePct) }}>
            {Math.round(singlePct)}%
          </div>
        </div>
      </div>

      {/* Compound callout */}
      {showCallout && (
        <div className="compound-callout">
          <span>⚡</span>
          <span>Compound detection caught {Math.round(advantage)}% more risk</span>
        </div>
      )}
    </div>
  );
});

export default RiskGauge;
