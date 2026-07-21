import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MessageSquare, Bot, User, Loader2, Clock,
  Sparkles, Cpu, Zap, X, ChevronRight,
} from 'lucide-react';
import { AIManager } from '../engine/ai/AIManager.js';
import { RAGEngine } from '../engine/ai/RAGEngine.js';
import { SAFETY_KNOWLEDGE_BASE } from '../data/rag/safety_knowledge_base.js';
import { generateIndustrialRAGDocuments } from '../data/rag/industrial_database.js';

/* ── Style Constants ─────────────────────────────────────────── */

const GLASS = {
  background: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(99, 102, 241, 0.15)',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

const SUGGESTION_CHIPS = [
  'What are IDLH values for H2S?',
  'Explain confined space permit requirements',
  'What is LOTO procedure?',
  'Indian Factories Act safety provisions',
];

const SYSTEM_PROMPT = `You are ShieldAI Safety Assistant — an expert in industrial safety, occupational health, and regulatory compliance. You specialize in:
- Indian Factories Act 1948 and related regulations
- OSHA standards and international best practices
- Chemical safety (IDLH values, MSDS, exposure limits)
- Confined space entry, LOTO, hot work permits
- Emergency response procedures
- Risk assessment methodologies

Provide precise, actionable answers. Cite regulations when applicable. Use bullet points for procedures. Always emphasize safety-first approaches.

IMPORTANT: When provided with RAG context, use it to ground your answers with specific data from the knowledge base.`;

function getSourceInfo(source) {
  switch (source) {
    case 'gemini': return { label: 'Gemini', color: '#818cf8', Icon: Sparkles };
    case 'webllm': return { label: 'WebLLM', color: '#38bdf8', Icon: Cpu };
    default:       return { label: 'AI', color: '#94a3b8', Icon: Bot };
  }
}

/* ── Chat Bubble ─────────────────────────────────────────────── */

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const source = getSourceInfo(message.source);
  const SourceIcon = source.Icon;

  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px', padding: '0 16px',
    }}>
      <div style={{
        maxWidth: '85%', display: 'flex', gap: '8px',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}>
        {/* Avatar */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isUser
            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
            : 'linear-gradient(135deg, #22c55e, #16a34a)',
          boxShadow: `0 2px 8px ${isUser ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
        }}>
          {isUser ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
        </div>

        {/* Bubble */}
        <div style={{
          background: isUser
            ? 'rgba(59, 130, 246, 0.12)'
            : 'rgba(34, 197, 94, 0.08)',
          border: `1px solid ${isUser ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.15)'}`,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            fontSize: '13px', lineHeight: '1.7', color: '#e2e8f0',
            fontFamily: message.isTechnical
              ? '"JetBrains Mono", "Fira Code", monospace'
              : 'inherit',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {message.content}
          </div>

          {/* Meta row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginTop: '6px', justifyContent: isUser ? 'flex-end' : 'flex-start',
          }}>
            {!isUser && message.source && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '9px', color: source.color, fontWeight: 600,
              }}>
                <SourceIcon size={9} />
                {source.label}
              </div>
            )}
            {message.latency != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#475569' }}>
                <Clock size={9} />
                {message.latency < 1000
                  ? `${message.latency.toFixed(0)}ms`
                  : `${(message.latency / 1000).toFixed(1)}s`}
              </div>
            )}
            <span style={{ fontSize: '9px', color: '#334155' }}>
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Typing Indicator ────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-start',
      marginBottom: '12px', padding: '0 16px',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        }}>
          <Bot size={14} color="#fff" />
        </div>
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.15)',
          borderRadius: '16px 16px 16px 4px',
          padding: '12px 18px',
          display: 'flex', gap: '5px', alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#22c55e',
              animation: `typing-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export function AIChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragReady, setRagReady] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const ragRef = useRef(null);

  /* ── Initialize RAG Engine ────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function initRAG() {
      try {
        const rag = new RAGEngine();
        ragRef.current = rag;
        if (SAFETY_KNOWLEDGE_BASE && Array.isArray(SAFETY_KNOWLEDGE_BASE)) {
          for (const doc of SAFETY_KNOWLEDGE_BASE) {
            rag.addDocument(doc);
          }
        }
        // Also load industrial database (equipment, personnel, chemicals, etc.)
        try {
          const industrialDocs = generateIndustrialRAGDocuments();
          for (const doc of industrialDocs) {
            rag.addDocument(doc);
          }
        } catch (e) {
          console.warn('[AIChatPanel] Industrial DB load failed:', e.message);
        }
        rag.buildIndex();
        if (!cancelled) setRagReady(true);
      } catch (err) {
        console.warn('[AIChatPanel] RAG init failed:', err.message);
        if (!cancelled) setRagReady(false);
      }
    }
    initRAG();
    return () => { cancelled = true; };
  }, []);

  /* ── Auto-scroll ──────────────────────────────────── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /* ── Send Message ─────────────────────────────────── */
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = AIManager.getInstance();

      /* Build RAG context */
      let ragContext = '';
      if (ragRef.current && ragReady) {
        try {
          const results = ragRef.current.search(trimmed, 3);
          if (results && results.length > 0) {
            ragContext = '\n\n--- KNOWLEDGE BASE CONTEXT ---\n' +
              results.map((r, i) =>
                `[${i + 1}] ${r.title || 'Document'}: ${r.content || r.text || ''}`
              ).join('\n\n');
          }
        } catch { /* RAG search failed, proceed without context */ }
      }

      const fullPrompt = trimmed + ragContext;
      const startTime = performance.now();

      const result = await ai.callGemini({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: fullPrompt,
        temperature: 0.5,
      });

      const latency = performance.now() - startTime;

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.success
          ? (typeof result.data === 'string' ? result.data : result.raw || JSON.stringify(result.data))
          : `⚠️ Error: ${result.error || 'AI service unavailable'}`,
        source: result.source || 'none',
        latency,
        timestamp: Date.now(),
        isTechnical: /```|IDLH|ppm|mg\/m|TWA|STEL/i.test(result.raw || ''),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Failed to get response: ${err.message}`,
        source: 'none',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, ragReady]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={GLASS}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={20} color="#22c55e" />
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            AI SAFETY CHAT
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '12px',
            background: ragReady ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${ragReady ? 'rgba(34, 197, 94, 0.25)' : 'rgba(148, 163, 184, 0.15)'}`,
          }}>
            <Zap size={10} color={ragReady ? '#22c55e' : '#64748b'} />
            <span style={{ fontSize: '9px', fontWeight: 600, color: ragReady ? '#22c55e' : '#64748b' }}>
              RAG {ragReady ? 'Ready' : 'Loading'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────── */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 0',
        scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '40px 20px', gap: '16px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(99, 102, 241, 0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}>
              <Bot size={28} color="#818cf8" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                Safety Assistant
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '280px' }}>
                Ask me anything about industrial safety, regulations, permits, or emergency procedures.
              </div>
            </div>

            {/* Suggestion Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '360px', marginTop: '4px' }}>
              {SUGGESTION_CHIPS.map((chip, i) => (
                <button key={i} onClick={() => sendMessage(chip)} style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  borderRadius: '20px', padding: '6px 14px',
                  color: '#94a3b8', fontSize: '11px', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    e.currentTarget.style.color = '#c7d2fe';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <ChevronRight size={10} />
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      {/* ── Input Area ─────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{
        padding: '12px 16px', borderTop: '1px solid rgba(148, 163, 184, 0.08)',
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1, position: 'relative',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '14px',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          transition: 'border-color 0.2s ease',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a safety question..."
            rows={1}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: '13px', lineHeight: '1.5',
              resize: 'none', fontFamily: 'inherit',
              maxHeight: '100px',
            }}
            onFocus={e => {
              e.target.parentElement.style.borderColor = 'rgba(99, 102, 241, 0.4)';
            }}
            onBlur={e => {
              e.target.parentElement.style.borderColor = 'rgba(148, 163, 184, 0.12)';
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          style={{
            width: '40px', height: '40px', borderRadius: '12px',
            border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: input.trim() && !isLoading
              ? 'linear-gradient(135deg, #6366f1, #818cf8)'
              : 'rgba(30, 41, 59, 0.6)',
            transition: 'all 0.2s ease',
            opacity: input.trim() && !isLoading ? 1 : 0.5,
            boxShadow: input.trim() && !isLoading
              ? '0 2px 10px rgba(99, 102, 241, 0.3)'
              : 'none',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (input.trim() && !isLoading) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isLoading
            ? <Loader2 size={16} color="#94a3b8" style={{ animation: 'spin 1.5s linear infinite' }} />
            : <Send size={16} color={input.trim() ? '#fff' : '#64748b'} />}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
