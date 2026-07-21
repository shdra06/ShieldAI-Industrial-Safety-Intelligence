// ============================================================================
// ShieldAI — 3D Scene (Dark theme, spaced layout, bar-chart sensors)
// Sensors LEFT (row) ═══> AI Brain CENTER ═══> Outputs RIGHT
// No Html overlays — uses drei Text for clean labels
// ============================================================================

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Grid } from '@react-three/drei';
import * as THREE from 'three';

function getColor(s) {
  if (!s) return '#475569';
  if (s.currentValue >= s.criticalThreshold) return '#ef4444';
  if (s.currentValue >= s.warningThreshold) return '#f59e0b';
  return '#22c55e';
}

function getRatio(s) {
  if (!s) return 0;
  return Math.min(1.5, s.currentValue / (s.criticalThreshold || 100));
}

// ── Sensor Bar (height = reading level) ─────────────────────────────────────
function SensorBar({ sensor, position, isHighlighted, isSelected, onClick }) {
  const fillRef = useRef();
  const glowRef = useRef();
  const ratio = getRatio(sensor);
  const barH = 0.3 + ratio * 3.5; // min 0.3, max ~5.5
  const color = getColor(sensor);
  const isCrit = sensor.currentValue >= sensor.criticalThreshold;
  const isWarn = sensor.currentValue >= sensor.warningThreshold && !isCrit;

  useFrame((state, dt) => {
    if (fillRef.current) {
      // Smooth height lerp
      const target = Math.max(0.1, barH);
      fillRef.current.scale.y = THREE.MathUtils.lerp(fillRef.current.scale.y, target, dt * 2);
      fillRef.current.position.y = -1.5 + fillRef.current.scale.y * 0.5;
    }
    if (glowRef.current) {
      if (isCrit) {
        glowRef.current.material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      } else if (isWarn) {
        glowRef.current.material.emissiveIntensity = 0.15 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      } else {
        glowRef.current.material.emissiveIntensity = 0.03;
      }
    }
  });

  const displayH = Math.max(barH, 1);

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick?.(sensor.id); }}>
      {/* Base pad */}
      <mesh position={[0, -1.55, 0]}>
        <boxGeometry args={[1.4, 0.1, 1.4]} />
        <meshStandardMaterial color="#1a1f2e" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Status ring on base */}
      <mesh position={[0, -1.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.65, 20]} />
        <meshBasicMaterial color={color} transparent opacity={isCrit ? 0.5 : 0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Bar body — scales with reading */}
      <mesh ref={fillRef} position={[0, -1.5 + barH * 0.5, 0]}>
        <boxGeometry args={[0.7, 1, 0.7]} />
        <meshStandardMaterial
          ref={glowRef}
          color={color}
          emissive={color}
          emissiveIntensity={isCrit ? 0.4 : 0.05}
          metalness={0.4} roughness={0.3}
          transparent opacity={0.9}
        />
      </mesh>

      {/* Critical outer glow */}
      {isCrit && (
        <mesh position={[0, -1.5 + barH * 0.5, 0]}>
          <boxGeometry args={[1, barH, 1]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.04} />
        </mesh>
      )}

      {/* Highlight ring (demo is activating this sensor) */}
      {isHighlighted && (
        <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 20]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Selected ring */}
      {isSelected && (
        <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 0.95, 20]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Type label (small 3D text) */}
      <Billboard position={[0, -1.5 + displayH + 0.5, 0]}>
        <Text fontSize={0.32} color={color} fontWeight="bold"
          outlineWidth={0.02} outlineColor="#0a0e1a"
          renderOrder={10} material-depthTest={false}
        >{sensor.type}</Text>
      </Billboard>

      {/* Value readout */}
      <Billboard position={[0, -1.5 + displayH + 0.15, 0]}>
        <Text fontSize={0.22} color="#94a3b8"
          renderOrder={10} material-depthTest={false}
        >{sensor.currentValue.toFixed(1)} {sensor.unit}</Text>
      </Billboard>
    </group>
  );
}

