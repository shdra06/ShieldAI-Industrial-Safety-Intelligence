import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

/* ── Agent color / icon map ───────────────────────────────── */

const AGENT_META = {
  scada:        { icon: '🔬', cls: 'agent-scada',       label: 'SCADA Agent' },
  vision:       { icon: '👁️', cls: 'agent-vision',      label: 'Vision Agent' },
  permit:       { icon: '📋', cls: 'agent-permit',      label: 'Permit Agent' },
  pattern:      { icon: '📊', cls: 'agent-pattern',     label: 'Pattern Agent' },
  compliance:   { icon: '⚖️', cls: 'agent-compliance',  label: 'Compliance Agent' },
  emergency:    { icon: '🚨', cls: 'agent-emergency',   label: 'Emergency Agent' },
  orchestrator: { icon: '🧠', cls: 'agent-orchestrator', label: 'Orchestrator' },
};

function getAgentMeta(agentType) {
  return AGENT_META[(agentType || '').toLowerCase()] || {
    icon: '💬',
    cls: 'agent-orchestrator',
    label: agentType || 'Agent',
  };
}

function severityClass(severity) {
  const s = (severity || 'info').toLowerCase();
  if (s === 'emergency') return 'severity-emergency';
  if (s === 'critical')  return 'severity-critical';
  if (s === 'warning')   return 'severity-warning';
  return 'severity-info';
}

/* ── Main Component ───────────────────────────────────────── */

const AgentConsole = React.memo(function AgentConsole({ messages = [] }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  /* Determine if agents are "thinking" — last message within 2s or explicit flag */
  const isThinking = messages.length > 0 && messages[messages.length - 1]?.thinking;

  if (messages.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <MessageSquare size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
            Multi-Agent Intelligence Console
          </span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <div className="empty-state-text">Agents initializing…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card agent-console-wrapper">
      <div className="card-header">
        <span className="card-title">
          <MessageSquare size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          Multi-Agent Intelligence Console
        </span>
        <span className="badge badge-info">{messages.length} msgs</span>
      </div>

      <div className="console-messages" ref={containerRef}>
        {messages.map((msg, idx) => {
          const agent = getAgentMeta(msg.agent);
          const sevCls = severityClass(msg.severity);
          const ts = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '';

          return (
            <div key={msg.id || idx} className={`console-message ${sevCls}`}>
              <div className="message-header">
                <span className={`message-agent-name ${agent.cls}`}>
                  <span>{agent.icon}</span>
                  {agent.label}
                </span>
                {ts && <span className="message-timestamp">{ts}</span>}
              </div>
              <div className="message-text">{msg.text || msg.message}</div>
            </div>
          );
        })}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="thinking-indicator">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-label">agents processing…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
});

export default AgentConsole;
