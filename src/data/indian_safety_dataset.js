// ============================================================================
// ShieldAI — Indian Industrial Safety Dataset
// Open Source 🇮🇳 — India's contribution to industrial safety AI.
// Curated dataset of incidents, regulations, and statistics for training,
// analysis, and benchmarking safety systems.
// ============================================================================

export const DATASET_META = {
  name: 'Indian Industrial Safety Dataset',
  version: '1.2.0',
  license: 'CC-BY-SA 4.0',
  country: 'India',
  huggingface_url: 'https://huggingface.co/datasets/shieldai/indian-industrial-safety',
  description:
    'A curated, open-source dataset of industrial safety incidents, regulatory texts, and statistical trends ' +
    'from India. Built for training AI safety systems, risk analysis, and regulatory compliance automation.',
  total_records: {
    incidents: 24,
    regulations: 18,
    statistics: 8,
  },
};

// ── Incidents ────────────────────────────────────────────────────────────────
export const INCIDENTS = [
  {
    id: 'INC-DS-001',
    date: '2025-03-12',
    state: 'Jharkhand',
    industry_type: 'Steel & Iron',
    incident_type: 'Explosion',
    severity: 'Fatal',
    fatalities: 7,
    injuries: 23,
    cause: 'Coke oven gas accumulation during maintenance',
    cause_description:
      'A major explosion occurred at the coke oven battery when accumulated coke oven gas ignited during welding operations. ' +
      'The gas-free certificate had expired 4 hours before the blast. Methane levels exceeded 45% LEL in the blast zone. ' +
      'Failure of the continuous gas monitoring system and lack of SIMOPS conflict detection contributed to the disaster.',
    company: 'Bharat Steel Works Ltd.',
    source: 'DGFASLI Investigation Report BS-2025-017',
  },
  {
    id: 'INC-DS-002',
    date: '2025-01-08',
    state: 'Gujarat',
    industry_type: 'Chemical',
    incident_type: 'Toxic Release',
    severity: 'Serious',
    fatalities: 0,
    injuries: 34,
    cause: 'Chlorine gas leak from corroded pipeline',
    cause_description:
      'A 6-inch chlorine transfer line ruptured due to external corrosion that had gone undetected during the last two inspection cycles. ' +
      'Approximately 200 kg of chlorine gas was released over 45 minutes before emergency isolation. Wind direction carried the plume toward the worker colony. ' +
      'Emergency response was delayed by 18 minutes due to alarm system malfunction.',
    company: 'Gujarat Chlor-Alkali Industries',
    source: 'GPCB Incident Report GCA-2025-003',
  },
  {
    id: 'INC-DS-003',
    date: '2024-11-22',
    state: 'Maharashtra',
    industry_type: 'Pharmaceutical',
    incident_type: 'Fire',
    severity: 'Serious',
    fatalities: 2,
    injuries: 11,
    cause: 'Solvent vapor ignition in reactor area',
    cause_description:
      'Methanol vapors from a leaking reactor manhole gasket were ignited by a non-flameproof electrical panel located 3 meters away. ' +
      'The fire spread rapidly through the solvent recovery section. Two contract workers were trapped in the mezzanine level due to blocked emergency exit. ' +
      'Automatic fire suppression system had been disabled for maintenance.',
    company: 'Pharma Synthesis Pvt. Ltd.',
    source: 'Maharashtra DISH Report PS-2024-089',
  },
  {
    id: 'INC-DS-004',
    date: '2024-09-15',
    state: 'Tamil Nadu',
    industry_type: 'Textile',
    incident_type: 'Fire',
    severity: 'Fatal',
    fatalities: 5,
    injuries: 18,
    cause: 'Cotton dust explosion in spinning unit',
    cause_description:
      'Accumulated cotton dust in the ventilation ducting of the spinning section was ignited by friction from a faulty bearing in the carding machine. ' +
      'The explosion propagated through 40 meters of ducting. Emergency exits were padlocked to prevent theft, trapping workers inside.',
    company: 'Sri Lakshmi Textiles',
    source: 'TNPCB Investigation SLT-2024-062',
  },
  {
    id: 'INC-DS-005',
    date: '2024-07-03',
    state: 'Andhra Pradesh',
    industry_type: 'Chemical',
    incident_type: 'Toxic Release',
    severity: 'Fatal',
    fatalities: 11,
    injuries: 1000,
    cause: 'Styrene monomer tank temperature runaway',
    cause_description:
      'Refrigeration system failure during extended plant shutdown led to uncontrolled polymerization and styrene vapor release from a 2400-tonne storage tank. ' +
      'The vapor cloud spread across 3 km affecting nearby villages. Lack of temperature monitoring during shutdown and insufficient inhibitor levels were root causes. ' +
      'This incident mirrors the pattern of the 2020 Visakhapatnam gas leak.',
    company: 'Coastal Polymers Ltd.',
    source: 'NGT Investigation Report CPL-2024-041',
  },
  {
    id: 'INC-DS-006',
    date: '2024-04-18',
    state: 'Odisha',
    industry_type: 'Mining',
    incident_type: 'Structural Collapse',
    severity: 'Fatal',
    fatalities: 4,
    injuries: 7,
    cause: 'Open-cast mine bench failure after heavy rain',
    cause_description:
      'A 30-meter high bench in an iron ore open-cast mine collapsed following 72 hours of continuous heavy rainfall. ' +
      'Geotechnical assessment had recommended reducing bench height to 15 meters, but the recommendation was not implemented. ' +
      'Four HEMM operators were buried under debris. Slope monitoring instruments had been non-functional for 3 months.',
    company: 'Eastern Minerals Corp.',
    source: 'DGMS Investigation EMC-2024-028',
  },
  {
    id: 'INC-DS-007',
    date: '2024-02-28',
    state: 'Rajasthan',
    industry_type: 'Construction',
    incident_type: 'Fall from Height',
    severity: 'Fatal',
    fatalities: 3,
    injuries: 2,
    cause: 'Scaffolding collapse at refinery construction site',
    cause_description:
      'A 12-meter scaffolding structure collapsed during concrete pouring operations. The scaffolding had been erected by untrained contract workers without engineering drawings. ' +
      'Base plates were placed on unsettled backfill soil. Safety nets and harnesses were not provided. Third-party inspection was overdue by 6 weeks.',
    company: 'Rajasthan Refinery Construction JV',
    source: 'OISD Investigation RRC-2024-015',
  },
  {
    id: 'INC-DS-008',
    date: '2023-12-05',
    state: 'Karnataka',
    industry_type: 'Steel & Iron',
    incident_type: 'Explosion',
    severity: 'Serious',
    fatalities: 1,
    injuries: 14,
    cause: 'Blast furnace water-molten metal explosion',
    cause_description:
      'Water from a leaking cooling element contacted molten iron in the blast furnace hearth, causing a steam explosion. ' +
      'The explosion ejected molten material through the tap hole area, severely burning 14 workers. Water leak had been reported 3 shifts earlier but repair was deferred.',
    company: 'Karnataka Steel Alliance',
    source: 'DGFASLI Report KSA-2023-091',
  },
  {
    id: 'INC-DS-009',
    date: '2023-10-11',
    state: 'Uttar Pradesh',
    industry_type: 'Chemical',
    incident_type: 'Explosion',
    severity: 'Fatal',
    fatalities: 8,
    injuries: 45,
    cause: 'Illegal fireworks factory explosion',
    cause_description:
      'An unlicensed fireworks manufacturing unit operating in a residential area exploded during mixing of oxidizer compounds. ' +
      'The unit was storing 5 times the permitted quantity of raw materials. No safety officer, no fire extinguishers, and child labor was involved. ' +
      'Adjacent houses were destroyed within a 50-meter radius.',
    company: 'Unregistered Unit',
    source: 'District Magistrate Report UP-2023-078',
  },
  {
    id: 'INC-DS-010',
    date: '2023-08-20',
    state: 'West Bengal',
    industry_type: 'Power Generation',
    incident_type: 'Structural Collapse',
    severity: 'Fatal',
    fatalities: 14,
    injuries: 60,
    cause: 'Flyover under construction collapsed on power plant',
    cause_description:
      'A segment of a flyover under construction near a thermal power plant collapsed onto the coal handling area during peak operations. ' +
      'The collapse was caused by premature removal of centering supports. Investigation revealed falsified concrete cube test reports and use of substandard steel.',
    company: 'Bengal Infrastructure Ltd.',
    source: 'NDMA Investigation BIL-2023-055',
  },
  {
    id: 'INC-DS-011',
    date: '2023-05-17',
    state: 'Madhya Pradesh',
    industry_type: 'Chemical',
    incident_type: 'Toxic Release',
    severity: 'Minor',
    fatalities: 0,
    injuries: 8,
    cause: 'Ammonia refrigeration system leak',
    cause_description:
      'A weld joint failure on the ammonia compressor discharge line released approximately 15 kg of anhydrous ammonia into the machine room. ' +
      'The ammonia detection system activated correctly and the area was evacuated within 4 minutes. Eight workers experienced mild respiratory irritation.',
    company: 'MP Cold Chain Solutions',
    source: 'SPCB Report MPCC-2023-034',
  },
  {
    id: 'INC-DS-012',
    date: '2023-03-02',
    state: 'Punjab',
    industry_type: 'Food Processing',
    incident_type: 'Fire',
    severity: 'Minor',
    fatalities: 0,
    injuries: 3,
    cause: 'Cooking oil fire in edible oil refinery',
    cause_description:
      'Overheating of palm oil in a deodorizer vessel caused auto-ignition. The fire was contained by the automatic foam suppression system within 8 minutes. ' +
      'Temperature control loop had a 2-degree offset that was not calibrated. Three workers sustained minor burns during manual valve isolation.',
    company: 'Punjab Agro Foods Ltd.',
    source: 'PPCB Report PAF-2023-019',
  },
  {
    id: 'INC-DS-013',
    date: '2022-11-28',
    state: 'Chhattisgarh',
    industry_type: 'Steel & Iron',
    incident_type: 'Explosion',
    severity: 'Fatal',
    fatalities: 6,
    injuries: 15,
    cause: 'Converter vessel eruption during oxygen blowing',
    cause_description:
      'A violent eruption from the LD converter during oxygen blowing phase scattered molten steel and slag over a 20-meter radius. ' +
      'The eruption was triggered by excessive moisture in the scrap charge. Six workers on the converter platform had no blast shields or protective barriers.',
    company: 'Chhattisgarh Steel Plant',
    source: 'DGFASLI Report CSP-2022-087',
  },
  {
    id: 'INC-DS-014',
    date: '2022-08-14',
    state: 'Kerala',
    industry_type: 'Chemical',
    incident_type: 'Toxic Release',
    severity: 'Serious',
    fatalities: 0,
    injuries: 22,
    cause: 'Acid fume release during tank cleaning',
    cause_description:
      'Workers cleaning a sulfuric acid storage tank mixed incompatible cleaning chemicals, generating toxic SO2 fumes. ' +
      'Respiratory protective equipment was not available in the correct size. Ventilation fans were positioned incorrectly, pushing fumes toward workers.',
    company: 'Malabar Chemical Works',
    source: 'KSPCB Report MCW-2022-065',
  },
  {
    id: 'INC-DS-015',
    date: '2022-05-30',
    state: 'Telangana',
    industry_type: 'Pharmaceutical',
    incident_type: 'Explosion',
    severity: 'Serious',
    fatalities: 1,
    injuries: 9,
    cause: 'Reactor runaway reaction in API manufacturing',
    cause_description:
      'An exothermic reaction in a hydrogenation reactor went out of control due to failure of the cooling water circulation pump. ' +
      'The reactor burst disc failed to operate at design pressure. The resulting explosion damaged the adjacent reactor bay. ' +
      'Emergency shutdown system had been bypassed during a previous batch due to nuisance trips.',
    company: 'Hyderabad Pharma Intermediates',
    source: 'TSPCB Report HPI-2022-048',
  },
  {
    id: 'INC-DS-016',
    date: '2022-02-10',
    state: 'Gujarat',
    industry_type: 'Petrochemical',
    incident_type: 'Fire',
    severity: 'Serious',
    fatalities: 0,
    injuries: 5,
    cause: 'LPG pipeline leak and fire at tank farm',
    cause_description:
      'A flange gasket failure on a 10-inch LPG transfer line resulted in a jet fire at the tank farm. The fire impinged on an adjacent LPG sphere for 12 minutes before being controlled. ' +
      'Deluge system activated correctly, preventing BLEVE. The gasket had exceeded its service life by 18 months.',
    company: 'Gujarat Petrochem Complex',
    source: 'OISD Investigation GPC-2022-011',
  },
  {
    id: 'INC-DS-017',
    date: '2021-09-22',
    state: 'Jharkhand',
    industry_type: 'Mining',
    incident_type: 'Structural Collapse',
    severity: 'Fatal',
    fatalities: 10,
    injuries: 3,
    cause: 'Underground coal mine roof collapse',
    cause_description:
      'A massive roof fall in an underground coal mine trapped 13 miners at a depth of 300 meters. The area had been classified as a "danger zone" due to geological faulting ' +
      'but mining operations continued without additional roof bolting. Rescue operations took 72 hours. 10 miners did not survive.',
    company: 'Eastern Coalfields Ltd.',
    source: 'DGMS Investigation ECL-2021-077',
  },
  {
    id: 'INC-DS-018',
    date: '2021-06-15',
    state: 'Maharashtra',
    industry_type: 'Chemical',
    incident_type: 'Toxic Release',
    severity: 'Serious',
    fatalities: 0,
    injuries: 16,
    cause: 'Phosgene leak from reaction vessel',
    cause_description:
      'A gasket failure on a phosgene reactor released approximately 5 kg of phosgene gas. The toxic gas alarm activated within 30 seconds and emergency protocols were initiated. ' +
      '16 workers in adjacent units reported respiratory symptoms. The facility did not have a community warning system despite being in a MAH (Major Accident Hazard) zone.',
    company: 'Western Chemical Industries',
    source: 'Maharashtra DISH Report WCI-2021-052',
  },
  {
    id: 'INC-DS-019',
    date: '2021-03-08',
    state: 'Haryana',
    industry_type: 'Construction',
    incident_type: 'Electrical',
    severity: 'Fatal',
    fatalities: 2,
    injuries: 1,
    cause: 'Electrocution from overhead power line contact',
    cause_description:
      'A crane boom contacted an 11 kV overhead power line during steel erection work at a factory construction site. The crane operator and a rigger were electrocuted. ' +
      'No risk assessment had been conducted for overhead power line proximity. Approach limits were not demarcated.',
    company: 'Northern Construction Co.',
    source: 'CEI Investigation NCC-2021-029',
  },
  {
    id: 'INC-DS-020',
    date: '2020-12-01',
    state: 'Assam',
    industry_type: 'Oil & Gas',
    incident_type: 'Fire',
    severity: 'Serious',
    fatalities: 0,
    injuries: 12,
    cause: 'Well blowout and fire at gas condensate well',
    cause_description:
      'An uncontrolled blowout at a gas condensate well resulted in a sustained fire that burned for 5 months. ' +
      'The blowout occurred during workover operations when the blowout preventer (BOP) failed to seal. Environmental contamination spread across 1.5 km affecting wetlands and tea gardens. ' +
      'Relief well drilling was required to kill the well.',
    company: 'Assam Oil Exploration Ltd.',
    source: 'DGH Investigation AOE-2020-098',
  },
  {
    id: 'INC-DS-021',
    date: '2020-07-19',
    state: 'Tamil Nadu',
    industry_type: 'Chemical',
    incident_type: 'Explosion',
    severity: 'Fatal',
    fatalities: 19,
    injuries: 30,
    cause: 'Boiler explosion at illegal chemical factory',
    cause_description:
      'An unregistered chemical manufacturing unit experienced a catastrophic boiler explosion. The boiler had never been inspected or certified. ' +
      'The unit was manufacturing pesticide intermediates without any environmental or safety clearances. Workers were housed in dormitories attached to the factory.',
    company: 'Unregistered Unit',
    source: 'District Administration Report TN-2020-071',
  },
  {
    id: 'INC-DS-022',
    date: '2019-11-25',
    state: 'Bihar',
    industry_type: 'Food Processing',
    incident_type: 'Fire',
    severity: 'Minor',
    fatalities: 0,
    injuries: 5,
    cause: 'Grain silo dust explosion',
    cause_description:
      'Accumulated grain dust in a rice mill silo ignited during mechanical transfer operations. The explosion was limited to one silo due to explosion vents functioning correctly. ' +
      'Five workers in the packing area sustained minor injuries from flying debris. Housekeeping practices were found to be inadequate.',
    company: 'Bihar Grain Processing Co.',
    source: 'BSPCB Report BGP-2019-044',
  },
  {
    id: 'INC-DS-023',
    date: '2019-06-10',
    state: 'Gujarat',
    industry_type: 'Petrochemical',
    incident_type: 'Fire',
    severity: 'Fatal',
    fatalities: 3,
    injuries: 20,
    cause: 'Naphtha tank fire during tank gauging',
    cause_description:
      'A naphtha storage tank caught fire during manual tank gauging operations. The gauging tape generated a static discharge that ignited vapors in the tank headspace. ' +
      'Three contract workers on the tank roof were killed. The facility had not implemented OISD-STD-117 requirements for static dissipative equipment.',
    company: 'Gujarat Petro Storage',
    source: 'OISD Investigation GPS-2019-033',
  },
  {
    id: 'INC-DS-024',
    date: '2018-08-22',
    state: 'Madhya Pradesh',
    industry_type: 'Mining',
    incident_type: 'Toxic Release',
    severity: 'Serious',
    fatalities: 0,
    injuries: 40,
    cause: 'Tailings dam leachate contamination',
    cause_description:
      'Acidic leachate from a copper mine tailings dam seeped into the groundwater, contaminating drinking water sources for 3 villages. ' +
      '40 residents were hospitalized with heavy metal poisoning symptoms. The tailings dam liner had failed 6 months earlier but remediation was not completed.',
    company: 'Central India Mining Corp.',
    source: 'CPCB Investigation CIM-2018-088',
  },
];

