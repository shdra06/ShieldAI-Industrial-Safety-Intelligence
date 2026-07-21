import React, { useMemo } from 'react';

/* ── Swiss Cheese Model — James Reason's barrier defense visualization ── */

const LAYER_DEFAULTS = [
  { name: 'Engineering Controls', holes: [], integrity: 0.95 },
  { name: 'Administrative Controls', holes: [], integrity: 0.90 },
  { name: 'Supervision', holes: [], integrity: 0.85 },
  { name: 'Human Factors', holes: [], integrity: 0.80 },
  { name: 'PPE / Last Defense', holes: [], integrity: 0.92 },
];

const LAYER_ICONS = ['⚙️', '📋', '👁️', '🧠', '🦺'];

function integrityColor(integrity) {
  if (integrity >= 0.8) return { fill: 'rgba(16, 185, 129, 0.25)', stroke: '#10B981' };
  if (integrity >= 0.6) return { fill: 'rgba(245, 158, 11, 0.25)', stroke: '#F59E0B' };
  if (integrity >= 0.4) return { fill: 'rgba(249, 115, 22, 0.3)', stroke: '#F97316' };
  return { fill: 'rgba(239, 68, 68, 0.35)', stroke: '#EF4444' };
}

function alignmentColor(score) {
  if (score >= 0.7) return 'var(--accent-danger)';
  if (score >= 0.4) return 'var(--accent-warning)';
  return 'var(--accent-safe)';
}

const SVG_WIDTH = 700;
const SVG_HEIGHT = 340;
const SLICE_WIDTH = 80;
const SLICE_HEIGHT = 220;
const SLICE_GAP = 30;
const START_X = 40;
const START_Y = 50;

