import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Database, FileText, BarChart3,
  ChevronDown, ChevronRight, ExternalLink, Flag,
} from 'lucide-react';
import {
  DATASET_META, INCIDENTS, REGULATIONS, STATISTICS,
} from '../data/indian_safety_dataset';

/* ============================================================================
   ShieldAI — Dataset Explorer
   Browse, search, and filter the Indian Industrial Safety Dataset.
   ============================================================================ */

// ── Theme tokens (inline) ────────────────────────────────────────────────────
const T = {
  bg:        '#0a0e1a',
  bgCard:    'rgba(17, 24, 39, 0.85)',
  bgHover:   'rgba(17, 24, 39, 0.95)',
  bgInput:   'rgba(15, 23, 42, 0.9)',
  border:    'rgba(148, 163, 184, 0.12)',
  borderFocus: 'rgba(59, 130, 246, 0.5)',
  text:      '#e2e8f0',
  textSec:   '#94a3b8',
  textMuted: '#64748b',
  safe:      '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  critical:  '#dc2626',
  info:      '#3b82f6',
  purple:    '#8b5cf6',
  cyan:      '#06b6d4',
  orange:    '#f97316',
  fontSans:  "'Inter', system-ui, -apple-system, sans-serif",
  fontMono:  "'JetBrains Mono', 'Fira Code', monospace",
  radius:    '10px',
  radiusSm:  '6px',
  radiusLg:  '14px',
  shadow:    '0 4px 12px rgba(0, 0, 0, 0.4)',
  shadowLg:  '0 8px 32px rgba(0, 0, 0, 0.5)',
  glass:     'blur(12px)',
};

const SEVERITY_COLORS = {
  Fatal:   T.danger,
  Serious: T.orange,
  Minor:   T.warning,
};

const TAB_CONFIG = [
  { key: 'incidents',   label: 'Incidents',   icon: Flag },
  { key: 'regulations', label: 'Regulations', icon: FileText },
  { key: 'statistics',  label: 'Statistics',  icon: BarChart3 },
];

// ── Utility: extract unique values from array ────────────────────────────────
function uniqueValues(arr, key) {
  return [...new Set(arr.map(item => item[key]).filter(Boolean))].sort();
}

