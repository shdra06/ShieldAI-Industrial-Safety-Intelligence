// ============================================================================
// ShieldAI — 3D Architecture Visualization
// Layout: SENSORS (left) ═══> AI BRAIN (center) ═══> OUTPUTS (right)
// Sensors are bar-chart style — height = reading level
// Slow, deliberate animations. Highlight active components.
// ============================================================================

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// ── Sensor definitions ──────────────────────────────────────────────────────
const SENSOR_DEFS = [
  { type: 'CH4',  label: 'CH₄',     unit: '% LEL', color: '#f59e0b', warn: 20, crit: 40 },
  { type: 'CO',   label: 'CO',       unit: 'ppm',   color: '#ef4444', warn: 35, crit: 100 },
  { type: 'H2S',  label: 'H₂S',     unit: 'ppm',   color: '#dc2626', warn: 10, crit: 50 },
  { type: 'NH3',  label: 'NH₃',     unit: 'ppm',   color: '#06b6d4', warn: 25, crit: 50 },
  { type: 'TEMP', label: 'Temp',     unit: '°C',    color: '#f97316', warn: 200, crit: 500 },
  { type: 'PRES', label: 'Press',    unit: 'bar',   color: '#8b5cf6', warn: 8, crit: 12 },
];

const AGENTS = [
  { name: 'SCADA',      color: '#60a5fa' },
  { name: 'Pattern',    color: '#a78bfa' },
  { name: 'Predictive', color: '#f59e0b' },
  { name: 'Compliance', color: '#ef4444' },
  { name: 'Cascade',    color: '#ec4899' },
  { name: 'Equipment',  color: '#f97316' },
];

// ── LAYOUT — everything widely spaced ───────────────────────────────────────
const SENSOR_X = -16;
const SENSOR_SPACING = 4;
const SENSOR_ROW_START = -(SENSOR_DEFS.length - 1) * SENSOR_SPACING / 2;

const BRAIN_X = 6;
const BRAIN_Y = 5;
const AGENT_ORBIT = 5;

const OUTPUT_X = 24;

// ── Ambient particles (subtle floating dust) ────────────────────────────────
function AmbientDust({ count = 150 }) {
  const ref = useRef();
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      speeds[i] = 0.1 + Math.random() * 0.3;
    }
    return { pos, speeds };
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const p = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      p.array[i * 3 + 1] += data.speeds[i] * 0.01;
      if (p.array[i * 3 + 1] > 12) p.array[i * 3 + 1] = 0;
    }
    p.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.pos} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#4a5568" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

