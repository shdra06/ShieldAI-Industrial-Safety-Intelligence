import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Download } from 'lucide-react';

/* ── Protocol steps ───────────────────────────────────────── */

const PROTOCOL_STEPS = [
  { id: 1, description: 'Revoke Active Permits' },
  { id: 2, description: 'Isolate Energy Sources (LOTO)' },
  { id: 3, description: 'Activate Emergency Ventilation' },
  { id: 4, description: 'Sound Evacuation Alarm' },
  { id: 5, description: 'Notify Emergency Response Teams' },
  { id: 6, description: 'Guide Evacuation via Safe Routes' },
  { id: 7, description: 'Preserve Sensor Evidence Trail' },
  { id: 8, description: 'Generate Regulatory Incident Report' },
];

function stepStatusIcon(status) {
  if (status === 'complete')  return '✅';
  if (status === 'executing') return '⚡';
  return '⏳';
}

/* ── Incident report generator ────────────────────────────── */

function generateIncidentReport({ emergencyZones, riskScore, sensors, workers, permits, messages, timestamp }) {
  const time = timestamp ? new Date(timestamp).toLocaleString('en-GB') : new Date().toLocaleString('en-GB');
  const zoneList = (emergencyZones ?? []).join(', ') || 'N/A';
  const affectedWorkers = (workers ?? []).filter(w => {
    const wZone = w.zone || w.zoneId;
    return (emergencyZones ?? []).some(z => z === wZone || `Z-${z}` === wZone);
  });
  const revokedPermits = (permits ?? []).filter(p => p.status === 'revoked').length;
  const critMessages = (messages ?? []).filter(m =>
    m?.severity === 'critical' || m?.severity === 'emergency' || m?.severity === 'danger'
  );

  const sensorReadings = (sensors ?? [])
    .filter(s => s.currentValue > (s.warningThreshold ?? Infinity) * 0.8)
    .map(s => `  • ${s.type ?? s.id}: ${s.currentValue?.toFixed(1)} (threshold: ${s.criticalThreshold})`)
    .join('\n') || '  • No anomalous readings';

  return `
═══════════════════════════════════════════════════════
        INCIDENT REPORT — ShieldAI Automated
═══════════════════════════════════════════════════════

Report Generated: ${time}
Incident Classification: EMERGENCY RESPONSE
Report ID: IR-${Date.now().toString(36).toUpperCase()}

─── SITUATION SUMMARY ───────────────────────────────
• Affected Zones: ${zoneList}
• Compound Risk Score: ${Math.round((riskScore ?? 0) * 100)}%
• Workers in Affected Zones: ${affectedWorkers.length}
• Permits Revoked: ${revokedPermits}

─── SENSOR READINGS AT TIME OF INCIDENT ─────────────
${sensorReadings}

─── WORKERS REQUIRING ACCOUNTABILITY ────────────────
${affectedWorkers.length > 0
  ? affectedWorkers.map(w => `  • ${w.name ?? w.id} — Zone: ${w.zone ?? w.zoneId}, PPE: ${w.ppeCompliant !== false ? '✅' : '❌'}`).join('\n')
  : '  • No workers in affected zones'}

─── AGENT ALERTS (Critical) ─────────────────────────
${critMessages.length > 0
  ? critMessages.slice(-5).map(m => `  [${m.agent ?? 'SYSTEM'}] ${m.text ?? m.message ?? 'Alert triggered'}`).join('\n')
  : '  • No critical alerts logged'}

─── REGULATORY COMPLIANCE ───────────────────────────
• OSHA 29 CFR 1910.119 — PSM Emergency Response: ACTIVATED
• EPA 40 CFR 68 — RMP Emergency Procedures: ACTIVATED
• IS 15656:2006 — Hazardous Chemical Storage: REFERENCED

─── ACTIONS TAKEN ───────────────────────────────────
• All active permits revoked automatically
• Energy sources isolated (LOTO procedure)
• Emergency ventilation activated
• Evacuation alarm sounded
• Emergency response teams notified
• Safe evacuation routes communicated
• Sensor evidence trail preserved

═══════════════════════════════════════════════════════
        END OF AUTOMATED INCIDENT REPORT
═══════════════════════════════════════════════════════
  `.trim();
}

/* ── Main Component ───────────────────────────────────────── */

function EmergencyOrchestrator({
  active = false,
  protocol = {},
  incidentReport: externalReport = null,
  emergencyZones = [],
  riskScore = 0,
  sensors = [],
  workers = [],
  permits = [],
  messages = [],
  simulationTime = null,
}) {
  const [stepStates, setStepStates] = useState([]);

  // BUG FIX: Generate incident report from emergency state when active (not always null)
  const incidentReport = useMemo(() => {
    if (externalReport) return externalReport;
    if (!active) return null;
    return generateIncidentReport({
      emergencyZones,
      riskScore,
      sensors,
      workers,
      permits,
      messages,
      timestamp: simulationTime,
    });
  }, [active, externalReport, emergencyZones, riskScore, sensors, workers, permits, messages, simulationTime]);

  /* Animate steps sequentially when activated */
  useEffect(() => {
    if (!active) {
      setStepStates([]);
      return;
    }

    /* If protocol provides step statuses, use those */
    if (protocol.steps && protocol.steps.length > 0) {
      setStepStates(protocol.steps);
      return;
    }

    /* Otherwise, auto-animate: each step goes pending → executing → complete */
    const states = PROTOCOL_STEPS.map(() => ({ status: 'pending', timestamp: null }));
    setStepStates([...states]);

    const timers = [];
    PROTOCOL_STEPS.forEach((_, i) => {
      /* Start executing */
      const execTimer = setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          next[i] = { status: 'executing', timestamp: new Date().toISOString() };
          return next;
        });
      }, i * 2000);

      /* Complete */
      const completeTimer = setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          next[i] = { status: 'complete', timestamp: new Date().toISOString() };
          return next;
        });
      }, i * 2000 + 1500);

      timers.push(execTimer, completeTimer);
    });

    return () => timers.forEach(clearTimeout);
  }, [active, protocol]);

  if (!active) return null;

  const completedSteps = stepStates.filter(s => s.status === 'complete').length;
  const progress = Math.round((completedSteps / PROTOCOL_STEPS.length) * 100);

  return (
    <div className="emergency-panel">
      {/* Red header */}
      <div className="emergency-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={13} />
          EMERGENCY PROTOCOL
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', opacity: 0.85 }}>
          {progress}% {emergencyZones.length > 0 ? `· ${emergencyZones.join(', ')}` : ''}
        </span>
      </div>

      <div className="emergency-body">
        {/* Compact 4-column step grid */}
        <div className="emergency-timeline">
          {PROTOCOL_STEPS.map((step, i) => {
            const state = stepStates[i] || { status: 'pending', timestamp: null };
            const statusCls = state.status;
            return (
              <div key={step.id} className={`emergency-step ${statusCls}`}>
                <div className={`step-number ${statusCls}`}>{stepStatusIcon(state.status)}</div>
                <div className="step-description">{step.description}</div>
              </div>
            );
          })}
        </div>

        {/* Download incident report */}
        {incidentReport && progress === 100 && (
          <button
            className="emergency-download-btn"
            onClick={() => {
              const blob = new Blob([incidentReport], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `incident-report-${Date.now()}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={11} /> Download Report
          </button>
        )}
      </div>
    </div>
  );
}

export default EmergencyOrchestrator;
