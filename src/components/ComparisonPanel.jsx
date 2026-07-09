import React, { useMemo } from 'react';
import { BarChart3, Zap } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */

function riskColor(pct) {
  if (pct >= 75) return 'var(--accent-critical)';
  if (pct >= 50) return 'var(--accent-danger)';
  if (pct >= 30) return 'var(--accent-warning)';
  return 'var(--accent-safe)';
}

const DEFAULT_FACTORS = [
  { key: 'gas',         label: 'Gas Level',       color: 'var(--accent-danger)' },
  { key: 'permit',      label: 'Permit Conflict', color: '#F97316' },
  { key: 'ppe',         label: 'PPE Compliance',  color: 'var(--accent-purple)' },
  { key: 'pattern',     label: 'Pattern Match',   color: '#06B6D4' },
  { key: 'maintenance', label: 'Maintenance',     color: 'var(--accent-warning)' },
];

/* ── Main Component ───────────────────────────────────────── */

const ComparisonPanel = React.memo(function ComparisonPanel({
  compoundRisk = 0,
  singleSensorRisk = 0,
  riskFactors = {},
}) {
  const compound = Math.min(100, Math.max(0, compoundRisk));
  const single = Math.min(100, Math.max(0, singleSensorRisk));
  const isCompoundHigher = compound > single;
  const advantage = compound - single;

  /* Build factor bars */
  const factors = useMemo(() => {
    return DEFAULT_FACTORS.map((f) => {
      const value = riskFactors[f.key] ?? 0;
      return { ...f, value: Math.min(100, Math.max(0, value)) };
    });
  }, [riskFactors]);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <BarChart3 size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          Risk Detection Comparison
        </span>
      </div>

      {/* Two metric boxes */}
      <div className="comparison-metrics">
        <div className="comparison-box">
          <div className="comparison-box-label">Traditional (Single Sensor)</div>
          <div className="comparison-box-value" style={{ color: riskColor(single) }}>
            {Math.round(single)}%
          </div>
          <div className="comparison-box-sublabel">Max sensor reading</div>
        </div>

        <div className={`comparison-box ${isCompoundHigher ? 'highlighted' : ''}`}>
          <div className="comparison-box-label">ShieldAI (Compound AI)</div>
          <div className="comparison-box-value" style={{ color: riskColor(compound) }}>
            {Math.round(compound)}%
          </div>
          <div className="comparison-box-sublabel">Compound score</div>
        </div>
      </div>

      {/* Risk factor bars */}
      <div className="risk-factors">
        {factors.map((f) => (
          <div key={f.key} className="risk-factor-row">
            <span className="risk-factor-label">{f.label}</span>
            <div className="risk-factor-bar-track">
              <div
                className="risk-factor-bar-fill"
                style={{ width: `${f.value}%`, backgroundColor: f.color }}
              />
            </div>
            <span className="risk-factor-value">{Math.round(f.value)}%</span>
          </div>
        ))}
      </div>

      {/* Callout */}
      {advantage > 15 && (
        <div className="comparison-callout">
          <Zap size={14} style={{ flexShrink: 0, color: 'var(--accent-info)' }} />
          <span>
            The compound model detected co-occurring sub-threshold risks that no single sensor would flag.
            Combined advantage: <strong>+{Math.round(advantage)}%</strong>.
          </span>
        </div>
      )}
    </div>
  );
});

export default ComparisonPanel;
