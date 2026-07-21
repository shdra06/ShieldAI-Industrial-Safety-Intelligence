import React, { useMemo, useState } from 'react';

/* ── Knowledge Graph Visualization ─────────────────────────── */

const NODE_TYPES = {
  equipment: { icon: '🏭', color: '#3B82F6', label: 'Equipment' },
  permit:    { icon: '📋', color: '#F59E0B', label: 'Permits' },
  worker:    { icon: '👷', color: '#8B5CF6', label: 'Workers' },
  zone:      { icon: '📍', color: '#10B981', label: 'Zones' },
  risk:      { icon: '⚠️', color: '#EF4444', label: 'Risks' },
  sensor:    { icon: '📡', color: '#06B6D4', label: 'Sensors' },
};

const SVG_W = 600;
const SVG_H = 400;

function buildGraph(zones, workers, permits, sensors, riskScores) {
  const nodes = [];
  const edges = [];
  const nodeMap = {};

  // Zone nodes
  (zones ?? []).forEach((z, i) => {
    const id = `zone-${z.id}`;
    const risk = riskScores?.[z.id] ?? riskScores?.[z.id?.replace('Z-', '')] ?? 0;
    const angle = (i / Math.max(zones.length, 1)) * Math.PI * 2;
    const r = 120;
    nodes.push({
      id, type: 'zone',
      label: z.name ?? z.id,
      x: SVG_W / 2 + Math.cos(angle) * r,
      y: SVG_H / 2 + Math.sin(angle) * r,
      risk,
    });
    nodeMap[z.id] = id;

    // Risk node if high
    if (risk > 0.4) {
      const riskId = `risk-${z.id}`;
      nodes.push({
        id: riskId, type: 'risk',
        label: `Risk ${Math.round(risk * 100)}%`,
        x: SVG_W / 2 + Math.cos(angle) * (r + 60),
        y: SVG_H / 2 + Math.sin(angle) * (r + 60),
        risk,
      });
      edges.push({ from: id, to: riskId, isRisk: true });
    }
  });

  // Worker nodes (limit to avoid clutter)
  const workerSample = (workers ?? []).slice(0, 8);
  workerSample.forEach((w, i) => {
    const id = `worker-${w.id ?? i}`;
    const zoneId = w.zone || w.zoneId;
    const angle = (i / Math.max(workerSample.length, 1)) * Math.PI * 2 + 0.3;
    const r = 160;
    nodes.push({
      id, type: 'worker',
      label: w.name ?? `W-${w.id}`,
      x: SVG_W / 2 + Math.cos(angle) * r,
      y: SVG_H / 2 + Math.sin(angle) * r,
      risk: 0,
    });
    if (nodeMap[zoneId]) {
      edges.push({ from: id, to: nodeMap[zoneId], isRisk: false });
    }
  });

  // Permit nodes
  const permitSample = (permits ?? []).filter(p => p.status === 'active').slice(0, 6);
  permitSample.forEach((p, i) => {
    const id = `permit-${p.id ?? i}`;
    const zoneId = p.zone || p.zoneId;
    const angle = (i / Math.max(permitSample.length, 1)) * Math.PI * 2 - 0.2;
    const r = 140;
    nodes.push({
      id, type: 'permit',
      label: p.type ?? `Permit`,
      x: SVG_W / 2 + Math.cos(angle) * r,
      y: SVG_H / 2 + Math.sin(angle) * r,
      risk: 0,
    });
    if (nodeMap[zoneId]) {
      edges.push({ from: id, to: nodeMap[zoneId], isRisk: false });
    }
  });

  return { nodes, edges };
}

const KnowledgeGraphViz = React.memo(function KnowledgeGraphViz({
  zones = [],
  workers = [],
  permits = [],
  sensors = [],
  riskScores = {},
}) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const { nodes, edges } = useMemo(() =>
    buildGraph(zones, workers, permits, sensors, riskScores),
    [zones, workers, permits, sensors, riskScores]
  );

  /* Resolve node positions for edges */
  const nodePositions = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  return (
    <div className="kg-card card">
      <div className="card-header">
        <span className="card-title">🔗 Knowledge Graph — Entity Relationships</span>
        <span className="badge badge-info">{nodes.length} entities</span>
      </div>

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="kg-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="kg-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodePositions[edge.from];
          const to = nodePositions[edge.to];
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={edge.isRisk ? 'rgba(239, 68, 68, 0.4)' : 'rgba(148, 163, 184, 0.15)'}
              strokeWidth={edge.isRisk ? 2 : 1}
              strokeDasharray={edge.isRisk ? '4 3' : 'none'}
              className={edge.isRisk ? 'kg-edge-risk' : 'kg-edge'}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const config = NODE_TYPES[node.type] ?? NODE_TYPES.zone;
          const isHovered = hoveredNode === node.id;
          const nodeRadius = isHovered ? 22 : 18;

          return (
            <g
              key={node.id}
              className="kg-node-group"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node circle */}
              <circle
                cx={node.x} cy={node.y}
                r={nodeRadius}
                fill={node.risk > 0.5 ? 'rgba(239, 68, 68, 0.2)' : `${config.color}15`}
                stroke={node.risk > 0.5 ? '#EF4444' : config.color}
                strokeWidth={isHovered ? 2 : 1}
                filter={isHovered ? 'url(#kg-glow)' : 'none'}
              />
              {/* Icon */}
              <text
                x={node.x} y={node.y + 5}
                textAnchor="middle"
                fontSize="14"
              >
                {config.icon}
              </text>
              {/* Label */}
              <text
                x={node.x} y={node.y + nodeRadius + 12}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="8"
                fontWeight="500"
              >
                {node.label.length > 14 ? node.label.substring(0, 12) + '…' : node.label}
              </text>

              {/* Hover detail */}
              {isHovered && (
                <g>
                  <rect
                    x={node.x - 60} y={node.y - nodeRadius - 30}
                    width={120} height={22}
                    rx={4} ry={4}
                    fill="rgba(17, 24, 39, 0.95)"
                    stroke={config.color}
                    strokeWidth={0.5}
                  />
                  <text
                    x={node.x} y={node.y - nodeRadius - 15}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize="9"
                    fontWeight="600"
                  >
                    {config.label}: {node.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="kg-legend">
        {Object.entries(NODE_TYPES).map(([key, config]) => (
          <span key={key} className="kg-legend-item">
            <span style={{ fontSize: '0.7rem' }}>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
});

export default KnowledgeGraphViz;
