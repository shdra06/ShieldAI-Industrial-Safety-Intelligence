// ============================================================================
// ShieldAI — 3D Output Screens
// Floating monitor screens for Warning, Emergency, Evacuation, Compliance
// ============================================================================

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const SCREENS = [
  { id: 'warning', icon: '⚠️', title: 'Warning System', y: 1.2 },
  { id: 'emergency', icon: '🚨', title: 'Emergency Services', y: 0.4 },
  { id: 'evacuation', icon: '🚷', title: 'Auto-Evacuation', y: -0.4 },
  { id: 'compliance', icon: '📄', title: 'Incident Report', y: -1.2 },
];

export default function OutputScreens3D({ isEmergency, hasWarning, warningCount }) {
  const groupRef = useRef();

  return (
    <group ref={groupRef} position={[6.5, 1, 0]}>
      {SCREENS.map((screen, i) => {
        const isActive = screen.id === 'warning' ? hasWarning :
                         screen.id === 'emergency' ? isEmergency :
                         screen.id === 'evacuation' ? isEmergency :
                         hasWarning;

        const color = screen.id === 'emergency' ? '#ef4444' :
                      screen.id === 'evacuation' ? '#dc2626' :
                      screen.id === 'warning' ? '#f59e0b' : '#60a5fa';

        return (
          <group key={screen.id} position={[0, screen.y, 0]}>
            {/* Screen frame */}
            <mesh>
              <boxGeometry args={[2.2, 0.7, 0.05]} />
              <meshStandardMaterial
                color={isActive ? '#0f172a' : '#030712'}
                metalness={0.8}
                roughness={0.2}
                emissive={isActive ? color : '#000'}
                emissiveIntensity={isActive ? 0.15 : 0}
              />
            </mesh>
            {/* Screen bezel */}
            <mesh position={[0, 0, -0.03]}>
              <boxGeometry args={[2.3, 0.8, 0.02]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.9}
                roughness={0.1}
                emissive={isActive ? color : '#000'}
                emissiveIntensity={isActive ? 0.05 : 0}
              />
            </mesh>
            {/* Status light */}
            <mesh position={[-1.0, 0.28, 0.04]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color={isActive ? color : '#1e293b'} />
            </mesh>
            {/* Screen content */}
            <Html position={[0, 0, 0.04]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
              <div style={{
                width: '140px', padding: '4px 8px',
                opacity: isActive ? 1 : 0.3,
                transition: 'opacity 0.5s',
              }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: isActive ? color : '#475569', fontFamily: 'Inter,sans-serif' }}>
                  {screen.icon} {screen.title}
                </div>
                <div style={{ fontSize: '7px', color: '#94a3b8', fontFamily: 'Inter,sans-serif', marginTop: '2px' }}>
                  {screen.id === 'warning' && (hasWarning ? `${warningCount} alerts raised` : 'Monitoring')}
                  {screen.id === 'emergency' && (isEmergency ? 'CONTACTED — En route' : 'On standby')}
                  {screen.id === 'evacuation' && (isEmergency ? 'Zone A LOCKED' : 'All zones clear')}
                  {screen.id === 'compliance' && (hasWarning ? 'DGMS Form-M filed' : 'No incidents')}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
