import React, { useState, useEffect } from 'react';

/**
 * StatusBar — 24px bottom bar with essential system metrics.
 * Compact: agents, status, zone alerts, permits, uptime, version.
 */
export default function StatusBar({
  agentCount = 18,
  lastUpdate,
  status = 'safe',
  permits = [],
  zones = [],
  riskScores = {},
  messages = [],
  workerAlerts = [],
}) {
  const activePermits = permits.filter((p) => p.status === 'active').length;
  const alertZones = zones.filter(
    (z) => (riskScores[z.id] ?? riskScores[z.id?.replace('Z-', '')] ?? 0) > 0.5
  ).length;

  const threatCount = (messages ?? []).filter(
    m => m?.severity === 'critical' || m?.severity === 'emergency' || m?.severity === 'danger'
  ).length;

  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setUptimeSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const uptimeStr = `${Math.floor(uptimeSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((uptimeSeconds % 3600) / 60).toString().padStart(2, '0')}:${(uptimeSeconds % 60).toString().padStart(2, '0')}`;

  const dotClass =
    status === 'critical' || status === 'danger' || status === 'emergency' ? 'danger'
      : status === 'warning' ? 'warning' : 'safe';

  return (
    <div className="status-bar">
      {/* Left cluster */}
      <span className="status-item">
        <span className={`status-dot-inline ${dotClass}`} />
        {agentCount} agents
      </span>

      <span className="status-separator">·</span>

      {alertZones > 0 ? (
        <span className="status-item text-warning">⚠ {alertZones} zone{alertZones !== 1 ? 's' : ''}</span>
      ) : (
        <span className="status-item">0 alerts</span>
      )}

      <span className="status-separator">·</span>

      <span className="status-item">{activePermits} permit{activePermits !== 1 ? 's' : ''}</span>

      {threatCount > 0 && (
        <>
          <span className="status-separator">·</span>
          <span className="status-item text-danger">{threatCount} threat{threatCount !== 1 ? 's' : ''}</span>
        </>
      )}

      {/* Right cluster */}
      <span className="status-right">
        <span className="status-item status-mono">⏱ {uptimeStr}</span>
        <span className="status-separator">·</span>
        <span className="status-item status-dim">ShieldAI v2.0</span>
      </span>
    </div>
  );
}
