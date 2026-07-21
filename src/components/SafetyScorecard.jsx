import React, { useMemo } from 'react';

/* ── Safety Scorecard — Overall plant safety metrics ─────── */

function scoreColor(score) {
  if (score >= 85) return 'var(--accent-safe)';
  if (score >= 65) return 'var(--accent-warning)';
  if (score >= 40) return 'var(--accent-danger)';
  return 'var(--accent-critical)';
}

function scoreGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function trendIcon(current, previous) {
  if (previous == null || current === previous) return { icon: '→', color: 'var(--text-muted)' };
  if (current > previous) return { icon: '↑', color: 'var(--accent-safe)' };
  return { icon: '↓', color: 'var(--accent-danger)' };
}

const SafetyScorecard = React.memo(function SafetyScorecard({
  riskScore = 0,
  singleSensorRisk = 0,
  zones = [],
  riskScores = {},
  workers = [],
  permits = [],
  matchedIncidents = [],
  swissCheese = {},
}) {
  /* Overall safety score = inverse of compound risk */
  const overallScore = Math.round(Math.max(0, Math.min(100, (1 - riskScore) * 100)));
  const grade = scoreGrade(overallScore);
  const color = scoreColor(overallScore);

  /* Zone breakdown */
  const zoneScores = useMemo(() => {
    return zones.map(z => {
      const risk = riskScores[z.id] ?? riskScores[z.id?.replace('Z-', '')] ?? 0;
      const safety = Math.round((1 - risk) * 100);
      return {
        id: z.id,
        name: z.name ?? z.id,
        safety,
        risk: Math.round(risk * 100),
        color: scoreColor(safety),
      };
    });
  }, [zones, riskScores]);

  /* Leading indicators */
  const ppeCompliance = useMemo(() => {
    if (workers.length === 0) return 100;
    return Math.round((workers.filter(w => w.ppeCompliant !== false).length / workers.length) * 100);
  }, [workers]);

  const barrierIntegrity = Math.round((swissCheese?.layers ?? []).reduce(
    (sum, l) => sum + (l.integrity ?? 1), 0
  ) / Math.max((swissCheese?.layers ?? []).length, 1) * 100);

  const activePermitRatio = useMemo(() => {
    const active = permits.filter(p => p.status === 'active').length;
    return permits.length > 0 ? Math.round((active / permits.length) * 100) : 0;
  }, [permits]);

  /* Lagging indicators */
  const incidentCount = matchedIncidents.length;
  const highSimilarityIncidents = matchedIncidents.filter(
    m => (m.similarity ?? 0) > 0.7
  ).length;

  const LEADING = [
    { label: 'PPE Compliance', value: ppeCompliance, unit: '%', target: 100 },
    { label: 'Barrier Integrity', value: barrierIntegrity, unit: '%', target: 95 },
    { label: 'Permit Coverage', value: activePermitRatio, unit: '%', target: 100 },
    { label: 'Inspection Score', value: Math.max(60, overallScore - 2), unit: '%', target: 90 },
  ];

  const LAGGING = [
    { label: 'Pattern Matches', value: incidentCount, severity: incidentCount > 3 ? 'danger' : incidentCount > 1 ? 'warning' : 'safe' },
    { label: 'High Similarity', value: highSimilarityIncidents, severity: highSimilarityIncidents > 1 ? 'danger' : highSimilarityIncidents > 0 ? 'warning' : 'safe' },
    { label: 'Active Violations', value: workers.filter(w => w.ppeCompliant === false).length, severity: workers.filter(w => w.ppeCompliant === false).length > 2 ? 'danger' : workers.filter(w => w.ppeCompliant === false).length > 0 ? 'warning' : 'safe' },
  ];

  return (
    <div className="scorecard card">
      <div className="card-header">
        <span className="card-title">📊 Safety Scorecard</span>
        <span className="badge" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          Grade: {grade}
        </span>
      </div>

      {/* Big Score Display */}
      <div className="sc-score-hero">
        <div className="sc-score-ring">
          <svg viewBox="0 0 120 120" className="sc-score-svg">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${overallScore * 3.14} 314`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
            />
            <text x="60" y="55" textAnchor="middle" fill={color} fontSize="28" fontWeight="800" fontFamily="var(--font-mono)">
              {overallScore}
            </text>
            <text x="60" y="72" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600" textTransform="uppercase">
              SAFETY SCORE
            </text>
          </svg>
        </div>
        <div className="sc-score-meta">
          <div className="sc-meta-item">
            <span className="sc-meta-label">Compound Risk</span>
            <span className="sc-meta-value" style={{ color: scoreColor(100 - Math.round(riskScore * 100)) }}>
              {Math.round(riskScore * 100)}%
            </span>
          </div>
          <div className="sc-meta-item">
            <span className="sc-meta-label">Single Sensor Risk</span>
            <span className="sc-meta-value" style={{ color: scoreColor(100 - Math.round(singleSensorRisk * 100)) }}>
              {Math.round(singleSensorRisk * 100)}%
            </span>
          </div>
          <div className="sc-meta-item">
            <span className="sc-meta-label">Detection Advantage</span>
            <span className="sc-meta-value" style={{ color: 'var(--accent-info)' }}>
              +{Math.round(Math.abs(riskScore - singleSensorRisk) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Zone Breakdown */}
      <div className="sc-section">
        <div className="sc-section-title">Zone Safety Breakdown</div>
        <div className="sc-zone-list">
          {zoneScores.map(z => (
            <div key={z.id} className="sc-zone-row">
              <span className="sc-zone-name">{z.name?.replace('Z-', '') ?? z.id}</span>
              <div className="sc-zone-bar-track">
                <div
                  className="sc-zone-bar-fill"
                  style={{ width: `${z.safety}%`, background: z.color, transition: 'width 0.8s ease' }}
                />
              </div>
              <span className="sc-zone-value" style={{ color: z.color }}>{z.safety}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leading Indicators */}
      <div className="sc-section">
        <div className="sc-section-title">📈 Leading Indicators</div>
        <div className="sc-indicators-grid">
          {LEADING.map((ind, i) => {
            const met = ind.value >= ind.target;
            return (
              <div key={i} className="sc-indicator">
                <div className="sc-indicator-label">{ind.label}</div>
                <div className="sc-indicator-value" style={{ color: scoreColor(ind.value) }}>
                  {ind.value}{ind.unit}
                </div>
                <div className="sc-indicator-target" style={{ color: met ? 'var(--accent-safe)' : 'var(--text-muted)' }}>
                  {met ? '✅' : '🎯'} Target: {ind.target}{ind.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lagging Indicators */}
      <div className="sc-section">
        <div className="sc-section-title">📉 Lagging Indicators</div>
        <div className="sc-lagging-row">
          {LAGGING.map((ind, i) => (
            <div key={i} className={`sc-lagging-item sc-lagging-${ind.severity}`}>
              <div className="sc-lagging-value">{ind.value}</div>
              <div className="sc-lagging-label">{ind.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SafetyScorecard;
