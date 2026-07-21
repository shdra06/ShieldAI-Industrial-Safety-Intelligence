// ============================================================================
// ShieldAI — Simulation Scenarios
// Pre-defined timelines that drive sensor changes, permit events, and worker
// movements to demonstrate the multi-agent safety system.
// ============================================================================

export const SCENARIOS = {
  // ── Scenario 1: Visakhapatnam-Pattern Gas Explosion ────────────────────
  vizag: {
    id: 'vizag',
    name: 'Coke Oven Gas Buildup — Vizag Pattern',
    description:
      'Simulates a gas buildup in Zone A (Coke Oven Battery) mirroring the Visakhapatnam incident. ' +
      'Methane levels rise steadily while a hot work permit is active. The system must detect the ' +
      'escalating risk, revoke permits, and trigger emergency protocols.',
    duration: 120,
    initialPermits: {
      'PTW-001': { status: 'active' },
    },
    timeline: [
      // Phase 1: Initial gas creep (0-30s)
      { time: 5,  type: 'sensor_change', target: 'GAS-001', value: 8,   description: 'CH4 begins rising in Zone A' },
      { time: 10, type: 'sensor_change', target: 'GAS-001', value: 12,  description: 'CH4 continues upward trend' },
      { time: 15, type: 'sensor_change', target: 'GAS-002', value: 22,  description: 'CO also rising — gas leak confirmed' },
      { time: 20, type: 'sensor_change', target: 'GAS-001', value: 16,  description: 'CH4 approaching warning threshold' },
      { time: 25, type: 'sensor_change', target: 'GAS-003', value: 5,   description: 'H2S starting to climb' },
      { time: 30, type: 'sensor_change', target: 'GAS-001', value: 22,  description: 'CH4 EXCEEDS WARNING THRESHOLD (20% LEL)' },

      // Phase 2: Hot work activation with rising gas (30-60s)
      { time: 35, type: 'sensor_change', target: 'GAS-002', value: 45,  description: 'CO nearing warning level' },
      { time: 40, type: 'permit_event',  target: 'PTW-001', data: { status: 'active', description: 'Welding commences on Gas Collecting Main' }, description: 'Hot work begins despite rising gas levels' },
      { time: 42, type: 'worker_event',  target: 'W-001',   data: { currentZone: 'Z-A' }, description: 'Welder Vikram Singh active at weld point' },
      { time: 45, type: 'sensor_change', target: 'GAS-001', value: 28,  description: 'CH4 at 28% LEL — dangerous level' },
      { time: 50, type: 'sensor_change', target: 'GAS-002', value: 65,  description: 'CO exceeds warning threshold' },
      { time: 55, type: 'sensor_change', target: 'GAS-003', value: 12,  description: 'H2S exceeds warning threshold' },
      { time: 58, type: 'sensor_change', target: 'PRES-001', value: 11, description: 'Gas main pressure rising abnormally' },
      { time: 60, type: 'sensor_change', target: 'GAS-001', value: 35,  description: 'CH4 at 35% LEL — approaching critical' },

      // Phase 3: Critical escalation (60-90s)
      { time: 65, type: 'sensor_change', target: 'GAS-001', value: 38,  description: 'CH4 nearing critical threshold' },
      { time: 68, type: 'sensor_change', target: 'GAS-002', value: 120, description: 'CO at dangerous levels' },
      { time: 70, type: 'sensor_change', target: 'PRES-001', value: 15, description: 'Pressure exceeds warning — valve failure suspected' },
      { time: 75, type: 'sensor_change', target: 'GAS-001', value: 42,  description: 'CH4 EXCEEDS CRITICAL THRESHOLD (40% LEL)' },
      { time: 78, type: 'sensor_change', target: 'GAS-002', value: 180, description: 'CO approaching critical' },
      { time: 80, type: 'sensor_change', target: 'GAS-003', value: 30,  description: 'H2S at dangerous level' },

      // Phase 4: Emergency (90-120s)
      { time: 85, type: 'sensor_change', target: 'GAS-001', value: 55,  description: 'CH4 far beyond critical — explosive atmosphere' },
      { time: 88, type: 'sensor_change', target: 'GAS-002', value: 250, description: 'CO exceeds critical threshold' },
      { time: 90, type: 'agent_override', target: 'PTW-001', data: { status: 'revoked', revokedBy: 'ShieldAI Emergency Agent' }, description: 'EMERGENCY: All permits auto-revoked' },
      { time: 92, type: 'sensor_change', target: 'PRES-001', value: 19, description: 'Pressure critical — imminent rupture risk' },
      { time: 95, type: 'sensor_change', target: 'GAS-001', value: 62,  description: 'CH4 at 62% LEL — evacuate immediately' },
      { time: 100, type: 'sensor_change', target: 'TEMP-001', value: 1250, description: 'Temperature spike detected' },
      { time: 110, type: 'sensor_change', target: 'GAS-001', value: 70,  description: 'CH4 at maximum — detonation risk' },
      { time: 120, type: 'sensor_change', target: 'GAS-001', value: 75,  description: 'Scenario ends — emergency state' },
    ],
  },

  // ── Scenario 2: Confined Space CO Buildup ─────────────────────────────
  confined: {
    id: 'confined',
    name: 'Confined Space Entry — CO Buildup',
    description:
      'Simulates a worker entering an ammonia scrubber vessel in Zone C while CO levels are building ' +
      'inside the vessel. The worker enters without proper PPE verification. The system must detect ' +
      'the PPE violation, atmospheric hazard, and initiate rescue protocols.',
    duration: 90,
    initialPermits: {
      'PTW-002': { status: 'active' },
    },
    timeline: [
      // CO buildup inside vessel
      { time: 5,  type: 'sensor_change', target: 'GAS-009', value: 15,  description: 'CO rising inside scrubber vessel' },
      { time: 10, type: 'sensor_change', target: 'GAS-008', value: 5,   description: 'H2S slight increase in Zone C' },
      { time: 15, type: 'sensor_change', target: 'GAS-009', value: 28,  description: 'CO approaching warning level' },
      { time: 20, type: 'sensor_change', target: 'GAS-007', value: 14,  description: 'NH3 elevated but within range' },

      // Worker enters without gas monitor (PPE violation)
      { time: 30, type: 'worker_event',  target: 'W-011',   data: { currentZone: 'Z-C', ppeCompliant: false, ppeItems: ['Hard Hat', 'Safety Boots'] }, description: 'Worker enters confined space WITHOUT respirator or gas monitor' },
      { time: 32, type: 'sensor_change', target: 'GAS-009', value: 40,  description: 'CO rising rapidly inside vessel' },

      // Escalation
      { time: 40, type: 'sensor_change', target: 'GAS-009', value: 55,  description: 'CO exceeds warning threshold' },
      { time: 45, type: 'sensor_change', target: 'GAS-008', value: 12,  description: 'H2S exceeds warning threshold' },
      { time: 50, type: 'sensor_change', target: 'GAS-009', value: 85,  description: 'CO at dangerous level — worker at risk' },
      { time: 55, type: 'sensor_change', target: 'GAS-007', value: 28,  description: 'NH3 exceeds warning threshold' },

      // Emergency
      { time: 60, type: 'sensor_change', target: 'GAS-009', value: 150, description: 'CO approaching critical inside vessel' },
      { time: 65, type: 'sensor_change', target: 'GAS-009', value: 210, description: 'CO EXCEEDS CRITICAL — life-threatening' },
      { time: 70, type: 'agent_override', target: 'PTW-002', data: { status: 'revoked', revokedBy: 'ShieldAI Emergency Agent' }, description: 'EMERGENCY: Confined space permit revoked' },
      { time: 75, type: 'sensor_change', target: 'GAS-008', value: 35,  description: 'H2S at dangerous level' },
      { time: 80, type: 'sensor_change', target: 'GAS-009', value: 280, description: 'CO extreme — immediate rescue required' },
      { time: 90, type: 'sensor_change', target: 'GAS-009', value: 320, description: 'Scenario ends — rescue in progress' },
    ],
  },

  // ── Scenario 3: Normal Operations ─────────────────────────────────────
  normal: {
    id: 'normal',
    name: 'Normal Operations — Stable',
    description:
      'Simulates stable plant operations with minor fluctuations in sensor readings. ' +
      'All values remain within normal ranges. Demonstrates baseline monitoring capability.',
    duration: 120,
    initialPermits: {},
    timeline: [
      // Minor CH4 fluctuations in Zone A
      { time: 10, type: 'sensor_change', target: 'GAS-001', value: 6,   description: 'Minor CH4 fluctuation — normal' },
      { time: 25, type: 'sensor_change', target: 'GAS-001', value: 4,   description: 'CH4 returns to baseline' },
      { time: 40, type: 'sensor_change', target: 'GAS-001', value: 7,   description: 'CH4 slight rise — within normal' },
      { time: 55, type: 'sensor_change', target: 'GAS-001', value: 5,   description: 'CH4 stable' },

      // CO normal variations in Zone B
      { time: 15, type: 'sensor_change', target: 'GAS-005', value: 20,  description: 'CO slight rise in Zone B — normal' },
      { time: 35, type: 'sensor_change', target: 'GAS-005', value: 15,  description: 'CO subsiding' },
      { time: 60, type: 'sensor_change', target: 'GAS-005', value: 22,  description: 'CO minor peak — within normal' },
      { time: 80, type: 'sensor_change', target: 'GAS-005', value: 16,  description: 'CO back to normal' },

      // Temperature routine in Zone D
      { time: 20, type: 'sensor_change', target: 'TEMP-002', value: 1540, description: 'Furnace temp slight rise — normal cycle' },
      { time: 50, type: 'sensor_change', target: 'TEMP-002', value: 1500, description: 'Furnace temp stabilizing' },
      { time: 90, type: 'sensor_change', target: 'TEMP-002', value: 1560, description: 'Furnace temp normal variation' },

      // Worker movements
      { time: 30, type: 'worker_event',  target: 'W-005',   data: { currentZone: 'Z-F' }, description: 'Operator moves to Control Room for break' },
      { time: 70, type: 'worker_event',  target: 'W-005',   data: { currentZone: 'Z-A' }, description: 'Operator returns to Zone A' },

      // NH3 stable in Zone C
      { time: 45, type: 'sensor_change', target: 'GAS-007', value: 10,  description: 'NH3 minor fluctuation — normal' },
      { time: 75, type: 'sensor_change', target: 'GAS-007', value: 7,   description: 'NH3 back to baseline' },

      { time: 120, type: 'sensor_change', target: 'GAS-001', value: 5,  description: 'Scenario ends — all normal' },
    ],
  },

  // ── Scenario 4: Normalization of Deviance ─────────────────────────────
  deviance: {
    id: 'deviance',
    name: 'Normalization of Deviance — Silent Drift',
    description:
      'Temperature and pressure slowly drift upward over 180 seconds. Each individual reading ' +
      'is below the warning threshold, but the consistent rate of change matches pre-incident ' +
      'conditions. Tests the Pattern Agent\'s drift detection and compound risk analysis. ' +
      'Based on real-world incidents where operators became desensitized to gradually worsening conditions.',
    duration: 180,
    initialPermits: {
      'PTW-003': { status: 'active' },
    },
    timeline: [
      // Phase 1: Subtle temperature creep (0-60s)
      { time: 4,   type: 'sensor_change', target: 'TEMP-002', value: 1525, description: 'Furnace temp slight increase — normal variation?' },
      { time: 8,   type: 'sensor_change', target: 'TEMP-002', value: 1532, description: 'Temp continues upward — within normal range' },
      { time: 12,  type: 'sensor_change', target: 'TEMP-002', value: 1538, description: 'Temp rising slowly — still normal' },
      { time: 16,  type: 'sensor_change', target: 'TEMP-002', value: 1545, description: 'Subtle upward trend in furnace temp' },
      { time: 20,  type: 'sensor_change', target: 'PRES-002', value: 3.3,  description: 'Pressure nudges up slightly' },
      { time: 24,  type: 'sensor_change', target: 'TEMP-002', value: 1553, description: 'Temp creeping higher — no alarm triggered' },
      { time: 28,  type: 'sensor_change', target: 'TEMP-002', value: 1560, description: 'Approaching upper normal range' },
      { time: 32,  type: 'sensor_change', target: 'PRES-002', value: 3.4,  description: 'Pressure also trending upward' },
      { time: 36,  type: 'sensor_change', target: 'TEMP-002', value: 1568, description: 'Temp at upper boundary of normal' },
      { time: 40,  type: 'sensor_change', target: 'GAS-010',  value: 24,   description: 'CO in Zone D slight increase — still normal' },
      { time: 44,  type: 'sensor_change', target: 'TEMP-002', value: 1575, description: 'Temp above normal range — no alarm' },
      { time: 48,  type: 'sensor_change', target: 'PRES-002', value: 3.5,  description: 'Pressure continuing slow rise' },
      { time: 52,  type: 'sensor_change', target: 'TEMP-002', value: 1582, description: 'Consistent upward drift pattern emerging' },
      { time: 56,  type: 'sensor_change', target: 'GAS-010',  value: 27,   description: 'CO creeping up steadily' },
      { time: 60,  type: 'sensor_change', target: 'TEMP-002', value: 1590, description: 'Temp well above normal — drift is clear' },

      // Phase 2: Correlated sensor drift (60-120s)
      { time: 64,  type: 'sensor_change', target: 'PRES-002', value: 3.65, description: 'Pressure now correlated with temp rise' },
      { time: 68,  type: 'sensor_change', target: 'TEMP-002', value: 1598, description: 'Temp approaching 1600°C boundary' },
      { time: 72,  type: 'sensor_change', target: 'GAS-010',  value: 30,   description: 'CO at upper normal — three sensors drifting' },
      { time: 76,  type: 'sensor_change', target: 'TEMP-002', value: 1608, description: 'Temp exceeds normal max (1600°C)' },
      { time: 80,  type: 'sensor_change', target: 'PRES-002', value: 3.8,  description: 'Pressure accelerating' },
      { time: 84,  type: 'sensor_change', target: 'TEMP-002', value: 1618, description: 'Drift rate increasing — nonlinear now' },
      { time: 88,  type: 'sensor_change', target: 'GAS-010',  value: 33,   description: 'CO continues steady rise' },
      { time: 92,  type: 'sensor_change', target: 'TEMP-002', value: 1630, description: 'Temperature drift accelerating' },
      { time: 96,  type: 'sensor_change', target: 'PRES-002', value: 3.95, description: 'Pressure nearing upper normal limit' },
      { time: 100, type: 'sensor_change', target: 'TEMP-002', value: 1645, description: 'Significant deviation from baseline' },
      { time: 104, type: 'sensor_change', target: 'GAS-010',  value: 37,   description: 'CO drift accelerating with temperature' },
      { time: 108, type: 'sensor_change', target: 'TEMP-002', value: 1660, description: 'Drift pattern matches pre-incident signature' },
      { time: 112, type: 'sensor_change', target: 'PRES-002', value: 4.1,  description: 'Pressure exceeds normal range' },
      { time: 116, type: 'sensor_change', target: 'TEMP-002', value: 1678, description: 'Temperature rising toward warning zone' },
      { time: 120, type: 'sensor_change', target: 'GAS-010',  value: 42,   description: 'CO approaching warning threshold' },

      // Phase 3: Threshold approach (120-180s)
      { time: 124, type: 'sensor_change', target: 'TEMP-002', value: 1690, description: 'Near warning threshold — Pattern Agent should flag' },
      { time: 128, type: 'sensor_change', target: 'PRES-002', value: 4.2,  description: 'Pressure in elevated zone' },
      { time: 132, type: 'sensor_change', target: 'TEMP-002', value: 1695, description: 'Very close to warning (1700°C)' },
      { time: 136, type: 'worker_event',  target: 'W-013',    data: { currentZone: 'Z-D' }, description: 'Contract worker enters Zone D unaware of drift' },
      { time: 140, type: 'sensor_change', target: 'TEMP-002', value: 1702, description: 'TEMP EXCEEDS WARNING — drift confirmed dangerous' },
      { time: 144, type: 'sensor_change', target: 'GAS-010',  value: 48,   description: 'CO approaching warning threshold' },
      { time: 148, type: 'sensor_change', target: 'PRES-002', value: 4.35, description: 'Pressure continues steady climb' },
      { time: 152, type: 'sensor_change', target: 'TEMP-002', value: 1720, description: 'Temperature well above warning' },
      { time: 156, type: 'sensor_change', target: 'GAS-010',  value: 52,   description: 'CO EXCEEDS WARNING THRESHOLD' },
      { time: 160, type: 'sensor_change', target: 'PRES-002', value: 4.5,  description: 'PRESSURE AT WARNING THRESHOLD' },
      { time: 164, type: 'sensor_change', target: 'TEMP-002', value: 1745, description: 'Rapid escalation now visible' },
      { time: 168, type: 'sensor_change', target: 'GAS-010',  value: 65,   description: 'CO rising rapidly' },
      { time: 172, type: 'sensor_change', target: 'TEMP-002', value: 1770, description: 'Temperature in critical approach zone' },
      { time: 176, type: 'sensor_change', target: 'PRES-002', value: 4.8,  description: 'Pressure escalating' },
      { time: 180, type: 'sensor_change', target: 'TEMP-002', value: 1800, description: 'Scenario ends — drift became emergency' },
    ],
  },

  // ── Scenario 5: Cascade Failure ───────────────────────────────────────
  cascade: {
    id: 'cascade',
    name: 'Cascade Failure — Multi-System Breakdown',
    description:
      'Simulates a cascading failure starting with a primary sensor spike, spreading to connected ' +
      'systems, escalating as a worker enters the danger zone, permits become conflicting, and ' +
      'culminating in a full emergency. Tests the knowledge graph cascade detection and compound ' +
      'risk calculation.',
    duration: 140,
    initialPermits: {
      'PTW-001': { status: 'active' },
      'PTW-004': { status: 'active' },
    },
    timeline: [
      // Phase 1: Primary sensor spike (0-30s)
      { time: 4,   type: 'sensor_change', target: 'GAS-001', value: 8,   description: 'CH4 beginning to rise in Zone A' },
      { time: 8,   type: 'sensor_change', target: 'GAS-001', value: 14,  description: 'CH4 rising faster than normal' },
      { time: 12,  type: 'sensor_change', target: 'GAS-001', value: 18,  description: 'CH4 approaching warning' },
      { time: 16,  type: 'sensor_change', target: 'GAS-001', value: 23,  description: 'CH4 EXCEEDS WARNING — primary sensor spike' },
      { time: 20,  type: 'sensor_change', target: 'GAS-001', value: 28,  description: 'CH4 rising rapidly' },
      { time: 24,  type: 'sensor_change', target: 'GAS-001', value: 32,  description: 'CH4 approaching critical zone' },
      { time: 28,  type: 'sensor_change', target: 'GAS-001', value: 35,  description: 'CH4 near critical — primary spike confirmed' },
      { time: 30,  type: 'sensor_change', target: 'GAS-001', value: 38,  description: 'PRIMARY SPIKE: CH4 at 38% LEL' },

      // Phase 2: Connected sensors rise (30-50s) — Cascade begins
      { time: 32,  type: 'sensor_change', target: 'GAS-002', value: 30,  description: 'CO beginning to respond in Zone A — cascade starting' },
      { time: 36,  type: 'sensor_change', target: 'GAS-002', value: 42,  description: 'CO rising — connected to CH4 leak source' },
      { time: 38,  type: 'sensor_change', target: 'GAS-003', value: 7,   description: 'H2S also responding' },
      { time: 40,  type: 'sensor_change', target: 'GAS-002', value: 55,  description: 'CO EXCEEDS WARNING — cascade confirmed' },
      { time: 42,  type: 'sensor_change', target: 'PRES-001', value: 10, description: 'Pressure rising — gas accumulating' },
      { time: 44,  type: 'sensor_change', target: 'GAS-004', value: 15,  description: 'CH4 rising in Zone B — cross-zone cascade' },
      { time: 46,  type: 'sensor_change', target: 'GAS-003', value: 11,  description: 'H2S exceeds warning in Zone A' },
      { time: 48,  type: 'sensor_change', target: 'PRES-001', value: 13, description: 'Pressure exceeds warning — valve failing' },
      { time: 50,  type: 'sensor_change', target: 'GAS-002', value: 85,  description: 'CO at dangerous level' },

      // Phase 3: Worker enters danger zone (50-70s)
      { time: 52,  type: 'sensor_change', target: 'GAS-004', value: 21,  description: 'CH4 in Zone B exceeds warning — cascade spreading' },
      { time: 56,  type: 'sensor_change', target: 'GAS-005', value: 35,  description: 'CO rising in Zone B' },
      { time: 60,  type: 'sensor_change', target: 'GAS-001', value: 42,  description: 'CH4 EXCEEDS CRITICAL in Zone A' },
      { time: 64,  type: 'worker_event',  target: 'W-008',   data: { currentZone: 'Z-A', ppeCompliant: false }, description: 'Helper Ravi Shankar enters Zone A — PPE non-compliant!' },
      { time: 66,  type: 'worker_event',  target: 'W-004',   data: { currentZone: 'Z-A' }, description: 'Fitter also enters Zone A from Zone B' },
      { time: 68,  type: 'sensor_change', target: 'GAS-002', value: 130, description: 'CO at very dangerous level in Zone A' },
      { time: 70,  type: 'sensor_change', target: 'PRES-001', value: 16, description: 'Pressure critical — imminent rupture' },

      // Phase 4: Permits become conflicting (70-90s)
      { time: 72,  type: 'permit_event',  target: 'PTW-004', data: { status: 'active', zoneId: 'Z-A', description: 'Cold work permit moved to Zone A due to Zone B conditions' }, description: 'SIMOPS: Cold work permit relocated to Zone A (already has Hot Work)' },
      { time: 74,  type: 'sensor_change', target: 'GAS-001', value: 48,  description: 'CH4 far beyond critical' },
      { time: 78,  type: 'sensor_change', target: 'GAS-005', value: 55,  description: 'CO exceeds warning in Zone B too' },
      { time: 80,  type: 'sensor_change', target: 'GAS-002', value: 180, description: 'CO approaching critical in Zone A' },
      { time: 84,  type: 'sensor_change', target: 'PRES-001', value: 18, description: 'PRESSURE CRITICAL — multiple system failure' },
      { time: 88,  type: 'sensor_change', target: 'GAS-001', value: 55,  description: 'Explosive atmosphere confirmed' },
      { time: 90,  type: 'sensor_change', target: 'GAS-002', value: 210, description: 'CO EXCEEDS CRITICAL in Zone A' },

      // Phase 5: Emergency (90-140s)
      { time: 92,  type: 'agent_override', target: 'PTW-001', data: { status: 'revoked', revokedBy: 'ShieldAI Emergency Agent' }, description: 'EMERGENCY: Hot work permit auto-revoked' },
      { time: 94,  type: 'agent_override', target: 'PTW-004', data: { status: 'revoked', revokedBy: 'ShieldAI Emergency Agent' }, description: 'EMERGENCY: Cold work permit auto-revoked' },
      { time: 96,  type: 'sensor_change', target: 'GAS-001', value: 60,  description: 'CH4 at 60% LEL — detonation risk' },
      { time: 100, type: 'sensor_change', target: 'TEMP-001', value: 1220, description: 'Temperature spike from gas accumulation' },
      { time: 104, type: 'sensor_change', target: 'GAS-004', value: 30,  description: 'Zone B CH4 still rising' },
      { time: 108, type: 'sensor_change', target: 'GAS-001', value: 65,  description: 'CH4 at maximum danger' },
      { time: 112, type: 'sensor_change', target: 'PRES-001', value: 20, description: 'Pressure beyond all limits' },
      { time: 120, type: 'sensor_change', target: 'GAS-001', value: 70,  description: 'Full cascade — multiple zones compromised' },
      { time: 130, type: 'sensor_change', target: 'GAS-001', value: 72,  description: 'Sustained emergency conditions' },
      { time: 140, type: 'sensor_change', target: 'GAS-001', value: 75,  description: 'Scenario ends — cascade failure complete' },
    ],
  },
};