// ── Flow particle — moves slowly along a path ───────────────────────────────
function FlowDot({ start, end, color, speed = 0.15, active = true, size = 0.1 }) {
  const ref = useRef();
  const s = useMemo(() => new THREE.Vector3(...start), [start]);
  const e = useMemo(() => new THREE.Vector3(...end), [end]);
  const offset = useMemo(() => Math.random(), []);

  useFrame((state) => {
    if (!ref.current || !active) return;
    const t = ((state.clock.elapsedTime * speed + offset) % 1);
    ref.current.position.lerpVectors(s, e, t);
    ref.current.material.opacity = 0.2 + Math.sin(t * Math.PI) * 0.6;
  });

  if (!active) return null;
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

// ── Connection line ─────────────────────────────────────────────────────────
function ConnectionLine({ start, end, color, active, curved = false }) {
  const geo = useMemo(() => {
    const sv = new THREE.Vector3(...start);
    const ev = new THREE.Vector3(...end);
    if (curved) {
      const mid = new THREE.Vector3().lerpVectors(sv, ev, 0.5);
      mid.y += 3;
      const curve = new THREE.QuadraticBezierCurve3(sv, mid, ev);
      return new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
    }
    return new THREE.BufferGeometry().setFromPoints([sv, ev]);
  }, [start, end, curved]);

  return (
    <line geometry={geo}>
      <lineBasicMaterial color={active ? color : '#1a1f2e'} transparent opacity={active ? 0.3 : 0.06} />
    </line>
  );
}

// ── Sensor Bar — height reflects the reading ────────────────────────────────
function SensorBar({ def, sensor, position, onSelect, isSelected, isActive }) {
  const bodyRef = useRef();
  const glowRef = useRef();
  const prevValue = useRef(0);
  const targetHeight = useRef(0.5);

  const ratio = sensor ? sensor.currentValue / (sensor.criticalThreshold || 100) : 0;
  const clampedRatio = Math.min(ratio, 1.5);
  const statusColor = ratio >= 1 ? '#ef4444' : ratio >= 0.5 ? '#f59e0b' : '#10b981';
  const barHeight = 0.5 + clampedRatio * 4; // Min 0.5, max ~6.5 height

  useFrame((state, delta) => {
    if (!bodyRef.current) return;

    // Smoothly lerp to target height (slow, visible growth)
    targetHeight.current = barHeight;
    const currentH = bodyRef.current.scale.y;
    const newH = THREE.MathUtils.lerp(currentH, targetHeight.current, delta * 1.5);
    bodyRef.current.scale.y = newH;
    bodyRef.current.position.y = newH / 2;

    // Glow pulse when critical — slow pulse
    if (glowRef.current) {
      if (ratio >= 1) {
        glowRef.current.material.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      } else if (ratio >= 0.5) {
        glowRef.current.material.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      } else {
        glowRef.current.material.emissiveIntensity = 0.05;
      }
    }

    prevValue.current = sensor?.currentValue ?? 0;
  });

  // Determine if value is changing (for highlight)
  const changing = sensor && Math.abs(sensor.currentValue - prevValue.current) > 0.01;

  return (
    <group position={position}>
      {/* Base plate */}
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.1, 1.8]} />
        <meshStandardMaterial color="#0f1729" metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Bottom ring — shows status color */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 20]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Bar body — height grows with reading */}
      <mesh ref={bodyRef} position={[0, barHeight / 2, 0]}>
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshStandardMaterial
          ref={glowRef}
          color={statusColor}
          metalness={0.5} roughness={0.3}
          emissive={statusColor}
          emissiveIntensity={ratio >= 1 ? 0.5 : 0.1}
        />
      </mesh>

      {/* Active highlight ring (only when value is changing) */}
      {isActive && (
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.0, 24]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Sensor type label (small, at top of bar) */}
      <Billboard position={[0, Math.max(barHeight + 0.8, 1.5), 0]}>
        <Text fontSize={0.35} color={statusColor} fontWeight="bold"
          outlineWidth={0.02} outlineColor="#000"
          renderOrder={10} material-depthTest={false}
        >{def.label}</Text>
      </Billboard>

      {/* Value readout (below label) */}
      <Billboard position={[0, Math.max(barHeight + 0.4, 1.1), 0]}>
        <Text fontSize={0.22} color="#94a3b8"
          renderOrder={10} material-depthTest={false}
        >{sensor ? `${sensor.currentValue.toFixed(1)}` : '—'}</Text>
      </Billboard>

      {/* Click zone (invisible larger hitbox) */}
      <mesh position={[0, barHeight / 2, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(def.type); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[1.5, Math.max(barHeight, 2), 1.5]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 24]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ── Agent sphere ────────────────────────────────────────────────────────────
function AgentSphere({ agent, position, active }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    // Slow float
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.2;
    // Slow rotation
    ref.current.children[0].rotation.y = state.clock.elapsedTime * 0.2;
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={agent.color} metalness={0.4} roughness={0.4}
          emissive={agent.color} emissiveIntensity={active ? 0.4 : 0.05}
          transparent opacity={active ? 0.9 : 0.3}
        />
      </mesh>
      <Billboard position={[0, 0.9, 0]}>
        <Text fontSize={0.22} color={active ? agent.color : '#475569'}
          renderOrder={10} material-depthTest={false}
        >{agent.name}</Text>
      </Billboard>
    </group>
  );
}

