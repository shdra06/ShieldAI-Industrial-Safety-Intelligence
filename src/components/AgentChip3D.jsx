// ============================================================================
// ShieldAI — 3D Agent Brain Chip
// A circuit board with glowing agent nodes and connecting traces
// ============================================================================

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const AGENT_NODES = [
  { id: 'scada',      name: 'SCADA',      icon: '📡', pos: [-1.2, 0.15, -0.6], color: '#60a5fa' },
  { id: 'pattern',    name: 'Pattern',    icon: '📊', pos: [0,    0.15, -0.6], color: '#a78bfa' },
  { id: 'predictive', name: 'Predictive', icon: '📈', pos: [1.2,  0.15, -0.6], color: '#f59e0b' },
  { id: 'compliance', name: 'Compliance', icon: '⚖️', pos: [-1.2, 0.15,  0.6], color: '#ef4444' },
  { id: 'cascade',    name: 'Cascade',    icon: '🔗', pos: [0,    0.15,  0.6], color: '#ec4899' },
  { id: 'equipment',  name: 'Equipment',  icon: '🔧', pos: [1.2,  0.15,  0.6], color: '#f97316' },
];

export default function AgentChip3D({ highlightAgent, isEmergency, hasWarning, activeFlow }) {
  const groupRef = useRef();
  const supervisorRef = useRef();
  const nodeRefs = useRef({});

  // Subtle float animation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.05;
    }
    // Supervisor pulse
    if (supervisorRef.current) {
      const intensity = highlightAgent === 'supervisor' ? 0.8 : isEmergency ? 0.5 : 0.15;
      const current = supervisorRef.current.material.emissiveIntensity;
      supervisorRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(current, intensity + Math.sin(Date.now() * 0.004) * 0.1, delta * 4);
    }
  });

  const ragGlow = activeFlow?.to === 'rag' || activeFlow?.from === 'rag';

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {/* PCB Board */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.5, 0.12, 2]} />
        <meshStandardMaterial
          color="#0c1222"
          metalness={0.7}
          roughness={0.3}
          emissive={isEmergency ? '#ef4444' : '#1a1a3a'}
          emissiveIntensity={isEmergency ? 0.15 : 0.05}
        />
      </mesh>

      {/* Board edge highlights */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[3.6, 0.01, 2.1]} />
        <meshBasicMaterial color={isEmergency ? '#ef4444' : '#a78bfa'} transparent opacity={0.15} />
      </mesh>

      {/* Supervisor node (center, larger) */}
      <mesh ref={supervisorRef} position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#a78bfa"
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <Html position={[0, 0.75, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: '10px' }}>🧠</div>
          <div style={{ fontSize: '7px', color: '#a78bfa', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>Supervisor</div>
        </div>
      </Html>

      {/* Sub-agent nodes */}
      {AGENT_NODES.map(agent => {
        const isHL = highlightAgent === agent.id;
        return (
          <group key={agent.id} position={agent.pos}>
            {/* Node sphere */}
            <mesh ref={el => nodeRefs.current[agent.id] = el}>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial
                color={agent.color}
                emissive={agent.color}
                emissiveIntensity={isHL ? 0.8 : 0.1}
                metalness={0.4}
                roughness={0.3}
              />
            </mesh>
            {/* Glow when active */}
            {isHL && (
              <mesh>
                <sphereGeometry args={[0.25, 12, 12]} />
                <meshBasicMaterial color={agent.color} transparent opacity={0.2} />
              </mesh>
            )}
            {/* Trace to supervisor (simple approach) */}
            <mesh position={[-agent.pos[0]/2, 0, -agent.pos[2]/2]}
              rotation={[0, Math.atan2(-agent.pos[0], -agent.pos[2]), 0]}>
              <boxGeometry args={[0.02, 0.02, Math.sqrt(agent.pos[0]*agent.pos[0] + agent.pos[2]*agent.pos[2])]} />
              <meshBasicMaterial color={isHL ? agent.color : '#1e293b'} transparent opacity={isHL ? 0.8 : 0.2} />
            </mesh>
            {/* Label */}
            <Html position={[0, 0.4, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
              <div style={{ fontSize: '7px', color: isHL ? agent.color : '#475569', fontWeight: 600, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {agent.icon}<br/>{agent.name}
              </div>
            </Html>
          </group>
        );
      })}

      {/* RAG Database below the chip */}
      <group position={[0, -0.8, 0]}>
        <mesh>
          <boxGeometry args={[1.6, 0.3, 0.8]} />
          <meshStandardMaterial
            color="#064e3b"
            metalness={0.6}
            roughness={0.3}
            emissive="#10b981"
            emissiveIntensity={ragGlow ? 0.5 : 0.05}
          />
        </mesh>
        <Html position={[0, 0.35, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: '7px', color: ragGlow ? '#10b981' : '#334155', fontWeight: 700, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', textAlign: 'center' }}>
            📚 RAG + Company DB
          </div>
        </Html>
      </group>
    </group>
  );
}
