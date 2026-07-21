// ============================================================================
// ShieldAI — Knowledge Graph
// Defines relationships between plant entities: Equipment → Zone → Sensor →
// Risk → Permit → Worker. Includes cascade chains for failure propagation
// and regulatory requirements per equipment type.
// ============================================================================

/**
 * Equipment nodes with their zone, connected sensors, and cascade relationships.
 */
export const EQUIPMENT_GRAPH = {
  // ── Zone A: Coke Oven Battery ───────────────────────────────────────
  'coke-ovens': {
    id: 'coke-ovens',
    name: 'Coke Ovens',
    zoneId: 'Z-A',
    type: 'process',
    sensors: ['GAS-001', 'GAS-002', 'GAS-003', 'TEMP-001'],
    riskFactors: ['methane_buildup', 'co_exposure', 'thermal_runaway'],
    requiredPermits: ['Hot Work', 'Confined Space'],
    regulations: ['REG-FA-37', 'REG-DGMS-10-2014'],
  },
  'gas-collecting-main': {
    id: 'gas-collecting-main',
    name: 'Gas Collecting Main',
    zoneId: 'Z-A',
    type: 'piping',
    sensors: ['GAS-001', 'GAS-002', 'PRES-001'],
    riskFactors: ['gas_leak', 'overpressure', 'flange_failure'],
    requiredPermits: ['Hot Work', 'Cold Work'],
    regulations: ['REG-FA-37', 'REG-OISD-105-5.1', 'REG-OISD-105-5.2'],
  },
  'by-product-plant': {
    id: 'by-product-plant',
    name: 'By-Product Plant',
    zoneId: 'Z-A',
    type: 'process',
    sensors: ['GAS-003', 'TEMP-001'],
    riskFactors: ['h2s_release', 'tar_fire'],
    requiredPermits: ['Hot Work'],
    regulations: ['REG-FA-38', 'REG-DGMS-10-2014'],
  },

  // ── Zone B: Gas Mixing Station ──────────────────────────────────────
  'gas-holders': {
    id: 'gas-holders',
    name: 'Gas Holders',
    zoneId: 'Z-B',
    type: 'storage',
    sensors: ['GAS-004', 'GAS-005'],
    riskFactors: ['overpressure', 'explosion', 'gas_release'],
    requiredPermits: ['Hot Work', 'Cold Work'],
    regulations: ['REG-FA-37', 'REG-OISD-105-5.2'],
  },
  'mixing-valves': {
    id: 'mixing-valves',
    name: 'Mixing Valves',
    zoneId: 'Z-B',
    type: 'control',
    sensors: ['GAS-004', 'GAS-005', 'GAS-006'],
    riskFactors: ['valve_failure', 'pressure_excursion'],
    requiredPermits: ['Cold Work'],
    regulations: ['REG-OISD-105-5.5'],
  },

  // ── Zone C: Ammonia Recovery ────────────────────────────────────────
  'scrubbers': {
    id: 'scrubbers',
    name: 'Scrubbers',
    zoneId: 'Z-C',
    type: 'process',
    sensors: ['GAS-007', 'GAS-008', 'GAS-009'],
    riskFactors: ['ammonia_release', 'toxic_exposure', 'confined_space'],
    requiredPermits: ['Confined Space'],
    regulations: ['REG-FA-36', 'REG-OISD-105-6.3'],
  },
  'absorption-towers': {
    id: 'absorption-towers',
    name: 'Absorption Towers',
    zoneId: 'Z-C',
    type: 'process',
    sensors: ['GAS-007', 'GAS-009'],
    riskFactors: ['ammonia_release', 'column_failure'],
    requiredPermits: ['Confined Space', 'Cold Work'],
    regulations: ['REG-FA-36', 'REG-FA-41A'],
  },
  'storage-tanks': {
    id: 'storage-tanks',
    name: 'Storage Tanks',
    zoneId: 'Z-C',
    type: 'storage',
    sensors: ['GAS-007', 'GAS-008'],
    riskFactors: ['tank_overflow', 'toxic_release', 'level_failure'],
    requiredPermits: ['Confined Space'],
    regulations: ['REG-FA-41A', 'REG-OISD-206-4.2'],
  },

  // ── Zone D: Blast Furnace Area ──────────────────────────────────────
  'blast-furnace': {
    id: 'blast-furnace',
    name: 'Blast Furnace',
    zoneId: 'Z-D',
    type: 'process',
    sensors: ['TEMP-002', 'PRES-002', 'GAS-010'],
    riskFactors: ['thermal_runaway', 'co_poisoning', 'molten_metal', 'pressure_rupture'],
    requiredPermits: ['Hot Work', 'Electrical Isolation'],
    regulations: ['REG-FA-37', 'REG-DGMS-10-2014'],
  },
  'hot-metal-ladle': {
    id: 'hot-metal-ladle',
    name: 'Hot Metal Ladle',
    zoneId: 'Z-D',
    type: 'equipment',
    sensors: ['TEMP-002'],
    riskFactors: ['molten_metal_spill', 'ladle_failure', 'entrapped_gas'],
    requiredPermits: ['Hot Work'],
    regulations: ['REG-FA-37', 'REG-FA-38'],
  },
  'slag-pit': {
    id: 'slag-pit',
    name: 'Slag Pit',
    zoneId: 'Z-D',
    type: 'process',
    sensors: ['TEMP-002'],
    riskFactors: ['steam_explosion', 'thermal_burn'],
    requiredPermits: [],
    regulations: ['REG-FA-38'],
  },
};