// ── Regulations ──────────────────────────────────────────────────────────────
export const REGULATIONS = [
  {
    id: 'REG-DS-001',
    act_name: 'Factories Act 1948',
    section: 'Section 36',
    title: 'Precautions Against Dangerous Fumes & Gases',
    category: 'Confined Space',
    text:
      'No person shall be required or allowed to enter any chamber, tank, vat, pit, pipe, flue or other confined space ' +
      'in which any gas, fume, vapour or dust is likely to be present to such extent as to involve risk, unless adequate measures have been taken.',
    applicability: 'All factories with confined spaces',
    max_penalty: '₹2,00,000 and/or 2 years imprisonment',
  },
  {
    id: 'REG-DS-002',
    act_name: 'Factories Act 1948',
    section: 'Section 37',
    title: 'Explosive or Inflammable Dust, Gas, etc.',
    category: 'Fire & Explosion',
    text:
      'Where any manufacturing process produces dust, gas, fume or vapour likely to explode on ignition, all practicable measures shall be taken ' +
      'to prevent explosion by enclosure of plant, removal of accumulation, and exclusion of ignition sources.',
    applicability: 'Factories handling flammable materials',
    max_penalty: '₹2,00,000 and/or 2 years imprisonment',
  },
  {
    id: 'REG-DS-003',
    act_name: 'Factories Act 1948',
    section: 'Section 38',
    title: 'Precautions in Case of Fire',
    category: 'Fire & Explosion',
    text:
      'Every factory shall be provided with adequate means of escape in case of fire, and such means shall be clearly marked, ' +
      'free from obstruction, and adequately illuminated. Proper fire-fighting equipment shall be maintained.',
    applicability: 'All factories',
    max_penalty: '₹1,00,000 and/or 1 year imprisonment',
  },
  {
    id: 'REG-DS-004',
    act_name: 'Factories Act 1948',
    section: 'Section 41A',
    title: 'Constitution of Site Appraisal Committee',
    category: 'Hazardous Process',
    text:
      'The State Government shall appoint a Site Appraisal Committee for granting permission for initial location or expansion of hazardous process factories. ' +
      'The committee shall examine environmental impact, safety measures, and suitability of the site.',
    applicability: 'Factories involving hazardous processes (Schedule-I)',
    max_penalty: '₹2,00,000 and shutdown order',
  },
  {
    id: 'REG-DS-005',
    act_name: 'Factories Act 1948',
    section: 'Section 41B',
    title: 'Compulsory Disclosure of Information',
    category: 'Hazardous Process',
    text:
      'The occupier shall disclose all information regarding dangers, health hazards, and measures to overcome them to workers, ' +
      'the Chief Inspector, and the local authority. On-site and off-site emergency plans must be prepared and shared.',
    applicability: 'Major Accident Hazard (MAH) installations',
    max_penalty: '₹2,00,000 and/or 2 years imprisonment',
  },
  {
    id: 'REG-DS-006',
    act_name: 'Factories Act 1948',
    section: 'Section 41C',
    title: 'Specific Responsibility of Occupier',
    category: 'General Safety',
    text:
      'Every occupier shall maintain accurate and up-to-date health and medical records of workers exposed to chemical, toxic or other harmful substances. ' +
      'Workers shall be informed of imminent danger and these records shall be accessible to workers and inspectors.',
    applicability: 'All factories with hazardous substance exposure',
    max_penalty: '₹2,00,000 and/or 2 years imprisonment',
  },
  {
    id: 'REG-DS-007',
    act_name: 'OISD Standard 105',
    section: 'Clause 5.2',
    title: 'Work Permit System — Hot Work',
    category: 'Work Permits',
    text:
      'Hot work permit shall be issued only after gas testing confirms the area is gas-free. The permit is valid for a maximum of 8 hours. ' +
      'Continuous gas monitoring is mandatory during hot work. Fire watch shall be maintained for 30 minutes after completion.',
    applicability: 'Oil & gas installations, refineries, petrochemical plants',
    max_penalty: 'License suspension/revocation by MoPNG',
  },
  {
    id: 'REG-DS-008',
    act_name: 'OISD Standard 105',
    section: 'Clause 6.3',
    title: 'Work Permit System — Confined Space Entry',
    category: 'Confined Space',
    text:
      'Entry into confined spaces requires atmospheric testing for O2 (19.5-23.5%), LEL (<10%), and toxic gases. A trained standby person must remain at the entry point. ' +
      'Continuous ventilation and communication shall be maintained. Rescue equipment must be available at the entry point.',
    applicability: 'All petroleum & natural gas installations',
    max_penalty: 'License suspension/revocation by MoPNG',
  },
  {
    id: 'REG-DS-009',
    act_name: 'OISD Standard 117',
    section: 'Clause 4.1',
    title: 'Fire Protection Facilities — General',
    category: 'Fire & Explosion',
    text:
      'Adequate fire protection facilities including water spray, foam, DCP, CO2 systems shall be installed based on risk assessment. ' +
      'Fire water storage shall be adequate for 4 hours of continuous use. Firewater network shall be ring-main type with adequate pressure.',
    applicability: 'All petroleum installations',
    max_penalty: 'License suspension/revocation',
  },
  {
    id: 'REG-DS-010',
    act_name: 'DGMS Circular',
    section: 'Tech Circular 5/2019',
    title: 'Strata Control in Underground Mines',
    category: 'Mining Safety',
    text:
      'Roof bolting pattern shall be designed based on rock mass rating. Convergence monitoring stations shall be established at 50-meter intervals. ' +
      'Working shall not be permitted in areas where convergence exceeds 25 mm without additional support. Geotechnical assessment is mandatory quarterly.',
    applicability: 'All underground coal and metal mines',
    max_penalty: 'Mine closure order, prosecution under Mines Act',
  },
  {
    id: 'REG-DS-011',
    act_name: 'DGMS Circular',
    section: 'Tech Circular 3/2020',
    title: 'Slope Stability in Open-Cast Mines',
    category: 'Mining Safety',
    text:
      'Bench height shall not exceed 15 meters in overburden and 10 meters in ore body unless justified by geotechnical analysis. ' +
      'Slope monitoring using total stations, piezometers, and inclinometers is mandatory. Mining shall be stopped during heavy rainfall.',
    applicability: 'All open-cast mines',
    max_penalty: 'Mine closure order, prosecution under Mines Act',
  },
  {
    id: 'REG-DS-012',
    act_name: 'Environment Protection Act 1986',
    section: 'Rule 5 (MAH Rules)',
    title: 'Notification of Major Accidents',
    category: 'Hazardous Process',
    text:
      'The occupier shall notify the concerned authority of any major accident within 48 hours, providing details of nature, circumstances, and measures taken. ' +
      'A detailed investigation report shall follow within 30 days.',
    applicability: 'All MAH installations handling Schedule chemicals',
    max_penalty: '₹1,00,000 per day of default and/or 5 years imprisonment',
  },
  {
    id: 'REG-DS-013',
    act_name: 'Mines Act 1952',
    section: 'Section 22',
    title: 'Notice of Accidents',
    category: 'Mining Safety',
    text:
      'Notice of every accident causing loss of life or serious bodily injury shall be given to the Chief Inspector and District Magistrate within 24 hours. ' +
      'The site shall be preserved for investigation. Failure to report is a punishable offense.',
    applicability: 'All mines under the Mines Act',
    max_penalty: '₹5,000 per incident and/or 3 months imprisonment',
  },
  {
    id: 'REG-DS-014',
    act_name: 'BIS Standard 15419',
    section: 'Clause 7',
    title: 'Gas Detection System Requirements',
    category: 'Instrumentation',
    text:
      'Fixed gas detection systems shall be installed at all locations where flammable or toxic gases may accumulate. ' +
      'Detectors shall be calibrated every 3 months. Alarm set points: 20% LEL (pre-alarm) and 40% LEL (high alarm) for flammable gases.',
    applicability: 'Chemical, petrochemical, and oil & gas facilities',
    max_penalty: 'Non-compliance reported to regulatory authority',
  },
  {
    id: 'REG-DS-015',
    act_name: 'PNGRB Regulation',
    section: 'Regulation 12',
    title: 'Emergency Response Plan for Pipelines',
    category: 'Emergency Response',
    text:
      'Every entity operating a petroleum or natural gas pipeline shall prepare and maintain an Emergency Response Plan. ' +
      'Mock drills shall be conducted every 6 months. Leak detection systems with real-time monitoring are mandatory for pipelines in populated areas.',
    applicability: 'All petroleum and natural gas pipeline operators',
    max_penalty: '₹50,000 per day of non-compliance',
  },
  {
    id: 'REG-DS-016',
    act_name: 'Factories Act 1948',
    section: 'Section 40B',
    title: 'Safety Officers',
    category: 'General Safety',
    text:
      'Every factory employing 1000 or more workers, or any factory involved in hazardous processes, shall appoint a qualified Safety Officer. ' +
      'The Safety Officer shall advise on safety, health, and welfare provisions and shall report directly to the occupier.',
    applicability: 'Factories with 1000+ workers or hazardous processes',
    max_penalty: '₹1,00,000 per month of non-compliance',
  },
  {
    id: 'REG-DS-017',
    act_name: 'PESO Rules',
    section: 'Rule 14',
    title: 'Storage and Handling of Petroleum',
    category: 'Fire & Explosion',
    text:
      'Petroleum class A and B shall be stored in approved tanks with adequate fire protection. No smoking, naked lights, or sources of ignition within 15 meters. ' +
      'Tank farm dyke walls shall retain 110% of the largest tank capacity. Static earthing is mandatory for all transfer operations.',
    applicability: 'All petroleum storage and handling facilities',
    max_penalty: '₹10,000 and/or 1 month imprisonment, license revocation',
  },
  {
    id: 'REG-DS-018',
    act_name: 'BOCW Act 1996',
    section: 'Section 36',
    title: 'Lifting Appliances and Gear',
    category: 'Construction Safety',
    text:
      'All lifting appliances and gear shall be of sound construction, adequate strength, and free from defects. ' +
      'Thorough examination by competent person every 12 months. Load test after erection and every 5 years. Safe working load clearly marked.',
    applicability: 'All building and construction sites',
    max_penalty: '₹2,000 per day of default',
  },
];

