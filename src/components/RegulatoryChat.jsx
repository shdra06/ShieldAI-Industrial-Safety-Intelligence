import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Send, BookOpen } from 'lucide-react';

/* ── Suggestions ──────────────────────────────────────────── */

const SUGGESTIONS = [
  'Section 36 confined space',
  'Hot work permit requirements',
  'Emergency preparedness OISD',
];

/* ── Main Component ───────────────────────────────────────── */

function RegulatoryChat({ regulations = [], searchRegulations }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSearching]);

  /* Submit a query */
  const handleSubmit = useCallback(async (query) => {
    const q = (query || input).trim();
    if (!q) return;

    /* Add user message */
    setMessages((prev) => [...prev, { type: 'query', text: q, id: Date.now() }]);
    setInput('');
    setIsSearching(true);

    try {
      if (typeof searchRegulations === 'function') {
        const results = await searchRegulations(q);
        setMessages((prev) => [
          ...prev,
          { type: 'response', results: results || [], query: q, id: Date.now() + 1 },
        ]);
      } else {
        /* No search function — show empty */
        setMessages((prev) => [
          ...prev,
          { type: 'response', results: [], query: q, id: Date.now() + 1 },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: 'response', results: [], query: q, id: Date.now() + 1, error: true },
      ]);
    } finally {
      setIsSearching(false);
    }
  }, [input, searchRegulations]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <BookOpen size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          Regulatory Intelligence (RAG)
        </span>
      </div>

      {/* Suggestions (only show when no messages) */}
      {messages.length === 0 && (
        <div className="chat-suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chat-suggestion-btn"
              onClick={() => handleSubmit(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => {
          if (msg.type === 'query') {
            return (
              <div key={msg.id} className="chat-query">
                {msg.text}
              </div>
            );
          }

          /* Response */
          const results = msg.results || [];
          return (
            <div key={msg.id} className="chat-response">
              {results.length === 0 ? (
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {msg.error
                    ? 'Error searching regulatory corpus. Please try again.'
                    : 'No matching regulations found.'}
                </div>
              ) : (
                results.map((r, ri) => (
                  <div key={ri} style={{ marginBottom: ri < results.length - 1 ? '0.75rem' : 0 }}>
                    {/* Citation badge */}
                    <div style={{ marginBottom: '0.35rem' }}>
                      <span className="citation-badge">
                        {r.act || r.actName || 'Regulation'} {r.section ? `S.${r.section}` : ''}
                      </span>
                      {r.relevance != null && (
                        <span className="text-muted" style={{ fontSize: '0.65rem', marginLeft: '0.35rem' }}>
                          {Math.round(r.relevance * 100)}% match
                        </span>
                      )}
                    </div>

                    {/* Clause title */}
                    {r.title && (
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        {r.title}
                      </div>
                    )}

                    {/* Clause text */}
                    {r.text && <blockquote>{r.text}</blockquote>}

                    {/* Relevance bar */}
                    {r.relevance != null && (
                      <div className="relevance-bar">
                        <div className="relevance-fill" style={{ width: `${Math.round(r.relevance * 100)}%` }} />
                      </div>
                    )}

                    {/* Applicable zones */}
                    {r.applicableZones && r.applicableZones.length > 0 && (
                      <div className="applicable-tags">
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginRight: '0.15rem' }}>
                          Applicable to:
                        </span>
                        {r.applicableZones.map((z) => (
                          <span key={z} className="applicable-tag">{z}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}

        {/* Searching indicator */}
        {isSearching && (
          <div className="chat-response">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '0.2rem' }}>
                Searching regulatory corpus…
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Ask about regulations…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
        />
        <button
          className="chat-send-btn"
          onClick={() => handleSubmit()}
          disabled={isSearching || !input.trim()}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default RegulatoryChat;
