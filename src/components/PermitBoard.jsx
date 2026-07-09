import React from 'react';
import { ClipboardList } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */

function permitTypeInfo(type) {
  const t = (type || '').toLowerCase().replace(/[_\s]+/g, ' ');
  const map = {
    'hot work':             { abbr: 'HW', cls: 'permit-type-hw', label: 'Hot Work' },
    'cold work':            { abbr: 'CW', cls: 'permit-type-cw', label: 'Cold Work' },
    'confined space':       { abbr: 'CS', cls: 'permit-type-cs', label: 'Confined Space' },
    'electrical isolation': { abbr: 'EI', cls: 'permit-type-ei', label: 'Elec. Isolation' },
  };
  return map[t] || { abbr: type?.substring(0, 2).toUpperCase() || '??', cls: 'permit-type-cw', label: type };
}

function statusInfo(status) {
  const s = (status || '').toLowerCase();
  if (s === 'revoked')  return { dotCls: 'revoked',  label: 'Revoked', wrapCls: 'revoked' };
  if (s === 'expired')  return { dotCls: 'expired',  label: 'Expired', wrapCls: '' };
  return { dotCls: 'active', label: 'Active', wrapCls: '' };
}

/* ── Main Component ───────────────────────────────────────── */

const PermitBoard = React.memo(function PermitBoard({ permits = [] }) {
  if (permits.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <ClipboardList size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
            Active Permits (PTW)
          </span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">No active permits</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <ClipboardList size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />
          Active Permits (PTW)
        </span>
        <span className="badge badge-info">{permits.length}</span>
      </div>

      <div className="permit-list">
        {permits.map((permit, idx) => {
          const typeInfo = permitTypeInfo(permit.type);
          const sInfo = statusInfo(permit.status);

          return (
            <div key={permit.id || idx} className="permit-item">
              {/* Type badge */}
              <span className={`permit-type-badge ${typeInfo.cls}`}>
                {typeInfo.abbr}
              </span>

              {/* Details */}
              <div className={`permit-details ${sInfo.wrapCls}`}>
                <div className="permit-id">{permit.id || `PTW-${idx + 1}`}</div>
                <div className="permit-zone">{permit.zone || permit.zoneName || '—'}</div>
              </div>

              {/* Status */}
              <div className="permit-status">
                <span className={`permit-status-dot ${sInfo.dotCls}`} />
                <span>{sInfo.label}</span>
              </div>

              {/* Conflict warning */}
              {permit.conflict && (
                <span className="permit-conflict" title="SIMOPS Conflict">⚠️</span>
              )}

              {/* LOTO */}
              {permit.loto !== undefined && (
                <span className="permit-loto" title={permit.loto ? 'LOTO Verified' : 'LOTO Not Verified'}>
                  {permit.loto ? '🔒' : '⚠️'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default PermitBoard;