/**
 * Cascade chains: defines how one failure can propagate to others.
 * Each chain describes the source event, intermediate steps, and final outcome.
 */
export const CASCADE_CHAINS = [
  {
    id: 'CASCADE-001',
    name: 'Pump Failure → Pressure Buildup → Relief Valve',
    source: { equipment: 'mixing-valves', trigger: 'valve_failure' },
    steps: [
      { equipment: 'gas-holders', effect: 'pressure_rise', sensorId: 'GAS-004', delayTicks: 5 },
      { equipment: 'gas-holders', effect: 'overpressure', sensorId: 'GAS-005', delayTicks: 10 },
    ],
    finalOutcome: 'Gas release to atmosphere if relief valve lifts',
    severity: 'critical',
  },
  {
    id: 'CASCADE-002',
    name: 'Gas Leak → Accumulation → Ignition (Hot Work)',
    source: { equipment: 'gas-collecting-main', trigger: 'gas_leak' },
    steps: [
      { equipment: 'coke-ovens', effect: 'ch4_rise', sensorId: 'GAS-001', delayTicks: 3 },
      { equipment: 'gas-collecting-main', effect: 'co_rise', sensorId: 'GAS-002', delayTicks: 5 },
      { equipment: 'gas-collecting-main', effect: 'pressure_rise', sensorId: 'PRES-001', delayTicks: 8 },
    ],
    finalOutcome: 'Explosion if ignition source (hot work) present',
    severity: 'fatal',
  },
  {
    id: 'CASCADE-003',
    name: 'Scrubber Failure → NH3 Release → Toxic Cloud',
    source: { equipment: 'scrubbers', trigger: 'column_failure' },
    steps: [
      { equipment: 'storage-tanks', effect: 'nh3_spike', sensorId: 'GAS-007', delayTicks: 4 },
      { equipment: 'scrubbers', effect: 'h2s_rise', sensorId: 'GAS-008', delayTicks: 6 },
      { equipment: 'absorption-towers', effect: 'co_rise', sensorId: 'GAS-009', delayTicks: 8 },
    ],
    finalOutcome: 'Toxic cloud threatening downwind zones',
    severity: 'fatal',
  },
  {
    id: 'CASCADE-004',
    name: 'Blast Furnace Overheat → CO Release → Worker Exposure',
    source: { equipment: 'blast-furnace', trigger: 'thermal_runaway' },
    steps: [
      { equipment: 'blast-furnace', effect: 'temp_spike', sensorId: 'TEMP-002', delayTicks: 2 },
      { equipment: 'blast-furnace', effect: 'pressure_rise', sensorId: 'PRES-002', delayTicks: 5 },
      { equipment: 'blast-furnace', effect: 'co_release', sensorId: 'GAS-010', delayTicks: 8 },
    ],
    finalOutcome: 'CO poisoning risk for Zone D workers',
    severity: 'fatal',
  },
  {
    id: 'CASCADE-005',
    name: 'Ladle Integrity Failure → Molten Metal Spill → Fire',
    source: { equipment: 'hot-metal-ladle', trigger: 'ladle_failure' },
    steps: [
      { equipment: 'hot-metal-ladle', effect: 'temp_anomaly', sensorId: 'TEMP-002', delayTicks: 1 },
      { equipment: 'blast-furnace', effect: 'pressure_surge', sensorId: 'PRES-002', delayTicks: 3 },
    ],
    finalOutcome: 'Molten steel spill, fire, potential crane damage',
    severity: 'fatal',
  },
];