// ── Shared inline styles ─────────────────────────────────────────────────────
const S = {
  container: {
    fontFamily: T.fontSans,
    color: T.text,
    padding: '24px',
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
    padding: '20px 24px',
    background: `linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.06))`,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    backdropFilter: T.glass,
  },
  badge: (bg, color = '#fff') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    background: bg + '22',
    color,
    border: `1px solid ${bg}44`,
  }),
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  input: {
    flex: '1 1 260px',
    padding: '10px 14px 10px 38px',
    background: T.bgInput,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm,
    color: T.text,
    fontSize: '13px',
    fontFamily: T.fontSans,
    outline: 'none',
    transition: 'border-color 0.2s',
    minWidth: 0,
  },
  select: {
    padding: '10px 12px',
    background: T.bgInput,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm,
    color: T.text,
    fontSize: '12px',
    fontFamily: T.fontSans,
    outline: 'none',
    cursor: 'pointer',
    minWidth: '130px',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 2px',
    fontSize: '13px',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '11px',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: T.textMuted,
    borderBottom: `1px solid ${T.border}`,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    borderBottom: `1px solid rgba(148,163,184,0.05)`,
    verticalAlign: 'top',
  },
  card: {
    background: T.bgCard,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
    padding: '18px 20px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: T.glass,
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '4px',
    borderRadius: T.radius,
    border: `1px solid ${T.border}`,
  },
  tab: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: T.radiusSm,
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    fontFamily: T.fontSans,
    color: active ? T.text : T.textMuted,
    background: active ? `rgba(59, 130, 246, 0.15)` : 'transparent',
    transition: 'all 0.2s ease',
  }),
  counter: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: T.radiusSm,
    background: 'rgba(15, 23, 42, 0.6)',
    border: `1px solid ${T.border}`,
    fontSize: '12px',
    color: T.textSec,
    fontFamily: T.fontMono,
  },
  expandedRow: {
    padding: '14px 20px',
    background: 'rgba(15, 23, 42, 0.5)',
    borderBottom: `1px solid ${T.border}`,
    fontSize: '12.5px',
    lineHeight: 1.7,
    color: T.textSec,
  },
  sortArrow: {
    fontSize: '10px',
    marginLeft: '4px',
    opacity: 0.7,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function DatasetExplorer() {
  const [activeTab, setActiveTab] = useState('incidents');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Incident filters
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterIncidentType, setFilterIncidentType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Regulation filters
  const [filterAct, setFilterAct] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleSort = useCallback((key) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortKey(key);
  }, [sortKey]);

  // ── Incident options ─────────────────────────────────────────────────────
  const industryOptions   = useMemo(() => uniqueValues(INCIDENTS, 'industry_type'), []);
  const incidentOptions   = useMemo(() => uniqueValues(INCIDENTS, 'incident_type'), []);
  const severityOptions   = useMemo(() => uniqueValues(INCIDENTS, 'severity'), []);
  const stateOptions      = useMemo(() => uniqueValues(INCIDENTS, 'state'), []);
  const actOptions        = useMemo(() => uniqueValues(REGULATIONS, 'act_name'), []);
  const categoryOptions   = useMemo(() => uniqueValues(REGULATIONS, 'category'), []);

  // ── Filtered incidents ────────────────────────────────────────────────────
  const filteredIncidents = useMemo(() => {
    const q = search.toLowerCase();
    let result = INCIDENTS.filter(inc => {
      if (q && ![inc.company, inc.state, inc.cause].some(f => (f || '').toLowerCase().includes(q))) return false;
      if (filterIndustry && inc.industry_type !== filterIndustry) return false;
      if (filterIncidentType && inc.incident_type !== filterIncidentType) return false;
      if (filterSeverity && inc.severity !== filterSeverity) return false;
      if (filterState && inc.state !== filterState) return false;
      return true;
    });
    result.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'fatalities') { va = +va; vb = +vb; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [search, filterIndustry, filterIncidentType, filterSeverity, filterState, sortKey, sortDir]);

  // ── Filtered regulations ──────────────────────────────────────────────────
  const filteredRegs = useMemo(() => {
    const q = search.toLowerCase();
    return REGULATIONS.filter(reg => {
      if (q && ![reg.title, reg.text, reg.section].some(f => (f || '').toLowerCase().includes(q))) return false;
      if (filterAct && reg.act_name !== filterAct) return false;
      if (filterCategory && reg.category !== filterCategory) return false;
      return true;
    });
  }, [search, filterAct, filterCategory]);

  // ── Stats for chart ───────────────────────────────────────────────────────
  const maxFatalities = Math.max(...STATISTICS.map(s => s.fatalities));

  const totalRecords =
    DATASET_META.total_records.incidents +
    DATASET_META.total_records.regulations +
    DATASET_META.total_records.statistics;

  // ── Render sort indicator ─────────────────────────────────────────────────
  const sortIndicator = (key) => {
    if (sortKey !== key) return null;
    return <span style={S.sortArrow}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={S.container}>
      {/* ── Dataset Info Header ─────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Database size={20} color={T.info} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {DATASET_META.name}
            </h2>
            <span style={S.badge(T.safe, T.safe)}>v{DATASET_META.version}</span>
            <span style={S.badge(T.orange, T.orange)}>Open Source 🇮🇳</span>
          </div>
          <p style={{ fontSize: '12.5px', color: T.textSec, lineHeight: 1.6, margin: 0, maxWidth: '640px' }}>
            {DATASET_META.description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={S.counter}>
            <Flag size={13} /> {DATASET_META.total_records.incidents} incidents
          </div>
          <div style={S.counter}>
            <FileText size={13} /> {DATASET_META.total_records.regulations} regulations
          </div>
          <div style={S.counter}>
            <BarChart3 size={13} /> {DATASET_META.total_records.statistics} years data
          </div>
          <a
            href={DATASET_META.huggingface_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: T.radiusSm,
              background: `linear-gradient(135deg, ${T.purple}33, ${T.info}22)`,
              border: `1px solid ${T.purple}44`,
              color: T.purple, fontSize: '12px', fontWeight: 600,
              textDecoration: 'none', transition: 'all 0.2s',
            }}
          >
            🤗 HuggingFace <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────── */}
      <div style={S.tabBar}>
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            style={S.tab(activeTab === key)}
            onClick={() => { setActiveTab(key); setSearch(''); setExpandedId(null); }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ ...S.counter, fontSize: '11px', padding: '4px 12px' }}>
          {totalRecords} total records
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  INCIDENTS TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'incidents' && (
        <div>
          <div style={S.searchRow}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={15} color={T.textMuted}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                style={S.input}
                placeholder="Search by company, state, or cause…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={e => { e.target.style.borderColor = T.borderFocus; }}
                onBlur={e => { e.target.style.borderColor = T.border; }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: T.textMuted, fontSize: '12px' }}>
              <Filter size={13} /> Filters:
            </div>
            <select style={S.select} value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
              <option value="">All Industries</option>
              {industryOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select style={S.select} value={filterIncidentType} onChange={e => setFilterIncidentType(e.target.value)}>
              <option value="">All Types</option>
              {incidentOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select style={S.select} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
              <option value="">All Severity</option>
              {severityOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select style={S.select} value={filterState} onChange={e => setFilterState(e.target.value)}>
              <option value="">All States</option>
              {stateOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: T.textMuted }}>
              Showing <strong style={{ color: T.text }}>{filteredIncidents.length}</strong> of{' '}
              <strong style={{ color: T.text }}>{INCIDENTS.length}</strong> incidents
            </span>
          </div>

          <div style={{
            background: T.bgCard, border: `1px solid ${T.border}`,
            borderRadius: T.radius, overflow: 'hidden', backdropFilter: T.glass,
          }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: '28px' }} />
                  <th style={S.th} onClick={() => handleSort('date')}>Date {sortIndicator('date')}</th>
                  <th style={S.th}>State</th>
                  <th style={S.th}>Industry</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th} onClick={() => handleSort('fatalities')}>Fatalities {sortIndicator('fatalities')}</th>
                  <th style={S.th}>Injuries</th>
                  <th style={S.th}>Severity</th>
                  <th style={S.th}>Cause</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(inc => {
                  const isExpanded = expandedId === inc.id;
                  const sevColor = SEVERITY_COLORS[inc.severity] || T.textMuted;
                  return (
                    <React.Fragment key={inc.id}>
                      <tr
                        onClick={() => toggleExpand(inc.id)}
                        style={{
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: isExpanded ? 'rgba(59,130,246,0.06)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(148,163,184,0.04)'; }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ ...S.td, textAlign: 'center', color: T.textMuted }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td style={{ ...S.td, fontFamily: T.fontMono, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {inc.date}
                        </td>
                        <td style={S.td}>{inc.state}</td>
                        <td style={{ ...S.td, fontSize: '12px' }}>{inc.industry_type}</td>
                        <td style={S.td}>
                          <span style={S.badge(T.info, T.info)}>{inc.incident_type}</span>
                        </td>
                        <td style={{ ...S.td, fontWeight: 700, color: inc.fatalities > 0 ? T.danger : T.safe, fontFamily: T.fontMono }}>
                          {inc.fatalities}
                        </td>
                        <td style={{ ...S.td, fontFamily: T.fontMono, color: inc.injuries >= 20 ? T.warning : T.textSec }}>
                          {inc.injuries}
                        </td>
                        <td style={S.td}>
                          <span style={{
                            ...S.badge(sevColor, sevColor),
                            boxShadow: `0 0 8px ${sevColor}22`,
                          }}>
                            {inc.severity}
                          </span>
                        </td>
                        <td style={{ ...S.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: T.textSec }}>
                          {inc.cause}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={S.expandedRow}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                              <div>
                                <strong style={{ color: T.text, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Cause Description
                                </strong>
                                <p style={{ margin: '6px 0 0', lineHeight: 1.8 }}>{inc.cause_description}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                <div>
                                  <strong style={{ color: T.text, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Company
                                  </strong>
                                  <p style={{ margin: '4px 0 0' }}>{inc.company}</p>
                                </div>
                                <div>
                                  <strong style={{ color: T.text, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Source
                                  </strong>
                                  <p style={{ margin: '4px 0 0', color: T.info }}>{inc.source}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...S.td, textAlign: 'center', padding: '40px', color: T.textMuted }}>
                      No incidents match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  REGULATIONS TAB                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'regulations' && (
        <div>
          <div style={S.searchRow}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={15} color={T.textMuted}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                style={S.input}
                placeholder="Search regulation title or text…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={e => { e.target.style.borderColor = T.borderFocus; }}
                onBlur={e => { e.target.style.borderColor = T.border; }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: T.textMuted, fontSize: '12px' }}>
              <Filter size={13} /> Filters:
            </div>
            <select style={S.select} value={filterAct} onChange={e => setFilterAct(e.target.value)}>
              <option value="">All Acts</option>
              {actOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select style={S.select} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categoryOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '12px', color: T.textMuted }}>
            Showing <strong style={{ color: T.text }}>{filteredRegs.length}</strong> of{' '}
            <strong style={{ color: T.text }}>{REGULATIONS.length}</strong> regulations
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {filteredRegs.map(reg => {
              const isExpanded = expandedId === reg.id;
              const catColors = {
                'Confined Space': T.cyan,
                'Fire & Explosion': T.danger,
                'Hazardous Process': T.orange,
                'Work Permits': T.warning,
                'Mining Safety': T.purple,
                'General Safety': T.safe,
                'Instrumentation': T.info,
                'Emergency Response': T.critical,
                'Construction Safety': T.warning,
              };
              const catColor = catColors[reg.category] || T.info;

              return (
                <div
                  key={reg.id}
                  style={{
                    ...S.card,
                    borderLeft: `3px solid ${catColor}44`,
                    background: isExpanded ? 'rgba(17, 24, 39, 0.95)' : T.bgCard,
                  }}
                  onClick={() => toggleExpand(reg.id)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${catColor}66`; e.currentTarget.style.boxShadow = `0 0 20px ${catColor}11`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isExpanded ? '14px' : 0 }}>
                    <div style={{ color: T.textMuted }}>
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>
                    <span style={{
                      fontFamily: T.fontMono, fontSize: '12px', color: T.info,
                      background: `${T.info}15`, padding: '2px 8px', borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      {reg.section}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, flex: 1 }}>
                      {reg.title}
                    </h3>
                    <span style={S.badge(catColor, catColor)}>{reg.category}</span>
                    <span style={{ fontSize: '11px', color: T.textMuted }}>{reg.act_name}</span>
                  </div>

                  {isExpanded && (
                    <div style={{ paddingLeft: '27px' }}>
                      <p style={{ fontSize: '13px', lineHeight: 1.8, color: T.textSec, margin: '0 0 14px' }}>
                        {reg.text}
                      </p>
                      <div style={{
                        display: 'flex', gap: '20px', flexWrap: 'wrap',
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: T.radiusSm,
                        border: `1px solid ${T.border}`,
                      }}>
                        <div>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: T.textMuted }}>
                            Applicability
                          </span>
                          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: T.text }}>{reg.applicability}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: T.textMuted }}>
                            Max Penalty
                          </span>
                          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: T.danger, fontWeight: 600 }}>{reg.max_penalty}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredRegs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: T.textMuted }}>
                No regulations match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  STATISTICS TAB                                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'statistics' && (
        <div>
          {/* ── Bar Chart (SVG) ───────────────────────────────────────── */}
          <div style={{
            ...S.card,
            padding: '24px',
            marginBottom: '20px',
            cursor: 'default',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} color={T.info} />
              Fatalities by Year
              <span style={{ fontSize: '11px', color: T.textMuted, fontWeight: 400 }}>(India — All Industries)</span>
            </h3>
            <svg viewBox="0 0 720 220" style={{ width: '100%', maxHeight: '220px' }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                const y = 200 - frac * 180;
                return (
                  <g key={i}>
                    <line x1={50} y1={y} x2={700} y2={y} stroke={T.border} strokeDasharray="4 4" />
                    <text x={46} y={y + 4} textAnchor="end" fill={T.textMuted} fontSize={10} fontFamily={T.fontMono}>
                      {Math.round(frac * maxFatalities)}
                    </text>
                  </g>
                );
              })}
              {/* Bars */}
              {STATISTICS.map((stat, i) => {
                const barW = 52;
                const gap = (650 - STATISTICS.length * barW) / (STATISTICS.length + 1);
                const x = 50 + gap + i * (barW + gap);
                const barH = (stat.fatalities / maxFatalities) * 180;
                const y = 200 - barH;
                const isPartial = stat.year === 2025;
                // Gradient color based on fatality count
                const ratio = stat.fatalities / maxFatalities;
                const barColor = ratio > 0.8 ? T.danger : ratio > 0.5 ? T.orange : T.warning;
                return (
                  <g key={stat.year}>
                    <defs>
                      <linearGradient id={`bar-grad-${stat.year}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={barColor} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={barColor} stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                    <rect
                      x={x} y={y} width={barW} height={barH}
                      rx={4} fill={`url(#bar-grad-${stat.year})`}
                      stroke={barColor} strokeWidth={0.5} strokeOpacity={0.5}
                    />
                    {isPartial && (
                      <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={T.warning} fontSize={9} fontFamily={T.fontMono}>
                        partial
                      </text>
                    )}
                    <text x={x + barW / 2} y={y + barH / 2 + 4} textAnchor="middle"
                      fill="#fff" fontSize={12} fontWeight={700} fontFamily={T.fontMono}
                    >
                      {stat.fatalities}
                    </text>
                    <text x={x + barW / 2} y={215} textAnchor="middle" fill={T.textSec} fontSize={11} fontFamily={T.fontMono}>
                      {stat.year}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── Statistics Table ───────────────────────────────────────── */}
          <div style={{
            background: T.bgCard, border: `1px solid ${T.border}`,
            borderRadius: T.radius, overflow: 'hidden', backdropFilter: T.glass,
          }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Year</th>
                  <th style={S.th}>Sector</th>
                  <th style={S.th}>Fatalities</th>
                  <th style={S.th}>Trend</th>
                  <th style={S.th}>Serious Accidents</th>
                  <th style={S.th}>Inspections</th>
                  <th style={S.th}>Registered Factories</th>
                  <th style={S.th}>Compliance %</th>
                </tr>
              </thead>
              <tbody>
                {STATISTICS.map((stat, i) => {
                  const prev = i > 0 ? STATISTICS[i - 1] : null;
                  const trendUp = prev ? stat.fatalities > prev.fatalities : null;
                  const trendColor = trendUp === null ? T.textMuted : trendUp ? T.danger : T.safe;
                  const trendIcon = trendUp === null ? '—' : trendUp ? '↑' : '↓';
                  const trendPct = prev
                    ? (((stat.fatalities - prev.fatalities) / prev.fatalities) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={stat.year}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...S.td, fontWeight: 700, fontFamily: T.fontMono }}>{stat.year}</td>
                      <td style={{ ...S.td, fontSize: '12px' }}>{stat.sector}</td>
                      <td style={{ ...S.td, fontWeight: 700, fontFamily: T.fontMono, color: stat.fatalities > 1200 ? T.danger : T.text }}>
                        {stat.fatalities.toLocaleString()}
                      </td>
                      <td style={S.td}>
                        <span style={{ color: trendColor, fontWeight: 700, fontFamily: T.fontMono, fontSize: '13px' }}>
                          {trendIcon}
                        </span>
                        {trendPct !== null && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: trendColor, fontFamily: T.fontMono }}>
                            {trendUp ? '+' : ''}{trendPct}%
                          </span>
                        )}
                      </td>
                      <td style={{ ...S.td, fontFamily: T.fontMono }}>{stat.serious_accidents.toLocaleString()}</td>
                      <td style={{ ...S.td, fontFamily: T.fontMono }}>{stat.inspections.toLocaleString()}</td>
                      <td style={{ ...S.td, fontFamily: T.fontMono, fontSize: '12px' }}>{stat.factories_registered.toLocaleString()}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            flex: '0 0 60px', height: '6px', borderRadius: '3px',
                            background: `rgba(148,163,184,0.1)`, overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${stat.compliance_rate}%`, height: '100%', borderRadius: '3px',
                              background: stat.compliance_rate >= 65 ? T.safe : stat.compliance_rate >= 60 ? T.warning : T.danger,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                          <span style={{ fontFamily: T.fontMono, fontSize: '12px', color: T.textSec }}>
                            {stat.compliance_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
