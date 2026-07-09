import React from 'react';
import { Shield, Activity, Clock, AlertTriangle } from 'lucide-react';

const SCENARIOS = [
  { id: 'normal', label: 'Normal Operations' },
  { id: 'vizag', label: 'Visakhapatnam Replay' },
  { id: 'confined', label: 'Confined Space Entry' },
];

function getRiskColor(score) {
  if (score >= 75) return 'var(--accent-critical)';
  if (score >= 50) return 'var(--accent-danger)';
  if (score >= 30) return 'var(--accent-warning)';
  return 'var(--accent-safe)';
}

function getStatusClass(status) {
  if (!status) return 'online';
  const s = status.toLowerCase();
  if (s === 'degraded' || s === 'warning') return 'degraded';
  if (s === 'offline' || s === 'error') return 'offline';
  return 'online';
}

function getStatusLabel(status) {
  if (!status) return 'All Systems Online';
  const s = status.toLowerCase();
  if (s === 'degraded' || s === 'warning') return 'Degraded';
  if (s === 'offline' || s === 'error') return 'Offline';
  return 'All Systems Online';
}

const Header = React.memo(function Header({
  scenario = 'normal',
  onScenarioChange,
  systemStatus,
  riskScore = 0,
  simulationTime,
}) {
  const statusClass = getStatusClass(systemStatus);
  const statusLabel = getStatusLabel(systemStatus);
  const riskColor = getRiskColor(riskScore);

  const formattedTime = simulationTime
    ? new Date(simulationTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <header className="header">
      {/* Brand */}
      <div className="header-brand">
        <div className="header-logo">
          <Shield size={22} strokeWidth={2.2} />
          <div>
            <div className="header-title">ShieldAI</div>
            <div className="header-subtitle">Industrial Safety Intelligence</div>
          </div>
        </div>
      </div>

      {/* Scenario Selector */}
      <nav className="scenario-selector" aria-label="Scenario">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`scenario-btn${scenario === s.id ? ' active' : ''}`}
            onClick={() => onScenarioChange?.(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Right Metrics */}
      <div className="header-metrics">
        {/* System status */}
        <div className="system-status">
          <span className={`status-dot ${statusClass}`} />
          <span>{statusLabel}</span>
        </div>

        {/* Risk Score */}
        <div className="risk-score-display">
          <span className="risk-score-value" style={{ color: riskColor }}>
            {riskScore}
            <span style={{ fontSize: '0.65rem', fontWeight: 400 }}>%</span>
          </span>
          <span className="risk-score-label">Risk</span>
        </div>

        {/* Simulation Clock */}
        <div className="sim-clock">
          <Clock size={14} />
          <span>{formattedTime}</span>
        </div>
      </div>
    </header>
  );
});

export default Header;