/**
 * Regulatory requirements mapped by equipment type.
 * Links equipment categories to mandatory safety requirements.
 */
export const REGULATORY_REQUIREMENTS = {
  process: {
    inspectionInterval: '6 months',
    safetySystem: 'SIL-2 minimum',
    mandatoryPPE: ['Hard Hat', 'Safety Goggles', 'Safety Boots', 'Gas Monitor'],
    regulations: ['REG-FA-37', 'REG-FA-41A', 'REG-DGMS-10-2014'],
    requiresPermit: true,
  },
  storage: {
    inspectionInterval: '3 months',
    safetySystem: 'SIL-2 with redundant level instrumentation',
    mandatoryPPE: ['Hard Hat', 'Safety Goggles', 'Safety Boots', 'Gas Monitor', 'Respirator'],
    regulations: ['REG-FA-41A', 'REG-OISD-206-4.2'],
    requiresPermit: true,
  },
  piping: {
    inspectionInterval: '6 months (UT thickness testing)',
    safetySystem: 'Double-block-and-bleed isolation',
    mandatoryPPE: ['Hard Hat', 'Safety Goggles', 'Safety Boots', 'Gas Monitor'],
    regulations: ['REG-OISD-105-5.1', 'REG-OISD-105-7.1'],
    requiresPermit: true,
  },
  control: {
    inspectionInterval: '12 months',
    safetySystem: 'Redundant control with failsafe',
    mandatoryPPE: ['Hard Hat', 'Safety Boots'],
    regulations: ['REG-OISD-105-5.5'],
    requiresPermit: false,
  },
  equipment: {
    inspectionInterval: '3 months',
    safetySystem: 'Pre-use inspection mandatory',
    mandatoryPPE: ['Hard Hat', 'Safety Goggles', 'Safety Boots'],
    regulations: ['REG-FA-38'],
    requiresPermit: true,
  },
};

/**
 * Looks up all sensors connected to a piece of equipment.
 * @param {string} equipmentId
 * @returns {string[]} Sensor IDs
 */
export function getEquipmentSensors(equipmentId) {
  const equip = EQUIPMENT_GRAPH[equipmentId];
  return equip ? equip.sensors : [];
}

/**
 * Finds all cascade chains that could be triggered by a sensor alert.
 * @param {string} sensorId
 * @returns {object[]} Matching cascade chains
 */
export function findCascadeChainsBySensor(sensorId) {
  return CASCADE_CHAINS.filter((chain) =>
    chain.steps.some((step) => step.sensorId === sensorId),
  );
}

/**
 * Gets all equipment in a zone.
 * @param {string} zoneId
 * @returns {object[]}
 */
export function getZoneEquipment(zoneId) {
  return Object.values(EQUIPMENT_GRAPH).filter((e) => e.zoneId === zoneId);
}

/**
 * Finds regulatory requirements for a specific equipment.
 * @param {string} equipmentId
 * @returns {object|null}
 */
export function getEquipmentRegulations(equipmentId) {
  const equip = EQUIPMENT_GRAPH[equipmentId];
  if (!equip) return null;
  return REGULATORY_REQUIREMENTS[equip.type] || null;
}