const SwissCheese = React.memo(function SwissCheese({
  swissCheese = {},
}) {
  const layers = swissCheese?.layers ?? LAYER_DEFAULTS;
  const alignmentScore = swissCheese?.alignmentScore ?? 0;
  const trajectoryBlocked = swissCheese?.trajectoryBlocked ?? true;

  /* Build cheese slices with holes */
  const slices = useMemo(() => {
    return layers.map((layer, i) => {
      const x = START_X + i * (SLICE_WIDTH + SLICE_GAP);
      const y = START_Y;
      const colors = integrityColor(layer.integrity ?? 1);

      // Generate holes — use provided or create defaults based on integrity
      const holes = (layer.holes ?? []).length > 0
        ? layer.holes
        : generateDefaultHoles(layer.integrity ?? 1, i);

      return {
        ...layer,
        x,
        y,
        colors,
        holes,
        icon: LAYER_ICONS[i] || '🛡️',
      };
    });
  }, [layers]);

  /* Trajectory path — draw line through holes when aligned */
  const trajectoryPath = useMemo(() => {
    if (layers.length === 0) return null;

    const points = slices.map((slice) => {
      // Find the most centered hole, or use center if no holes
      if (slice.holes.length === 0) return null;
      const bestHole = slice.holes.reduce((best, h) =>
        Math.abs(h.y - SLICE_HEIGHT / 2) < Math.abs(best.y - SLICE_HEIGHT / 2) ? h : best
      , slice.holes[0]);
      return {
        x: slice.x + SLICE_WIDTH / 2,
        y: START_Y + bestHole.y,
      };
    });

    // Only draw if we have enough alignment
    if (points.some(p => p === null)) return null;
    return points;
  }, [slices, layers]);

  const showTrajectory = alignmentScore > 0.3 && trajectoryPath;

  return (
    <div className="swiss-cheese-card card">
      <div className="card-header">
        <span className="card-title">🧀 Swiss Cheese Model — Barrier Analysis</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${alignmentScore >= 0.7 ? 'badge-critical' : alignmentScore >= 0.4 ? 'badge-warning' : 'badge-safe'}`}>
            Alignment: {Math.round(alignmentScore * 100)}%
          </span>
          <span className={`badge ${trajectoryBlocked ? 'badge-safe' : 'badge-critical'}`}>
            {trajectoryBlocked ? '🛡️ Blocked' : '⚠️ Path Open'}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="swiss-cheese-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for trajectory */}
          <filter id="trajectory-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Hole pattern */}
          <radialGradient id="hole-gradient">
            <stop offset="0%" stopColor="rgba(10, 14, 26, 0.9)" />
            <stop offset="100%" stopColor="rgba(10, 14, 26, 0.6)" />
          </radialGradient>
        </defs>

        {/* Hazard source label (left) */}
        <text x={15} y={START_Y + SLICE_HEIGHT / 2 - 10} fill="var(--accent-danger)" fontSize="11" fontWeight="700" textAnchor="middle" transform={`rotate(-90, 15, ${START_Y + SLICE_HEIGHT / 2})`}>
          HAZARD
        </text>
        <text x={15} y={START_Y + SLICE_HEIGHT / 2 + 5} fill="#EF4444" fontSize="18" textAnchor="middle">
          ⚠️
        </text>

        {/* Accident label (right) */}
        <text x={SVG_WIDTH - 15} y={START_Y + SLICE_HEIGHT / 2 - 10} fill="var(--accent-danger)" fontSize="11" fontWeight="700" textAnchor="middle" transform={`rotate(90, ${SVG_WIDTH - 15}, ${START_Y + SLICE_HEIGHT / 2})`}>
          ACCIDENT
        </text>
        <text x={SVG_WIDTH - 15} y={START_Y + SLICE_HEIGHT / 2 + 5} fill={trajectoryBlocked ? '#10B981' : '#EF4444'} fontSize="18" textAnchor="middle">
          {trajectoryBlocked ? '✅' : '💥'}
        </text>

        {/* Trajectory line */}
        {showTrajectory && trajectoryPath && (
          <g filter="url(#trajectory-glow)">
            <polyline
              points={trajectoryPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={trajectoryBlocked ? 'rgba(245, 158, 11, 0.5)' : '#EF4444'}
              strokeWidth={trajectoryBlocked ? 2 : 3}
              strokeDasharray={trajectoryBlocked ? '6 4' : 'none'}
              className="sc-trajectory-line"
            />
            {/* Arrow at end */}
            {!trajectoryBlocked && (
              <polygon
                points={`${trajectoryPath[trajectoryPath.length - 1].x + 10},${trajectoryPath[trajectoryPath.length - 1].y} ${trajectoryPath[trajectoryPath.length - 1].x},${trajectoryPath[trajectoryPath.length - 1].y - 5} ${trajectoryPath[trajectoryPath.length - 1].x},${trajectoryPath[trajectoryPath.length - 1].y + 5}`}
                fill="#EF4444"
              />
            )}
          </g>
        )}

        {/* Cheese slices */}
        {slices.map((slice, i) => (
          <g key={i} className="sc-slice-group">
            {/* Slice background */}
            <rect
              x={slice.x}
              y={slice.y}
              width={SLICE_WIDTH}
              height={SLICE_HEIGHT}
              rx={12}
              ry={12}
              fill={slice.colors.fill}
              stroke={slice.colors.stroke}
              strokeWidth={1.5}
              className="sc-slice"
            />

            {/* Integrity fill (bottom up) */}
            <rect
              x={slice.x + 2}
              y={slice.y + SLICE_HEIGHT * (1 - (slice.integrity ?? 1))}
              width={SLICE_WIDTH - 4}
              height={SLICE_HEIGHT * (slice.integrity ?? 1)}
              rx={10}
              ry={10}
              fill={slice.colors.fill}
              opacity={0.4}
            />

            {/* Holes */}
            {slice.holes.map((hole, j) => (
              <ellipse
                key={j}
                cx={slice.x + hole.x}
                cy={slice.y + hole.y}
                rx={(hole.radius ?? 12) * 1.3}
                ry={hole.radius ?? 12}
                fill="url(#hole-gradient)"
                stroke="rgba(148, 163, 184, 0.15)"
                strokeWidth={0.5}
                className="sc-hole"
              />
            ))}

            {/* Layer label */}
            <text
              x={slice.x + SLICE_WIDTH / 2}
              y={slice.y + SLICE_HEIGHT + 18}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize="9"
              fontWeight="600"
            >
              {slice.icon} {slice.name}
            </text>

            {/* Integrity % */}
            <text
              x={slice.x + SLICE_WIDTH / 2}
              y={slice.y + SLICE_HEIGHT + 30}
              textAnchor="middle"
              fill={slice.colors.stroke}
              fontSize="10"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              {Math.round((slice.integrity ?? 1) * 100)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
});

/* Helper: generate default holes based on integrity */
function generateDefaultHoles(integrity, layerIndex) {
  const numHoles = Math.max(1, Math.round((1 - integrity) * 5));
  const holes = [];
  const seed = layerIndex * 137 + 42;
  for (let i = 0; i < numHoles; i++) {
    const pseudoRand = ((seed * (i + 1) * 31) % 100) / 100;
    holes.push({
      x: 15 + pseudoRand * (SLICE_WIDTH - 30),
      y: 30 + ((seed * (i + 1) * 47) % (SLICE_HEIGHT - 60)),
      radius: 8 + (1 - integrity) * 10 + pseudoRand * 5,
    });
  }
  return holes;
}

export default SwissCheese;
