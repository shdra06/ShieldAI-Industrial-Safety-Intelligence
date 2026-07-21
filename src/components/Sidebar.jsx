import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, Shield, ClipboardList, History, Users, Layers, Brain, AlertTriangle } from 'lucide-react';
import RiskGauge from './RiskGauge.jsx';
import PermitBoard from './PermitBoard.jsx';
import IncidentTimeline from './IncidentTimeline.jsx';

/**
 * Sidebar — Accordion-style collapsible sections.
 * Only ONE section expands at a time (ISA-101 progressive disclosure).
 * Compact, professional layout with minimal visual noise.
 */
export default function Sidebar({
  compoundRisk,
  singleSensorRisk,
  status,
  permits = [],
  matchedIncidents = [],
  swissCheese = {},
  workers = [],
  temporalRisk = {},
  compoundLeadTime,
  incidentsPrevented,
}) {
  // Accordion: only one section open at a time. null = all collapsed.
  const [activeSection, setActiveSection] = useState('intel');

  // Auto-expand risk section when compound risk is elevated
  useEffect(() => {
    if (compoundRisk >= 50) setActiveSection('risk');
  }, [compoundRisk]);

  const toggle = useCallback((key) => {
    setActiveSection((prev) => (prev === key ? null : key));
  }, []);

  const activePermitCount = permits.filter((p) => p.status === 'active').length;
  const revokedCount = permits.filter((p) => p.status === 'revoked').length;

  // Swiss Cheese data
  const scLayers = swissCheese?.layers ?? [];
  const alignmentScore = swissCheese?.alignmentScore ?? 0;
  const trajectoryBlocked = swissCheese?.trajectoryBlocked ?? true;

  // Worker summary
  const totalWorkers = workers.length;
  const compliantWorkers = workers.filter((w) => w.ppeCompliant !== false).length;
  const nonCompliant = totalWorkers - compliantWorkers;

  // Temporal risk
  const shiftPhase = temporalRisk?.shiftPhase ?? 'mid';
  const fatigueLevel = temporalRisk?.fatigueLevel ?? 'low';

  // Section config for rendering
  const sections = [
    {
      key: 'intel',
      icon: <Brain size={12} />,
      label: 'Intelligence Summary',
      badge: 'Active',
      badgeClass: 'badge-safe',
      content: (
        <div className="sb-worker-grid">
          <div className="sb-kpi">
            <div className="sb-kpi-value" style={{ color: 'var(--accent-safe)' }}>18</div>
            <div className="sb-kpi-label">AI Agents</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi-value">{compoundLeadTime}</div>
            <div className="sb-kpi-label">Lead Time (min)</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi-value">{incidentsPrevented}</div>
            <div className="sb-kpi-label">Incidents Prevented</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi-value">130+</div>
            <div className="sb-kpi-label">RAG Documents</div>
          </div>
        </div>
      ),
    },
    {
      key: 'vizag',
      icon: <AlertTriangle size={12} />,
      label: 'Vizag Context',
      content: (
        <div style={{ color: '#F59E0B', fontSize: '0.85em', lineHeight: '1.4' }}>
          Based on Visakhapatnam Steel Plant (Jan 2025) incident where 8 workers died due to coke oven gas explosion. ShieldAI's compound risk engine would have detected the threat 12+ minutes earlier by correlating gas pressure anomalies with equipment age and maintenance gaps.
        </div>
      ),
    },
    {
      key: 'risk',
      icon: <Shield size={12} />,
      label: 'Risk Overview',
      badge: compoundRisk != null ? `${compoundRisk}%` : null,
      badgeClass: compoundRisk >= 75 ? 'badge-critical' : compoundRisk >= 40 ? 'badge-warning' : 'badge-safe',
      content: (
        <RiskGauge
          compoundRisk={compoundRisk}
          singleSensorRisk={singleSensorRisk}
          status={status}
        />
      ),
    },
    {
      key: 'barriers',
      icon: <Layers size={12} />,
      label: 'Barrier Defense',
      badge: trajectoryBlocked ? 'OK' : '⚠',
      badgeClass: trajectoryBlocked ? 'badge-safe' : 'badge-critical',
      content: (
        <div className="sb-sc-mini">
          <div className="sb-sc-alignment-row">
            <span className="sb-sc-metric-label">Alignment</span>
            <span
              className="sb-sc-metric-value"
              style={{
                color:
                  alignmentScore >= 0.7
                    ? 'var(--accent-danger)'
                    : alignmentScore >= 0.4
                    ? 'var(--accent-warning)'
                    : 'var(--accent-safe)',
              }}
            >
              {Math.round(alignmentScore * 100)}%
            </span>
          </div>
          {scLayers.map((layer, i) => {
            const integrity = layer.integrity ?? 1;
            const color =
              integrity >= 0.8
                ? 'var(--accent-safe)'
                : integrity >= 0.6
                ? 'var(--accent-warning)'
                : 'var(--accent-danger)';
            return (
              <div key={i} className="sb-sc-layer">
                <span className="sb-sc-layer-name" title={layer.name}>
                  {['⚙️', '📋', '👁️', '🧠', '🦺'][i] ?? '🛡️'}
                </span>
                <div className="sb-sc-bar-track">
                  <div
                    className="sb-sc-bar-fill"
                    style={{ width: `${integrity * 100}%`, background: color }}
                  />
                </div>
                <span className="sb-sc-layer-pct" style={{ color }}>
                  {Math.round(integrity * 100)}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: 'workers',
      icon: <Users size={12} />,
      label: 'Workforce',
      badge: `${totalWorkers}`,
      badgeClass: nonCompliant > 0 ? 'badge-warning' : 'badge-muted',
      content: (
        <div className="sb-worker-grid">
          <div className="sb-kpi">
            <div className="sb-kpi-value">{totalWorkers}</div>
            <div className="sb-kpi-label">On-Site</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi-value" style={{ color: nonCompliant > 0 ? 'var(--accent-warning)' : 'var(--accent-safe)' }}>
              {compliantWorkers}/{totalWorkers}
            </div>
            <div className="sb-kpi-label">PPE ✓</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi-value" style={{ textTransform: 'capitalize' }}>
              {shiftPhase === 'changeover' ? '🔄' : shiftPhase === 'start' ? '🌅' : shiftPhase === 'end' ? '🌆' : '☀️'} {shiftPhase}
            </div>
            <div className="sb-kpi-label">Shift</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi-value">
              {fatigueLevel === 'high' ? '🔴' : fatigueLevel === 'moderate' ? '🟡' : '🟢'} {fatigueLevel}
            </div>
            <div className="sb-kpi-label">Fatigue</div>
          </div>
        </div>
      ),
    },
    {
      key: 'permits',
      icon: <ClipboardList size={12} />,
      label: 'Permits',
      badge: revokedCount > 0 ? `${revokedCount} revoked` : `${activePermitCount}`,
      badgeClass: revokedCount > 0 ? 'badge-critical' : 'badge-muted',
      content: <PermitBoard permits={permits} />,
    },
    {
      key: 'incidents',
      icon: <History size={12} />,
      label: 'Incident Patterns',
      badge: matchedIncidents.length > 0 ? `${matchedIncidents.length}` : null,
      badgeClass: matchedIncidents.length > 0 ? 'badge-warning' : 'badge-muted',
      content: <IncidentTimeline matchedIncidents={matchedIncidents} />,
    },
  ];

  // Determine which sections have something noteworthy
  const sectionHasAlert = {
    intel: true,
    vizag: true,
    risk: compoundRisk >= 30,
    barriers: !trajectoryBlocked || alignmentScore >= 0.4,
    workers: nonCompliant > 0 || fatigueLevel !== 'low',
    permits: revokedCount > 0,
    incidents: matchedIncidents.length > 0,
  };

  return (
    <aside className="sidebar">
      {sections.map((section) => {
        const isActive = activeSection === section.key;
        const hasAlert = sectionHasAlert[section.key];
        return (
          <div
            key={section.key}
            className={`sidebar-section ${isActive ? 'expanded' : ''}`}
            style={!hasAlert && !isActive ? { opacity: 0.5 } : undefined}
          >
            <button
              className="sidebar-section-header"
              onClick={() => toggle(section.key)}
              aria-expanded={isActive}
            >
              <div className="ssh-left">
                <ChevronRight
                  size={11}
                  className={`ssh-chevron ${isActive ? 'rotated' : ''}`}
                />
                {section.icon}
                <span className="ssh-label">{section.label}</span>
              </div>
              {section.badge && (
                <span className={`ssh-badge ${section.badgeClass || ''}`}>
                  {section.badge}
                </span>
              )}
            </button>
            <div className={`sidebar-section-body ${isActive ? '' : 'collapsed'}`}>
              <div className="ssb-inner">
                {section.content}
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