// ── Brain Core ──────────────────────────────────────────────────────────────
function BrainCore({ position, active }) {
  const outerRef = useRef();
  const innerRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.15; // Slow rotation
      outerRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.25;
      const s = 1 + Math.sin(t * 1.5) * 0.03;
      innerRef.current.scale.setScalar(s);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = t * 0.08;
    }
  });

  return (
    <group position={position}>
      {/* Wireframe shell */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[1.8, 1]} />
        <meshStandardMaterial
          color="#a78bfa" wireframe metalness={0.5} roughness={0.3}
          emissive="#a78bfa" emissiveIntensity={active ? 0.4 : 0.1}
        />
      </mesh>

      {/* Solid core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color="#e2e8f0" metalness={0.8} roughness={0.2}
          emissive="#a78bfa" emissiveIntensity={active ? 0.4 : 0.1}
        />
      </mesh>

      {/* Slow orbiting rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.8, 0.03, 8, 48]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.3} transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[3.2, 0.025, 8, 48]} />
        <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.2} transparent opacity={0.25} />
      </mesh>

      {/* Label */}
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.4} color="#c4b5fd" fontWeight="bold"
          outlineWidth={0.03} outlineColor="#000"
          renderOrder={10} material-depthTest={false}
        >🧠 AI Supervisor</Text>
      </Billboard>

      <pointLight color="#a78bfa" intensity={active ? 1.5 : 0.3} distance={10} />
    </group>
  );
}

// ── Database Node ───────────────────────────────────────────────────────────
function DBNode({ position }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 1, 16]} />
        <meshStandardMaterial color="#10b981" metalness={0.3} roughness={0.5} emissive="#10b981" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 16]} />
        <meshStandardMaterial color="#34d399" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh ref={ref} position={[0, 1.8, 0]}>
        <boxGeometry args={[0.35, 0.45, 0.04]} />
        <meshStandardMaterial color="#e2e8f0" emissive="#10b981" emissiveIntensity={0.3} />
      </mesh>
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.28} color="#10b981" renderOrder={10} material-depthTest={false}>
          RAG + DB
        </Text>
      </Billboard>
    </group>
  );
}

// ── Emergency Node ──────────────────────────────────────────────────────────
function AlertNode({ position, active }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * (active ? 1 : 0.1);
    if (active) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      ref.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color={active ? '#ef4444' : '#334155'}
          emissive={active ? '#ef4444' : '#1e293b'}
          emissiveIntensity={active ? 0.6 : 0.05}
          metalness={0.4} roughness={0.3}
        />
      </mesh>
      {active && <pointLight color="#ef4444" intensity={1.5} distance={5} />}
      <Billboard position={[0, 1.3, 0]}>
        <Text fontSize={0.25} color={active ? '#ef4444' : '#475569'} renderOrder={10} material-depthTest={false}>
          {active ? '🚨 EMERGENCY' : 'Emergency'}
        </Text>
      </Billboard>
    </group>
  );
}

// ── Ground ──────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <group>
      <gridHelper args={[70, 70, '#141825', '#0d1018']} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#060810" />
      </mesh>
    </group>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────────────
