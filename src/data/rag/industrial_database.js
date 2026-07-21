/**
 * Industrial Plant Database — Comprehensive Equipment, Personnel & Maintenance Records
 *
 * This module provides a realistic industrial facility database that the RAG engine
 * uses to give contextual risk assessments. When gas readings are medium but the
 * equipment is dangerously old, the AI should flag it as HIGH risk.
 *
 * Categories:
 *   - equipment_registry: All major equipment with age, condition, last inspection
 *   - maintenance_records: Inspection history, repairs, pending work orders
 *   - personnel_database: Employee details, training records, medical fitness
 *   - incident_history: Past incidents linked to specific equipment
 *   - zone_profiles: Zone-specific risk factors and environmental conditions
 *   - chemical_inventory: Chemicals on-site with quantities and SDS summaries
 *   - safety_systems: Fire suppression, gas detection, alarm systems with status
 *
 * @module industrial_database
 */

// ══════════════════════════════════════════════════════════════════════════════
// EQUIPMENT REGISTRY — Age, condition, maintenance status for every major asset
// ══════════════════════════════════════════════════════════════════════════════

export const EQUIPMENT_REGISTRY = [
  // ── Zone A: Coke Oven Battery ──────────────────────────────────────────
  {
    id: 'EQ-A001',
    name: 'Coke Oven Battery #1',
    zoneId: 'Z-A',
    type: 'Coke Oven',
    manufacturer: 'Bhilai Engineering Corporation',
    model: 'BEC-7M Standard',
    installDate: '2009-03-15',
    expectedLifespan: 20,
    ageYears: 17.3,
    condition: 'deteriorating',
    conditionScore: 0.42, // 0=destroyed, 1=brand new
    lastInspection: '2025-11-20',
    nextInspection: '2026-05-20',
    inspectionOverdue: true,
    lastMajorOverhaul: '2022-06-10',
    knownDefects: [
      'Refractory lining cracked in chambers 3, 7, 11 — silica bricks degrading',
      'Door seal leakage on push side — CO emissions above normal baseline',
      'Heating flue wall thinning detected (ultrasonic — 12% wall loss)',
    ],
    failureRisk: 'high',
    criticality: 'critical', // critical/high/medium/low
    sensorIds: ['GAS-001', 'GAS-002', 'GAS-003', 'TEMP-001', 'PRES-001'],
    relatedIncidents: ['INC-2024-003', 'INC-2023-011'],
    sparePartsAvailable: false,
    notes: 'Battery approaching end-of-life. Capital replacement approved for 2027 but delayed due to budget constraints. Running on extended life with monthly patch repairs.',
  },
  {
    id: 'EQ-A002',
    name: 'Gas Collecting Main',
    zoneId: 'Z-A',
    type: 'Gas Pipeline',
    manufacturer: 'Rashtriya Ispat Nigam Ltd',
    model: 'GCM-450 SS',
    installDate: '2012-08-22',
    expectedLifespan: 25,
    ageYears: 13.9,
    condition: 'fair',
    conditionScore: 0.58,
    lastInspection: '2026-02-14',
    nextInspection: '2026-08-14',
    inspectionOverdue: false,
    lastMajorOverhaul: '2024-01-20',
    knownDefects: [
      'Tar deposition at bend sections — flow restriction 8%',
      'Expansion joint J-3 showing fatigue cracks (monitored quarterly)',
    ],
    failureRisk: 'medium',
    criticality: 'critical',
    sensorIds: ['PRES-001', 'GAS-001'],
    relatedIncidents: ['INC-2023-005'],
    sparePartsAvailable: true,
    notes: 'Tar cleaning schedule accelerated to monthly. J-3 expansion joint replacement scheduled for next planned shutdown.',
  },
  {
    id: 'EQ-A003',
    name: 'By-Product Recovery Plant',
    zoneId: 'Z-A',
    type: 'Chemical Processing',
    manufacturer: 'Larsen & Toubro',
    model: 'L&T BRP-200',
    installDate: '2014-11-05',
    expectedLifespan: 30,
    ageYears: 11.7,
    condition: 'good',
    conditionScore: 0.72,
    lastInspection: '2026-04-10',
    nextInspection: '2026-10-10',
    inspectionOverdue: false,
    lastMajorOverhaul: '2025-03-15',
    knownDefects: [
      'Minor corrosion on ammonia scrubber inlet pipe (surface only)',
    ],
    failureRisk: 'low',
    criticality: 'high',
    sensorIds: ['GAS-003'],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'Well-maintained. Recent overhaul replaced all gaskets and valve seats.',
  },

  // ── Zone B: Gas Mixing Station ─────────────────────────────────────────
  {
    id: 'EQ-B001',
    name: 'Gas Holder #1 (Coke Oven Gas)',
    zoneId: 'Z-B',
    type: 'Gas Storage',
    manufacturer: 'MAN Turbo India',
    model: 'MAN-GH-5000',
    installDate: '2006-07-18',
    expectedLifespan: 30,
    ageYears: 20.0,
    condition: 'poor',
    conditionScore: 0.35,
    lastInspection: '2025-09-05',
    nextInspection: '2026-03-05',
    inspectionOverdue: true,
    lastMajorOverhaul: '2020-12-01',
    knownDefects: [
      'Piston seal leakage — fugitive methane emissions detected at base',
      'Guide rail corrosion on north side — 25% section loss',
      'Water seal level fluctuation indicating possible seal degradation',
      'Foundation settlement 15mm on NE corner (surveyed 2025-Q3)',
    ],
    failureRisk: 'critical',
    criticality: 'critical',
    sensorIds: ['GAS-004', 'GAS-005', 'PRES-002'],
    relatedIncidents: ['INC-2024-001', 'INC-2022-008'],
    sparePartsAvailable: false,
    notes: 'DANGEROUS: 20-year-old gas holder with multiple critical defects. Inspection overdue by 4+ months. Any sensor reading above 50% should be treated as EMERGENCY due to equipment degradation. Replacement gas holder approved but 18 months from commissioning.',
  },
  {
    id: 'EQ-B002',
    name: 'Gas Mixing Valve Assembly',
    zoneId: 'Z-B',
    type: 'Control Valve',
    manufacturer: 'Fisher Controls (Emerson)',
    model: 'Fisher D4 Rotary',
    installDate: '2018-03-10',
    expectedLifespan: 15,
    ageYears: 8.3,
    condition: 'good',
    conditionScore: 0.75,
    lastInspection: '2026-05-22',
    nextInspection: '2026-11-22',
    inspectionOverdue: false,
    lastMajorOverhaul: '2025-08-10',
    knownDefects: [],
    failureRisk: 'low',
    criticality: 'high',
    sensorIds: ['GAS-005', 'PRES-002'],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'Recently overhauled, actuator and positioner replaced.',
  },
  {
    id: 'EQ-B003',
    name: 'Flow Control System B',
    zoneId: 'Z-B',
    type: 'Instrumentation',
    manufacturer: 'Yokogawa India',
    model: 'CENTUM VP DCS',
    installDate: '2016-01-20',
    expectedLifespan: 20,
    ageYears: 10.5,
    condition: 'good',
    conditionScore: 0.70,
    lastInspection: '2026-06-01',
    nextInspection: '2026-12-01',
    inspectionOverdue: false,
    lastMajorOverhaul: 'N/A',
    knownDefects: [
      'Intermittent communication fault on FIC-B204 (transient)',
    ],
    failureRisk: 'low',
    criticality: 'medium',
    sensorIds: [],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'Software updated to latest firmware 2026-Q1.',
  },

  // ── Zone C: Ammonia Recovery ────────────────────────────────────────────
  {
    id: 'EQ-C001',
    name: 'Ammonia Absorption Tower #1',
    zoneId: 'Z-C',
    type: 'Absorption Column',
    manufacturer: 'Thermax Limited',
    model: 'Thermax AAT-300',
    installDate: '2011-04-25',
    expectedLifespan: 25,
    ageYears: 15.2,
    condition: 'deteriorating',
    conditionScore: 0.45,
    lastInspection: '2025-12-10',
    nextInspection: '2026-06-10',
    inspectionOverdue: true,
    lastMajorOverhaul: '2023-02-18',
    knownDefects: [
      'Packing material degradation — efficiency dropped from 95% to 82%',
      'Liquid distributor nozzles partially clogged (3 of 12)',
      'Bottom drain valve corroded — manual isolation only',
      'Trace NH3 leak at flange joint FL-C014 (monitored weekly)',
    ],
    failureRisk: 'high',
    criticality: 'critical',
    sensorIds: ['GAS-006', 'GAS-007'],
    relatedIncidents: ['INC-2024-006'],
    sparePartsAvailable: false,
    notes: 'Ammonia release risk: This equipment handles toxic NH3 at 15.2 years age with deteriorating internals. Any NH3 reading above 25 ppm should be treated as CRITICAL given the known flange leak and distributor clogging. Packing replacement requires 2-week shutdown — not yet scheduled.',
  },
  {
    id: 'EQ-C002',
    name: 'Ammonia Storage Tank T-301',
    zoneId: 'Z-C',
    type: 'Pressure Vessel',
    manufacturer: 'Godrej & Boyce',
    model: 'G&B PV-50',
    installDate: '2013-09-12',
    expectedLifespan: 30,
    ageYears: 12.8,
    condition: 'fair',
    conditionScore: 0.60,
    lastInspection: '2026-03-28',
    nextInspection: '2026-09-28',
    inspectionOverdue: false,
    lastMajorOverhaul: '2024-07-05',
    knownDefects: [
      'Minor surface pitting on bottom shell (within code limits)',
      'PRV-301 relief valve tested — set pressure drift +3% (recalibrated)',
    ],
    failureRisk: 'medium',
    criticality: 'critical',
    sensorIds: ['GAS-007', 'PRES-003'],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'PESO-registered pressure vessel. Statutory inspection current. Bottom pitting monitored — next UT thickness survey in Oct 2026.',
  },

  // ── Zone D: Blast Furnace Area ─────────────────────────────────────────
  {
    id: 'EQ-D001',
    name: 'Blast Furnace #3',
    zoneId: 'Z-D',
    type: 'Blast Furnace',
    manufacturer: 'MECON / SAIL',
    model: 'MECON BF-III 1200m³',
    installDate: '2004-12-01',
    expectedLifespan: 20,
    ageYears: 21.6,
    condition: 'critical',
    conditionScore: 0.25,
    lastInspection: '2025-08-15',
    nextInspection: '2026-02-15',
    inspectionOverdue: true,
    lastMajorOverhaul: '2019-04-20',
    knownDefects: [
      'Hearth sidewall refractory erosion — residual thickness 45% of original',
      'Cooling stave #14-#18 showing high heat load (stave temp > 350°C)',
      'Tuyere #7 replaced emergency in 2025-Q1 due to burnthrough',
      'Cast iron runner cracking at torpedo ladle connection',
      'BF gas cleaning system cyclone clogging (requires frequent clearing)',
    ],
    failureRisk: 'critical',
    criticality: 'critical',
    sensorIds: ['TEMP-002', 'PRES-004', 'GAS-008', 'GAS-009'],
    relatedIncidents: ['INC-2025-001', 'INC-2024-009', 'INC-2023-015'],
    sparePartsAvailable: false,
    notes: 'EXTREME RISK: Blast Furnace #3 is 21.6 years old, past design life. Multiple critical defects including hearth erosion and cooling stave failures. ANY temperature excursion should be treated as EMERGENCY. Major reline scheduled for 2027-Q2 but furnace must survive until then. Running at reduced blast rate (85% capacity) as mitigation.',
  },
  {
    id: 'EQ-D002',
    name: 'Hot Metal Ladle Transfer Car',
    zoneId: 'Z-D',
    type: 'Material Handling',
    manufacturer: 'Elecon Engineering',
    model: 'Elecon HML-150T',
    installDate: '2017-06-30',
    expectedLifespan: 25,
    ageYears: 9.0,
    condition: 'good',
    conditionScore: 0.68,
    lastInspection: '2026-04-18',
    nextInspection: '2026-10-18',
    inspectionOverdue: false,
    lastMajorOverhaul: '2025-12-01',
    knownDefects: [
      'Rail wheel flange wear at 60% life (within limits)',
    ],
    failureRisk: 'low',
    criticality: 'high',
    sensorIds: ['TEMP-002'],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'Routine maintenance current.',
  },

  // ── Zone E: Maintenance Workshop ───────────────────────────────────────
  {
    id: 'EQ-E001',
    name: 'Overhead Crane 20T',
    zoneId: 'Z-E',
    type: 'Lifting Equipment',
    manufacturer: 'ElectroMech India',
    model: 'EM EOT-20',
    installDate: '2015-02-14',
    expectedLifespan: 30,
    ageYears: 11.4,
    condition: 'good',
    conditionScore: 0.73,
    lastInspection: '2026-06-05',
    nextInspection: '2026-12-05',
    inspectionOverdue: false,
    lastMajorOverhaul: '2025-06-20',
    knownDefects: [],
    failureRisk: 'low',
    criticality: 'medium',
    sensorIds: [],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'Statutory test (load test) current. Third-party inspected by DGFASLI-approved agency.',
  },
  {
    id: 'EQ-E002',
    name: 'Welding Station Set (6 units)',
    zoneId: 'Z-E',
    type: 'Welding Equipment',
    manufacturer: 'ESAB India',
    model: 'ESAB Warrior 400i',
    installDate: '2020-10-10',
    expectedLifespan: 15,
    ageYears: 5.8,
    condition: 'good',
    conditionScore: 0.82,
    lastInspection: '2026-05-15',
    nextInspection: '2026-11-15',
    inspectionOverdue: false,
    lastMajorOverhaul: 'N/A',
    knownDefects: [
      'Unit #4 intermittent arc instability (electrical investigation pending)',
    ],
    failureRisk: 'low',
    criticality: 'low',
    sensorIds: [],
    relatedIncidents: [],
    sparePartsAvailable: true,
    notes: 'Regular PM schedule maintained.',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE RECORDS — Inspection history and pending work orders
// ══════════════════════════════════════════════════════════════════════════════

export const MAINTENANCE_RECORDS = [
  {
    id: 'MR-2026-001',
    equipmentId: 'EQ-A001',
    type: 'inspection',
    date: '2025-11-20',
    inspector: 'M. Subramaniam (Competent Person)',
    agency: 'In-house NDT Team',
    findings: 'Refractory lining shows 30% degradation in chambers 3, 7, 11. Door seals on push side have gaps of 8-12mm causing fugitive CO emissions. Heating flue wall UT scan shows 12% loss. Recommended: Emergency patching within 30 days, full reline within 18 months.',
    actionTaken: 'Emergency silica brick patching completed for chambers 3 and 7. Chamber 11 deferred due to production pressure. Door seal replacement ordered.',
    status: 'partially_completed',
    severity: 'critical',
  },
  {
    id: 'MR-2026-002',
    equipmentId: 'EQ-B001',
    type: 'inspection',
    date: '2025-09-05',
    inspector: 'K. Raghunath (Third-party)',
    agency: 'Bureau Veritas India',
    findings: 'Gas holder piston seal leaking methane at base — detected by portable LEL meter at 15% LEL. Guide rails on north side have 25% section loss due to corrosion. Water seal level fluctuating ±200mm indicating possible internal seal degradation. Foundation NE corner settlement at 15mm.',
    actionTaken: 'Seal grease replenishment performed. Corrosion areas treated with epoxy coating. Settlement monitoring stakes installed. Recommended: Full shutdown inspection within 6 months — NOT YET SCHEDULED.',
    status: 'overdue',
    severity: 'critical',
  },
  {
    id: 'MR-2026-003',
    equipmentId: 'EQ-D001',
    type: 'inspection',
    date: '2025-08-15',
    inspector: 'Dr. A. Mukherjee (Refractory Specialist)',
    agency: 'RDCIS/SAIL + External consultant',
    findings: 'Hearth sidewall residual thickness at 45% — campaign life approaching limit. Cooling staves 14-18 running 50°C above design temperature. Tuyere burnthrough history indicates localized hot spots. Recommend reducing blast rate to 85% and planning emergency reline if hearth temp exceeds 450°C.',
    actionTaken: 'Blast rate reduced to 85%. Additional temperature monitoring installed on staves 14-18. Reline budget sanctioned for 2027-Q2.',
    status: 'in_progress',
    severity: 'critical',
  },
  {
    id: 'MR-2026-004',
    equipmentId: 'EQ-C001',
    type: 'inspection',
    date: '2025-12-10',
    inspector: 'S. Natarajan',
    agency: 'In-house Chemical Engineering',
    findings: 'Absorption efficiency dropped from 95% to 82% due to packing degradation. 3 of 12 distributor nozzles clogged. Bottom drain valve corroded beyond repair — isolation requires manual valve upstream. NH3 leak at FL-C014 flange — tightened to 75 Nm but leak persists at 3 ppm.',
    actionTaken: 'Nozzles cleaned (partial success). Drain valve added to replacement list. Flange leak monitored weekly — LDAR program.',
    status: 'partially_completed',
    severity: 'high',
  },
  {
    id: 'MR-2026-005',
    equipmentId: 'EQ-A002',
    type: 'planned_maintenance',
    date: '2026-08-14',
    inspector: 'Scheduled',
    agency: 'In-house',
    findings: 'UPCOMING: Semi-annual inspection of Gas Collecting Main. Focus areas: tar deposition levels, expansion joint J-3 fatigue assessment, flange bolt torque verification.',
    actionTaken: 'Pre-shutdown materials procured. Scaffolding plan approved.',
    status: 'scheduled',
    severity: 'medium',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// PENDING WORK ORDERS — Open maintenance requests ranked by priority
// ══════════════════════════════════════════════════════════════════════════════

export const PENDING_WORK_ORDERS = [
  {
    id: 'WO-2026-101',
    equipmentId: 'EQ-B001',
    priority: 'P1-Critical',
    description: 'Full shutdown inspection of Gas Holder #1 — overdue by 4 months. Piston seal replacement, guide rail structural assessment, foundation survey.',
    requestedDate: '2026-03-05',
    estimatedDuration: '14 days',
    estimatedCost: '₹45,00,000',
    status: 'awaiting_shutdown_window',
    riskIfDeferred: 'Catastrophic methane release — potential explosion if seal fails during high-pressure operation. Gas holder contains 5000m³ of coke oven gas at any time.',
  },
  {
    id: 'WO-2026-102',
    equipmentId: 'EQ-A001',
    priority: 'P1-Critical',
    description: 'Chamber 11 refractory patching — deferred from November 2025. Hot spot detected, risk of CO breakout.',
    requestedDate: '2025-12-15',
    estimatedDuration: '5 days',
    estimatedCost: '₹12,00,000',
    status: 'awaiting_shutdown_window',
    riskIfDeferred: 'Uncontrolled CO release through cracked refractory into oven surroundings. Direct risk to Zone A workers.',
  },
  {
    id: 'WO-2026-103',
    equipmentId: 'EQ-C001',
    priority: 'P2-High',
    description: 'Ammonia tower packing replacement and distributor nozzle overhaul. Requires 2-week shutdown.',
    requestedDate: '2026-01-20',
    estimatedDuration: '14 days',
    estimatedCost: '₹28,00,000',
    status: 'approved_not_scheduled',
    riskIfDeferred: 'Increased NH3 slip to atmosphere. Worker exposure risk in Zone C. Potential environmental violation under Air (Prevention and Control of Pollution) Act.',
  },
  {
    id: 'WO-2026-104',
    equipmentId: 'EQ-D001',
    priority: 'P1-Critical',
    description: 'Blast Furnace #3 emergency reline preparation — hearth sidewall at 45% residual thickness.',
    requestedDate: '2025-09-01',
    estimatedDuration: '90 days (full reline)',
    estimatedCost: '₹150,00,00,000',
    status: 'budget_approved_2027',
    riskIfDeferred: 'Hearth breakout — molten iron release. Catastrophic consequences. Current mitigation: reduced blast rate.',
  },
  {
    id: 'WO-2026-105',
    equipmentId: 'EQ-C001',
    priority: 'P2-High',
    description: 'Replace corroded bottom drain valve on Ammonia Tower #1. Manual isolation only available.',
    requestedDate: '2026-02-10',
    estimatedDuration: '2 days',
    estimatedCost: '₹1,50,000',
    status: 'parts_on_order',
    riskIfDeferred: 'Unable to drain tower safely in emergency. Delayed emergency response capability.',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// PERSONNEL DATABASE — Employee records, training, medical fitness
// ══════════════════════════════════════════════════════════════════════════════

export const PERSONNEL_DATABASE = [
  {
    id: 'EMP-001',
    name: 'Vikram Singh',
    workerId: 'W-001',
    department: 'Coke Ovens',
    designation: 'Senior Welder',
    joinDate: '2015-06-10',
    yearsExperience: 11.1,
    age: 38,
    medicalFitness: 'Fit',
    lastMedical: '2026-04-15',
    nextMedical: '2027-04-15',
    bloodGroup: 'B+',
    emergencyContact: 'Suman Singh (Wife) — +91-9876543210',
    safetyTraining: [
      { course: 'Gas Cutting & Welding Safety', date: '2026-01-10', validUntil: '2027-01-10', provider: 'NITTTR Bhopal' },
      { course: 'Hot Work Permit Procedures', date: '2025-12-15', validUntil: '2026-12-15', provider: 'In-house' },
      { course: 'Fire Fighting (Intermediate)', date: '2025-06-20', validUntil: '2026-06-20', expired: true, provider: 'State Fire Service' },
      { course: 'First Aid & CPR', date: '2026-03-01', validUntil: '2028-03-01', provider: 'Red Cross India' },
    ],
    violationHistory: [
      { date: '2025-08-12', type: 'PPE', description: 'Found without welding gloves during gas cutting operation', action: 'Written warning + retraining' },
    ],
    restrictedZones: [], // Can access all zones
    shiftPattern: 'A-shift (6AM-2PM)',
  },
  {
    id: 'EMP-002',
    name: 'Ajay Patel',
    workerId: 'W-002',
    department: 'Quality & Inspection',
    designation: 'NDT Inspector Level-II',
    joinDate: '2018-02-01',
    yearsExperience: 8.5,
    age: 34,
    medicalFitness: 'Fit',
    lastMedical: '2026-05-20',
    nextMedical: '2027-05-20',
    bloodGroup: 'O+',
    emergencyContact: 'Meena Patel (Wife) — +91-9876543211',
    safetyTraining: [
      { course: 'Confined Space Entry', date: '2025-11-20', validUntil: '2026-11-20', provider: 'DGFASLI' },
      { course: 'NDT Level-II Certification', date: '2024-03-10', validUntil: '2027-03-10', provider: 'ISNT Mumbai' },
      { course: 'Chemical Hazard Awareness', date: '2026-02-05', validUntil: '2028-02-05', provider: 'In-house' },
      { course: 'SCBA Usage', date: '2025-08-15', validUntil: '2026-08-15', provider: 'Drager India' },
    ],
    violationHistory: [],
    restrictedZones: [],
    shiftPattern: 'A-shift (6AM-2PM)',
  },
  {
    id: 'EMP-003',
    name: 'Pradeep Kumar',
    workerId: 'W-003',
    department: 'Electrical',
    designation: 'Electrical Technician (HV)',
    joinDate: '2019-07-15',
    yearsExperience: 7.0,
    age: 31,
    medicalFitness: 'Fit with Restrictions',
    lastMedical: '2026-01-10',
    nextMedical: '2026-07-10',
    medicalNotes: 'Mild color vision deficiency (deuteranomaly). Restricted from sole reliance on color-coded alarm systems.',
    bloodGroup: 'A+',
    emergencyContact: 'Ramesh Kumar (Father) — +91-9876543212',
    safetyTraining: [
      { course: 'Electrical Competency (HV)', date: '2025-02-28', validUntil: '2027-02-28', provider: 'CPRI Bangalore' },
      { course: 'LOTO Authorized Person', date: '2025-09-15', validUntil: '2026-09-15', provider: 'In-house' },
      { course: 'Arc Flash Safety', date: '2025-05-10', validUntil: '2027-05-10', provider: 'Schneider Electric India' },
    ],
    violationHistory: [],
    restrictedZones: [],
    shiftPattern: 'A-shift (6AM-2PM)',
  },
  {
    id: 'EMP-004',
    name: 'Deepak Sharma',
    workerId: 'W-004',
    department: 'Mechanical Maintenance',
    designation: 'Fitter Grade-I',
    joinDate: '2012-03-20',
    yearsExperience: 14.3,
    age: 42,
    medicalFitness: 'Fit',
    lastMedical: '2025-11-05',
    nextMedical: '2026-11-05',
    bloodGroup: 'AB+',
    emergencyContact: 'Anita Sharma (Wife) — +91-9876543213',
    safetyTraining: [
      { course: 'Rigging & Slinging', date: '2025-07-20', validUntil: '2026-07-20', provider: 'Crane Safety India' },
      { course: 'Confined Space Rescue', date: '2025-04-10', validUntil: '2026-04-10', expired: true, provider: 'DGFASLI' },
      { course: 'Gas Free Certification', date: '2026-01-15', validUntil: '2027-01-15', provider: 'In-house' },
    ],
    violationHistory: [
      { date: '2024-12-03', type: 'Procedure', description: 'Entered confined space without completing gas test — near miss reported', action: 'Suspended 3 days + mandatory retraining' },
    ],
    restrictedZones: ['Z-C'], // Restricted from ammonia area due to lack of current SCBA training
    shiftPattern: 'B-shift (2PM-10PM)',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CHEMICAL INVENTORY — On-site chemicals with quantities and hazard data
// ══════════════════════════════════════════════════════════════════════════════

export const CHEMICAL_INVENTORY = [
  {
    id: 'CHEM-001',
    name: 'Coke Oven Gas (COG)',
    location: 'Zone A → Zone B pipeline',
    quantity: '5000 m³ (gas holder) + continuous production',
    composition: 'H2 55%, CH4 25%, CO 7%, CO2 2%, N2 5%, C2H4 3%, H2S 0.5%, NH3 0.3%',
    hazards: ['Extremely flammable (H220)', 'Toxic - CO and H2S components', 'Asphyxiant - displaces oxygen'],
    pel: 'CO: 50 ppm TWA, H2S: 10 ppm TWA',
    idlh: 'CO: 1200 ppm, H2S: 100 ppm',
    lel: 'CH4: 5% vol, H2: 4% vol',
    fireRating: 'Class I Division 1 Gas',
    sdsNumber: 'SDS-COG-001',
    lastInventory: '2026-07-01',
  },
  {
    id: 'CHEM-002',
    name: 'Anhydrous Ammonia (NH3)',
    location: 'Zone C - Storage Tank T-301 and process piping',
    quantity: '25 tonnes (storage) + process hold-up',
    composition: 'NH3 99.5% min',
    hazards: ['Toxic by inhalation (H331)', 'Corrosive to skin/eyes (H314)', 'Dangerous for environment (H400)'],
    pel: '50 ppm TWA (OSHA), 25 ppm TWA (ACGIH TLV)',
    idlh: '300 ppm',
    lel: '15% vol',
    fireRating: 'Slightly flammable at high concentration',
    sdsNumber: 'SDS-NH3-002',
    lastInventory: '2026-07-05',
    psmThreshold: 'Above 10,000 lbs — OSHA PSM applies',
  },
  {
    id: 'CHEM-003',
    name: 'Blast Furnace Gas (BFG)',
    location: 'Zone D - BF top gas + gas cleaning system',
    quantity: 'Continuous production ~2400 Nm³/tonne hot metal',
    composition: 'CO 22%, CO2 22%, N2 53%, H2 3%',
    hazards: ['Toxic - high CO content (H331)', 'Asphyxiant', 'Slightly flammable'],
    pel: 'CO: 50 ppm TWA',
    idlh: 'CO: 1200 ppm',
    lel: 'CO: 12.5% vol',
    fireRating: 'Class I gas due to CO',
    sdsNumber: 'SDS-BFG-003',
    lastInventory: '2026-07-01',
  },
  {
    id: 'CHEM-004',
    name: 'Coal Tar (By-product)',
    location: 'Zone A - By-product plant decanter, tar storage',
    quantity: '200 tonnes (storage)',
    composition: 'Complex PAH mixture: naphthalene 10%, phenanthrene 5%, anthracene 2%, benzopyrene 0.1%',
    hazards: ['Carcinogenic (H350)', 'Toxic if inhaled (H332)', 'Harmful to aquatic life (H411)'],
    pel: '0.2 mg/m³ (OSHA - coal tar pitch volatiles)',
    idlh: '80 mg/m³',
    lel: 'N/A (liquid)',
    fireRating: 'Combustible liquid — Flash point 80°C',
    sdsNumber: 'SDS-TAR-004',
    lastInventory: '2026-06-28',
  },
  {
    id: 'CHEM-005',
    name: 'Sulfuric Acid (Process)',
    location: 'Zone C - Ammonium sulphate section',
    quantity: '15 tonnes',
    composition: 'H2SO4 98% conc.',
    hazards: ['Corrosive (H314)', 'Causes severe burns', 'Reacts violently with water'],
    pel: '1 mg/m³ TWA',
    idlh: '15 mg/m³',
    lel: 'N/A',
    fireRating: 'Non-flammable but oxidizer',
    sdsNumber: 'SDS-H2SO4-005',
    lastInventory: '2026-07-02',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY SYSTEMS STATUS — Fire suppression, detection, alarm systems
// ══════════════════════════════════════════════════════════════════════════════

export const SAFETY_SYSTEMS = [
  {
    id: 'SS-001',
    name: 'Fire Water System',
    type: 'fire_suppression',
    zones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E'],
    status: 'operational',
    lastTest: '2026-06-15',
    capacity: '2500 GPM at 150 psi',
    issues: ['Hydrant H-12 (Zone B) leaking at bonnet — repair scheduled', 'Fire water tank level at 78% (should be 100%)'],
    conditionScore: 0.75,
  },
  {
    id: 'SS-002',
    name: 'Fixed Gas Detection System',
    type: 'gas_detection',
    zones: ['Z-A', 'Z-B', 'Z-C'],
    status: 'degraded',
    lastTest: '2026-05-01',
    detectorCount: 24,
    issueCount: 3,
    issues: [
      'Detector GD-A07 (Zone A) — calibration overdue by 45 days',
      'Detector GD-B03 (Zone B) — intermittent fault, false alarm history',
      'Detector GD-C11 (Zone C) — sensor element approaching end-of-life (18 months old, rated for 24 months)',
    ],
    conditionScore: 0.65,
  },
  {
    id: 'SS-003',
    name: 'Plant Emergency Alarm System',
    type: 'alarm',
    zones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E', 'Z-F'],
    status: 'operational',
    lastTest: '2026-06-30',
    coverage: '100% — all zones covered with audible + visual alarms',
    issues: ['Strobe light in Zone D-North non-functional — replacement ordered'],
    conditionScore: 0.90,
  },
  {
    id: 'SS-004',
    name: 'Emergency Shower & Eyewash Stations',
    type: 'decontamination',
    zones: ['Z-A', 'Z-C', 'Z-E'],
    status: 'partially_operational',
    lastTest: '2026-04-20',
    stationCount: 8,
    issues: [
      'Station ES-C02 (Zone C) — tepid water system failed, delivering cold water only',
      'Station ES-A03 (Zone A) — flow rate below ANSI Z358.1 minimum (15 GPM)',
    ],
    conditionScore: 0.70,
  },
  {
    id: 'SS-005',
    name: 'SCBA Rescue Equipment Cache',
    type: 'rescue',
    zones: ['Z-E', 'Z-F'],
    status: 'operational',
    lastTest: '2026-06-10',
    equipmentList: '12x SCBA sets, 4x escape respirators, 2x gas rescue kits, 1x confined space tripod',
    issues: ['2 SCBA cylinders due for hydrostatic testing in August 2026'],
    conditionScore: 0.85,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// PAST INCIDENT DATABASE — Historical incidents linked to equipment
// ══════════════════════════════════════════════════════════════════════════════

export const INCIDENT_DATABASE = [
  {
    id: 'INC-2025-001',
    date: '2025-01-22',
    zone: 'Z-D',
    equipment: 'EQ-D001',
    type: 'Tuyere Burnthrough',
    severity: 'serious',
    description: 'Blast Furnace #3 tuyere #7 burnthrough resulted in water ingress into the furnace. Emergency blowdown initiated. No injuries but 48-hour production loss.',
    rootCause: 'Localized refractory erosion behind tuyere created hot spot. Inadequate cooling water flow due to partially blocked pipe.',
    corrective: 'Tuyere replaced. Cooling system flushed. Enhanced thermal monitoring installed on staves 14-18.',
    injuries: 0,
    nearMiss: false,
    productionLossHours: 48,
    cost: '₹2,50,00,000',
  },
  {
    id: 'INC-2024-009',
    date: '2024-08-05',
    zone: 'Z-D',
    equipment: 'EQ-D001',
    type: 'Slag Pit Explosion',
    severity: 'major',
    description: 'Water-granulated slag exploded in pit due to residual moisture contact with hot slag. Two workers suffered minor burn injuries. Slag pit wall damaged.',
    rootCause: 'Rain water accumulation in slag pit not pumped out before casting. Inadequate pre-cast inspection.',
    corrective: 'Mandatory pre-cast inspection procedure implemented. Automatic water level sensor installed in slag pit.',
    injuries: 2,
    nearMiss: false,
    productionLossHours: 24,
    cost: '₹85,00,000',
  },
  {
    id: 'INC-2024-006',
    date: '2024-05-12',
    zone: 'Z-C',
    equipment: 'EQ-C001',
    type: 'NH3 Release',
    severity: 'serious',
    description: 'Ammonia leak from flange FL-C014 on absorption tower during startup after maintenance. NH3 concentration reached 80 ppm at ground level. Zone C evacuated for 3 hours. Two workers treated for mild irritation.',
    rootCause: 'Flange gasket not replaced during maintenance — old gasket reused against procedure. Bolting torque inconsistent.',
    corrective: 'Gasket replaced. Bolting procedure reinforced. Leak detection added to startup checklist. Weekly LDAR monitoring of FL-C014.',
    injuries: 2,
    nearMiss: false,
    productionLossHours: 6,
    cost: '₹15,00,000',
  },
  {
    id: 'INC-2024-003',
    date: '2024-02-18',
    zone: 'Z-A',
    equipment: 'EQ-A001',
    type: 'CO Exposure',
    severity: 'serious',
    description: 'CO alarm triggered at 180 ppm in coke oven battery area during pushing operation. Three workers evacuated with symptoms of CO exposure (headache, dizziness). Caused by door seal failure on oven #7.',
    rootCause: 'Door seal degradation not detected during routine visual inspection. Seal material had hardened due to thermal cycling.',
    corrective: 'All door seals inspected and 8 replaced. Seal material upgraded to high-temp silicone. CO monitor alarm setpoint lowered to 100 ppm.',
    injuries: 3,
    nearMiss: false,
    productionLossHours: 8,
    cost: '₹22,00,000',
  },
  {
    id: 'INC-2024-001',
    date: '2024-01-05',
    zone: 'Z-B',
    equipment: 'EQ-B001',
    type: 'Gas Holder Piston Jam',
    severity: 'major',
    description: 'Gas Holder #1 piston jammed during descent due to guide rail corrosion debris. Gas pressure spiked to 1.8x design. Emergency venting to flare initiated. No injuries.',
    rootCause: 'Corroded guide rail debris (scale and rust) accumulated on piston travel path. Maintenance deferral of guide rail treatment.',
    corrective: 'Guide rail cleaned and epoxy-coated. Piston seal inspected and re-greased. Operating pressure limit reduced by 10% as precaution.',
    injuries: 0,
    nearMiss: true,
    productionLossHours: 12,
    cost: '₹35,00,000',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CONVERT TO RAG DOCUMENTS — Format everything for the RAGEngine
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert the industrial database into RAG-compatible documents.
 * Each equipment, maintenance record, employee, chemical, etc. becomes a
 * searchable document in the knowledge base.
 */
export function generateIndustrialRAGDocuments() {
  const docs = [];

  // Equipment documents
  for (const eq of EQUIPMENT_REGISTRY) {
    docs.push({
      id: `rag-eq-${eq.id}`,
      category: 'equipment',
      title: `Equipment: ${eq.name} (${eq.id})`,
      text: `${eq.name} is a ${eq.type} located in ${eq.zoneId}. ` +
        `Manufactured by ${eq.manufacturer} (model: ${eq.model}), installed on ${eq.installDate}. ` +
        `Age: ${eq.ageYears} years (expected lifespan: ${eq.expectedLifespan} years). ` +
        `Condition: ${eq.condition} (score: ${eq.conditionScore}/1.0). ` +
        `Failure risk: ${eq.failureRisk}. Criticality: ${eq.criticality}. ` +
        `Last inspection: ${eq.lastInspection}. Next inspection due: ${eq.nextInspection}. ` +
        `Inspection overdue: ${eq.inspectionOverdue ? 'YES — OVERDUE' : 'No'}. ` +
        `Last major overhaul: ${eq.lastMajorOverhaul}. ` +
        `Known defects: ${eq.knownDefects.length > 0 ? eq.knownDefects.join('; ') : 'None'}. ` +
        `Spare parts available: ${eq.sparePartsAvailable ? 'Yes' : 'NO — not available'}. ` +
        `Connected sensors: ${eq.sensorIds.join(', ') || 'None'}. ` +
        `Related past incidents: ${eq.relatedIncidents.join(', ') || 'None'}. ` +
        `Notes: ${eq.notes}`,
      metadata: {
        source: 'Plant Equipment Registry',
        type: 'equipment',
        zoneId: eq.zoneId,
        equipmentId: eq.id,
        condition: eq.condition,
        failureRisk: eq.failureRisk,
        ageYears: eq.ageYears,
        inspectionOverdue: eq.inspectionOverdue,
      },
    });
  }

  // Maintenance records
  for (const mr of MAINTENANCE_RECORDS) {
    docs.push({
      id: `rag-maint-${mr.id}`,
      category: 'maintenance',
      title: `Maintenance Record: ${mr.id} — Equipment ${mr.equipmentId}`,
      text: `${mr.type === 'inspection' ? 'Inspection' : 'Planned maintenance'} on ${mr.date} ` +
        `for equipment ${mr.equipmentId}. Inspector: ${mr.inspector} (${mr.agency}). ` +
        `Findings: ${mr.findings} ` +
        `Action taken: ${mr.actionTaken} ` +
        `Status: ${mr.status}. Severity: ${mr.severity}.`,
      metadata: {
        source: 'Maintenance Management System',
        type: 'maintenance',
        equipmentId: mr.equipmentId,
        severity: mr.severity,
        status: mr.status,
      },
    });
  }

  // Work orders
  for (const wo of PENDING_WORK_ORDERS) {
    docs.push({
      id: `rag-wo-${wo.id}`,
      category: 'work_orders',
      title: `Work Order: ${wo.id} — ${wo.priority} — ${wo.equipmentId}`,
      text: `Priority: ${wo.priority}. Equipment: ${wo.equipmentId}. ` +
        `Description: ${wo.description} ` +
        `Requested: ${wo.requestedDate}. Duration: ${wo.estimatedDuration}. Cost: ${wo.estimatedCost}. ` +
        `Status: ${wo.status}. ` +
        `Risk if deferred: ${wo.riskIfDeferred}`,
      metadata: {
        source: 'Work Order System',
        type: 'work_order',
        equipmentId: wo.equipmentId,
        priority: wo.priority,
        status: wo.status,
      },
    });
  }

  // Personnel
  for (const emp of PERSONNEL_DATABASE) {
    const expiredTraining = emp.safetyTraining.filter(t => t.expired);
    docs.push({
      id: `rag-emp-${emp.id}`,
      category: 'personnel',
      title: `Employee: ${emp.name} (${emp.designation}) — ${emp.department}`,
      text: `${emp.name} is a ${emp.designation} in ${emp.department}, joined ${emp.joinDate} (${emp.yearsExperience} years experience). ` +
        `Age: ${emp.age}. Worker ID: ${emp.workerId}. ` +
        `Medical fitness: ${emp.medicalFitness}. Last medical: ${emp.lastMedical}. ${emp.medicalNotes || ''} ` +
        `Safety training: ${emp.safetyTraining.map(t => `${t.course} (valid until ${t.validUntil}${t.expired ? ' — EXPIRED' : ''})`).join('; ')}. ` +
        `Violations: ${emp.violationHistory.length > 0 ? emp.violationHistory.map(v => `${v.date}: ${v.description}`).join('; ') : 'None'}. ` +
        `Restricted zones: ${emp.restrictedZones.length > 0 ? emp.restrictedZones.join(', ') : 'None'}. ` +
        `Shift: ${emp.shiftPattern}. Emergency contact: ${emp.emergencyContact}.`,
      metadata: {
        source: 'HR/Safety Database',
        type: 'personnel',
        department: emp.department,
        workerId: emp.workerId,
      },
    });
  }

  // Chemicals
  for (const chem of CHEMICAL_INVENTORY) {
    docs.push({
      id: `rag-chem-${chem.id}`,
      category: 'chemical_inventory',
      title: `Chemical: ${chem.name} — ${chem.location}`,
      text: `${chem.name} stored at ${chem.location}. Quantity: ${chem.quantity}. ` +
        `Composition: ${chem.composition}. ` +
        `Hazards: ${chem.hazards.join('; ')}. ` +
        `PEL: ${chem.pel}. IDLH: ${chem.idlh}. LEL: ${chem.lel}. ` +
        `Fire rating: ${chem.fireRating}. SDS: ${chem.sdsNumber}. ` +
        `Last inventory: ${chem.lastInventory}. ${chem.psmThreshold || ''}`,
      metadata: {
        source: 'Chemical Inventory Register',
        type: 'chemical',
      },
    });
  }

  // Safety systems
  for (const ss of SAFETY_SYSTEMS) {
    docs.push({
      id: `rag-ss-${ss.id}`,
      category: 'safety_systems',
      title: `Safety System: ${ss.name} — Status: ${ss.status}`,
      text: `${ss.name} (${ss.type}) covers zones: ${ss.zones.join(', ')}. ` +
        `Status: ${ss.status}. Condition score: ${ss.conditionScore}/1.0. ` +
        `Last test: ${ss.lastTest}. ` +
        `${ss.capacity ? `Capacity: ${ss.capacity}. ` : ''}` +
        `${ss.detectorCount ? `Detectors: ${ss.detectorCount} (${ss.issueCount} with issues). ` : ''}` +
        `Issues: ${ss.issues.length > 0 ? ss.issues.join('; ') : 'None'}.`,
      metadata: {
        source: 'Safety Systems Register',
        type: 'safety_system',
        status: ss.status,
      },
    });
  }

  // Incidents
  for (const inc of INCIDENT_DATABASE) {
    docs.push({
      id: `rag-inc-${inc.id}`,
      category: 'incident_history',
      title: `Incident: ${inc.id} — ${inc.type} at ${inc.zone}`,
      text: `Incident ${inc.id} on ${inc.date} in ${inc.zone} involving equipment ${inc.equipment}. ` +
        `Type: ${inc.type}. Severity: ${inc.severity}. ` +
        `Description: ${inc.description} ` +
        `Root cause: ${inc.rootCause} ` +
        `Corrective action: ${inc.corrective} ` +
        `Injuries: ${inc.injuries}. Near miss: ${inc.nearMiss}. ` +
        `Production loss: ${inc.productionLossHours} hours. Cost: ${inc.cost}.`,
      metadata: {
        source: 'Incident Investigation Register',
        type: 'incident',
        zone: inc.zone,
        equipmentId: inc.equipment,
        severity: inc.severity,
      },
    });
  }

  return docs;
}

/**
 * Metadata for the industrial database
 */
export const INDUSTRIAL_DB_METADATA = {
  name: 'shieldai-industrial-database',
  version: '1.0.0',
  facility: 'Integrated Steel Plant — Coke Oven + Blast Furnace Complex',
  location: 'Jharkhand, India',
  totalEquipment: EQUIPMENT_REGISTRY.length,
  totalPersonnel: PERSONNEL_DATABASE.length,
  totalChemicals: CHEMICAL_INVENTORY.length,
  totalIncidents: INCIDENT_DATABASE.length,
  criticalEquipment: EQUIPMENT_REGISTRY.filter(e => e.failureRisk === 'critical').length,
  overdueInspections: EQUIPMENT_REGISTRY.filter(e => e.inspectionOverdue).length,
  pendingWorkOrders: PENDING_WORK_ORDERS.length,
  lastUpdated: '2026-07-18',
};