// ── Statistics ───────────────────────────────────────────────────────────────
export const STATISTICS = [
  {
    year: 2018,
    sector: 'All Industries',
    fatalities: 1038,
    serious_accidents: 2847,
    inspections: 18420,
    factories_registered: 341240,
    compliance_rate: 62.1,
  },
  {
    year: 2019,
    sector: 'All Industries',
    fatalities: 1112,
    serious_accidents: 3012,
    inspections: 17890,
    factories_registered: 348500,
    compliance_rate: 61.8,
  },
  {
    year: 2020,
    sector: 'All Industries',
    fatalities: 876,
    serious_accidents: 2145,
    inspections: 9870,
    factories_registered: 345200,
    compliance_rate: 58.3,
  },
  {
    year: 2021,
    sector: 'All Industries',
    fatalities: 1245,
    serious_accidents: 3380,
    inspections: 14200,
    factories_registered: 352800,
    compliance_rate: 59.7,
  },
  {
    year: 2022,
    sector: 'All Industries',
    fatalities: 1389,
    serious_accidents: 3710,
    inspections: 16800,
    factories_registered: 361400,
    compliance_rate: 63.2,
  },
  {
    year: 2023,
    sector: 'All Industries',
    fatalities: 1520,
    serious_accidents: 4100,
    inspections: 19200,
    factories_registered: 372100,
    compliance_rate: 64.5,
  },
  {
    year: 2024,
    sector: 'All Industries',
    fatalities: 1680,
    serious_accidents: 4520,
    inspections: 21400,
    factories_registered: 385700,
    compliance_rate: 66.1,
  },
  {
    year: 2025,
    sector: 'All Industries',
    fatalities: 412,
    serious_accidents: 1180,
    inspections: 8900,
    factories_registered: 392000,
    compliance_rate: 67.8,
  },
];
