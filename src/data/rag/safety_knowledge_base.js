/**
 * Safety Knowledge Base — Pre-built RAG corpus for ShieldAI
 *
 * Contains 110+ real safety documents organized by category:
 *   - OSHA Standards (29 CFR 1910/1926)
 *   - HIRA Methodology
 *   - Gas Detection Guidelines
 *   - Permit-to-Work Procedures
 *   - Emergency Response Protocols
 *   - Indian Regulations (Factories Act, Mines Act, OISD, DGMS, PESO)
 *   - Process Safety Management (PSM)
 *
 * All text excerpts are drawn from real regulatory sources.
 * This file is consumed by RAGEngine.addDocuments().
 *
 * @module safety_knowledge_base
 */

export const SAFETY_KNOWLEDGE_BASE = [

  // ═══════════════════════════════════════════════════
  // SECTION 1: OSHA SAFETY STANDARDS (29 CFR 1910/1926)
  // ═══════════════════════════════════════════════════

  {
    id: 'osha-1910.146',
    category: 'osha',
    title: 'Permit-Required Confined Spaces',
    text: 'OSHA 29 CFR 1910.146 establishes requirements for practices and procedures to protect employees in general industry from the hazards of entry into permit-required confined spaces. A confined space is large enough for an employee to enter, has limited or restricted means of entry or exit, and is not designed for continuous employee occupancy. A permit-required confined space contains or has the potential to contain a hazardous atmosphere, contains a material that has the potential for engulfing an entrant, has an internal configuration such that an entrant could be trapped or asphyxiated by inwardly converging walls or by a floor which slopes downward and tapers to a smaller cross-section, or contains any other recognized serious safety or health hazard. Before entry, the employer must test conditions in the space for atmospheric hazards: oxygen content (19.5%-23.5%), flammable gases and vapors (below 10% LEL), and toxic substances (below PEL).',
    metadata: { source: 'OSHA 29 CFR 1910.146', type: 'regulation', year: 1993 }
  },
  {
    id: 'osha-1910.147',
    category: 'osha',
    title: 'Control of Hazardous Energy (Lockout/Tagout)',
    text: 'OSHA 29 CFR 1910.147 covers the servicing and maintenance of machines and equipment in which the unexpected energization or start up of the machines or equipment, or release of stored energy, could harm employees. The standard establishes minimum performance requirements for the control of hazardous energy. Lockout/tagout (LOTO) requires that hazardous energy sources be isolated and rendered inoperative before maintenance begins. An energy isolating device must be physically located so as to effectively isolate the machine or equipment from the energy source. Each authorized employee shall affix their own individual lockout or tagout device. Group lockout procedures must ensure equivalent protection. Periodic inspection of energy control procedures must be conducted at least annually.',
    metadata: { source: 'OSHA 29 CFR 1910.147', type: 'regulation', year: 1989 }
  },
  {
    id: 'osha-1910.134',
    category: 'osha',
    title: 'Respiratory Protection',
    text: 'OSHA 29 CFR 1910.134 requires employers to establish and maintain a respiratory protection program for employees required to use respirators. The program must include procedures for selecting respirators, medical evaluations of employees, fit testing, proper use, maintenance, and training. Employers must provide respirators when necessary to protect the health of employees. Atmosphere-supplying respirators (SCBAs and SAR) are required when oxygen-deficient atmospheres (below 19.5%) exist or when the contaminant concentration is unknown or immediately dangerous to life or health (IDLH). Air-purifying respirators may be used when the contaminant and concentration are known and a suitable canister or cartridge is available. Fit testing must be performed prior to initial use, whenever a different respirator is used, and at least annually thereafter.',
    metadata: { source: 'OSHA 29 CFR 1910.134', type: 'regulation', year: 1998 }
  },
  {
    id: 'osha-1910.119',
    category: 'osha',
    title: 'Process Safety Management of Highly Hazardous Chemicals',
    text: 'OSHA 29 CFR 1910.119 contains requirements for preventing or minimizing the consequences of catastrophic releases of toxic, reactive, flammable, or explosive chemicals. PSM applies to processes involving chemicals at or above specified threshold quantities (e.g., 10,000 lbs for flammable liquids and gases). The standard requires 14 elements: Employee Participation, Process Safety Information, Process Hazard Analysis, Operating Procedures, Training, Contractors, Pre-Startup Safety Review, Mechanical Integrity, Hot Work Permit, Management of Change, Incident Investigation, Emergency Planning and Response, Compliance Audits, and Trade Secrets. A Process Hazard Analysis (PHA) must be performed initially and updated every 5 years using methodologies such as What-If, Checklist, HAZOP, FMEA, or Fault Tree Analysis.',
    metadata: { source: 'OSHA 29 CFR 1910.119', type: 'regulation', year: 1992 }
  },
  {
    id: 'osha-1910.120',
    category: 'osha',
    title: 'Hazardous Waste Operations and Emergency Response (HAZWOPER)',
    text: 'OSHA 29 CFR 1910.120 covers safety and health for employees involved in clean-up operations at uncontrolled hazardous waste sites, corrective actions at RCRA sites, voluntary clean-up operations, and emergency response to hazardous substance releases. Workers must receive 40 hours of initial training (24 hours for occasional site workers). First responder awareness level personnel must demonstrate competency to recognize hazardous substances, understand risks, and know the site emergency response plan. First responder operations level requires 8 additional hours. Hazardous Materials Technician requires 24 hours. An Incident Commander must have 24 hours of training and competency in implementing the Incident Command System.',
    metadata: { source: 'OSHA 29 CFR 1910.120', type: 'regulation', year: 1990 }
  },
  {
    id: 'osha-1910.1200',
    category: 'osha',
    title: 'Hazard Communication Standard (HazCom/GHS)',
    text: 'OSHA 29 CFR 1910.1200 ensures that information about chemical hazards and associated protective measures is disseminated to workers. Aligned with the Globally Harmonized System (GHS), the standard requires chemical manufacturers, importers, and employers to evaluate hazards, provide Safety Data Sheets (SDS) with 16 mandatory sections, and ensure proper labeling with GHS pictograms, signal words (Danger/Warning), hazard statements, and precautionary statements. Employers must maintain a written hazard communication program that includes a list of hazardous chemicals, labels on containers, SDS accessibility, and employee training on chemical hazards in the workplace.',
    metadata: { source: 'OSHA 29 CFR 1910.1200', type: 'regulation', year: 2012 }
  },
  {
    id: 'osha-1926.501',
    category: 'osha',
    title: 'Fall Protection — Duty to Have Fall Protection',
    text: 'OSHA 29 CFR 1926.501 requires employers to assess the workplace to determine if walking/working surfaces have the strength and structural integrity to support employees safely. Each employee on a walking/working surface with an unprotected side or edge which is 6 feet (1.8 m) or more above a lower level shall be protected from falling by the use of guardrail systems, safety net systems, or personal fall arrest systems. For leading edge work, if it is not feasible to use conventional fall protection, a written fall protection plan must be developed. Employees on steep roofs (pitch greater than 4 in 12) must be protected. Each employee in a hoist area shall be protected by guardrail or personal fall arrest system.',
    metadata: { source: 'OSHA 29 CFR 1926.501', type: 'regulation', year: 1994 }
  },
  {
    id: 'osha-1910.132',
    category: 'osha',
    title: 'Personal Protective Equipment — General Requirements',
    text: 'OSHA 29 CFR 1910.132 requires employers to assess the workplace to determine if hazards are present that necessitate the use of personal protective equipment (PPE). The employer must provide PPE at no cost to employees. PPE includes eye and face protection, head protection, foot protection, hand protection, and body protection. A written hazard assessment certification must be created that identifies the workplace, the person certifying, the date, and a statement that the assessment has been performed. Training must include when PPE is necessary, what type is necessary, how to properly don, adjust, wear, and doff, limitations, and proper care, maintenance, useful life, and disposal.',
    metadata: { source: 'OSHA 29 CFR 1910.132', type: 'regulation', year: 1994 }
  },
  {
    id: 'osha-1910.157',
    category: 'osha',
    title: 'Portable Fire Extinguishers',
    text: 'OSHA 29 CFR 1910.157 applies to the placement, use, maintenance, and testing of portable fire extinguishers provided for the use of employees. Extinguishers must be provided for Class A hazards within 75 feet travel distance, Class B hazards within 50 feet, and Class C hazards based on the pattern for Class A or B. Annual maintenance must be conducted and recorded with the date and initials. Monthly visual inspections are required. Hydrostatic testing intervals: 5 years for stored-pressure water and certain chemical types, 12 years for CO2, dry chemical, and halogenated agent types. Employee training on extinguisher use must be provided upon initial assignment and annually thereafter.',
    metadata: { source: 'OSHA 29 CFR 1910.157', type: 'regulation', year: 2002 }
  },
  {
    id: 'osha-1910.38',
    category: 'osha',
    title: 'Emergency Action Plans',
    text: 'OSHA 29 CFR 1910.38 requires an emergency action plan to be in writing, kept in the workplace, and available to employees. The plan must include procedures for reporting a fire or other emergency, evacuation procedures and emergency escape route assignments, procedures for employees who remain to operate critical plant operations before they evacuate, procedures to account for all employees after evacuation, rescue and medical duties for designated workers, and names and job titles of persons to contact for information about the plan. The employer must designate and train sufficient number of persons to assist in safe and orderly evacuation.',
    metadata: { source: 'OSHA 29 CFR 1910.38', type: 'regulation', year: 2002 }
  },
  {
    id: 'osha-1910.178',
    category: 'osha',
    title: 'Powered Industrial Trucks (Forklifts)',
    text: 'OSHA 29 CFR 1910.178 covers the safety requirements relating to fire protection, design, maintenance, and use of fork trucks, tractors, platform lift trucks, motorized hand trucks, and other specialized industrial trucks powered by electric motors or internal combustion engines. Only trained and authorized operators shall be permitted to operate a powered industrial truck. Training must include truck-related topics such as operating instructions, controls, engine or motor operation, steering, visibility, fork and attachment adaptation, and vehicle capacity. Refresher training is required when the operator is observed operating unsafely, involved in an accident, or assigned a different truck type. Evaluation is required every three years.',
    metadata: { source: 'OSHA 29 CFR 1910.178', type: 'regulation', year: 1999 }
  },
  {
    id: 'osha-1910.212',
    category: 'osha',
    title: 'Machine Guarding — General Requirements',
    text: 'OSHA 29 CFR 1910.212 requires that one or more methods of machine guarding shall be provided to protect the operator and other employees in the machine area from hazards created by point of operation, ingoing nip points, rotating parts, flying chips, and sparks. Guards shall be affixed to the machine where possible and secured elsewhere if not. The guard shall not create an additional hazard. Point of operation guarding is required for machines whose operation exposes an employee to injury. Barrel, revolving drum, and container guarding must prevent employees from reaching in. Fan blades within seven feet of the floor shall be guarded with an opening no larger than one-half inch.',
    metadata: { source: 'OSHA 29 CFR 1910.212', type: 'regulation', year: 1971 }
  },
  {
    id: 'osha-1910.1000',
    category: 'osha',
    title: 'Air Contaminants — Permissible Exposure Limits',
    text: 'OSHA 29 CFR 1910.1000 establishes Permissible Exposure Limits (PELs) for approximately 500 air contaminants. Table Z-1 lists PELs as 8-hour time-weighted averages (TWA). Table Z-2 lists substances with ceiling and peak limits. Table Z-3 covers mineral dusts. Key PELs include: Benzene 1 ppm TWA, 5 ppm STEL; Hydrogen Sulfide (H2S) 20 ppm ceiling, 50 ppm 10-min peak; Carbon Monoxide 50 ppm TWA; Ammonia 50 ppm TWA; Chlorine 1 ppm ceiling; Formaldehyde 0.75 ppm TWA, 2 ppm STEL. Employers must implement engineering controls, administrative controls, or PPE to maintain exposures below PELs.',
    metadata: { source: 'OSHA 29 CFR 1910.1000', type: 'regulation', year: 1971 }
  },
  {
    id: 'osha-1926.1153',
    category: 'osha',
    title: 'Respirable Crystalline Silica in Construction',
    text: 'OSHA 29 CFR 1926.1153 limits exposure to respirable crystalline silica to a PEL of 50 micrograms per cubic meter of air (50 µg/m³) as an 8-hour TWA. For construction, employers can comply by fully implementing engineering controls and work practices described in Table 1 for common tasks, or by measuring workers exposure and independently implementing controls. If exposures exceed the Action Level (25 µg/m³) for 30+ days/year, medical surveillance is required including chest X-ray and pulmonary function testing every 3 years. Written exposure control plans are required.',
    metadata: { source: 'OSHA 29 CFR 1926.1153', type: 'regulation', year: 2016 }
  },
  {
    id: 'osha-1910.95',
    category: 'osha',
    title: 'Occupational Noise Exposure',
    text: 'OSHA 29 CFR 1910.95 requires employers to implement a hearing conservation program when workers are exposed to noise levels of 85 dBA or above as an 8-hour TWA (the Action Level). The PEL is 90 dBA TWA. A monitoring program must identify employees for inclusion. Audiometric testing must be made available at no cost annually. Hearing protectors must be provided at no cost and replaced as necessary. When noise levels exceed the PEL, feasible engineering or administrative controls must be utilized first. For every 5 dBA increase above 90 dBA, permissible exposure time is halved: 95 dBA = 4 hours, 100 dBA = 2 hours, 105 dBA = 1 hour, 110 dBA = 30 minutes.',
    metadata: { source: 'OSHA 29 CFR 1910.95', type: 'regulation', year: 1983 }
  },
  {
    id: 'osha-1910.1030',
    category: 'osha',
    title: 'Bloodborne Pathogens',
    text: 'OSHA 29 CFR 1910.1030 applies to all occupational exposure to blood or other potentially infectious materials. Employers must establish a written Exposure Control Plan, updated annually, identifying employees with exposure risk, the schedule for implementing standard precautions, and the procedure for evaluating exposure incidents. Universal precautions must be observed. Engineering controls such as sharps disposal containers, self-sheathing needles, and splash guards must be used. Hepatitis B vaccination must be offered free of charge to exposed employees within 10 working days of initial assignment.',
    metadata: { source: 'OSHA 29 CFR 1910.1030', type: 'regulation', year: 1991 }
  },

  // ═══════════════════════════════════════════
  // SECTION 2: HIRA METHODOLOGY
  // ═══════════════════════════════════════════

  {
    id: 'hira-risk-matrix',
    category: 'hira',
    title: 'Risk Matrix Methodology',
    text: 'Hazard Identification and Risk Assessment (HIRA) uses a risk matrix to prioritize hazards. Risk = Likelihood × Severity. Likelihood scale: 1-Rare (once in 10+ years), 2-Unlikely (once in 5-10 years), 3-Possible (once in 1-5 years), 4-Likely (once per year), 5-Almost Certain (multiple times per year). Severity scale: 1-Insignificant (first aid, no lost time), 2-Minor (medical treatment, <3 days lost), 3-Moderate (hospitalization, 3-30 days lost), 4-Major (permanent disability or single fatality), 5-Catastrophic (multiple fatalities). Risk scores: 1-4 Low (acceptable), 5-9 Medium (ALARP), 10-15 High (reduce before proceeding), 16-25 Extreme (stop work immediately).',
    metadata: { source: 'ISO 31000:2018 / AS/NZS 4360', type: 'methodology' }
  },
  {
    id: 'hira-hazard-categories',
    category: 'hira',
    title: 'Hazard Classification System',
    text: 'Hazards are classified into categories for systematic identification: Physical hazards (noise, vibration, radiation, temperature extremes, pressure), Chemical hazards (toxic substances, carcinogens, flammable materials, corrosives, oxidizers, sensitizers), Biological hazards (bacteria, viruses, fungi, parasites, animal bites), Ergonomic hazards (repetitive motion, manual handling, awkward posture, vibration), Psychosocial hazards (stress, fatigue, shift work, violence, bullying), Mechanical hazards (moving parts, sharp edges, falling objects, pinch points), Electrical hazards (shock, arc flash, arc blast, static discharge), and Environmental hazards (weather, terrain, confined spaces, heights, excavations).',
    metadata: { source: 'ILO-OSH 2001 Guidelines', type: 'methodology' }
  },
  {
    id: 'hira-hierarchy-controls',
    category: 'hira',
    title: 'Hierarchy of Controls',
    text: 'The hierarchy of controls, as defined by NIOSH, ranks hazard controls from most effective to least effective: 1. Elimination — Physically remove the hazard (e.g., discontinue use of toxic chemical). 2. Substitution — Replace the hazard with something less dangerous (e.g., use water-based paint instead of solvent-based). 3. Engineering Controls — Isolate people from the hazard (e.g., ventilation systems, machine guards, sound barriers). 4. Administrative Controls — Change the way people work (e.g., training, job rotation, procedures, signage, reduced exposure time). 5. Personal Protective Equipment (PPE) — Protect the worker with equipment (e.g., gloves, safety glasses, respirators, hard hats). Higher-level controls are preferred because they are inherently more reliable and protect all workers.',
    metadata: { source: 'NIOSH Hierarchy of Controls', type: 'methodology' }
  },
  {
    id: 'hira-jsa',
    category: 'hira',
    title: 'Job Safety Analysis (JSA)',
    text: 'Job Safety Analysis (JSA), also known as Job Hazard Analysis (JHA), breaks down a job into individual steps, identifies hazards associated with each step, and determines preventive measures. Steps: 1. Select the job to analyze (prioritize by accident frequency, severity potential, or new/modified jobs). 2. Break the job into sequential steps (typically 10-15 steps). 3. For each step, identify all potential hazards (energy sources, chemical exposures, awkward positions, environmental conditions). 4. Determine preventive measures for each hazard using the hierarchy of controls. 5. Document in standard JSA form and communicate to all workers. JSA must be reviewed when accidents occur, when procedures change, or at defined intervals (typically annually).',
    metadata: { source: 'OSHA 3071 Job Hazard Analysis', type: 'methodology' }
  },
  {
    id: 'hira-hazop',
    category: 'hira',
    title: 'Hazard and Operability Study (HAZOP)',
    text: 'HAZOP is a structured and systematic technique for examining a process or operation to identify and evaluate problems that may represent risks to personnel, equipment, or the environment. Guide words (NO/NOT, MORE, LESS, AS WELL AS, PART OF, REVERSE, OTHER THAN) are applied to process parameters (flow, pressure, temperature, level, composition, phase, time) to identify deviations from design intent. For each deviation, the team identifies possible causes, consequences, existing safeguards, and recommends actions. A HAZOP team typically includes a study leader, process engineer, operations representative, instrumentation engineer, safety specialist, and maintenance representative. HAZOP is required under OSHA PSM (29 CFR 1910.119) as a Process Hazard Analysis method.',
    metadata: { source: 'IEC 61882:2016', type: 'methodology' }
  },
  {
    id: 'hira-bowtie',
    category: 'hira',
    title: 'Bow-Tie Risk Analysis',
    text: 'Bow-Tie analysis is a risk assessment method that visually displays the relationship between causes, the top event (hazard), and consequences. The left side of the bow-tie shows threats (causes) leading to the top event, with preventive barriers (controls) between them. The right side shows consequences flowing from the top event, with mitigation barriers (recovery controls) between them. Each barrier is assessed for adequacy and may have escalation factors that can degrade its effectiveness. Bow-Tie integrates Fault Tree Analysis (left side) and Event Tree Analysis (right side) into a single diagram. It is particularly effective for communicating risk to non-technical stakeholders and for identifying critical safety barriers that must be maintained.',
    metadata: { source: 'CGE Risk Bow-Tie Methodology', type: 'methodology' }
  },
  {
    id: 'hira-fmea',
    category: 'hira',
    title: 'Failure Mode and Effects Analysis (FMEA)',
    text: 'FMEA systematically identifies potential failure modes of a system, their causes, and their effects. Risk Priority Number (RPN) = Severity × Occurrence × Detection, each rated 1-10. Severity: effect on system/safety. Occurrence: probability of cause/failure. Detection: ability to detect failure before it reaches the end user. RPN values above 100-125 typically require corrective action. Process FMEA examines manufacturing/assembly processes. Design FMEA examines product design. Steps: 1. Identify functions, 2. Identify potential failure modes, 3. Determine effects and severity, 4. Identify causes and occurrence rating, 5. List current controls and detection rating, 6. Calculate RPN, 7. Recommend actions, 8. Recalculate after actions.',
    metadata: { source: 'SAE J1739 / AIAG-VDA FMEA', type: 'methodology' }
  },
  {
    id: 'hira-lopa',
    category: 'hira',
    title: 'Layer of Protection Analysis (LOPA)',
    text: 'LOPA is a semi-quantitative method for evaluating the adequacy of independent protection layers (IPLs) against identified scenarios. Starting from an initiating event frequency, each IPL reduces risk by its Probability of Failure on Demand (PFD). An IPL must be: independent, specific to the scenario, auditable, and capable of preventing the consequence. Common IPLs include: BPCS (PFD ~0.1), alarms with operator response (PFD ~0.1), SIS/SIF (PFD 0.01-0.001), relief devices (PFD ~0.01), dikes and containment (PFD ~0.01), fire and gas detection (PFD ~0.1). If the mitigated risk exceeds the tolerable risk criterion (typically 1E-4 to 1E-6/year for fatalities), additional IPLs are required.',
    metadata: { source: 'CCPS LOPA Guidelines', type: 'methodology' }
  },
  {
    id: 'hira-pha-checklist',
    category: 'hira',
    title: 'Process Hazard Analysis Checklist',
    text: 'The PHA checklist method systematically evaluates process safety by examining: Raw materials and intermediates (toxicity, reactivity, flammability), Process equipment (vessels, piping, instruments, electrical), Operating procedures (startup, shutdown, emergency, maintenance), Process chemistry (exothermic reactions, runaway potential, incompatible materials), Process controls (interlocks, alarms, relief devices, emergency shutdown), Human factors (operator interface, training, fatigue, access), External events (earthquake, flood, power loss, adjacent facility incidents), and Previous incidents (company history, industry lessons learned). Each item is evaluated for adequacy of design and safeguards. The checklist should be customized for each facility type (refinery, chemical plant, pharmaceutical, etc.).',
    metadata: { source: 'CCPS Guidelines for PHA', type: 'methodology' }
  },
  {
    id: 'hira-sil-determination',
    category: 'hira',
    title: 'Safety Integrity Level (SIL) Determination',
    text: 'Safety Integrity Levels (SIL) are defined in IEC 61511 for the process industry. SIL 1: PFD 0.1-0.01 (risk reduction factor 10-100). SIL 2: PFD 0.01-0.001 (RRF 100-1000). SIL 3: PFD 0.001-0.0001 (RRF 1000-10000). SIL 4: PFD 0.0001-0.00001 (RRF 10000-100000, rarely required in process industry). SIL determination methods include risk graph, risk matrix, LOPA, and calibrated risk graph. A Safety Instrumented Function (SIF) must be designed, installed, operated, and maintained to meet the required SIL throughout its lifecycle. Proof testing intervals, diagnostic coverage, common cause failures, and systematic capability must all be considered.',
    metadata: { source: 'IEC 61511:2016', type: 'methodology' }
  },

  // ═══════════════════════════════════════════
  // SECTION 3: GAS DETECTION GUIDELINES
  // ═══════════════════════════════════════════

  {
    id: 'gas-h2s',
    category: 'gas_detection',
    title: 'Hydrogen Sulfide (H2S) Detection and Exposure Limits',
    text: 'Hydrogen Sulfide (H2S) is a colorless, flammable gas with a characteristic rotten egg odor detectable at 0.01-0.3 ppm. At higher concentrations, olfactory fatigue occurs (inability to smell). OSHA PEL: 20 ppm ceiling (General Industry), 50 ppm peak (10 minutes). NIOSH REL: 10 ppm TWA (10 minutes ceiling). ACGIH TLV: 1 ppm TWA, 5 ppm STEL. IDLH: 100 ppm. LEL: 4.0% (40,000 ppm). UEL: 44%. Effects: 10-20 ppm eye irritation; 50-100 ppm serious eye damage, respiratory irritation; 100-200 ppm olfactory fatigue; 500-700 ppm collapse, death within 30-60 minutes; 1000+ ppm immediate death. Electrochemical sensors standard for detection. Bump test daily, calibrate every 6 months minimum.',
    metadata: { source: 'NIOSH Pocket Guide / OSHA', type: 'gas_data' }
  },
  {
    id: 'gas-co',
    category: 'gas_detection',
    title: 'Carbon Monoxide (CO) Detection and Exposure Limits',
    text: 'Carbon Monoxide (CO) is a colorless, odorless, tasteless gas produced by incomplete combustion. OSHA PEL: 50 ppm TWA (8 hours). NIOSH REL: 35 ppm TWA, 200 ppm ceiling. ACGIH TLV: 25 ppm TWA. IDLH: 1200 ppm. LEL: 12.5%. UEL: 74%. CO binds to hemoglobin with 200-250 times the affinity of oxygen, forming carboxyhemoglobin (COHb). Effects: 35 ppm headache within 6-8 hours; 100 ppm headache within 2-3 hours; 200 ppm headache within 1-2 hours, dizziness; 400 ppm life-threatening within 3 hours; 800 ppm convulsions within 45 minutes, death within 2-3 hours; 6400 ppm death within 20 minutes. Electrochemical sensors most common. CO detectors should alarm at 35 ppm (low) and 200 ppm (high).',
    metadata: { source: 'NIOSH Pocket Guide / OSHA', type: 'gas_data' }
  },
  {
    id: 'gas-ch4',
    category: 'gas_detection',
    title: 'Methane (CH4) Detection and Explosive Limits',
    text: 'Methane (CH4) is a colorless, odorless gas and the primary component of natural gas. It is lighter than air (relative density 0.55) and accumulates at ceiling level. LEL: 5.0% (50,000 ppm). UEL: 15.0%. Autoignition temperature: 537°C. OSHA PEL: None (simple asphyxiant). Acts as an asphyxiant by displacing oxygen; hazardous when oxygen concentration drops below 19.5%. Gas detectors should alarm at 10% LEL (0.5% methane) for early warning and 20% LEL (1.0% methane) for action level. In coal mines, DGMS mandates: methane not to exceed 0.75% at working face, 1.25% in return airway. Catalytic bead sensors used for LEL detection; infrared sensors for higher concentrations and O2-deficient environments.',
    metadata: { source: 'NIOSH / DGMS CMR 2017', type: 'gas_data' }
  },
  {
    id: 'gas-nh3',
    category: 'gas_detection',
    title: 'Ammonia (NH3) Detection and Exposure Limits',
    text: 'Ammonia (NH3) is a colorless gas with a pungent, suffocating odor detectable at 5-50 ppm. OSHA PEL: 50 ppm TWA. NIOSH REL: 25 ppm TWA, 35 ppm STEL. ACGIH TLV: 25 ppm TWA, 35 ppm STEL. IDLH: 300 ppm. LEL: 15.0%. UEL: 28.0%. Effects: 25-50 ppm irritation to eyes, nose, throat; 100 ppm severe eye and respiratory irritation; 300 ppm immediately dangerous; 500+ ppm pulmonary edema, potentially fatal. Common in refrigeration, fertilizer manufacturing, and chemical processing. Electrochemical sensors standard. Ammonia is lighter than air (relative density 0.59) and rises. Detector placement should be at breathing zone and near ceiling.',
    metadata: { source: 'NIOSH Pocket Guide', type: 'gas_data' }
  },
  {
    id: 'gas-cl2',
    category: 'gas_detection',
    title: 'Chlorine (Cl2) Detection and Exposure Limits',
    text: 'Chlorine (Cl2) is a yellow-green gas with a pungent, suffocating odor. OSHA PEL: 1 ppm ceiling. NIOSH REL: 0.5 ppm TWA, 1 ppm ceiling (15 minutes). ACGIH TLV: 0.5 ppm TWA, 1 ppm STEL. IDLH: 10 ppm. Non-flammable but a strong oxidizer that supports combustion. Chlorine is heavier than air (relative density 2.49) and accumulates in low-lying areas. Effects: 0.5 ppm mild mucous membrane irritation; 1-3 ppm moderate irritation; 5-15 ppm severe irritation; 30 ppm chest pain, cough, dyspnea; 40-60 ppm toxic pneumonitis, pulmonary edema; 430 ppm lethal within 30 minutes. Used in water treatment, chemical manufacturing, pulp and paper. Electrochemical sensors most common.',
    metadata: { source: 'NIOSH Pocket Guide / EPA', type: 'gas_data' }
  },
  {
    id: 'gas-so2',
    category: 'gas_detection',
    title: 'Sulfur Dioxide (SO2) Detection and Exposure Limits',
    text: 'Sulfur Dioxide (SO2) is a colorless gas with a strong, pungent odor. OSHA PEL: 5 ppm TWA. NIOSH REL: 2 ppm TWA, 5 ppm STEL. ACGIH TLV: 0.25 ppm TWA. IDLH: 100 ppm. Non-flammable. Heavier than air (relative density 2.26). Effects: 1-5 ppm irritation of nose and throat; 5-10 ppm increased resistance to airflow; 10-50 ppm severe irritation, chest tightness; 100+ ppm life-threatening pulmonary edema. Common in sulfuric acid manufacturing, petroleum refining, smelting. Electrochemical sensors used. SO2 is also a major contributor to acid rain and industrial air pollution.',
    metadata: { source: 'NIOSH Pocket Guide', type: 'gas_data' }
  },
  {
    id: 'gas-no2',
    category: 'gas_detection',
    title: 'Nitrogen Dioxide (NO2) Detection and Exposure Limits',
    text: 'Nitrogen Dioxide (NO2) is a reddish-brown gas with a pungent, acrid odor. OSHA PEL: 5 ppm ceiling. NIOSH REL: 1 ppm STEL. ACGIH TLV: 0.2 ppm TWA. IDLH: 20 ppm. Non-flammable but a strong oxidizer. Heavier than air (relative density 1.58). Effects: 1-3 ppm mild irritation; 5 ppm cough, chest pain; 10-20 ppm pulmonary edema may be delayed 24-72 hours; 50+ ppm rapid death. Generated during welding, combustion, blasting in mines, and chemical processes. NO2 exposure symptoms may be delayed — workers may feel fine initially but develop severe pulmonary edema hours later. Medical monitoring required after any overexposure.',
    metadata: { source: 'NIOSH Pocket Guide', type: 'gas_data' }
  },
  {
    id: 'gas-benzene',
    category: 'gas_detection',
    title: 'Benzene Exposure Limits and Detection',
    text: 'Benzene (C6H6) is a colorless liquid with a sweet aromatic odor. OSHA PEL: 1 ppm TWA, 5 ppm STEL (15 minutes). NIOSH REL: 0.1 ppm TWA. ACGIH TLV: 0.5 ppm TWA, 2.5 ppm STEL. IDLH: 500 ppm. LEL: 1.2%. UEL: 7.8%. Flash point: -11°C. Benzene is a confirmed human carcinogen (IARC Group 1) causing leukemia (AML). Chronic exposure causes bone marrow suppression, aplastic anemia, and leukemia. Common in petroleum refining, petrochemical, coke ovens, rubber manufacturing. PID (photoionization detector) sensors with 10.6 eV lamp are standard for benzene detection. Biological exposure index: urinary S-phenylmercapturic acid.',
    metadata: { source: 'OSHA 29 CFR 1910.1028 / NIOSH', type: 'gas_data' }
  },
  {
    id: 'gas-co2',
    category: 'gas_detection',
    title: 'Carbon Dioxide (CO2) Detection and Exposure Limits',
    text: 'Carbon Dioxide (CO2) is a colorless, odorless gas at low concentrations. OSHA PEL: 5,000 ppm TWA. NIOSH REL: 5,000 ppm TWA, 30,000 ppm STEL. ACGIH TLV: 5,000 ppm TWA, 30,000 ppm STEL. IDLH: 40,000 ppm (4%). Non-flammable. Heavier than air (relative density 1.52), accumulates in confined spaces, pits, and low areas. Effects: 5,000 ppm headache, increased respiration; 30,000 ppm dizziness, increased blood pressure; 50,000 ppm unconsciousness within minutes; 100,000+ ppm death. NDIR (non-dispersive infrared) sensors standard for detection. Common hazard in breweries, fermentation, carbonation, fire suppression systems, agricultural silos.',
    metadata: { source: 'NIOSH Pocket Guide', type: 'gas_data' }
  },
  {
    id: 'gas-oxygen',
    category: 'gas_detection',
    title: 'Oxygen (O2) Monitoring for Confined Spaces',
    text: 'Normal atmospheric oxygen is 20.9%. OSHA defines oxygen-deficient atmosphere as below 19.5% and oxygen-enriched atmosphere as above 23.5%. Both conditions are immediately hazardous. Oxygen-deficient effects: 19.5% minimum for safe entry; 16-19.5% impaired judgment, rapid breathing; 12-16% increased pulse, poor coordination; 10-12% nausea, vomiting, inability to move freely; 6-10% loss of consciousness within minutes; below 6% death within minutes. Oxygen enrichment increases fire risk dramatically — materials that normally resist burning may ignite easily. Galvanic cell (electrochemical) sensors are standard, with typical lifespan of 1-2 years. Sensors must be calibrated in fresh air (20.9%) before each use.',
    metadata: { source: 'OSHA 29 CFR 1910.146 / NIOSH', type: 'gas_data' }
  },
  {
    id: 'gas-hcn',
    category: 'gas_detection',
    title: 'Hydrogen Cyanide (HCN) Detection and Exposure Limits',
    text: 'Hydrogen Cyanide (HCN) is a colorless to pale blue liquid/gas with a faint bitter almond odor (not detectable by 40% of population due to genetic trait). OSHA PEL: 10 ppm TWA (skin). NIOSH REL: 4.7 ppm STEL (skin). ACGIH TLV: 4.7 ppm ceiling (skin). IDLH: 50 ppm. LEL: 5.6%. UEL: 40%. HCN inhibits cytochrome c oxidase, blocking cellular respiration. Effects: 18-36 ppm slight headache after hours; 45-54 ppm tolerable for 30-60 minutes; 100 ppm death within 1 hour; 300 ppm rapidly fatal. Skin absorption is significant. Common in gold/silver extraction (cyanide leaching), electroplating, fumigation, chemical synthesis. Electrochemical sensors standard.',
    metadata: { source: 'NIOSH Pocket Guide / CDC', type: 'gas_data' }
  },

  // ═══════════════════════════════════════════
  // SECTION 4: PERMIT-TO-WORK PROCEDURES
  // ═══════════════════════════════════════════

  {
    id: 'ptw-hot-work',
    category: 'permit_to_work',
    title: 'Hot Work Permit Procedures',
    text: 'Hot work includes welding, cutting, brazing, soldering, grinding, and any operation producing sparks or flame. Before issuing a hot work permit: 1. Relocate combustibles to at least 35 feet (11 m) from work area, or protect with fire-resistant covers. 2. Ensure fire extinguishing equipment is immediately available. 3. Test atmosphere for flammable gases (must be below 10% LEL). 4. For tanks/vessels that contained flammable materials, gas-free certification is required. 5. Assign a fire watch during operations and for at least 30 minutes (NFPA 51B recommends 60 minutes) after completion. 6. Fire watch must have unobstructed view, know alarm procedures, and have appropriate extinguisher. 7. Permit valid for single shift only — must be renewed for each shift.',
    metadata: { source: 'NFPA 51B / OSHA 29 CFR 1910.252', type: 'procedure' }
  },
  {
    id: 'ptw-confined-space-entry',
    category: 'permit_to_work',
    title: 'Confined Space Entry Permit Procedures',
    text: 'Before entry into a permit-required confined space: 1. Issue written entry permit specifying space, purpose, date, authorized entrants, attendants, and entry supervisor. 2. Isolate the space — blank/blind all piping, de-energize electrical per LOTO, secure mechanical equipment. 3. Purge, ventilate, and inert as necessary. 4. Test atmosphere before entry: O2 (19.5-23.5%), LEL (<10%), toxic gases (below PEL). 5. Test at multiple levels (top, middle, bottom). 6. Continuous atmospheric monitoring during occupancy. 7. Provide adequate ventilation (minimum 20 air changes per hour recommended). 8. Station trained attendant outside at all times. 9. Rescue plan and equipment must be in place — rescue team or retrieval system with mechanical advantage. 10. Communication between entrant and attendant must be maintained.',
    metadata: { source: 'OSHA 29 CFR 1910.146', type: 'procedure' }
  },
  {
    id: 'ptw-electrical-isolation',
    category: 'permit_to_work',
    title: 'Electrical Isolation and Lockout/Tagout Procedures',
    text: 'Lockout/Tagout (LOTO) for electrical isolation: 1. Notify all affected employees. 2. Identify all energy sources (electrical, hydraulic, pneumatic, mechanical, thermal, chemical, gravitational). 3. Shut down equipment using normal stopping procedure. 4. Operate energy isolating devices (breakers, disconnect switches, valves) to isolate from energy sources. 5. Apply personal lockout device and tag to each isolating device. 6. Dissipate or restrain stored energy (capacitors, springs, elevated parts, rotating flywheels, hydraulic/pneumatic pressure). 7. Verify isolation by attempting to restart equipment and using appropriate test equipment (voltmeter for electrical). 8. For group LOTO, each worker applies their own lock — no worker can be locked out by another. 9. Removal only by the person who applied the lock.',
    metadata: { source: 'OSHA 29 CFR 1910.147 / NFPA 70E', type: 'procedure' }
  },
  {
    id: 'ptw-working-at-height',
    category: 'permit_to_work',
    title: 'Working at Height Permit Procedures',
    text: 'Work at height applies to any work where a person could fall a distance liable to cause personal injury (typically 6 feet/1.8 m per OSHA, 2 meters per many international standards). Permit requirements: 1. Competent person must assess the work and select appropriate equipment. 2. Hierarchy of controls: avoid work at height where possible, use collective protection (guardrails, safety nets), then personal protection (harnesses, lanyards). 3. Full body harness with shock-absorbing lanyard or self-retracting lifeline mandatory when guardrails not feasible. 4. Anchor points must support 5,000 lbs per attached worker (OSHA) or 2x the foreseeable load. 5. Inspect all equipment before each use. 6. Free fall distance must be limited to 6 feet maximum. 7. Rescue plan must be established before work begins — suspension trauma can cause death within 30 minutes of fall arrest.',
    metadata: { source: 'OSHA 29 CFR 1926 Subpart M / EN 363', type: 'procedure' }
  },
  {
    id: 'ptw-excavation',
    category: 'permit_to_work',
    title: 'Excavation and Trenching Permit Procedures',
    text: 'OSHA 29 CFR 1926 Subpart P requires: 1. Locate underground utilities before digging (call 811 or equivalent). 2. Competent person must inspect excavation daily and after rain, vibration, or other hazards. 3. Protective systems required for trenches 5 feet (1.5 m) or deeper: sloping/benching, shoring, or trench shields. 4. Soil classification (Type A-stable rock, Type B-medium, Type C-granular) determines allowable slope. Type C requires 1.5H:1V slope. 5. Keep spoil pile at least 2 feet from edge. 6. Means of egress (ladder, ramp, stairway) within 25 feet of lateral travel for trenches 4 feet or deeper. 7. Atmospheric testing required if hazardous atmosphere potential exists. 8. Water accumulation must be controlled. 9. No work permitted beneath raised loads.',
    metadata: { source: 'OSHA 29 CFR 1926 Subpart P', type: 'procedure' }
  },
  {
    id: 'ptw-radiography',
    category: 'permit_to_work',
    title: 'Radiography Work Permit Procedures',
    text: 'Radiography using ionizing radiation for weld inspection, vessel integrity testing, or pipeline inspection requires a specific permit. Requirements: 1. Only licensed and certified radiographers may perform work. 2. Establish controlled area boundary using appropriate signage and barriers — public dose limit 1 mSv/year, occupational limit 20 mSv/year (AERB). 3. Personal dosimeters (TLD badges) mandatory for all workers within controlled area. 4. Area monitoring with radiation survey meter before, during, and after exposure. 5. Minimum exclusion distance based on source activity, typically 15-30 meters for industrial sources. 6. Night-time or shutdown periods preferred to minimize personnel exposure. 7. Emergency procedures for source stuck in exposed position must be documented.',
    metadata: { source: 'AERB Safety Code AERB/RF-IR/SG-1 / OSHA 29 CFR 1910.1096', type: 'procedure' }
  },
  {
    id: 'ptw-lifting-operations',
    category: 'permit_to_work',
    title: 'Lifting Operations Permit Procedures',
    text: 'Lifting operations involving cranes, hoists, and rigging require: 1. Lift plan for all critical lifts (loads exceeding 75% of rated capacity, personnel lifts, lifts over live equipment, blind lifts). 2. Competent person must determine load weight, center of gravity, rigging configuration, and crane capacity at working radius. 3. All rigging equipment (slings, shackles, hooks) must be inspected before use and have legible load ratings. 4. Never exceed Safe Working Load (SWL) of any component. 5. Tag lines must be used to control the load. 6. No personnel under suspended loads. 7. Operator must have clear sight of load or use a qualified signal person. 8. Ground conditions must support crane outrigger loads. 9. Maintain safe distance from overhead power lines (minimum 10 feet for <50kV, 35 feet for >350kV).',
    metadata: { source: 'ASME B30.5 / OSHA 29 CFR 1926 Subpart CC', type: 'procedure' }
  },

  // ═══════════════════════════════════════════
  // SECTION 5: EMERGENCY RESPONSE PROTOCOLS
  // ═══════════════════════════════════════════

  {
    id: 'er-fire',
    category: 'emergency_response',
    title: 'Fire Emergency Response Protocol',
    text: 'Fire emergency response follows the RACE protocol: R — Rescue anyone in immediate danger. A — Alarm: activate the nearest fire alarm pull station, call emergency services (fire brigade, 101 in India). C — Contain: close doors and windows to limit fire spread, shut off utilities if safe to do so. E — Extinguish/Evacuate: attempt to extinguish small fires using appropriate extinguisher (Class A-water, Class B-CO2/foam, Class C-dry chemical, Class D-special metal agent, Class K-wet chemical), or evacuate via designated routes. Evacuation: proceed to assembly point, account for all personnel using head count or badge system. Do not use elevators. Do not re-enter until fire chief gives all-clear. Firewater system must maintain minimum 4 bar pressure at highest point.',
    metadata: { source: 'NFPA 101 Life Safety Code / NBC India', type: 'protocol' }
  },
  {
    id: 'er-gas-leak',
    category: 'emergency_response',
    title: 'Gas Leak Emergency Response Protocol',
    text: 'Gas leak response — Toxic/Flammable gases: 1. IMMEDIATE: Activate gas alarm, alert control room, initiate emergency shutdown of affected section. 2. UPWIND: Approach from upwind direction. Establish upwind command post. 3. EVACUATE: Clear the affected area and downwind zones. Determine evacuation radius based on ERG (Emergency Response Guidebook) or site-specific ERP. 4. ISOLATE: Shut off gas source if safe to do so — close emergency isolation valves (EIV/ESV). 5. ELIMINATE IGNITION SOURCES: No smoking, no phones in hazard zone, stop hot work. 6. MONITOR: Deploy portable gas detectors to define hazard perimeter. 7. For H2S: evacuation if >100 ppm, SCBA required for rescue; for NH3: water spray to knock down cloud; for Cl2: evacuate 100-330 feet crosswind, do NOT apply water to chlorine leaks. 8. Medical triage for exposed personnel.',
    metadata: { source: 'ERG 2020 / NIOSH / OISD-GDN-117', type: 'protocol' }
  },
  {
    id: 'er-chemical-spill',
    category: 'emergency_response',
    title: 'Chemical Spill Response Protocol',
    text: 'Chemical spill response: 1. ASSESS: Identify the chemical using labels, SDS, or manifest. Determine hazard category (flammable, corrosive, toxic, reactive, oxidizer). 2. PROTECT: Don appropriate PPE — minimum chemical splash goggles, chemical-resistant gloves, and apron for minor spills; full Level A or B encapsulated suit for unknown or highly toxic materials. 3. CONTAIN: Stop the source if safe. Build dike/berm around spill using absorbent socks, earth, or sand. Prevent entry into drains, waterways, or soil. 4. NOTIFY: Report to EHS, emergency coordinator, and regulatory authorities as required (CERCLA for >RQ, state emergency response commission). 5. CLEAN UP: Absorb liquids with appropriate absorbent material. Neutralize acids with sodium bicarbonate, bases with citric acid (only if trained). 6. DISPOSE: Collect all contaminated materials as hazardous waste per regulations.',
    metadata: { source: 'EPA 40 CFR 302 / OSHA HAZWOPER', type: 'protocol' }
  },
  {
    id: 'er-medical-emergency',
    category: 'emergency_response',
    title: 'Medical Emergency Response Protocol',
    text: 'Medical emergency response: 1. Ensure scene safety — do not become a second victim. 2. Call for help — activate emergency medical services, call site medical team (108/ambulance in India). 3. Provide first aid within training level: Check ABCs (Airway, Breathing, Circulation). For unconscious breathing victim — recovery position. For cardiac arrest — CPR with AED if available (30 compressions : 2 breaths). For severe bleeding — direct pressure, tourniquet if life-threatening extremity hemorrhage. For burns — cool with clean running water for minimum 20 minutes (do not use ice). For chemical eye exposure — flush with water for minimum 15 minutes (30 minutes for alkali). 4. Record vital signs and treatment for handover to EMS. 5. Preserve scene if work-related injury for investigation.',
    metadata: { source: 'First Aid Guidelines / OSHA', type: 'protocol' }
  },
  {
    id: 'er-evacuation',
    category: 'emergency_response',
    title: 'Evacuation Procedures and Assembly Points',
    text: 'Facility evacuation procedure: 1. Emergency alarm activation — distinct alarm for evacuation (continuous siren vs. intermittent for shelter-in-place). 2. All non-essential personnel stop work, secure processes to safe state, and proceed to nearest assembly point via designated evacuation route. 3. Floor wardens sweep their assigned areas to ensure complete evacuation. 4. Mobility-impaired personnel assisted to designated rescue areas. 5. At assembly points, department heads conduct headcount using roster/badge system and report to Emergency Commander. 6. Missing persons reported immediately to search and rescue team. 7. No re-entry until Emergency Commander issues all-clear. 8. Evacuation drills required minimum twice per year (OSHA) — quarterly for high-hazard facilities. Evacuation routes must be marked with photoluminescent signage per OSHA 29 CFR 1910.37.',
    metadata: { source: 'OSHA 29 CFR 1910.38 / NFPA 101', type: 'protocol' }
  },
  {
    id: 'er-rescue-confined-space',
    category: 'emergency_response',
    title: 'Confined Space Rescue Protocol',
    text: 'Confined space rescue: 1. NEVER attempt rescue without proper training, equipment, and authority — over 60% of confined space fatalities are rescuers. 2. Non-entry rescue is preferred — use retrieval system (tripod, winch, full body harness with D-ring) if space configuration allows. 3. For entry rescue, rescue team must: have SCBA or supplied-air respirator, be trained in confined space rescue, have current first aid/CPR certification. 4. Continuous atmospheric monitoring during rescue — conditions may have changed. 5. Establish communication with victim if conscious. 6. Rescue team enters with lifeline and backup attendant monitors from outside. 7. Victim extraction — horizontal drag using SKED stretcher or basket stretcher for vertical. 8. Begin medical treatment immediately upon extraction. 9. Report to emergency medical services — describe atmosphere and exposure duration.',
    metadata: { source: 'OSHA 29 CFR 1910.146 / NFPA 350', type: 'protocol' }
  },
  {
    id: 'er-earthquake',
    category: 'emergency_response',
    title: 'Earthquake Emergency Response Protocol',
    text: 'Earthquake response for industrial facilities: During shaking: DROP, COVER, HOLD ON. Move away from windows, heavy equipment, and shelving. For process plant: Emergency shutdown of critical processes may initiate automatically via seismic sensors. After shaking stops: 1. Check for injuries and provide first aid. 2. Check for fires, gas leaks (smell, hissing sounds), structural damage. 3. Shut off utilities at source if damage suspected. 4. Evacuate if building damage is evident. 5. Do not enter damaged structures. 6. Check storage tanks for leaks, level changes, or foundation damage. 7. Inspect pressure vessels and piping for damage — do not restart process until integrity verified. 8. Be prepared for aftershocks. 9. Report status to Emergency Commander. Seismic Zone IV and V facilities (per IS 1893) must have seismic ERP.',
    metadata: { source: 'IS 1893:2016 / BIS / NDMA Guidelines', type: 'protocol' }
  },
  {
    id: 'er-tsunami',
    category: 'emergency_response',
    title: 'Tsunami Warning Response for Coastal Industrial Facilities',
    text: 'Tsunami emergency response for coastal refineries, ports, and industrial zones: 1. Natural warning signs: strong earthquake felt, unusual sea recession, roaring ocean sound. 2. Official warning from INCOIS (Indian National Centre for Ocean Information Services) via ITEWC. 3. Immediately evacuate all personnel from coastal low-lying areas to designated high ground (minimum 30 meters elevation or 2 km inland). 4. Secure all hazardous materials, close tank valves, initiate emergency shutdown of waterfront operations. 5. Move vessels to deep water if time permits (>30 minutes warning). 6. Do not return until official all-clear from NDMA/SDMA. 7. After tsunami: check for contamination of water supplies, structural damage to storage tanks, and pipeline ruptures.',
    metadata: { source: 'NDMA Tsunami Guidelines / INCOIS', type: 'protocol' }
  },
  {
    id: 'er-shelter-in-place',
    category: 'emergency_response',
    title: 'Shelter-in-Place Protocol for Toxic Gas Release',
    text: 'Shelter-in-place is appropriate when evacuation would increase exposure to a toxic gas cloud: 1. Activate shelter-in-place alarm (distinct from evacuation alarm). 2. Move indoors to designated shelter rooms (preferably interior rooms on upper floors). 3. Close all doors, windows, and HVAC dampers. 4. Seal gaps around doors and windows with wet towels or plastic sheeting and duct tape. 5. Turn off all air handling equipment — fans, ACs, ventilation systems. 6. Account for all personnel within the shelter. 7. Monitor wind direction and gas concentration via control room or portable monitors. 8. Maintain communication with emergency coordinator. 9. Remain sheltered until all-clear from Emergency Commander. 10. After all-clear, ventilate building thoroughly before resuming normal activities. For ammonia: upper floors preferred (lighter than air). For chlorine: upper floors critical (heavier than air settles low).',
    metadata: { source: 'EPA Shelter-in-Place Guidance / OISD', type: 'protocol' }
  },

  // ═══════════════════════════════════════════
  // SECTION 6: INDIAN REGULATIONS
  // ═══════════════════════════════════════════

  {
    id: 'india-factories-7a',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 7A: Safety Officers',
    text: 'Section 7A of the Factories Act 1948 mandates that every factory wherein one thousand or more workers are ordinarily employed, or wherein any manufacturing process or operation is carried on which involves any risk of bodily injury, poisoning, disease, or any other hazard to health, the occupier shall employ such number of Safety Officers as may be prescribed. Safety Officers must possess the qualifications prescribed under the Factories (Amendment) Act 1987. The Safety Officer shall advise and assist the occupier/factory manager in fulfilling their obligations under the Act, carry out safety surveys, investigate accidents, organize safety week celebrations, and maintain safety statistics. The Safety Officer should report directly to the occupier or the person in charge of the factory.',
    metadata: { source: 'Factories Act 1948, Section 7A', type: 'indian_law', year: 1987 }
  },
  {
    id: 'india-factories-11',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 11: Cleanliness',
    text: 'Section 11 of the Factories Act 1948 requires that every factory shall be kept clean and free from effluvia arising from any drain, privy, or other nuisance. Accumulation of dirt and refuse must be removed daily by sweeping or other effective method. The floor of every workroom must be cleaned at least once every week by washing, using disinfectant where necessary. Effective means of drainage shall be provided and maintained. All inside walls and partitions, ceilings, and tops of rooms, and all walls and sides of passages and staircases shall be repainted or revarnished at least once in every period of five years, or whitewashed or color-washed at least once in every period of fourteen months.',
    metadata: { source: 'Factories Act 1948, Section 11', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-13',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 13: Ventilation and Temperature',
    text: 'Section 13 requires that effective and suitable provision shall be made in every factory for securing and maintaining in every workroom adequate ventilation by the circulation of fresh air, and such a temperature as will secure to workers therein reasonable conditions of comfort and prevent injury to health. The walls and roof shall be of such material and so designed that such temperature shall not be exceeded but kept as low as practicable. The State Government may prescribe a standard of adequate ventilation and reasonable temperature for any factory or class of factories. Where the nature of work generates excessive heat, effective measures for its reduction must be adopted.',
    metadata: { source: 'Factories Act 1948, Section 13', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-14',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 14: Dust and Fume',
    text: 'Section 14 requires that in every factory in which, by reason of the manufacturing process carried on, there is given off any dust or fume or other impurity of such a nature and to such an extent as is likely to be injurious or offensive to the workers employed therein, or any dust in substantial quantities, effective and suitable provision shall be made to prevent its inhalation and accumulation in any workroom, and if any exhaust appliance is necessary, it shall be applied as near as possible to the point of origin of the dust, fume, or other impurity, and such point shall be enclosed so far as possible. The State Government may prescribe the maximum concentration of dust or fume permissible in any factory.',
    metadata: { source: 'Factories Act 1948, Section 14', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-36',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 36: Self-Acting Machines',
    text: 'Section 36 provides that no traversing part of a self-acting machine in any factory and no material carried thereon shall, if the space over which it runs is a space over which any person is liable to pass, whether in the course of his employment or otherwise, be allowed to run on its outward or inward traverse within a distance of eighteen inches from any fixed structure which is not part of the machine. The Inspector may direct that in any particular case this requirement shall apply even if no person is liable to pass over the space.',
    metadata: { source: 'Factories Act 1948, Section 36', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-38',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 38: Hoists and Lifts',
    text: 'Section 38 requires that every hoist and lift in a factory shall be of good mechanical construction, sound material, and adequate strength, properly maintained, and thoroughly examined by a competent person at least once in every period of six months. A register shall be kept containing the prescribed particulars of every such examination. Every hoist way and lift way shall be sufficiently protected by an enclosure fitted with gates. The maximum safe working load shall be plainly marked on every hoist or lift. No person shall be carried on a hoist or lift unless it is constructed and maintained for carrying persons, with maximum number of persons plainly marked.',
    metadata: { source: 'Factories Act 1948, Section 38', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-40',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 40: Pressure Plant',
    text: 'Section 40 requires that where in any factory any plant or machinery or any part thereof is operated at a pressure above atmospheric pressure, effective measures shall be taken to ensure that the safe working pressure of such plant or machinery or part is not exceeded. The State Government may make rules providing for examination and testing of any plant or machinery and prescribing the maximum permissible working pressure. The owner must maintain a record of examination and testing results. Pressure vessels must conform to Indian standards and be tested hydrostatically before use and periodically thereafter.',
    metadata: { source: 'Factories Act 1948, Section 40', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-41a',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 41A: Site Appraisal Committee',
    text: 'Section 41A (inserted by Amendment Act 1987) mandates that the State Government shall appoint a Site Appraisal Committee for granting permission to the occupier of a factory involving a hazardous process. The Committee shall examine an application for establishing a factory involving hazardous processes and advise the State Government about the suitability of the proposed site, having regard to the population, water supply, waste disposal, and other relevant factors. No factory involving a hazardous process shall be established without previous permission of the State Government upon recommendation of the Site Appraisal Committee.',
    metadata: { source: 'Factories Act 1948, Section 41A', type: 'indian_law', year: 1987 }
  },
  {
    id: 'india-factories-41b',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 41B: Compulsory Disclosure of Information',
    text: 'Section 41B requires the occupier of every factory involving a hazardous process to disclose information regarding dangers, including health hazards and the measures to overcome them, to workers employed in the factory, the Chief Inspector, the local authority within whose jurisdiction the factory is situated, and the general public living in the vicinity of the factory. The occupier shall draw up an on-site emergency plan and detailed disaster control measures for the factory, and make these available to workers. The occupier shall also inform the Chief Inspector of the nature and details of hazardous processes and quantities of hazardous substances handled.',
    metadata: { source: 'Factories Act 1948, Section 41B', type: 'indian_law', year: 1987 }
  },
  {
    id: 'india-factories-87',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 87: Dangerous Operations',
    text: 'Section 87 empowers the State Government to make rules requiring that in respect of any factory or class of factories in which any manufacturing process or operation exposes any persons employed in it to a serious risk of bodily injury, poisoning, or disease, such manufacturing process or operation shall be carried on under defined conditions or shall be prohibited. Rules may require medical examination of workers, prohibit employment of women and young persons, provide for protective equipment, restrict hours of work, and require adequate washing facilities. Specific rules have been made for manufacture of aerated water, electroplating, handling of asbestos, lead processes, and exposure to benzene.',
    metadata: { source: 'Factories Act 1948, Section 87', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-88',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 88: Notice of Certain Accidents',
    text: 'Section 88 requires that where in any factory any accident occurs which causes death, or which causes any bodily injury by reason of which the person injured is prevented from working for a period of 48 hours or more immediately following the accident, the manager of the factory shall send notice thereof to the Inspector, Chief Inspector, and such other authorities as prescribed, in the prescribed form and within the prescribed time. For fatal accidents, notice must be sent immediately. For serious bodily injuries, notice must be sent within twelve hours. The scene of the accident must be preserved until inspected by the Inspector unless preservation is impracticable.',
    metadata: { source: 'Factories Act 1948, Section 88', type: 'indian_law', year: 1948 }
  },
  {
    id: 'india-factories-88a',
    category: 'indian_regulations',
    title: 'Factories Act 1948 — Section 88A: Notice of Certain Dangerous Occurrences',
    text: 'Section 88A requires notice of dangerous occurrences whether or not they result in bodily injury. Dangerous occurrences include: bursting of a pressure vessel, collapse or failure of crane, hoist, or lifting machinery, explosion or fire causing damage to any room or plant, collapse of a building, floor, wall, or gallery, uncontrolled release of any substance likely to cause bodily injury, and any other event prescribed by the State Government. The manager must report to the Chief Inspector within 12 hours and follow up with a detailed written report within 30 days.',
    metadata: { source: 'Factories Act 1948, Section 88A', type: 'indian_law', year: 1987 }
  },
  {
    id: 'india-oisd-116',
    category: 'indian_regulations',
    title: 'OISD Standard 116 — Fire Protection Facilities for Petroleum Refineries and Oil/Gas Processing Plants',
    text: 'OISD-STD-116 specifies minimum fire protection requirements for petroleum refineries, gas processing plants, and petrochemical plants. Key requirements: Fire water network shall be designed for minimum 4 hours of continuous operation at the maximum demand rate. Fire water storage capacity minimum 4 hours at maximum demand. Fire water pumps: minimum two pumps (one electric, one diesel), each capable of meeting 100% of maximum demand. Foam system for hydrocarbon storage tanks — fixed foam pouring system for tanks ≥20m diameter. Cooling water spray system for adjacent tanks within fire exposure distance. Medium velocity water spray for LPG/propane spheres and bullets. Fire hydrants at maximum 30m intervals around process units and 45m intervals along roads.',
    metadata: { source: 'OISD-STD-116 (Rev 3)', type: 'indian_standard' }
  },
  {
    id: 'india-oisd-144',
    category: 'indian_regulations',
    title: 'OISD Standard 144 — Liquefied Petroleum Gas (LPG) Installations',
    text: 'OISD-STD-144 covers design, construction, operation, and maintenance requirements for LPG storage, handling, and distribution installations. Minimum safety distances: LPG storage from property boundary — Mounded: 15m for ≤100 MT, 30m for >500 MT; Unmounded spheres/bullets: 30m for ≤100 MT, 60m for >500 MT. Instrumentation: pressure and temperature indicators, high-level alarms, emergency shutdown valves (ESV), excess flow check valves. Fire protection: medium velocity water spray system at application rate of 10.2 liters/min/m² for spheres and bullets. Gas detection: fixed combustible gas detectors at all potential leak points, alarm at 20% LEL, executive action at 40% LEL.',
    metadata: { source: 'OISD-STD-144 (Rev 2)', type: 'indian_standard' }
  },
  {
    id: 'india-oisd-150',
    category: 'indian_regulations',
    title: 'OISD Standard 150 — Design and Safety Requirements for Cross-Country Pipelines',
    text: 'OISD-STD-150 covers safety requirements for cross-country hydrocarbon liquid and gas pipelines. Pipeline design factors: Class 1 (rural, <10 buildings) — 0.72, Class 2 (fringe) — 0.60, Class 3 (suburban) — 0.50, Class 4 (urban, 4+ story buildings) — 0.40. Depth of cover: minimum 1.2m in normal soil, 1.5m at road/railway crossings, 1.8m at river crossings. Pipeline patrol: weekly aerial/foot patrol in Class 1-2, twice weekly in Class 3-4. Cathodic protection mandatory for all buried steel pipelines. Leak detection system (computational pipeline monitoring) required for liquid pipelines >100 km. Sectionalizing valves at maximum 16 km intervals for gas pipelines in Class 3-4 areas.',
    metadata: { source: 'OISD-STD-150 (Rev 1)', type: 'indian_standard' }
  },
  {
    id: 'india-oisd-154',
    category: 'indian_regulations',
    title: 'OISD Standard 154 — Safety Aspects in Functional Design of Petroleum Depots',
    text: 'OISD-STD-154 covers safety requirements for petroleum product storage depots (POL depots). Tank farm layout: minimum inter-tank distance — floating roof tanks: 0.5D (but not less than 10m); fixed roof tanks: 0.5D (not less than 10m); for tanks ≤9m diameter: one-third diameter. Dyke capacity: 110% of largest tank within dyked area. Maximum tanks within one dyke: fixed roof — 6, floating roof — 12. Tank breathing and venting: pressure/vacuum valves sized per API 2000. Electrical classification: Zone 0 inside tanks; Zone 1 within 3m of vents, fill points, and loading/unloading points; Zone 2 extending 15m from Zone 1 boundary.',
    metadata: { source: 'OISD-STD-154 (Rev 2)', type: 'indian_standard' }
  },
  {
    id: 'india-oisd-169',
    category: 'indian_regulations',
    title: 'OISD Standard 169 — Inspection of Static Equipment in Petroleum Industry',
    text: 'OISD-RP-169 provides guidelines for inspection of static equipment (pressure vessels, heat exchangers, columns, reactors, storage tanks) in petroleum industry. Inspection intervals: Internal inspection — maximum 6 years for process vessels, 10 years for storage tanks (per API 653). External inspection — annually. On-stream inspection: ultrasonic thickness measurement at designated corrosion monitoring locations. Minimum retirement thickness to be calculated per ASME/API standards. Risk-Based Inspection (RBI) may be used to optimize inspection intervals. NDE methods: visual examination, ultrasonic testing (UT), magnetic particle testing (MPT), radiographic testing (RT), and liquid penetrant testing (LPT). Fitness-for-service assessment per API 579 for equipment with identified flaws.',
    metadata: { source: 'OISD-RP-169', type: 'indian_standard' }
  },
  {
    id: 'india-oisd-171',
    category: 'indian_regulations',
    title: 'OISD Standard 171 — Inspection of Pressure Relieving Devices',
    text: 'OISD-RP-171 provides guidelines for inspection, testing, and maintenance of pressure relieving devices (PRDs) including safety valves, relief valves, and rupture discs. All PRDs must be tested and calibrated at least once every 2 years unless Risk-Based Inspection justifies an extended interval (maximum 4 years). Set pressure tolerance: ±3% for set pressures ≤70 bar, ±2% for >70 bar. Documentation must include tag number, location, set pressure, test date, test results, and next test date. Rupture discs must be replaced at maximum 5-year intervals unless the manufacturer certifies a longer service life. PRDs must not be blocked or isolated without written management approval and alternate protection.',
    metadata: { source: 'OISD-RP-171', type: 'indian_standard' }
  },
  {
    id: 'india-oisd-156',
    category: 'indian_regulations',
    title: 'OISD Standard 156 — Safety in Lubricating Oil and Grease Installations',
    text: 'OISD-STD-156 covers safety requirements for lube oil blending, grease manufacturing, and lube oil storage installations. Flash point classification: Class A (flash point below 23°C), Class B (23-65°C), Class C (65-93°C), Excluded (above 93°C). Storage layout follows Petroleum Rules 2002 for inter-tank distances. Blending kettles with heating systems: temperature controls with high-temperature alarm and automatic shutdown. Grease manufacturing kettles operating above flash point: inert gas blanketing or adequate ventilation. Static grounding for all equipment handling volatile products. Spillage containment for blending and filling areas.',
    metadata: { source: 'OISD-STD-156', type: 'indian_standard' }
  },
  {
    id: 'india-mines-act',
    category: 'indian_regulations',
    title: 'Mines Act 1952 — Key Safety Provisions',
    text: 'The Mines Act 1952 governs safety, welfare, and working conditions in mines across India. Key provisions: Section 17 — Mining operations must be under a qualified manager. Section 18 — Duties of mine owners, agents, and managers. Section 19 — Reporting of accidents causing death or serious bodily injury to Chief Inspector within 24 hours. Section 22 — Notice of certain diseases (lead poisoning, phosphorus poisoning, silicosis, asbestosis). Section 23 — Power of inspectors to enter, examine, and inquire. Section 24 — Medical examination of workers. Section 40 — Limitation of daily hours of work (not exceeding 10 hours). Section 45 — Leave with wages. Section 57 — Power of Central Government to make rules for safety and health. The Mines Rules 1955, Coal Mines Regulations 2017, and Metalliferous Mines Regulations 1961 provide detailed safety requirements.',
    metadata: { source: 'Mines Act 1952', type: 'indian_law', year: 1952 }
  },
  {
    id: 'india-dgms-circular-strata',
    category: 'indian_regulations',
    title: 'DGMS Circular — Strata Control in Underground Coal Mines',
    text: 'DGMS (Directorate General of Mines Safety) circulars on strata control mandate: All underground coal mines must have a Strata Control Cell headed by a qualified mining engineer. Systematic support design based on Rock Mass Rating (RMR) or Q-system classification. Roof bolting as primary support in competent strata — bolt length minimum 1.5m, spacing not exceeding 1.2m × 1.2m. Standing support (props, cribs) in weak/disturbed strata. Breaker line supports of adequate capacity for longwall faces. Gallery dimensions not to exceed the approved dimensions in the mine plan. Telltale extensometers for monitoring roof convergence — maximum permissible convergence before re-support. Prohibition of work under unsupported roof. Systematic goaf management — sand stowing or hydraulic stowing in degree III seams.',
    metadata: { source: 'DGMS Technical Circulars', type: 'indian_standard' }
  },
  {
    id: 'india-dgms-circular-ventilation',
    category: 'indian_regulations',
    title: 'DGMS Circular — Mine Ventilation Standards',
    text: 'DGMS ventilation standards for underground mines mandate: Minimum air velocity at working face — 1 m/s in coal mines, 0.3 m/s in metalliferous mines. Air quantity at working face — minimum 6 m³/s for development headings, 9 m³/s for longwall faces. Methane concentration limits: not to exceed 0.75% at working face, 1.25% in return airway — if exceeded, all electrical equipment must be switched off and workers withdrawn. Main ventilation fans must be dual installation (one standby). Fan operation to be monitored continuously with automatic alarm for fan stoppage. Quarterly ventilation surveys mandatory. Ventilation plan to be reviewed and approved by Regional Inspector of Mines. Carbon dioxide concentration not to exceed 0.5% in working places.',
    metadata: { source: 'DGMS / Coal Mines Regulations 2017', type: 'indian_standard' }
  },
  {
    id: 'india-dgms-circular-electrical',
    category: 'indian_regulations',
    title: 'DGMS Circular — Electrical Safety in Mines',
    text: 'DGMS circulars on electrical safety in mines require: All electrical apparatus in gassy coal mines must be flameproof (Ex d) or intrinsically safe (Ex i) certified. Earth fault protection: earth leakage relay with sensitivity ≤125 mA for trailing cables. All metallic structures must be properly earthed — earth resistance not exceeding 1 ohm. Competent electrical supervisor must be appointed for mines using electricity above 650V. Permit-to-work system mandatory for all electrical maintenance. Isolation and earthing before maintenance — minimum two points of isolation for HV circuits. Prohibition of live-line working in mines. Emergency power supply for safety-critical systems: pumping, ventilation, winding. Electrical installation inspection by competent person quarterly.',
    metadata: { source: 'DGMS / Indian Electricity Rules', type: 'indian_standard' }
  },
  {
    id: 'india-peso-petroleum-rules',
    category: 'indian_regulations',
    title: 'Petroleum Rules 2002 — Storage and Transport Safety',
    text: 'The Petroleum Rules 2002, notified under the Petroleum Act 1934, regulate storage, transport, and distribution of petroleum products. Key provisions: License required for storage exceeding specified limits — Class A petroleum: >30 liters, Class B: >2,500 liters, Class C: not less than 45,000 liters. Tank construction: steel tanks designed to API 650 or IS 803. Minimum distances: petroleum storage from building — 15m for ≤2,700 kL, 23m for 2,700-45,000 kL, 30m for >45,000 kL. Vent pipes: flame arrestors on all tank vents. Static electricity precautions: bonding and grounding of all equipment, maximum road tanker filling rate of 1.2 m/s until fill pipe submerged. Tank truck loading/unloading: engine to be switched off, earthing clip connected. Administered by PESO (Petroleum and Explosives Safety Organisation), Nagpur.',
    metadata: { source: 'Petroleum Rules 2002 / Petroleum Act 1934', type: 'indian_law' }
  },
  {
    id: 'india-peso-explosives',
    category: 'indian_regulations',
    title: 'Explosives Act 1884 and Explosives Rules 2008',
    text: 'The Explosives Act 1884 (amended 1983) and Explosives Rules 2008 regulate manufacture, possession, use, sale, transport, and import of explosives. License from PESO (formerly CCOE) required for all activities involving explosives. Storage: licensed magazines with minimum quantity and distance requirements — for blasting explosives, safety distance based on quantity-distance tables (e.g., 50 kg requires minimum 65m from inhabited building). Transport: in approved vehicles with valid transport permit, explosives and detonators in separate compartments. In mines: blasting only under supervision of a shot firer holding a valid certificate. Maximum charge per delay: calculated based on scaled distance and vibration limits (peak particle velocity ≤5 mm/s for residential structures per DGMS).',
    metadata: { source: 'Explosives Act 1884 / Explosives Rules 2008', type: 'indian_law' }
  },
  {
    id: 'india-epact-environment',
    category: 'indian_regulations',
    title: 'Environment Protection Act 1986 — Industrial Safety Provisions',
    text: 'The Environment (Protection) Act 1986 empowers the Central Government to take measures for environmental protection and to coordinate actions of state governments and other authorities. Key safety-related provisions: Section 7 — No industry shall discharge pollutants in excess of prescribed standards. Section 8 — Persons handling hazardous substances must comply with procedures and safeguards. The Hazardous and Other Wastes (Management and Transboundary Movement) Rules 2016 require: registration and authorization for hazardous waste generation, storage, and disposal. Environment Impact Assessment (EIA) Notification 2006 mandates environmental clearance for specified industrial activities. The Chemical Accidents (Emergency Planning, Preparedness, and Response) Rules 1996 require district-level crisis groups and onsite/offsite emergency plans for MAH (Major Accident Hazard) units.',
    metadata: { source: 'Environment Protection Act 1986 / MOEF&CC', type: 'indian_law', year: 1986 }
  },
  {
    id: 'india-ndma-chemical',
    category: 'indian_regulations',
    title: 'NDMA Guidelines on Chemical (Industrial) Disaster Management',
    text: 'National Disaster Management Authority (NDMA) guidelines for chemical disaster management require: Identification and classification of Major Accident Hazard (MAH) installations under the MSIHC Rules 1989. On-site Emergency Plan (OEP): factory-level plan covering emergency organization, communication, medical response, evacuation, and media management. Off-site Emergency Plan: district-level plan coordinated by District Collector, covering community warning systems, evacuation routes, medical facilities, and mutual aid agreements. Mock drills: at least once every six months for on-site plans, annually for off-site plans. Chemical disaster database at state and district levels. GIS-based vulnerability mapping considering population density, wind patterns, and topography. 24/7 emergency response center at district level.',
    metadata: { source: 'NDMA Chemical Disaster Guidelines 2007', type: 'indian_standard' }
  },

  // ═══════════════════════════════════════════
  // SECTION 7: PROCESS SAFETY MANAGEMENT
  // ═══════════════════════════════════════════

  {
    id: 'psm-14-elements',
    category: 'process_safety',
    title: 'PSM 14 Elements Overview',
    text: 'Process Safety Management (PSM) under OSHA 29 CFR 1910.119 comprises 14 elements: 1. Employee Participation — workers involved in PHA and procedure development. 2. Process Safety Information — comprehensive documentation of chemical hazards, process technology, and equipment. 3. Process Hazard Analysis — systematic evaluation of hazards using HAZOP, What-If, FMEA, etc., updated every 5 years. 4. Operating Procedures — written procedures for each operating phase (startup, normal, shutdown, emergency). 5. Training — initial and refresher (every 3 years) for all process operators. 6. Contractors — evaluation of contractor safety performance. 7. Pre-Startup Safety Review — before introducing new or modified facilities. 8. Mechanical Integrity — written procedures for maintaining equipment (pressure vessels, piping, relief devices, controls). 9. Hot Work Permit. 10. Management of Change. 11. Incident Investigation — within 48 hours, report within 30 days. 12. Emergency Planning and Response. 13. Compliance Audits — at least every 3 years. 14. Trade Secrets — safety information not withheld.',
    metadata: { source: 'OSHA 29 CFR 1910.119', type: 'process_safety' }
  },
  {
    id: 'psm-moc',
    category: 'process_safety',
    title: 'Management of Change (MOC) Procedures',
    text: 'Management of Change (MOC) is a systematic procedure for managing temporary and permanent changes to process equipment, technology, procedures, and facilities. MOC applies to changes in: process chemicals, technology, equipment, procedures, and facilities — it does NOT apply to replacement in kind. MOC steps: 1. Initiate MOC request with description and justification. 2. Evaluate the technical basis for the change. 3. Assess impact on safety and health (what could go wrong?). 4. Determine if modifications to operating procedures are needed. 5. Determine required authorization and notifications. 6. Evaluate impact on process safety information and P&IDs. 7. Address training requirements for affected personnel. 8. Implement the change. 9. Pre-Startup Safety Review if the change modified process or equipment. 10. Update all affected documentation (P&IDs, operating procedures, training materials). MOC must be completed BEFORE the change is made, except for emergency changes which must be documented within 72 hours.',
    metadata: { source: 'OSHA 29 CFR 1910.119(l) / CCPS MOC Guidelines', type: 'process_safety' }
  },
  {
    id: 'psm-pha-methods',
    category: 'process_safety',
    title: 'Process Hazard Analysis Methods Comparison',
    text: 'Process Hazard Analysis (PHA) methods under PSM: 1. What-If Analysis — brainstorming approach asking "What if...?" questions about process deviations. Best for simple processes or as a preliminary review. 2. Checklist — systematic evaluation against a pre-developed list of known hazards. Good for compliance verification. 3. What-If/Checklist — combination of brainstorming and checklist approaches. 4. HAZOP — most rigorous, uses guide words applied to process parameters. Required team of 5-7 specialists. 5. FMEA — bottom-up analysis of equipment failure modes and their effects. Good for mechanical/control systems. 6. Fault Tree Analysis — top-down, deductive, starts with the undesired event and works backward to identify contributing causes. Provides quantitative probability. 7. Event Tree — inductive, starts with initiating event and follows potential consequences. PHA must address: hazards of the process, previous incidents, engineering and administrative controls, consequences of failure, facility siting, human factors, and qualitative evaluation of possible safety/health effects on employees.',
    metadata: { source: 'OSHA 29 CFR 1910.119(e) / CCPS PHA Guidelines', type: 'process_safety' }
  },
  {
    id: 'psm-mechanical-integrity',
    category: 'process_safety',
    title: 'Mechanical Integrity Program Requirements',
    text: 'The Mechanical Integrity (MI) element of PSM requires written procedures for maintaining the ongoing integrity of process equipment. Equipment covered: pressure vessels and storage tanks, piping systems (including valves), relief and vent systems and devices, emergency shutdown systems, controls and monitoring devices (including sensors and alarms), pumps, and rotating equipment. Requirements: 1. Written procedures for maintaining equipment. 2. Training for maintenance personnel. 3. Inspections and tests performed on process equipment following recognized and generally accepted good engineering practices (RAGAGEP) such as API, ASME, NFPA codes. 4. Deficiency correction before further use or in a safe and timely manner. 5. Equipment installed per design specifications and manufacturer instructions. Quality assurance for new equipment — verify suitability for process application.',
    metadata: { source: 'OSHA 29 CFR 1910.119(j)', type: 'process_safety' }
  },
  {
    id: 'psm-pssr',
    category: 'process_safety',
    title: 'Pre-Startup Safety Review (PSSR)',
    text: 'Pre-Startup Safety Review (PSSR) must be performed for new facilities, modified facilities (where the modification necessitated a change in process safety information), and after extended shutdowns. PSSR must confirm: 1. Construction and equipment are in accordance with design specifications. 2. Safety, operating, maintenance, and emergency procedures are in place and adequate. 3. For new facilities, a PHA has been performed and recommendations resolved or implemented before startup. 4. Modified facilities — MOC requirements have been met. 5. Training of each employee involved in operating a process has been completed. A PSSR checklist typically covers: P&ID verification (field vs. drawing), instrument loop checks, safety system function tests, valve lineup verification, leak testing, relief device installation and setting verification, and environmental permits.',
    metadata: { source: 'OSHA 29 CFR 1910.119(i) / CCPS PSSR Guidelines', type: 'process_safety' }
  },
  {
    id: 'psm-incident-investigation',
    category: 'process_safety',
    title: 'Incident Investigation Requirements',
    text: 'PSM incident investigation requirements: Investigation must begin within 48 hours of the incident. Incidents that must be investigated: any event that resulted in, or could reasonably have resulted in, a catastrophic release of a highly hazardous chemical. Investigation team must include at least one person knowledgeable in the process, a contract employee if the incident involved contract work, and other persons with appropriate knowledge/experience. Investigation report must include: date and time of incident, date investigation began, description of the incident, factors that contributed to the incident, and any recommendations from the investigation. The employer must address and resolve investigation findings and recommendations promptly. The report must be reviewed by all affected personnel. Reports must be retained for 5 years. Root cause analysis using methods such as TapRooT, 5-Why, or Ishikawa fishbone diagram should be employed.',
    metadata: { source: 'OSHA 29 CFR 1910.119(m)', type: 'process_safety' }
  },
  {
    id: 'psm-process-safety-info',
    category: 'process_safety',
    title: 'Process Safety Information (PSI) Requirements',
    text: 'Process Safety Information must be compiled for chemicals, process technology, and equipment. Chemical information: toxicity, PEL, physical data (boiling point, vapor pressure, specific gravity), reactivity data, corrosivity, thermal and chemical stability, hazardous effects of mixing. Process technology: block flow diagram, process chemistry, maximum intended inventory, safe upper and lower limits for temperature, pressure, flow, composition. Equipment information: materials of construction, P&IDs, electrical classification, relief system design basis, ventilation system design, design codes and standards employed, material and energy balances, safety systems (interlocks, detection, suppression). All process safety information must be kept current and accessible. When information is not available, it may be developed in conjunction with the PHA.',
    metadata: { source: 'OSHA 29 CFR 1910.119(d)', type: 'process_safety' }
  },
  {
    id: 'psm-compliance-audit',
    category: 'process_safety',
    title: 'PSM Compliance Audit Requirements',
    text: 'Employers must certify that they have evaluated compliance with PSM provisions at least every three years. The compliance audit must be conducted by at least one person knowledgeable in the process. The audit must verify that procedures and practices developed under the standard are adequate and being followed. The employer must promptly determine and document an appropriate response to each audit finding, and document that deficiencies have been corrected. The two most recent audit reports must be retained. Audit scope covers all 14 elements. Common audit findings include: outdated operating procedures, incomplete training documentation, overdue PHA recommendations, lapsed MI inspections, inadequate MOC documentation, and incomplete incident investigation follow-up.',
    metadata: { source: 'OSHA 29 CFR 1910.119(o)', type: 'process_safety' }
  },
  {
    id: 'psm-contractor-safety',
    category: 'process_safety',
    title: 'Contractor Safety Management under PSM',
    text: 'PSM contractor safety requirements apply to contractors performing maintenance, repair, turnaround, major renovation, or specialty work on or adjacent to a covered process. Employer responsibilities: 1. Obtain and evaluate contractor safety information (injury rates, experience modification rate, OSHA citations). 2. Inform contractor of known potential fire, explosion, or toxic release hazards. 3. Explain applicable provisions of the emergency action plan. 4. Develop and implement safe work practices to control contractor entry, presence, and exit. 5. Periodically evaluate contractor safety performance. Contractor responsibilities: 1. Train employees in safe work practices. 2. Document training. 3. Ensure employees follow safety rules of the facility. 4. Advise employer of unique hazards presented by contractor work. 5. Report injuries, illnesses, and incidents.',
    metadata: { source: 'OSHA 29 CFR 1910.119(h)', type: 'process_safety' }
  },
  {
    id: 'psm-emergency-planning',
    category: 'process_safety',
    title: 'Emergency Planning and Response under PSM',
    text: 'PSM emergency planning requires employers to establish and implement an emergency action plan in accordance with 29 CFR 1910.38 for the entire plant, and address small releases within the process area. The plan must include: procedures for informing and alerting employees of emergencies, employee evacuation and accounting procedures, emergency medical treatment, procedures for handling small releases and chemical spills, designation of emergency response teams, alarm systems, and coordination with local emergency services (fire department, HAZMAT team, hospital). Regular drills are essential — at least annually for full-scale evacuation, quarterly for department-level drills. Coordination with Local Emergency Planning Committee (LEPC) or District Disaster Management Authority (DDMA) for off-site emergency scenarios.',
    metadata: { source: 'OSHA 29 CFR 1910.119(n) / 29 CFR 1910.38', type: 'process_safety' }
  },
];

/**
 * Utility: Get documents filtered by category
 * @param {string} category
 * @returns {object[]}
 */
export function getDocumentsByCategory(category) {
  return SAFETY_KNOWLEDGE_BASE.filter(doc => doc.category === category);
}

/**
 * Utility: Get all available categories
 * @returns {string[]}
 */
export function getCategories() {
  return [...new Set(SAFETY_KNOWLEDGE_BASE.map(doc => doc.category))];
}

/**
 * Knowledge base metadata
 */
export const KB_METADATA = {
  name: 'shieldai-safety-knowledge-base',
  version: '1.0.0',
  totalDocuments: SAFETY_KNOWLEDGE_BASE.length,
  categories: getCategories(),
  description: 'Comprehensive industrial safety knowledge base covering OSHA standards, HIRA methodology, gas detection, permit-to-work, emergency response, Indian regulations, and process safety management.',
  sources: [
    'OSHA 29 CFR 1910/1926',
    'NIOSH Pocket Guide to Chemical Hazards',
    'Factories Act 1948 (India)',
    'Mines Act 1952 (India)',
    'OISD Standards (India)',
    'DGMS Technical Circulars (India)',
    'PESO / Petroleum Rules 2002 (India)',
    'NFPA Standards',
    'IEC 61511/61882',
    'ISO 31000',
    'CCPS Guidelines',
  ],
  lastUpdated: '2025-01-01',
};
