import React from 'react';
import { Shield, Clock, Workflow } from 'lucide-react';

const SCENARIOS = [
  { id: 'normal', label: 'Normal' },
  { id: 'vizag', label: 'Vizag Replay' },
  { id: 'confined', label: 'Confined Space' },
  { id: 'deviance', label: 'Silent Drift' },
  { id: 'cascade', label: 'Cascade Failure' },
];

function getRiskColor(score) {
  if (score >= 75) return 'var(--accent-critical, #DC2626)';
  if (score >= 50) return 'var(--accent-danger, #EF4444)';
  if (score >= 30) return 'var(--accent-warning, #F59E0B)';
  return 'var(--accent-safe, #10B981)';
}

function getStatusInfo(status, riskScore = 0) {
  // Derive status dynamically from actual risk score (0-100)
  if (riskScore >= 90) return { label: 'EMERGENCY', cls: 'emergency', dot: 'danger' };
  if (riskScore >= 75) return { label: 'Critical', cls: 'emergency', dot: 'danger' };
  if (riskScore >= 50) return { label: 'Warning', cls: 'degraded', dot: 'warning' };
  if (riskScore >= 25) return { label: 'Elevated', cls: 'degraded', dot: 'warning' };
  return { label: 'Online', cls: 'safe', dot: 'safe' };
}

const Header = React.memo(function Header({
  scenario = 'normal',
  onScenarioChange,
  systemStatus,
  riskScore = 0,
  simulationTime,
  threatCount = 0,
  agentModeActive = false,
  onToggleAgentMode,
  compoundLeadTime = 0,
  compoundRisk = 0,
  incidentsPrevented = 0,
  onDemoMode,
}) {
  const [showPlantMenu, setShowPlantMenu] = React.useState(false);
  const plantMenuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClick = (e) => {
      if (plantMenuRef.current && !plantMenuRef.current.contains(e.target)) {
        setShowPlantMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const statusInfo = getStatusInfo(systemStatus, riskScore);
  const riskColor = getRiskColor(riskScore);

  const formattedTime = simulationTime
    ? new Date(simulationTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <header className={`header ${statusInfo.cls === 'emergency' ? 'header-emergency' : ''}`}>
      {/* Brand — Compact */}
      <div className="header-brand">
        <Shield size={18} strokeWidth={2.5} className="header-shield" />
        <span className="header-title">ShieldAI</span>
      </div>

      {/* Multi-Plant Selector */}
      <div 
        ref={plantMenuRef}
        style={{ position: 'relative', marginLeft: '16px', zIndex: 100 }}
      >
        <button
          className="hm-chip"
          onClick={() => setShowPlantMenu(!showPlantMenu)}
          title="Multi-Plant Ready"
          style={{
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
            color: '#e2e8f0'
          }}
        >
          <span>📍 Rourkela</span>
          <span style={{ fontSize: '9px', opacity: 0.5 }}>▼</span>
        </button>

        {showPlantMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            background: '#1e293b',
            border: '1px solid rgba(100,116,139,0.3)',
            borderRadius: '8px',
            width: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid rgba(100,116,139,0.2)' }}>
              MULTI-PLANT DEPLOYMENT
            </div>
            <button style={{ textAlign: 'left', padding: '10px 12px', background: 'rgba(16,185,129,0.1)', border: 'none', color: '#e2e8f0', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
              Rourkela Steel Plant
            </button>
            <button disabled style={{ textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }}></div>
              Vizag Steel Plant
            </button>
            <button disabled style={{ textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }}></div>
              Bokaro Steel Plant
            </button>
            <button disabled style={{ textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }}></div>
              Durgapur Steel Plant
            </button>
            <div style={{ borderTop: '1px solid rgba(100,116,139,0.2)' }}></div>
            <button disabled style={{ textAlign: 'center', padding: '10px 12px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'not-allowed', fontStyle: 'italic' }}>
              + Add Plant
            </button>
          </div>
        )}
      </div>

      {/* Scenario Tabs — Centered */}
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
        <button
          className="scenario-btn"
          onClick={onDemoMode}
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
            border: '1px solid rgba(139,92,246,0.5)',
            color: '#e2e8f0',
            fontWeight: 700,
          }}
        >
          🎬 Demo
        </button>
      </nav>

      {/* Right Metrics — Clean, grouped */}
      <div className="header-metrics">
        {/* Threat count — only if > 0 */}
        {threatCount > 0 && (
          <div className="hm-chip hm-threat" title={`${threatCount} active threats`}>
            ⚠ {threatCount}
          </div>
        )}

        {/* Agent Mode Toggle */}
        <button
          className={`hm-chip ${agentModeActive ? 'hm-agent-mode-active' : ''}`}
          onClick={onToggleAgentMode}
          title="Toggle Agent Flow Mode"
          style={{
            cursor: 'pointer',
            border: agentModeActive ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255,255,255,0.08)',
            background: agentModeActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
            color: agentModeActive ? '#a78bfa' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            padding: '3px 8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <Workflow size={12} />
          <span>AGENTS</span>
        </button>

        {/* Compound Risk Advantage Badge */}
        {compoundLeadTime > 0 && (
          <div
            className="hm-chip"
            title={`Multi-agent compound risk detection gave a +${compoundLeadTime}m advantage`}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>⏱️</span>
            <span>+{compoundLeadTime}min early</span>
          </div>
        )}

        {/* Incidents Prevented Counter */}
        <div
          className="hm-chip"
          title="Total incidents prevented by ShieldAI"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>🛡️</span>
          <span>{incidentsPrevented} Prevented</span>
        </div>

        {/* System status dot + label */}
        <div className={`hm-chip hm-status hm-status-${statusInfo.cls}`}>
          <span className={`status-dot ${statusInfo.dot}`} />
          <span>{statusInfo.label}</span>
        </div>

        {/* Risk Score — prominent */}
        <div className="hm-risk" title="Compound Risk Score">
          <span className="hm-risk-value" style={{ color: riskColor }}>
            {riskScore}
            <span className="hm-risk-unit">%</span>
          </span>
          <span className="hm-risk-label">RISK</span>
        </div>

        {/* Clock */}
        <div className="hm-chip hm-clock">
          <Clock size={12} />
          <span>{formattedTime}</span>
        </div>
      </div>
    </header>
  );
});

export default Header;
