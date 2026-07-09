import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText } from 'lucide-react';

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

/* ── Main Component ───────────────────────────────────────── */

function EmergencyOrchestrator({ active = false, protocol = {}, incidentReport = '' }) {
  const [showReport, setShowReport] = useState(false);
  const [stepStates, setStepStates] = useState([]);

  /* Animate steps sequentially when activated */
  useEffect(() => {
    if (!active) {
      setStepStates([]);
      setShowReport(false);
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

  return (
    <div className="emergency-panel">
      {/* Red header */}
      <div className="emergency-header">
        <AlertTriangle size={18} />
        <span>⚠️ EMERGENCY PROTOCOL ACTIVATED</span>
      </div>

      <div className="emergency-body">
        {/* Timeline */}
        <div className="emergency-timeline">
          {PROTOCOL_STEPS.map((step, i) => {
            const state = stepStates[i] || { status: 'pending', timestamp: null };
            const statusCls = state.status;
            const ts = state.timestamp
              ? new Date(state.timestamp).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '';

            return (
              <div key={step.id} className={`emergency-step ${statusCls}`}>
                <div className="step-number">{step.id}</div>
                <div className="step-content">
                  <div className="step-description">{step.description}</div>
                  <div className="step-meta">
                    <span className="step-status-icon">{stepStatusIcon(state.status)}</span>
                    {ts && <span className="step-timestamp">{ts}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Incident report toggle */}
        {incidentReport && (
          <>
            <button
              className="incident-report-toggle"
              onClick={() => setShowReport((prev) => !prev)}
            >
              <FileText size={14} />
              <span>Incident Report</span>
              {showReport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showReport && (
              <div className="incident-report-content">
                {incidentReport}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EmergencyOrchestrator;
