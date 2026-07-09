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
};