// ── Agent Brain ─────────────────────────────────────────────────────────────
const AGENTS = [
  { id: 'scada',      name: 'SCADA',      pos: [-2.2, 0.3, -1.2], color: '#3b82f6' },
  { id: 'pattern',    name: 'Pattern',    pos: [0,    0.3, -1.5], color: '#8b5cf6' },
  { id: 'predictive', name: 'Predictive', pos: [2.2,  0.3, -1.2], color: '#f59e0b' },
  { id: 'compliance', name: 'Compliance', pos: [-2.2, 0.3,  1.2], color: '#ef4444' },
  { id: 'cascade',    name: 'Cascade',    pos: [0,    0.3,  1.5], color: '#ec4899' },
  { id: 'equipment',  name: 'Equipment',  pos: [2.2,  0.3,  1.2], color: '#f97316' },
];

function AgentBrain({ highlightAgent, isEmergency, activeFlow }) {
  const supervisorRef = useRef();
  const shellRef = useRef();
  const ragGlow = activeFlow?.to === 'rag' || activeFlow?.from === 'rag';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (supervisorRef.current) {
      supervisorRef.current.position.y = 1 + Math.sin(t * 0.8) * 0.1;
    }
    if (shellRef.current) {
      shellRef.current.rotation.y = t * 0.15;
      shellRef.current.rotation.x = Math.sin(t * 0.1) * 0.05;
    }
  });

  return (
    <group position={[4, 0, 0]}>
      {/* Platform */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[4, 4.2, 0.2, 24]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.6}
          emissive={isEmergency ? '#ef4444' : '#7c3aed'} emissiveIntensity={0.05} />
      </mesh>

      {/* Wireframe shell */}
      <mesh ref={shellRef} position={[0, 1, 0]}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial color="#a78bfa" wireframe
          emissive="#a78bfa" emissiveIntensity={highlightAgent === 'supervisor' ? 0.5 : 0.1} />
      </mesh>

      {/* Supervisor core */}
      <mesh ref={supervisorRef} position={[0, 1, 0]}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2}
          emissive="#a78bfa" emissiveIntensity={highlightAgent === 'supervisor' ? 0.5 : 0.1} />
      </mesh>

      {/* Orbit ring */}
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2, 0.02, 8, 48]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.2} />
      </mesh>

      {/* Label */}
      <Billboard position={[0, 3, 0]}>
        <Text fontSize={0.35} color="#c4b5fd" fontWeight="bold"
          outlineWidth={0.02} outlineColor="#0a0e1a"
          renderOrder={10} material-depthTest={false}
        >🧠 Supervisor</Text>
      </Billboard>

      {/* Sub-agents */}
      {AGENTS.map(a => {
        const isHL = highlightAgent === a.id;
        return (
          <group key={a.id} position={a.pos}>
            <mesh>
              <dodecahedronGeometry args={[0.25, 0]} />
              <meshStandardMaterial color={a.color}
                emissive={a.color} emissiveIntensity={isHL ? 0.6 : 0.03}
                metalness={0.3} roughness={0.3} />
            </mesh>
            {isHL && (
              <mesh><sphereGeometry args={[0.4, 12, 12]} /><meshBasicMaterial color={a.color} transparent opacity={0.12} /></mesh>
            )}
            {/* Connection line to center */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  array={new Float32Array([0, 0, 0, -a.pos[0], 0.7 - a.pos[1], -a.pos[2]])}
                  count={2} itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isHL ? a.color : '#1e293b'} transparent opacity={isHL ? 0.5 : 0.15} />
            </line>
            <Billboard position={[0, 0.5, 0]}>
              <Text fontSize={0.18} color={isHL ? a.color : '#475569'}
                renderOrder={10} material-depthTest={false}
              >{a.name}</Text>
            </Billboard>
          </group>
        );
      })}

      {/* RAG Database */}
      <group position={[0, -1.8, 0]}>
        <mesh>
          <cylinderGeometry args={[0.8, 0.8, 0.6, 16]} />
          <meshStandardMaterial color={ragGlow ? '#166534' : '#14532d'} metalness={0.3} roughness={0.5}
            emissive="#22c55e" emissiveIntensity={ragGlow ? 0.3 : 0.03} />
        </mesh>
        <Billboard position={[0, 0.6, 0]}>
          <Text fontSize={0.2} color={ragGlow ? '#22c55e' : '#475569'}
            renderOrder={10} material-depthTest={false}
          >📚 RAG + DB</Text>
        </Billboard>
      </group>

      <pointLight color="#a78bfa" intensity={highlightAgent ? 1 : 0.3} distance={8} position={[0, 2, 0]} />
    </group>
  );
}

