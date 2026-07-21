import React, { useMemo } from 'react';
import { EVACUATION_ROUTES } from '../data/plantLayout.js';

/* ── Zone layout data ─────────────────────────────────────── */
const ZONE_RECTS = [
  { id: 'A', x: 20,  y: 20,  w: 240, h: 200, label: 'Zone A — Tank Farm',      hazard: 'Class I / Flammable',    equipment: ['TK-101', 'TK-102', 'V-201'] },
  { id: 'B', x: 280, y: 20,  w: 250, h: 200, label: 'Zone B — Reactor Block',   hazard: 'Class II / Toxic',       equipment: ['R-301', 'HX-301', 'P-301']  },
  { id: 'C', x: 550, y: 20,  w: 250, h: 200, label: 'Zone C — Utilities',       hazard: 'Class III / Electrical', equipment: ['BLR-01', 'CMP-01', 'GEN-01'] },
  { id: 'D', x: 20,  y: 250, w: 240, h: 220, label: 'Zone D — Warehouse',       hazard: 'Storage / Low',          equipment: ['CR-01', 'WH-BAY-1']          },
  { id: 'E', x: 280, y: 250, w: 250, h: 220, label: 'Zone E — Control Room',    hazard: 'Operations / Safe',      equipment: ['DCS-01', 'SIS-01']            },
  { id: 'F', x: 550, y: 250, w: 250, h: 220, label: 'Zone F — Loading Bay',     hazard: 'Class I / Vapor',        equipment: ['LP-01', 'ARM-01', 'ARM-02']   },
];

const LEGEND = [
  { level: 'Normal',    cls: 'zone-normal',    color: '#10B981' },
  { level: 'Elevated',  cls: 'zone-elevated',  color: '#F59E0B' },
  { level: 'Warning',   cls: 'zone-warning',   color: '#F59E0B' },
  { level: 'Critical',  cls: 'zone-critical',  color: '#EF4444' },
  { level: 'Emergency', cls: 'zone-emergency', color: '#DC2626' },
];

// BUG FIX: thresholds now on 0-1 scale (risk scores are 0-1, not 0-100)
function riskToClass(score) {
  if (score == null) return 'zone-normal';
  if (score >= 0.85) return 'zone-emergency';
  if (score >= 0.65) return 'zone-critical';
  if (score >= 0.40) return 'zone-warning';
  if (score >= 0.20) return 'zone-elevated';
  return 'zone-normal';
}

function permitAbbr(type) {
  const map = {
    'hot_work': 'HW', 'cold_work': 'CW',
    'confined_space': 'CS', 'electrical_isolation': 'EI',
    'hot work': 'HW', 'cold work': 'CW',
    'confined space': 'CS', 'electrical isolation': 'EI',
  };
  return map[(type || '').toLowerCase()] || type?.substring(0, 2).toUpperCase() || '??';
}

function permitColor(type) {
  const abbr = permitAbbr(type);
  const map = { HW: '#EF4444', CW: '#3B82F6', CS: '#8B5CF6', EI: '#F59E0B' };
  return map[abbr] || '#94A3B8';
}

/* ── Grid dots ────────────────────────────────────────────── */
function GridDots() {
  const lines = [];
  for (let x = 0; x <= 820; x += 40) {
    lines.push(<line key={`gv${x}`} x1={x} y1={0} x2={x} y2={500} className="plant-map-grid-line" />);
  }
  for (let y = 0; y <= 500; y += 40) {
    lines.push(<line key={`gh${y}`} x1={0} y1={y} x2={820} y2={y} className="plant-map-grid-line" />);
  }
  return <g>{lines}</g>;
}

