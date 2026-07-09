// ============================================================================
// ShieldAI — Regulatory Database
// Indian industrial safety regulations: Factories Act, OISD, DGMS clauses.
// Includes full-text search with relevance scoring.
// ============================================================================

export const REGULATIONS = [
  // ── Factories Act 1948 ─────────────────────────────────────────────────
  {
    id: 'REG-FA-36',
    act: 'Factories Act 1948',
    section: 'Section 36',
    title: 'Precautions Against Dangerous Fumes, Gases, etc.',
    text:
      'No person shall be required or allowed to enter any chamber, tank, vat, pit, pipe, flue or other confined space in any factory ' +
      'in which any gas, fume, vapour or dust is likely to be present to such an extent as to involve risk to persons being overcome thereby, ' +
      'unless it is provided with a manhole of adequate size or other effective means of egress. ' +
      'No person shall enter or be permitted to enter any such confined space until all practicable measures have been taken to remove any gas, ' +
      'fume, vapour or dust which may be present and to prevent any ingress thereof, and unless a certificate in writing has been given by a ' +
      'competent person that the space is reasonably free from dangerous gas, fume, vapour or dust.',
    keywords: ['confined space', 'gas', 'fume', 'vapour', 'dust', 'manhole', 'egress', 'certificate', 'competent person', 'entry'],
    applicableZones: ['Z-A', 'Z-C', 'Z-D'],
    applicablePermitTypes: ['Confined Space'],
  },
  {
    id: 'REG-FA-36A',
    act: 'Factories Act 1948',
    section: 'Section 36A',
    title: 'Precautions Regarding the Use of Portable Electric Light',
    text:
      'In any factory no portable electric light or any other electric apparatus of voltage exceeding twenty-four volts shall be permitted ' +
      'to be used inside any chamber, tank, vat, pit, pipe, flue or other confined space unless adequate safety devices are provided. ' +
      'Only flame-proof or intrinsically safe electrical equipment shall be used in areas classified as hazardous.',
    keywords: ['portable electric light', 'confined space', 'voltage', 'flame-proof', 'intrinsically safe', 'hazardous area', 'electrical'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D'],
    applicablePermitTypes: ['Confined Space', 'Electrical Isolation'],
  },
  {
    id: 'REG-FA-37',
    act: 'Factories Act 1948',
    section: 'Section 37',
    title: 'Explosive or Inflammable Dust, Gas, etc.',
    text:
      'Where in any factory any manufacturing process produces dust, gas, fume or vapour of such character and to such extent as to be ' +
      'likely to explode on ignition, all practicable measures shall be taken to prevent any such explosion by enclosure of the plant or ' +
      'machinery used in the process, removal or prevention of the accumulation of such dust, gas, fume or vapour, and exclusion or ' +
      'effective enclosure of all possible sources of ignition. Where any plant or machinery used in a process giving rise to the risk of ' +
      'explosion is not so enclosed, no source of ignition, including a hot work operation, shall be permitted in the vicinity.',
    keywords: ['explosive', 'inflammable', 'dust', 'gas', 'fume', 'vapour', 'ignition', 'hot work', 'enclosure', 'accumulation', 'explosion'],
    applicableZones: ['Z-A', 'Z-B'],
    applicablePermitTypes: ['Hot Work'],
  },
  {
    id: 'REG-FA-38',
    act: 'Factories Act 1948',
    section: 'Section 38',
    title: 'Precautions in Case of Fire',
    text:
      'In every factory all practicable measures shall be taken to prevent outbreak of fire and its spread, both internally and externally, ' +
      'and to provide and maintain safe means of escape for all persons in the event of fire, and the necessary equipment and facilities for ' +
      'extinguishing fire. Effective measures shall be taken to ensure that in every room of the factory the workers employed therein are ' +
      'familiar with the means of escape in case of fire and have been adequately trained in the routine to be followed in such case.',
    keywords: ['fire', 'prevention', 'spread', 'escape', 'extinguishing', 'training', 'fire drill', 'means of escape'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E', 'Z-F'],
    applicablePermitTypes: ['Hot Work'],
  },
  {
    id: 'REG-FA-41A',
    act: 'Factories Act 1948',
    section: 'Section 41A',
    title: 'Constitution of Site Appraisal Committees — Hazardous Process',
    text:
      'A factory involving a hazardous process shall constitute a Site Appraisal Committee before expansion or modernization. ' +
      'The occupier of every factory involving a hazardous process shall provide for: a detailed health and safety policy for workers, ' +
      'maintain accurate records of hazardous chemicals, conduct health surveillance, and provide information regarding dangers including ' +
      'health hazards and measures to overcome such hazards. Workers shall be trained in emergency procedures specific to the hazardous ' +
      'process being carried out.',
    keywords: ['hazardous process', 'site appraisal', 'health surveillance', 'hazardous chemicals', 'emergency procedures', 'training', 'policy'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D'],
    applicablePermitTypes: ['Hot Work', 'Confined Space', 'Cold Work', 'Electrical Isolation'],
  },
  {
    id: 'REG-FA-40B',
    act: 'Factories Act 1948',
    section: 'Section 40B',
    title: 'Safety Officers',
    text:
      'In every factory wherein one thousand or more workers are ordinarily employed, the occupier shall employ such number of safety officers ' +
      'as may be prescribed. The safety officers shall be responsible for advising on matters relating to safety, health, and welfare of the ' +
      'workers and shall carry out inspections of the factory to identify potentially hazardous conditions and unsafe practices.',
    keywords: ['safety officer', 'inspection', 'hazardous conditions', 'unsafe practices', 'welfare'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E', 'Z-F'],
    applicablePermitTypes: [],
  },

  // ── OISD-STD-105: Work Permit System ───────────────────────────────────
  {
    id: 'REG-OISD-105-5.1',
    act: 'OISD-STD-105',
    section: 'Clause 5.1',
    title: 'Hot Work Permit — General Requirements',
    text:
      'A hot work permit shall be issued only after the area has been tested and certified gas-free by a competent person. ' +
      'The gas-free certificate shall specify the time of testing and shall be valid for a period not exceeding 2 hours. ' +
      'The permit shall clearly specify the nature of work, duration, and safety precautions required. ' +
      'Continuous gas monitoring shall be maintained throughout the duration of the hot work operation.',
    keywords: ['hot work', 'permit', 'gas-free', 'competent person', 'gas monitoring', 'duration', 'safety precautions', 'testing'],
    applicableZones: ['Z-A', 'Z-B', 'Z-D', 'Z-E'],
    applicablePermitTypes: ['Hot Work'],
  },
  {
    id: 'REG-OISD-105-5.2',
    act: 'OISD-STD-105',
    section: 'Clause 5.2',
    title: 'Hot Work — Flammable Atmosphere Controls',
    text:
      'Hot work shall not be permitted when the flammable gas concentration exceeds 1% of the Lower Explosive Limit (LEL) in the work area. ' +
      'Gas monitoring shall be carried out at multiple points including at ground level, mid-height, and overhead. ' +
      'If gas levels rise above 10% LEL at any time during hot work, work shall be stopped immediately, workers evacuated, and permit revoked.',
    keywords: ['hot work', 'flammable', 'LEL', 'gas monitoring', 'evacuation', 'permit revocation', 'stop work', 'lower explosive limit'],
    applicableZones: ['Z-A', 'Z-B'],
    applicablePermitTypes: ['Hot Work'],
  },
  {
    id: 'REG-OISD-105-5.5',
    act: 'OISD-STD-105',
    section: 'Clause 5.5',
    title: 'Simultaneous Operations (SIMOPS)',
    text:
      'Where simultaneous operations are carried out in the same area, a SIMOPS assessment shall be conducted to identify potential conflicts. ' +
      'Conflicting permits shall not be issued for the same zone or adjacent areas without specific mitigation measures documented and approved. ' +
      'Hot work and cold work permits shall not coexist in the same zone unless a specific SIMOPS risk assessment has been conducted and approved ' +
      'by the Plant Manager.',
    keywords: ['SIMOPS', 'simultaneous operations', 'conflict', 'adjacent areas', 'mitigation', 'hot work', 'cold work', 'risk assessment'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D'],
    applicablePermitTypes: ['Hot Work', 'Cold Work', 'Confined Space'],
  },
  {
    id: 'REG-OISD-105-6.3',
    act: 'OISD-STD-105',
    section: 'Clause 6.3',
    title: 'Confined Space Entry — Atmospheric Testing',
    text:
      'Before any person enters a confined space, the atmosphere within shall be tested for oxygen content, flammable gases, and toxic gases. ' +
      'Entry shall not be permitted if oxygen concentration is below 19.5% or above 23.5%, or if flammable gas concentration exceeds 1% LEL, ' +
      'or if toxic gas concentration exceeds the relevant Permissible Exposure Limit (PEL). Continuous monitoring shall be maintained during ' +
      'the entire period of occupancy with audible and visual alarms set at action levels.',
    keywords: ['confined space', 'atmospheric testing', 'oxygen', 'flammable', 'toxic', 'PEL', 'continuous monitoring', 'alarms', 'entry'],
    applicableZones: ['Z-A', 'Z-C', 'Z-D'],
    applicablePermitTypes: ['Confined Space'],
  },
  {
    id: 'REG-OISD-105-7.1',
    act: 'OISD-STD-105',
    section: 'Clause 7.1',
    title: 'Lockout/Tagout (LOTO) Procedure',
    text:
      'Before any maintenance, servicing, or repair work is commenced, all energy sources (electrical, mechanical, hydraulic, pneumatic, ' +
      'thermal, chemical, and gravitational) shall be identified and positively isolated using approved lockout devices. ' +
      'Each worker shall apply their own lock and tag. Verification of zero energy state shall be performed before work begins. ' +
      'Locks shall not be removed until the worker who applied them has verified that it is safe to do so.',
    keywords: ['lockout', 'tagout', 'LOTO', 'energy isolation', 'zero energy', 'maintenance', 'lock', 'tag', 'verification'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E'],
    applicablePermitTypes: ['Electrical Isolation', 'Hot Work', 'Cold Work', 'Confined Space'],
  },
  {
    id: 'REG-OISD-105-8.1',
    act: 'OISD-STD-105',
    section: 'Clause 8.1',
    title: 'Permit Validity and Renewal',
    text:
      'No work permit shall be valid for a period exceeding one shift (12 hours) without renewal. ' +
      'Renewal of a permit requires re-assessment of the work area conditions including gas testing, energy isolation checks, ' +
      'and PPE adequacy verification. An expired permit shall be treated as null and void — continuation of work under an expired permit ' +
      'constitutes a safety violation.',
    keywords: ['permit validity', 'renewal', 'expired', 'shift', 're-assessment', 'gas testing', 'violation', 'PPE'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E'],
    applicablePermitTypes: ['Hot Work', 'Cold Work', 'Confined Space', 'Electrical Isolation'],
  },

  // ── OISD-GDN-206: Emergency Preparedness ──────────────────────────────
  {
    id: 'REG-OISD-206-3.1',
    act: 'OISD-GDN-206',
    section: 'Clause 3.1',
    title: 'On-Site Emergency Plan',
    text:
      'Every installation handling hazardous materials shall have a documented On-Site Emergency Plan that defines the roles and responsibilities ' +
      'of all personnel, communication protocols, evacuation procedures, assembly points, and emergency resource mobilization. ' +
      'The plan shall be rehearsed through mock drills at least twice a year with participation from all shifts.',
    keywords: ['emergency plan', 'on-site', 'evacuation', 'assembly point', 'mock drill', 'communication', 'hazardous materials', 'roles'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E', 'Z-F'],
    applicablePermitTypes: [],
  },
  {
    id: 'REG-OISD-206-4.2',
    act: 'OISD-GDN-206',
    section: 'Clause 4.2',
    title: 'Toxic Release Response',
    text:
      'In the event of a toxic release, the emergency response shall include immediate isolation of the source, activation of ' +
      'wind direction indicators, downwind evacuation of personnel, establishment of exclusion zones, and deployment of emergency ' +
      'neutralization or scrubbing systems. Medical teams shall be placed on standby with specific antidotes for known toxic agents.',
    keywords: ['toxic release', 'isolation', 'wind direction', 'downwind', 'evacuation', 'exclusion zone', 'scrubbing', 'antidotes', 'medical'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D'],
    applicablePermitTypes: [],
  },
  {
    id: 'REG-OISD-206-5.1',
    act: 'OISD-GDN-206',
    section: 'Clause 5.1',
    title: 'Emergency Communication Protocol',
    text:
      'Emergency communication shall be established through a dedicated alarm system with distinct siren codes for fire, toxic release, ' +
      'and general evacuation. A public address system shall cover all plant areas including remote zones. Communication trees shall be ' +
      'tested monthly. All workers shall be trained to recognize alarm signals and respond appropriately.',
    keywords: ['emergency communication', 'alarm', 'siren', 'public address', 'fire alarm', 'toxic alarm', 'evacuation alarm', 'training'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E', 'Z-F'],
    applicablePermitTypes: [],
  },

  // ── DGMS: Gas Monitoring ──────────────────────────────────────────────
  {
    id: 'REG-DGMS-10-2014',
    act: 'DGMS Circular',
    section: 'Circular No. 10/2014',
    title: 'Continuous Gas Monitoring in Coke Oven Plants',
    text:
      'All coke oven plants shall install fixed continuous gas monitoring systems for methane (CH4), carbon monoxide (CO), and hydrogen ' +
      'sulfide (H2S) at strategic locations. Alarm set points: CH4 at 20% LEL (warning) and 40% LEL (danger); CO at 50 ppm (warning) ' +
      'and 200 ppm (danger); H2S at 10 ppm (warning) and 50 ppm (danger). Calibration shall be carried out at least monthly.',
    keywords: ['gas monitoring', 'continuous', 'CH4', 'CO', 'H2S', 'methane', 'carbon monoxide', 'hydrogen sulfide', 'alarm', 'calibration', 'coke oven'],
    applicableZones: ['Z-A', 'Z-B'],
    applicablePermitTypes: ['Hot Work', 'Cold Work'],
  },
  {
    id: 'REG-DGMS-5-2010',
    act: 'DGMS Circular',
    section: 'Circular No. 5/2010',
    title: 'Personal Gas Monitors for Workers',
    text:
      'All workers deployed in areas where toxic or flammable gases may be present shall be provided with personal gas monitors capable ' +
      'of detecting at least CO and H2S. Monitors shall have audible and vibration alarms. Workers shall be trained in the use, care, and ' +
      'limitations of the equipment. Monitors shall be bump-tested before each shift.',
    keywords: ['personal gas monitor', 'CO', 'H2S', 'worker', 'alarm', 'vibration', 'bump test', 'training', 'toxic', 'flammable'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D'],
    applicablePermitTypes: [],
  },
  {
    id: 'REG-DGMS-PPE',
    act: 'DGMS Circular',
    section: 'General PPE Requirements',
    title: 'Personal Protective Equipment Standards',
    text:
      'All personnel entering hazardous zones shall wear appropriate personal protective equipment as determined by the hazard assessment ' +
      'for that area. Minimum PPE for Class I (Flammable Gas) zones: flame-resistant coverall, hard hat, safety boots, safety goggles, ' +
      'and personal gas monitor. Minimum PPE for Class II (Toxic) zones: chemical-resistant suit, respirator with appropriate cartridge, ' +
      'hard hat, chemical-resistant gloves, safety boots, and personal gas monitor.',
    keywords: ['PPE', 'personal protective equipment', 'hazardous zone', 'flame-resistant', 'respirator', 'chemical-resistant', 'hard hat', 'gas monitor'],
    applicableZones: ['Z-A', 'Z-B', 'Z-C', 'Z-D'],
    applicablePermitTypes: ['Hot Work', 'Cold Work', 'Confined Space', 'Electrical Isolation'],
  },
];

// ── Full-text search engine ──────────────────────────────────────────────────

/**
 * Tokenizes input text into lowercase search terms, filtering noise words.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'would', 'that',
    'this', 'these', 'those', 'it', 'its', 'not', 'no', 'nor', 'as', 'if',
    'such', 'any', 'all', 'each', 'every', 'than', 'so',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));
}

/**
 * Searches regulations by matching query tokens against keywords and full text.
 * Returns results sorted by relevance score with source citations.
 *
 * @param {string} query - Natural language search query
 * @param {number} [maxResults=5] - Maximum results to return
 * @returns {{ regulation: object, score: number, citation: string }[]}
 */
export function searchRegulations(query, maxResults = 5) {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  const scored = REGULATIONS.map((reg) => {
    let score = 0;

    // Keyword match (highest weight — 3 points per match)
    const regKeywords = reg.keywords.map((k) => k.toLowerCase());
    for (const token of queryTokens) {
      for (const keyword of regKeywords) {
        if (keyword === token) {
          score += 3;
        } else if (keyword.includes(token) || token.includes(keyword)) {
          score += 1.5;
        }
      }
    }

    // Title match (2 points per token)
    const titleLower = reg.title.toLowerCase();
    for (const token of queryTokens) {
      if (titleLower.includes(token)) {
        score += 2;
      }
    }

    // Full text match (1 point per token)
    const textLower = reg.text.toLowerCase();
    for (const token of queryTokens) {
      if (textLower.includes(token)) {
        score += 1;
      }
    }

    // Section / Act match (bonus)
    const actLower = reg.act.toLowerCase();
    const sectionLower = reg.section.toLowerCase();
    for (const token of queryTokens) {
      if (actLower.includes(token) || sectionLower.includes(token)) {
        score += 1;
      }
    }

    const citation = `${reg.act} ${reg.section} — ${reg.title}`;

    return { regulation: reg, score, citation };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
