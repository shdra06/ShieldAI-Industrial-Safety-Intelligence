import React from 'react';
import { History } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */

function severityBadge(severity) {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'fatal')    return { cls: 'badge-critical', label: severity };
  if (s === 'high' || s === 'danger')       return { cls: 'badge-danger',   label: severity };
  if (s === 'medium' || s === 'warning')    return { cls: 'badge-warning',  label: severity };
  return { cls: 'badge-info', label: severity || 'Info' };
}

function similarityColor(pct) {
  if (pct >= 80) return 'var(--accent-warning)';
  if (pct >= 60) return 'var(--accent-info)';
  return 'var(--text-muted)';
}

/* ── Main Component ───────────────────────────────────────── */

const IncidentTimeline = React.memo(function IncidentTimeline({ matchedIncidents = [] }) {
  const top3 = matchedIncidents.slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <History size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
            Incident Pattern Intelligence
          </span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-text">No pattern matches yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <History size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          Incident Pattern Intelligence
        </span>
        <span className="badge badge-info">{matchedIncidents.length} matches</span>
      </div>

      <div className="incident-list">
        {top3.map((incident, idx) => {
          const sim = incident.similarity ?? 0;
          const simPct = typeof sim === 'number' && sim <= 1 ? Math.round(sim * 100) : Math.round(sim);
          const isHighMatch = simPct >= 80;
          const badge = severityBadge(incident.severity);
          const simColor = similarityColor(simPct);

          const date = incident.date
            ? new Date(incident.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '';

          return (
            <div
              key={incident.id || idx}
              className={`incident-card${isHighMatch ? ' high-match' : ''}`}
            >
              {/* Header row */}
              <div className="incident-card-header">
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
                <span className="incident-title truncate">{incident.title || 'Unnamed Incident'}</span>
                {date && <span className="incident-date">{date}</span>}
              </div>

              {/* Description */}
              {incident.description && (
                <div className="incident-description">{incident.description}</div>
              )}

              {/* Similarity bar */}
              <div className="similarity-bar">
                <div className="similarity-track">
                  <div
                    className="similarity-fill"
                    style={{ width: `${simPct}%`, backgroundColor: simColor }}
                  />
                </div>
                <span className="similarity-value" style={{ color: simColor }}>
                  {simPct}%
                </span>
              </div>

              {/* Keywords */}
              {incident.keywords && incident.keywords.length > 0 && (
                <div className="incident-tags">
                  {incident.keywords.map((kw) => (
                    <span key={kw} className="incident-tag">{kw}</span>
                  ))}
                </div>
              )}

              {/* Regulatory reference */}
              {incident.regulatoryRef && (
                <div className="incident-reg-ref">
                  <span className="citation-badge">{incident.regulatoryRef}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default IncidentTimeline;
