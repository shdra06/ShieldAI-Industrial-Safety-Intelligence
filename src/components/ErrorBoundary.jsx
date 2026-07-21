// ============================================================================
// ShieldAI — Global Error Boundary
// Catches any React render error and shows a recovery UI instead of blank page
// ============================================================================

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ShieldAI] Component crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100vw', background: '#0a0e1a', color: '#e2e8f0',
          fontFamily: "'Inter', system-ui, sans-serif", padding: '2rem',
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)', borderRadius: '16px', padding: '2rem 3rem',
            border: '1px solid rgba(239, 68, 68, 0.3)', maxWidth: '600px', width: '100%',
            backdropFilter: 'blur(12px)',
          }}>
            <h2 style={{ color: '#ef4444', margin: '0 0 1rem', fontSize: '1.2rem' }}>
              ⚠️ ShieldAI — Component Error
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
              A component crashed. This is usually caused by missing data or an incompatible prop.
            </p>
            <details style={{ marginBottom: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.75rem' }}>
                Technical Details
              </summary>
              <pre style={{
                background: '#1e293b', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem',
                overflow: 'auto', maxHeight: '200px', fontSize: '0.7rem', color: '#f87171',
              }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6',
                  color: '#60a5fa', padding: '0.5rem 1.5rem', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                🔄 Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#94a3b8', padding: '0.5rem 1.5rem', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                🔃 Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lightweight boundary for individual sections (shows inline error)
export class SectionBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ShieldAI] Section "${this.props.name}" crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', minHeight: '60px', padding: '1rem',
          background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.15)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
              ⚠ {this.props.name || 'Section'} crashed
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                marginTop: '4px', background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                color: '#64748b', padding: '2px 8px', borderRadius: '4px',
                cursor: 'pointer', fontSize: '0.65rem',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