function Scene({ sensors, onSensorSelect, selectedSensor, hasEmergency }) {
  const sensorMap = useMemo(() => {
    const m = {};
    for (const s of sensors) m[s.type] = s;
    return m;
  }, [sensors]);

  const hasCritical = sensors.some(s => s.currentValue >= s.criticalThreshold);
  const hasWarning = sensors.some(s => s.currentValue >= s.warningThreshold);
  const brainActive = hasWarning || hasCritical;

  // Which sensors are currently elevated?
  const activeSensorTypes = useMemo(() => {
    const set = new Set();
    for (const s of sensors) {
      if (s.currentValue >= s.warningThreshold * 0.5) set.add(s.type);
    }
    return set;
  }, [sensors]);

  // Sensor positions — clean row
  const sensorPos = SENSOR_DEFS.map((_, i) => [
    SENSOR_X, 0, SENSOR_ROW_START + i * SENSOR_SPACING,
  ]);

  // Agent positions — orbit brain
  const agentPos = AGENTS.map((_, i) => {
    const angle = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
    return [
      BRAIN_X + Math.cos(angle) * AGENT_ORBIT,
      BRAIN_Y + Math.sin(angle) * 2,
      Math.sin(angle) * AGENT_ORBIT,
    ];
  });

  const brainPos = [BRAIN_X, BRAIN_Y, 0];
  const dbPos = [OUTPUT_X, 1, -5];
  const alertPos = [OUTPUT_X, 1, 5];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[15, 20, 10]} intensity={0.6} color="#e2e8f0" />
      <directionalLight position={[-15, 10, -5]} intensity={0.2} color="#a78bfa" />
      {hasCritical && <pointLight position={[SENSOR_X, 5, 0]} intensity={0.5} color="#ef4444" />}

      <AmbientDust />
      <Ground />

      {/* ═══ SECTION LABELS ═══ */}
      <Billboard position={[SENSOR_X, 7, 0]}>
        <Text fontSize={0.5} color="#334155" letterSpacing={0.15}
          renderOrder={10} material-depthTest={false}>SENSORS</Text>
      </Billboard>
      <Billboard position={[BRAIN_X, 10, 0]}>
        <Text fontSize={0.5} color="#334155" letterSpacing={0.15}
          renderOrder={10} material-depthTest={false}>AI BRAIN</Text>
      </Billboard>
      <Billboard position={[OUTPUT_X, 6, 0]}>
        <Text fontSize={0.4} color="#334155" letterSpacing={0.15}
          renderOrder={10} material-depthTest={false}>OUTPUT</Text>
      </Billboard>

      {/* ═══ SENSOR BARS ═══ */}
      {SENSOR_DEFS.map((def, i) => (
        <SensorBar
          key={def.type}
          def={def}
          sensor={sensorMap[def.type]}
          position={sensorPos[i]}
          onSelect={onSensorSelect}
          isSelected={selectedSensor === def.type}
          isActive={activeSensorTypes.has(def.type)}
        />
      ))}

      {/* ═══ FLOW: Sensors → Brain ═══ */}
      {SENSOR_DEFS.map((def, i) => {
        const active = activeSensorTypes.has(def.type);
        const sp = sensorPos[i];
        return (
          <React.Fragment key={`sf-${def.type}`}>
            <ConnectionLine
              start={[sp[0] + 1.5, 1.5, sp[2]]}
              end={brainPos}
              color={def.color}
              active={active}
              curved
            />
            {active && (
              <>
                <FlowDot start={[sp[0]+1.5, 1, sp[2]]} end={brainPos} color={def.color} speed={0.12} active size={0.08} />
                <FlowDot start={[sp[0]+1.5, 1.5, sp[2]]} end={brainPos} color={def.color} speed={0.08} active size={0.06} />
              </>
            )}
          </React.Fragment>
        );
      })}

      {/* ═══ AI BRAIN ═══ */}
      <BrainCore position={brainPos} active={brainActive} />

      {AGENTS.map((agent, i) => (
        <AgentSphere key={agent.name} agent={agent} position={agentPos[i]} active={brainActive} />
      ))}

      {AGENTS.map((agent, i) => (
        <ConnectionLine key={`al-${agent.name}`} start={agentPos[i]} end={brainPos} color={agent.color} active={brainActive} />
      ))}

      {/* ═══ FLOW: Brain → Outputs ═══ */}
      <ConnectionLine start={brainPos} end={dbPos} color="#10b981" active curved />
      <FlowDot start={brainPos} end={dbPos} color="#10b981" speed={0.1} active size={0.1} />

      <ConnectionLine start={brainPos} end={alertPos} color="#ef4444" active={hasCritical} curved />
      {hasCritical && (
        <FlowDot start={brainPos} end={alertPos} color="#ef4444" speed={0.2} active size={0.12} />
      )}

      {/* ═══ OUTPUT NODES ═══ */}
      <DBNode position={dbPos} />
      <AlertNode position={alertPos} active={hasEmergency || hasCritical} />
    </>
  );
}