/* ── Main component ───────────────────────────────────────── */
const PlantMap = React.memo(function PlantMap({
  zones = [],
  workers = [],
  permits = [],
  riskScores = {},
}) {
  /* Determine zone class + emergency status */
  const zoneData = useMemo(() => {
    return ZONE_RECTS.map((z) => {
      const score = riskScores[z.id] ?? 0;
      const cls = riskToClass(score);
      const isEmergency = cls === 'zone-emergency';
      const isWarningOrAbove = cls === 'zone-warning' || cls === 'zone-critical' || cls === 'zone-emergency';
      return { ...z, cls, isEmergency, isWarningOrAbove, score };
    });
  }, [riskScores]);

  /* Workers per zone */
  const workersByZone = useMemo(() => {
    const map = {};
    workers.forEach((w) => {
      const zid = w.zone || w.zoneId;
      if (!map[zid]) map[zid] = [];
      map[zid].push(w);
    });
    return map;
  }, [workers]);

  /* Permits per zone */
  const permitsByZone = useMemo(() => {
    const map = {};
    permits.forEach((p) => {
      const zid = p.zone || p.zoneId;
      if (!map[zid]) map[zid] = [];
      map[zid].push(p);
    });
    return map;
  }, [permits]);

  /* Determine emergency zone IDs for evacuation routes */
  const emergencyZoneIds = useMemo(() => {
    const ids = new Set();
    zoneData.forEach(z => {
      if (z.isEmergency) {
        ids.add(`Z-${z.id}`);
        ids.add(z.id);
      }
    });
    return ids;
  }, [zoneData]);

  /* Filter evacuation routes for active emergency zones */
  const activeEvacRoutes = useMemo(() => {
    if (emergencyZoneIds.size === 0) return [];
    return (EVACUATION_ROUTES ?? []).filter(r =>
      emergencyZoneIds.has(r.from) || emergencyZoneIds.has(r.to)
    );
  }, [emergencyZoneIds]);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Plant Overview Map</span>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <span className="badge badge-info">{workers.length} workers</span>
          {emergencyZoneIds.size > 0 && (
            <span className="badge badge-critical" style={{ animation: 'pulse-danger 1.5s ease-in-out infinite' }}>
              🚨 EVACUATION
            </span>
          )}
        </div>
      </div>

      <svg viewBox="0 0 820 500" className="plant-map-svg" xmlns="http://www.w3.org/2000/svg">
        <GridDots />

        {/* Evacuation Routes (rendered behind zones) */}
        {activeEvacRoutes.map((route, i) => (
          <g key={`evac-route-${i}`}>
            {/* Glow effect */}
            <path
              d={route.path}
              fill="none"
              stroke="rgba(220, 38, 38, 0.3)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Main route line */}
            <path
              d={route.path}
              fill="none"
              stroke="#DC2626"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 4"
              className="evac-route-animated"
              markerEnd="url(#arrowhead)"
            />
            {/* Route label */}
            <text
              x={route.path.split(' ')[1]}
              y={parseInt(route.path.split(' ')[2]) - 8}
              className="evac-route-label"
              fill="#DC2626"
              fontSize="8"
              fontWeight="600"
            >
              {route.label}
            </text>
          </g>
        ))}

        {/* Zones */}
        {zoneData.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x} y={z.y} width={z.w} height={z.h}
              rx={8} ry={8}
              className={z.cls}
            />
            {/* Risk score indicator */}
            {z.score > 0.2 && (
              <text
                x={z.x + z.w - 12} y={z.y + 20}
                textAnchor="end"
                fill={z.score >= 0.65 ? '#EF4444' : z.score >= 0.4 ? '#F59E0B' : '#10B981'}
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {Math.round(z.score * 100)}%
              </text>
            )}
            {/* Zone label */}
            <text x={z.x + 10} y={z.y + 22} className="zone-label">{z.label}</text>
            <text x={z.x + 10} y={z.y + 35} className="zone-sublabel">{z.hazard}</text>

            {/* Equipment labels */}
            {z.equipment.map((eq, i) => (
              <text key={eq} x={z.x + 10} y={z.y + z.h - 10 - i * 13} className="equipment-label">{eq}</text>
            ))}

            {/* Evacuation arrows for emergency zones */}
            {z.isEmergency && (
              <g>
                <line
                  x1={z.x + z.w / 2} y1={z.y + z.h - 10}
                  x2={z.x + z.w / 2} y2={z.y + z.h + 18}
                  className="evac-arrow"
                  markerEnd="url(#arrowhead)"
                />
                <line
                  x1={z.x + z.w - 10} y1={z.y + z.h / 2}
                  x2={z.x + z.w + 18} y2={z.y + z.h / 2}
                  className="evac-arrow"
                  markerEnd="url(#arrowhead)"
                />
                {/* Emergency zone pulsing border */}
                <rect
                  x={z.x - 2} y={z.y - 2} width={z.w + 4} height={z.h + 4}
                  rx={10} ry={10}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth={2}
                  className="emergency-zone-pulse"
                />
              </g>
            )}

            {/* Worker dots */}
            {(workersByZone[z.id] || []).map((w, i) => {
              const cols = Math.floor((z.w - 30) / 18);
              const row = Math.floor(i / cols);
              const col = i % cols;
              const cx = z.x + 50 + col * 18;
              const cy = z.y + 55 + row * 18;
              const compliant = w.ppeCompliant !== false;
              return (
                <circle
                  key={w.id || `w${i}`}
                  cx={cx} cy={cy} r={6}
                  className={`worker-dot ${compliant ? 'compliant' : 'non-compliant'}`}
                />
              );
            })}

            {/* Permit icons */}
            {(permitsByZone[z.id] || []).map((p, i) => {
              const px = z.x + z.w - 45 - i * 34;
              const py = z.y + 48;
              const abbr = permitAbbr(p.type);
              const color = permitColor(p.type);
              return (
                <g key={p.id || `p${i}`}>
                  <rect x={px} y={py} width={28} height={16} rx={3} ry={3}
                    fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1} />
                  <text x={px + 14} y={py + 12} textAnchor="middle"
                    className="permit-icon" fill={color}>{abbr}</text>
                </g>
              );
            })}
          </g>
        ))}

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#DC2626" />
          </marker>
        </defs>

        {/* Legend */}
        <g transform="translate(20, 490)">
          {LEGEND.map((l, i) => (
            <g key={l.level} transform={`translate(${i * 95}, 0)`}>
              <rect x={0} y={-8} width={10} height={10} rx={2} fill={l.color} fillOpacity={0.5} />
              <text x={14} y={0} className="legend-box">{l.level}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
});

export default PlantMap;
