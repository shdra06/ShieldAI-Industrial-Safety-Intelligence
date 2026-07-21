// ============================================================================
// ShieldAI — 3D Sensor Tube
// A glass cylinder with colored liquid fill representing sensor value
// ============================================================================

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export default function SensorTube3D({ sensor, index, isHighlighted, isSelected, onClick }) {
  const groupRef = useRef();
  const fillRef = useRef();
  const glowRef = useRef();

  const { currentValue, criticalThreshold, warningThreshold, type, unit, zoneId } = sensor;
  const ratio = Math.min(1, currentValue / (criticalThreshold || 100));
  const fillHeight = ratio * 2.4; // tube inner height

  // Color based on threshold
  const color = useMemo(() => {
    if (currentValue >= criticalThreshold) return '#ef4444';
    if (currentValue >= warningThreshold) return '#f59e0b';
    return '#10b981';
  }, [currentValue, criticalThreshold, warningThreshold]);

  const TYPE_ICONS = { CH4: '🔥', CO: '💨', H2S: '☠️', NH3: '🧪', Temperature: '🌡️', Pressure: '⏲️' };

  // Animate fill level smoothly
  useFrame((_, delta) => {
    if (fillRef.current) {
      const target = fillHeight;
      const current = fillRef.current.scale.y;
      fillRef.current.scale.y = THREE.MathUtils.lerp(current, Math.max(0.01, target), delta * 3);
      fillRef.current.position.y = -1.2 + fillRef.current.scale.y * 0.5;
    }
    // Pulse glow for critical
    if (glowRef.current && currentValue >= criticalThreshold) {
      glowRef.current.material.opacity = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
    }
  });

  const x = (index % 4) * 2.2 - 3.3;
  const z = Math.floor(index / 4) * 2.5 - 1;

  return (
    <group ref={groupRef} position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onClick?.(sensor.id); }}>
      {/* Glass tube */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 3, 16, 1, true]} />
        <meshPhysicalMaterial
          color="#1e293b"
          transparent
          opacity={0.15}
          roughness={0.1}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Base cap */}
      <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Top cap (rim) */}
      <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.35, 16]} />
        <meshStandardMaterial color={isSelected ? '#a78bfa' : '#334155'} metalness={0.8} roughness={0.2} emissive={isSelected ? '#a78bfa' : '#000'} emissiveIntensity={isSelected ? 0.5 : 0} />
      </mesh>

      {/* Fill liquid */}
      <mesh ref={fillRef} position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 1, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={ratio > 0.8 ? 0.6 : 0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Critical glow sphere */}
      {currentValue >= warningThreshold && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.08} />
        </mesh>
      )}

      {/* Highlight ring */}
      {isHighlighted && (
        <mesh position={[0, -1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 16]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 2.1, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: currentValue >= criticalThreshold ? 'rgba(239,68,68,0.9)' : currentValue >= warningThreshold ? 'rgba(245,158,11,0.9)' : 'rgba(15,23,42,0.85)',
          padding: '2px 6px', borderRadius: '4px', textAlign: 'center',
          border: `1px solid ${color}40`, whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: '8px', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            {TYPE_ICONS[type] || '📡'} {type}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
            {currentValue.toFixed(1)}<span style={{ fontSize: '7px', opacity: 0.7 }}>{unit}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}
