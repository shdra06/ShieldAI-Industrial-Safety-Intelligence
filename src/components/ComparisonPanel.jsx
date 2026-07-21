import React, { useMemo } from 'react';
import { BarChart3, Zap, Clock, Heart, TrendingUp } from 'lucide-react';

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
  { key: 'temporal',    label: 'Temporal Risk',    color: '#8B5CF6' },
  { key: 'barrier',     label: 'Barrier Alignment',color: '#EC4899' },
];

/* ── Main Component ───────────────────────────────────────── */

const ComparisonPanel = React.memo(function ComparisonPanel({
  compoundRisk = 0,
  singleSensorRisk = 0,
  riskFactors = {},
  // New props
  compoundLeadTime = 0,
  swissCheeseAlignment = 0,
  temporalRisk = {},
}) {
  const compound = Math.min(100, Math.max(0, compoundRisk));
  const single = Math.min(100, Math.max(0, singleSensorRisk));
  const isCompoundHigher = compound > single;
  const advantage = compound - single;

  // Lead time display
  const leadTimeTicks = compoundLeadTime ?? 0;
  const leadTimeSeconds = leadTimeTicks * 2; // assuming 2s per tick

  // Lives saved metric — based on lead time and advantage
  const livesSaved = useMemo(() => {
    if (leadTimeTicks <= 0 && advantage <= 10) return 0;
    // Rough formula: more lead time + larger advantage = more lives potentially saved
    return Math.max(0, Math.min(12, Math.floor(advantage / 8 + leadTimeTicks / 10)));
  }, [advantage, leadTimeTicks]);

  /* Build factor bars */
  const factors = useMemo(() => {
    const enriched = { ...riskFactors };
    // Add temporal risk factor
    if (temporalRisk?.timeOfDayFactor != null) {
      enriched.temporal = (temporalRisk.timeOfDayFactor ?? 0) * 100;
    }
    // Add barrier alignment factor
    if (swissCheeseAlignment > 0) {
      enriched.barrier = swissCheeseAlignment * 100;
    }

    return DEFAULT_FACTORS.map((f) => {
      const value = enriched[f.key] ?? 0;
      return { ...f, value: Math.min(100, Math.max(0, value)) };
    });
  }, [riskFactors, temporalRisk, swissCheeseAlignment]);

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

      {/* Lead Time + Lives Saved Row */}
      <div className="cp-enhanced-row">
        {/* Lead Time Display */}
        <div className="cp-lead-time">
          <Clock size={13} style={{ color: 'var(--accent-info)', flexShrink: 0 }} />
          <div className="cp-lead-time-content">
            <span className="cp-lead-time-label">Early Detection Lead</span>
            <span className="cp-lead-time-value">
              {leadTimeTicks > 0 ? (
                <>
                  <strong style={{ color: 'var(--accent-info)', fontFamily: 'var(--font-mono)' }}>
                    {leadTimeTicks} ticks
                  </strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginLeft: '0.3rem' }}>
                    (~{leadTimeSeconds}s ahead)
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Calculating…</span>
              )}
            </span>
          </div>
          {/* Animated advantage bar */}
          <div className="cp-lead-bar-track">
            <div
              className="cp-lead-bar-fill"
              style={{
                width: `${Math.min(100, leadTimeTicks * 3)}%`,
                background: 'linear-gradient(90deg, var(--accent-info), var(--accent-cyan))',
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>

        {/* Lives Saved Metric */}
        <div className="cp-lives-saved">
          <Heart size={16} style={{ color: livesSaved > 0 ? 'var(--accent-safe)' : 'var(--text-muted)' }} />
          <div>
            <div className="cp-lives-value" style={{ color: livesSaved > 0 ? 'var(--accent-safe)' : 'var(--text-muted)' }}>
              {livesSaved}
            </div>
            <div className="cp-lives-label">Lives Protected</div>
          </div>
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
            {leadTimeTicks > 0 && (
              <> ShieldAI detected the threat <strong>{leadTimeTicks} ticks</strong> before a single-sensor system would.</>
            )}
          </span>
        </div>
      )}
    </div>
  );
});

export default ComparisonPanel;