// ── Output Nodes ────────────────────────────────────────────────────────────
function OutputNodes({ isEmergency, hasWarning, warningCount }) {
  const items = [
    { label: 'Warning', sub: hasWarning ? `${warningCount} alerts` : 'Standby', active: hasWarning, color: '#f59e0b', y: 1.5 },
    { label: 'Emergency', sub: isEmergency ? 'ACTIVE' : 'Standby', active: isEmergency, color: '#ef4444', y: 0 },
    { label: 'Evacuation', sub: isEmergency ? 'ZONE LOCKED' : 'Clear', active: isEmergency, color: '#dc2626', y: -1.5 },
    { label: 'Report', sub: hasWarning ? 'DGMS Form-M' : 'None', active: hasWarning, color: '#3b82f6', y: -3 },
  ];

  return (
    <group position={[14, 0, 0]}>
      {items.map((item, i) => {
        return (
          <group key={i} position={[0, item.y, 0]}>
            <mesh>
              <boxGeometry args={[2.5, 1, 0.15]} />
              <meshStandardMaterial
                color={item.active ? '#1a1020' : '#111827'}
                emissive={item.active ? item.color : '#000'}
                emissiveIntensity={item.active ? 0.1 : 0}
                metalness={0.2} roughness={0.6}
              />
            </mesh>
            {/* Border */}
            <mesh position={[0, 0, -0.08]}>
              <boxGeometry args={[2.6, 1.1, 0.01]} />
              <meshStandardMaterial color={item.active ? item.color : '#1e293b'} transparent opacity={item.active ? 0.4 : 0.15} />
            </mesh>
            <Billboard position={[0, 0.15, 0.1]}>
              <Text fontSize={0.2} color={item.active ? item.color : '#475569'} fontWeight="bold"
                renderOrder={10} material-depthTest={false}
              >{item.label}</Text>
            </Billboard>
            <Billboard position={[0, -0.15, 0.1]}>
              <Text fontSize={0.14} color={item.active ? '#94a3b8' : '#334155'}
                renderOrder={10} material-depthTest={false}
              >{item.sub}</Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

// ── Data Particles ──────────────────────────────────────────────────────────
function DataParticles({ isEmergency, hasWarning }) {
  const ref = useRef();
  const count = 40;
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3]     = -10 + Math.random() * 2;
      a[i * 3 + 1] = -1 + Math.random() * 3;
      a[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return a;
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const speed = isEmergency ? 3 : hasWarning ? 1.5 : 0.5;
    for (let i = 0; i < count; i++) {
      let x = pos.getX(i);
      x += dt * speed;
      if (x > 16) {
        x = -10 + Math.random();
        pos.setY(i, -1 + Math.random() * 3);
        pos.setZ(i, (Math.random() - 0.5) * 5);
      }
      pos.setX(i, x);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color={isEmergency ? '#ef4444' : '#7c3aed'} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ── Flow lines ──────────────────────────────────────────────────────────────
function FlowLines({ isEmergency, hasWarning }) {
  const c = isEmergency ? '#ef4444' : hasWarning ? '#f59e0b' : '#1e293b';
  const o = isEmergency || hasWarning ? 0.3 : 0.08;
  return (
    <>
      {/* Sensors → Brain */}
      <mesh position={[-4, -0.5, 0]}>
        <boxGeometry args={[6, 0.02, 0.02]} />
        <meshBasicMaterial color={c} transparent opacity={o} />
      </mesh>
      {/* Brain → Outputs */}
      <mesh position={[10, -0.5, 0]}>
        <boxGeometry args={[6, 0.02, 0.02]} />
        <meshBasicMaterial color={c} transparent opacity={o} />
      </mesh>
    </>
  );
}

// =============================================================================
// MAIN SCENE
// =============================================================================
export default function Scene3D({
  sensors = [], highlightAgent, isEmergency, hasWarning, activeFlow,
  highlightSensor, selectedSensor, warningCount, onSensorClick,
}) {
  // Group sensors by type, take worst reading per type
  const uniqueSensors = useMemo(() => {
    const byType = {};
    for (const s of sensors) {
      const key = s.type;
      if (!byType[key] || s.currentValue > byType[key].currentValue) {
        byType[key] = s;
      }
    }
    return Object.values(byType);
  }, [sensors]);

  // Position sensors in a single clean row
  const sensorPositions = useMemo(() => {
    const count = uniqueSensors.length;
    const spacing = 2.5;
    const startZ = -(count - 1) * spacing / 2;
    return uniqueSensors.map((_, i) => [-9, 0, startZ + i * spacing]);
  }, [uniqueSensors.length]);

  return (
    <Canvas
      camera={{ position: [0, 10, 20], fov: 42 }}
      style={{ background: '#0a0e1a' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 25, 50]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 8]} intensity={0.6} color="#e2e8f0" />
      <directionalLight position={[-8, 8, -5]} intensity={0.2} color="#a78bfa" />
      {isEmergency && <pointLight position={[-9, 4, 0]} intensity={0.6} color="#ef4444" />}

      {/* Grid floor */}
      <Grid
        infiniteGrid
        cellSize={2}
        sectionSize={8}
        cellColor="#141825"
        sectionColor="#1a2035"
        fadeDistance={35}
        position={[0, -1.6, 0]}
      />

      {/* Section labels */}
      <Billboard position={[-9, 4, 0]}>
        <Text fontSize={0.4} color="#334155" letterSpacing={0.12}
          renderOrder={10} material-depthTest={false}>SENSORS</Text>
      </Billboard>
      <Billboard position={[4, 4.5, 0]}>
        <Text fontSize={0.4} color="#334155" letterSpacing={0.12}
          renderOrder={10} material-depthTest={false}>AI BRAIN</Text>
      </Billboard>
      <Billboard position={[14, 4, 0]}>
        <Text fontSize={0.35} color="#334155" letterSpacing={0.12}
          renderOrder={10} material-depthTest={false}>OUTPUT</Text>
      </Billboard>

      {/* ═══ SENSORS ═══ */}
      {uniqueSensors.map((sensor, i) => (
        <SensorBar
          key={sensor.id}
          sensor={sensor}
          position={sensorPositions[i]}
          isHighlighted={highlightSensor === sensor.id}
          isSelected={selectedSensor === sensor.id}
          onClick={onSensorClick}
        />
      ))}

      {/* ═══ AI BRAIN ═══ */}
      <AgentBrain highlightAgent={highlightAgent} isEmergency={isEmergency} activeFlow={activeFlow} />

      {/* ═══ OUTPUTS ═══ */}
      <OutputNodes isEmergency={isEmergency} hasWarning={hasWarning} warningCount={warningCount} />

      {/* ═══ DATA FLOW ═══ */}
      <DataParticles isEmergency={isEmergency} hasWarning={hasWarning} />
      <FlowLines isEmergency={isEmergency} hasWarning={hasWarning} />

      {/* Camera */}
      <OrbitControls
        enablePan enableZoom enableRotate
        maxPolarAngle={Math.PI / 2.1}
        minDistance={8}
        maxDistance={35}
        autoRotate={!isEmergency}
        autoRotateSpeed={0.3}
        target={[2, 0, 0]}
        dampingFactor={0.05}
        enableDamping
      />
    </Canvas>
  );
}
