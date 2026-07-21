import React, { useMemo } from 'react';

/* ── Worker Panel — Real-time worker roster & alerts ─────── */

const ROLE_EMOJIS = {
  operator: '🔧',
  supervisor: '👔',
  engineer: '⚙️',
  technician: '🛠️',
  safety: '🦺',
  contractor: '🏗️',
  default: '👷',
};

const FATIGUE_COLORS = {
  low: { color: 'var(--accent-safe)', label: 'Low', bg: 'rgba(16, 185, 129, 0.1)' },
  moderate: { color: 'var(--accent-warning)', label: 'Moderate', bg: 'rgba(245, 158, 11, 0.1)' },
  high: { color: 'var(--accent-danger)', label: 'High', bg: 'rgba(239, 68, 68, 0.1)' },
};

const ALERT_SEVERITY_COLORS = {
  high: 'badge-critical',
  medium: 'badge-warning',
  low: 'badge-info',
};

const WorkerPanel = React.memo(function WorkerPanel({
  workers = [],
  workerAlerts = [],
  temporalRisk = {},
}) {
  /* Zone distribution */
  const zoneDistribution = useMemo(() => {
    const dist = {};
    workers.forEach(w => {
      const zone = w.zone || w.zoneId || 'Unknown';
      dist[zone] = (dist[zone] || 0) + 1;
    });
    return dist;
  }, [workers]);

  /* Worker compliance stats */
  const stats = useMemo(() => {
    const total = workers.length;
    const compliant = workers.filter(w => w.ppeCompliant !== false).length;
    const certified = workers.filter(w => w.certificationValid !== false).length;
    return { total, compliant, certified };
  }, [workers]);

  const fatigueLevel = temporalRisk?.fatigueLevel ?? 'low';
  const shiftPhase = temporalRisk?.shiftPhase ?? 'mid';

  return (
    <div className="worker-panel card">
      <div className="card-header">
        <span className="card-title">👷 Worker Safety Dashboard</span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <span className="badge badge-info">{stats.total} on-site</span>
          <span className={`badge ${stats.compliant === stats.total ? 'badge-safe' : 'badge-warning'}`}>
            {stats.compliant}/{stats.total} PPE ✓
          </span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="wp-stats-row">
        <div className="wp-stat-box">
          <div className="wp-stat-value" style={{ color: 'var(--accent-info)' }}>{stats.total}</div>
          <div className="wp-stat-label">Workers</div>
        </div>
        <div className="wp-stat-box">
          <div className="wp-stat-value" style={{ color: stats.compliant === stats.total ? 'var(--accent-safe)' : 'var(--accent-warning)' }}>
            {Math.round((stats.compliant / Math.max(stats.total, 1)) * 100)}%
          </div>
          <div className="wp-stat-label">PPE Compliance</div>
        </div>
        <div className="wp-stat-box">
          <div className="wp-stat-value" style={{ color: FATIGUE_COLORS[fatigueLevel].color }}>
            {FATIGUE_COLORS[fatigueLevel].label}
          </div>
          <div className="wp-stat-label">Fatigue Level</div>
        </div>
        <div className="wp-stat-box">
          <div className="wp-stat-value" style={{ color: 'var(--accent-purple)', textTransform: 'capitalize' }}>
            {shiftPhase}
          </div>
          <div className="wp-stat-label">Shift Phase</div>
        </div>
      </div>

      {/* Zone Distribution Bar */}
      <div className="wp-zone-bar">
        <div className="wp-zone-bar-label">Zone Distribution</div>
        <div className="wp-zone-bar-track">
          {Object.entries(zoneDistribution).map(([zone, count], i) => {
            const colors = ['var(--accent-info)', 'var(--accent-safe)', 'var(--accent-purple)', 'var(--accent-warning)', 'var(--accent-cyan)', 'var(--accent-danger)'];
            const pct = (count / Math.max(stats.total, 1)) * 100;
            return (
              <div
                key={zone}
                className="wp-zone-bar-segment"
                style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                title={`${zone}: ${count} workers`}
              >
                {pct > 12 && <span className="wp-zone-bar-text">{zone.replace('Z-', '')}</span>}
              </div>
            );
          })}
        </div>
        <div className="wp-zone-bar-legend">
          {Object.entries(zoneDistribution).map(([zone, count], i) => {
            const colors = ['var(--accent-info)', 'var(--accent-safe)', 'var(--accent-purple)', 'var(--accent-warning)', 'var(--accent-cyan)', 'var(--accent-danger)'];
            return (
              <span key={zone} className="wp-zone-legend-item">
                <span className="wp-zone-legend-dot" style={{ background: colors[i % colors.length] }} />
                {zone.replace('Z-', '')}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Worker Alerts */}
      {workerAlerts.length > 0 && (
        <div className="wp-alerts">
          <div className="wp-section-title">⚡ Active Worker Alerts</div>
          {workerAlerts.slice(0, 5).map((alert, i) => (
            <div key={i} className={`wp-alert-item ${alert.severity === 'high' ? 'wp-alert-critical' : ''}`}>
              <span className="wp-alert-icon">
                {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
              </span>
              <div className="wp-alert-content">
                <span className="wp-alert-name">{alert.workerName ?? `Worker ${alert.workerId}`}</span>
                <span className="wp-alert-detail">
                  {alert.alertType ?? 'Alert'} — Zone {alert.zoneId ?? '?'}
                  {alert.distance != null && ` (${alert.distance.toFixed(1)}m)`}
                </span>
              </div>
              <span className={`badge ${ALERT_SEVERITY_COLORS[alert.severity] ?? 'badge-info'}`}>
                {(alert.severity ?? 'info').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Worker Roster Table */}
      <div className="wp-table-wrapper">
        <div className="wp-section-title">Worker Roster</div>
        <div className="wp-table">
          <div className="wp-table-header">
            <span className="wp-col-avatar"></span>
            <span className="wp-col-name">Name</span>
            <span className="wp-col-role">Role</span>
            <span className="wp-col-zone">Zone</span>
            <span className="wp-col-ppe">PPE</span>
            <span className="wp-col-cert">Cert</span>
          </div>
          {workers.slice(0, 12).map((w, i) => {
            const role = (w.role ?? 'default').toLowerCase();
            const emoji = ROLE_EMOJIS[role] || ROLE_EMOJIS.default;
            const compliant = w.ppeCompliant !== false;
            const certValid = w.certificationValid !== false;

            return (
              <div key={w.id || i} className={`wp-table-row ${!compliant ? 'wp-row-noncompliant' : ''}`}>
                <span className="wp-col-avatar">{emoji}</span>
                <span className="wp-col-name">{w.name ?? `W-${w.id}`}</span>
                <span className="wp-col-role" style={{ textTransform: 'capitalize' }}>{w.role ?? '—'}</span>
                <span className="wp-col-zone">{(w.zone ?? w.zoneId ?? '—').replace('Z-', '')}</span>
                <span className="wp-col-ppe">{compliant ? '✅' : '❌'}</span>
                <span className="wp-col-cert">{certValid ? '✅' : '⚠️'}</span>
              </div>
            );
          })}
          {workers.length === 0 && (
            <div className="wp-empty">No workers on-site</div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WorkerPanel;
