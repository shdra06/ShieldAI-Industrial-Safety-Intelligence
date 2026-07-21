// ============================================================================
// ShieldAI — Historical Incident Data
// Real-world-inspired industrial incidents for pattern matching and training.
// ============================================================================

export const HISTORICAL_INCIDENTS = [
  {
    id: 'INC-001',
    title: 'Coke Oven Gas Explosion — Visakhapatnam Pattern',
    date: '2024-12-17',
    zone: 'Z-A',
    description:
      'Explosion triggered by ignition of accumulated coke oven gas (COG) during hot work on the gas collecting main. ' +
      'Methane concentration exceeded 40% LEL before the blast. A welding operation was underway approximately 8 meters from the gas leak point. ' +
      'The gas-free certificate had been issued 6 hours earlier but conditions had changed due to a upstream valve failure.',
    rootCause: 'Simultaneous hot work during active gas leak; stale gas-free certificate; inadequate continuous gas monitoring',
    casualties: 14,
    severity: 'fatal',
    keywords: ['coke oven gas', 'explosion', 'hot work', 'methane', 'CH4', 'welding', 'gas collecting main', 'SIMOPS', 'gas-free certificate'],
    preventiveMeasures: [
      'Mandatory continuous gas monitoring during all hot work in flammable zones',
      'Gas-free certificates valid for maximum 2 hours; re-test before resuming work',
      'SIMOPS conflict detection: no hot work within 15m of open gas systems',
      'Real-time interlock between gas detectors and hot work permit systems',
    ],
    regulatoryRef: 'Factories Act 1948 §37; OISD-STD-105 Clause 5.2',
  },
  {
    id: 'INC-002',
    title: 'Confined Space Asphyxiation — Scrubber Vessel',
    date: '2023-06-14',
    zone: 'Z-C',
    description:
      'Two workers entered an ammonia scrubber vessel for routine cleaning. Oxygen levels dropped below 16% due to nitrogen purge residue. ' +
      'The standby person left the entry point unattended. Workers lost consciousness within 3 minutes. Rescue was delayed by 12 minutes.',
    rootCause: 'Incomplete atmosphere testing; standby person abandoned post; rescue plan not rehearsed',
    casualties: 2,
    severity: 'fatal',
    keywords: ['confined space', 'asphyxiation', 'oxygen deficiency', 'scrubber', 'ammonia', 'nitrogen', 'rescue delay', 'standby person'],
    preventiveMeasures: [
      'Continuous atmospheric monitoring inside confined spaces with audible alarms',
      'Standby person must remain at entry point for entire duration — no exceptions',
      'Pre-entry rescue drill mandatory within 24 hours of planned confined space work',
      'Buddy system with communication check every 5 minutes',
    ],
    regulatoryRef: 'Factories Act 1948 §36; OISD-STD-105 Clause 6.3',
  },
  {
    id: 'INC-003',
    title: 'Hot Work Fire — By-Product Plant',
    date: '2024-03-22',
    zone: 'Z-A',
    description:
      'Grinding sparks ignited residual tar deposits on piping near the by-product plant. Fire spread to cable trays above. ' +
      'Fire watch had been withdrawn 10 minutes before the fire started. Combustible materials within 5m were not cleared.',
    rootCause: 'Inadequate housekeeping; premature withdrawal of fire watch; tar residue not identified in pre-work inspection',
    casualties: 0,
    severity: 'major',
    keywords: ['hot work', 'fire', 'grinding', 'sparks', 'tar', 'by-product plant', 'fire watch', 'combustibles', 'housekeeping'],
    preventiveMeasures: [
      'Fire watch to continue for minimum 30 minutes after hot work completion',
      'Pre-work inspection must identify and document all combustible materials within 11m',
      'Tar and hydrocarbon residue cleaning mandatory before hot work on process piping',
    ],
    regulatoryRef: 'OISD-STD-105 Clause 5.3; IS 3016',
  },
  {
    id: 'INC-004',
    title: 'Ammonia Leak — Storage Tank Overflow',
    date: '2023-11-08',
    zone: 'Z-C',
    description:
      'Ammonia storage tank T-301 overflowed due to level indicator malfunction. Approximately 500 kg of anhydrous ammonia released. ' +
      'Wind carried the toxic cloud toward the maintenance workshop (Zone E). 18 workers evacuated; 6 treated for respiratory irritation.',
    rootCause: 'Level instrument failure; no independent high-high level alarm; inadequate wind direction monitoring',
    casualties: 0,
    severity: 'major',
    keywords: ['ammonia', 'NH3', 'leak', 'toxic release', 'storage tank', 'overflow', 'level indicator', 'evacuation', 'respiratory'],
    preventiveMeasures: [
      'Redundant level instrumentation (SIL-2) on all toxic storage vessels',
      'Wind direction integrated into emergency response system for plume modeling',
      'Automatic isolation valves on tank inlet activated by high-high level alarm',
      'Emergency ammonia scrubbing curtain system near vulnerable zones',
    ],
    regulatoryRef: 'Factories Act 1948 §41A; OISD-GDN-206 Clause 4.2',
  },
  {
    id: 'INC-005',
    title: 'Electrical Arc Flash — Blast Furnace MCC',
    date: '2024-08-30',
    zone: 'Z-D',
    description:
      'Arc flash event at the Motor Control Center (MCC) for the blast furnace charge conveyor. Electrician suffered second-degree burns. ' +
      'LOTO procedure was not completed — one disconnect point was missed. Arc flash hazard analysis had not been updated after motor upgrade.',
    rootCause: 'Incomplete LOTO; outdated arc flash hazard analysis; inadequate PPE for actual arc flash category',
    casualties: 0,
    severity: 'major',
    keywords: ['arc flash', 'electrical', 'LOTO', 'lockout tagout', 'MCC', 'burns', 'blast furnace', 'PPE inadequate'],
    preventiveMeasures: [
      'Independent verification of all LOTO points by second qualified person',
      'Arc flash hazard analysis to be updated within 30 days of any electrical modification',
      'PPE must match current arc flash category — minimum HRC Level 2 for MCC work',
    ],
    regulatoryRef: 'Factories Act 1948 §36A; OISD-STD-105 Clause 7.1; IE Rules 1956',
  },
  {
    id: 'INC-006',
    title: 'Blast Furnace Gas (BFG) Poisoning',
    date: '2022-09-12',
    zone: 'Z-D',
    description:
      'Three workers exposed to blast furnace gas containing high CO levels (>800ppm) during stove changeover. ' +
      'Gas leak from a corroded flange on the hot blast main. Workers were not carrying personal CO monitors.',
    rootCause: 'Corroded flange not identified in last inspection; workers lacked personal gas monitors; delayed alarm response',
    casualties: 1,
    severity: 'fatal',
    keywords: ['blast furnace gas', 'CO', 'carbon monoxide', 'poisoning', 'flange leak', 'gas monitor', 'corrosion'],
    preventiveMeasures: [
      'Mandatory personal CO monitors for all personnel in Zone D',
      'Flange inspection program — ultrasonic thickness testing every 6 months',
      'Fixed gas detection with automatic alarm at 35ppm CO in blast furnace area',
    ],
    regulatoryRef: 'DGMS Circ. 10/2014; Factories Act 1948 §37',
  },
  {
    id: 'INC-007',
    title: 'Crane Incident — Maintenance Workshop',
    date: '2024-01-15',
    zone: 'Z-E',
    description:
      'Overhead crane dropped a 2-tonne motor casing during lifting operation. Rigging sling failed due to wear. ' +
      'No barricading around lift zone. Two workers narrowly missed by the falling load.',
    rootCause: 'Worn rigging sling not inspected before use; no barricade zone established; lift plan not prepared for critical lift',
    casualties: 0,
    severity: 'near-miss',
    keywords: ['crane', 'dropped load', 'rigging', 'sling failure', 'lifting', 'barricade', 'near miss'],
    preventiveMeasures: [
      'Pre-use inspection of all rigging equipment — discard if damage observed',
      'Critical lift plan required for all loads > 1 tonne',
      'Barricade zone with minimum 1.5x load radius',
    ],
    regulatoryRef: 'Factories Act 1948 §29; IS 3177',
  },
  {
    id: 'INC-008',
    title: 'H2S Release During Coke Quenching',
    date: '2023-04-20',
    zone: 'Z-A',
    description:
      'Sudden release of hydrogen sulfide during coke quenching operation. H2S levels spiked to 75ppm in downwind area. ' +
      'Four workers reported headache, nausea, and eye irritation. Emergency ventilation activated after 4-minute delay.',
    rootCause: 'High sulfur content in coal charge not communicated to operations; quench tower water chemistry not adjusted; delayed ventilation activation',
    casualties: 0,
    severity: 'minor',
    keywords: ['H2S', 'hydrogen sulfide', 'coke quenching', 'toxic release', 'sulfur', 'ventilation delay', 'quench tower'],
    preventiveMeasures: [
      'Coal quality parameters communicated to operations before each charge',
      'Automatic H2S-triggered ventilation activation — no manual delay',
      'Wind socks at all quench towers with automatic area alarm on unfavorable wind direction',
    ],
    regulatoryRef: 'DGMS Circ. 5/2010; OISD-GDN-206 Clause 3.4',
  },
  {
    id: 'INC-009',
    title: 'Gas Holder Pressure Excursion',
    date: '2025-02-28',
    zone: 'Z-B',
    description:
      'Gas holder pressure exceeded design limit by 15% during a mixing station upset. Relief valve lifted but discharged gas ' +
      'toward the maintenance workshop. Area evacuated. Pressure stabilized after 8 minutes when upstream supply was isolated.',
    rootCause: 'Mixing valve controller malfunction; relief valve discharge routed toward occupied area; no automatic upstream trip',
    casualties: 0,
    severity: 'near-miss',
    keywords: ['gas holder', 'pressure excursion', 'relief valve', 'mixing station', 'overpressure', 'evacuation', 'controller malfunction'],
    preventiveMeasures: [
      'Safety Integrity Level (SIL-2) high pressure trip on gas holder',
      'Relief valve discharge routed to safe flare system',
      'Automatic upstream isolation on high-high pressure',
    ],
    regulatoryRef: 'OISD-STD-105 Clause 4.5; PESO regulations',
  },
  {
    id: 'INC-010',
    title: 'Permit-to-Work System Failure — Concurrent Hot Works',
    date: '2024-06-10',
    zone: 'Z-A',
    description:
      'Two hot work permits were simultaneously active in Zone A — one for welding on the gas main (PTW-A12) and another for ' +
      'grinding on adjacent piping (PTW-A15). The permits were issued by different shifts without cross-referencing. ' +
      'Combined spark generation in an area with 15% LEL methane reading. Near-miss detected by a passing safety officer.',
    rootCause: 'No SIMOPS (Simultaneous Operations) check in permit system; shift handover gap; no digital conflict detection',
    casualties: 0,
    severity: 'near-miss',
    keywords: ['SIMOPS', 'concurrent permits', 'hot work', 'permit conflict', 'shift handover', 'methane', 'sparks', 'digital permit'],
    preventiveMeasures: [
      'Mandatory SIMOPS conflict detection in digital permit system',
      'Cross-shift permit register with handover acknowledgement',
      'Maximum one hot work permit per zone at any given time in Class I areas',
    ],
    regulatoryRef: 'OISD-STD-105 Clause 5.5; Factories Act 1948 §40B',
  },
  {
    id: 'INC-011',
    title: 'SMS-1 Caster-2 Molten Steel Explosion — Vizag Steel Plant',
    date: '2026-06-08',
    zone: 'Z-D',
    description:
      'A 150-tonne ladle of molten steel (1,500-1,600°C) exploded during casting operations at Caster-2 in SMS-1. ' +
      'Entrapped gases (O₂, H₂, N₂) within the liquid steel caused sudden pressure buildup, rupturing the ladle seal ' +
      'before the slide gate could be opened. The ladle tipped, spilling molten metal onto the working platform below, ' +
      'engulfing workers. Massive fire damaged an overhead crane. Contributing factors included poor quality ferro-alloys ' +
      'causing gas entrapment, unaddressed minor ladle leaks in preceding months, staff shortages forcing excessive workloads, ' +
      'and production pressure to meet targets.',
    rootCause: 'Entrapped gases in liquid steel; no automated gas entrapment detection in ladle; inadequate ladle integrity monitoring; staff shortages; poor raw material quality control',
    casualties: 10,
    severity: 'fatal',
    keywords: ['molten steel', 'ladle explosion', 'SMS', 'caster', 'entrapped gas', 'pressure rupture', 'continuous casting', 'staff shortage', 'ferro-alloy quality', 'crane damage'],
    preventiveMeasures: [
      'Automated gas entrapment detection using sub-lance probes before casting',
      'Ladle integrity monitoring system with crack/leak detection before each heat',
      'Mandatory ladle pre-heat validation with infrared thermal imaging',
      'Raw material quality control: reject non-conforming ferro-alloys',
      'Minimum staffing levels enforced per IEC 61511 SIL requirements',
      'Emergency shutdown interlock: auto-abort casting if ladle anomaly detected',
    ],
    regulatoryRef: 'IEC 61508/61511 SIL-2; Ministry of Steel SG-25; OISD-STD-105 Clause 8',
  },
  {
    id: 'INC-012',
    title: 'Gas Pipeline Explosion — SAIL Bhilai Coke Oven Battery 11',
    date: '2018-10-09',
    zone: 'Z-A',
    description:
      'A gas pipeline exploded during maintenance work at Coke Oven Battery Complex No. 11 at SAIL Bhilai Steel Plant. ' +
      'Workers were performing routine maintenance on the gas pipeline when the explosion occurred. ' +
      'Inadequate gas isolation procedures during maintenance and possible permit-to-work system failures contributed to the disaster.',
    rootCause: 'Inadequate gas isolation during maintenance; PTW system failure; residual gas in pipeline',
    casualties: 12,
    severity: 'fatal',
    keywords: ['gas pipeline', 'explosion', 'maintenance', 'coke oven', 'gas isolation', 'permit-to-work', 'SAIL', 'Bhilai'],
    preventiveMeasures: [
      'Double-block-and-bleed isolation for all gas pipeline maintenance',
      'Positive isolation verification with gas-free testing at multiple points',
      'Mandatory hot work permit with real-time gas monitoring during pipe maintenance',
      'Lockout-Tagout (LOTO) procedure with photo verification',
    ],
    regulatoryRef: 'OISD-STD-105 Clause 5.4; IS 17893:2023 PTW Framework',
  },
];