// ── Sensor Detail Panel ─────────────────────────────────────────────────────
function SensorDetailPanel({ sensor, def, onOverride, onClose }) {
  if (!sensor || !def) return null;
  const ratio = sensor.currentValue / (sensor.criticalThreshold || 100);
  const color = ratio >= 1 ? '#ef4444' : ratio >= 0.5 ? '#f59e0b' : '#10b981';
  const max = (sensor.criticalThreshold || 100) * 1.5;

  return (
    <div style={{
      position: 'absolute', bottom: '12px', left: '12px', zIndex: 20,
      background: 'rgba(8,11,20,0.95)', backdropFilter: 'blur(12px)',
      border: `1px solid ${color}40`, borderRadius: '10px',
      padding: '12px', width: '220px', fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 700 }}>{def.label}</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
          width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px',
        }}>✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color }}>
          {sensor.currentValue.toFixed(1)}
        </span>
        <span style={{ color: '#64748b', fontSize: '11px' }}>{sensor.unit || def.unit}</span>
      </div>

      <input
        type="range" min={0} max={max} step={max > 100 ? 1 : 0.1}
        value={sensor.currentValue}
        onChange={(e) => onOverride(sensor.id, +e.target.value)}
        style={{ width: '100%', accentColor: color, marginBottom: '6px' }}
      />

      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', position: 'relative', marginBottom: '4px' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: '2px',
          width: `${Math.min(100, (sensor.currentValue / max) * 100)}%`,
          background: color, transition: 'width 0.3s',
        }} />
      </div>

      <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
        {[
          { l: 'Safe', v: sensor.warningThreshold * 0.1, c: '#10b981' },
          { l: 'Warn', v: sensor.warningThreshold, c: '#f59e0b' },
          { l: 'Crit', v: sensor.criticalThreshold, c: '#ef4444' },
        ].map(p => (
          <button key={p.l} onClick={() => onOverride(sensor.id, +p.v.toFixed(1))} style={{
            flex: 1, padding: '3px', borderRadius: '3px', cursor: 'pointer',
            background: `${p.c}15`, border: `1px solid ${p.c}30`, color: p.c,
            fontSize: '8px', fontWeight: 600, fontFamily: 'inherit',
          }}>{p.l}</button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================
export default function Factory3D({ sensors = [], systemStatus, onSensorOverride }) {
  const [selectedSensor, setSelectedSensor] = useState(null);

  const sensorMap = useMemo(() => {
    const m = {};
    for (const s of sensors) m[s.type] = s;
    return m;
  }, [sensors]);

  const selectedDef = SENSOR_DEFS.find(d => d.type === selectedSensor);
  const selectedData = selectedSensor ? sensorMap[selectedSensor] : null;
  const hasEmergency = systemStatus === 'emergency' || systemStatus === 'critical';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#060810' }}>
      <Canvas
        camera={{ position: [-8, 12, 22], fov: 45 }}
        onPointerMissed={() => setSelectedSensor(null)}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={['#060810', 35, 60]} />
        <Scene
          sensors={sensors}
          onSensorSelect={setSelectedSensor}
          selectedSensor={selectedSensor}
          hasEmergency={hasEmergency}
        />
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.05}
          minDistance={10} maxDistance={45}
          maxPolarAngle={Math.PI / 2.2}
          target={[2, 3, 0]}
        />
      </Canvas>

      {selectedData && selectedDef && (
        <SensorDetailPanel
          sensor={selectedData}
          def={selectedDef}
          onOverride={onSensorOverride}
          onClose={() => setSelectedSensor(null)}
        />
      )}

      {/* Compact legend */}
      <div style={{
        position: 'absolute', top: '6px', right: '6px', zIndex: 10,
        background: 'rgba(8,11,20,0.9)', backdropFilter: 'blur(8px)',
        borderRadius: '6px', padding: '6px 8px', border: '1px solid rgba(255,255,255,0.05)',
        fontSize: '8px', color: '#64748b',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '3px', color: '#94a3b8', fontSize: '9px' }}>Status</div>
        {[
          { c: '#10b981', l: 'Normal' },
          { c: '#f59e0b', l: 'Warning' },
          { c: '#ef4444', l: 'Critical' },
        ].map(({ c, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: '4px', right: '6px', zIndex: 10,
        background: 'rgba(8,11,20,0.8)', borderRadius: '4px', padding: '3px 6px',
        fontSize: '8px', color: '#334155', border: '1px solid rgba(255,255,255,0.04)',
      }}>
        Click sensor to adjust • Drag to orbit • Scroll to zoom
      </div>
    </div>
  );
}
