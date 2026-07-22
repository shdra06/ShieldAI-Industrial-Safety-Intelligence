// ============================================================================
// ShieldAI — Architecture View v4 (2D/3D + Cinematic + Smart Sensors + Log)
// ============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
const Scene3D = lazy(() => import('./Scene3D.jsx').catch(() => ({
  default: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5A6376', fontSize: '12px' }}>3D scene failed to load. Try refreshing.</div>
})));

const AGENTS = [
  { id: 'scada',      name: 'SCADA',      icon: '📡', color: '#60a5fa' },
  { id: 'pattern',    name: 'Pattern',    icon: '📊', color: '#a78bfa' },
  { id: 'predictive', name: 'Predictive', icon: '📈', color: '#f59e0b' },
  { id: 'compliance', name: 'Compliance', icon: '⚖️', color: '#ef4444' },
  { id: 'cascade',    name: 'Cascade',    icon: '🔗', color: '#ec4899' },
  { id: 'equipment',  name: 'Equipment',  icon: '🔧', color: '#f97316' },
];

const TYPE_ICONS = { CH4: '🔥', CO: '💨', H2S: '☠️', NH3: '🧪', Temperature: '🌡️', Pressure: '⏲️' };

// ── Which agents consume each sensor type's data ─────────────────────────────
const SENSOR_AGENTS = {
  CH4:         [
    { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa' },
    { id: 'cascade', name: 'Cascade', icon: '🔗', color: '#ec4899' },
    { id: 'predictive', name: 'Predict', icon: '📈', color: '#f59e0b' },
    { id: 'emergency', name: 'Emergency', icon: '🚨', color: '#ef4444' },
    { id: 'evacuation', name: 'Evac', icon: '🚷', color: '#f97316' },
  ],
  CO:          [
    { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa' },
    { id: 'cascade', name: 'Cascade', icon: '🔗', color: '#ec4899' },
    { id: 'compliance', name: 'Comply', icon: '⚖️', color: '#a78bfa' },
    { id: 'environmental', name: 'Environ', icon: '🌿', color: '#22c55e' },
    { id: 'predictive', name: 'Predict', icon: '📈', color: '#f59e0b' },
  ],
  H2S:         [
    { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa' },
    { id: 'emergency', name: 'Emergency', icon: '🚨', color: '#ef4444' },
    { id: 'evacuation', name: 'Evac', icon: '🚷', color: '#f97316' },
    { id: 'compliance', name: 'Comply', icon: '⚖️', color: '#a78bfa' },
    { id: 'resource', name: 'Resource', icon: '👷', color: '#06b6d4' },
  ],
  NH3:         [
    { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa' },
    { id: 'environmental', name: 'Environ', icon: '🌿', color: '#22c55e' },
    { id: 'compliance', name: 'Comply', icon: '⚖️', color: '#a78bfa' },
    { id: 'predictive', name: 'Predict', icon: '📈', color: '#f59e0b' },
  ],
  Temperature: [
    { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa' },
    { id: 'cascade', name: 'Cascade', icon: '🔗', color: '#ec4899' },
    { id: 'maintenance', name: 'Maint', icon: '🔧', color: '#f97316' },
    { id: 'predictive', name: 'Predict', icon: '📈', color: '#f59e0b' },
    { id: 'digital_twin', name: 'DigiTwin', icon: '🏭', color: '#8b5cf6' },
  ],
  Pressure:    [
    { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa' },
    { id: 'cascade', name: 'Cascade', icon: '🔗', color: '#ec4899' },
    { id: 'maintenance', name: 'Maint', icon: '🔧', color: '#f97316' },
    { id: 'emergency', name: 'Emergency', icon: '🚨', color: '#ef4444' },
    { id: 'digital_twin', name: 'DigiTwin', icon: '🏭', color: '#8b5cf6' },
  ],
};

function getColor(s) {
  if (!s) return '#9CA3AF';
  const r = s.currentValue / (s.criticalThreshold || 100);
  return r >= 1 ? '#DC2626' : r >= 0.5 ? '#D97706' : '#059669';
}

// ── Cinema Scenarios — each scenario has its own fast-paced story ────────────
const SCENARIOS = {
  // ──────────── VIZAG REPLAY — Coke Oven Gas Overpressure ────────────
  vizag: {
    title: '🏭 Vizag Steel Plant — Coke Oven Gas Overpressure',
    desc: 'Recreates the Jan 2025 Vizag Steel Plant explosion sequence. Gas main pressure builds in the coke oven battery, triggering a multi-agent cascade response.',
    steps: [
      { at:0, narration:'🟢 Shift start — all readings nominal', log:{agent:'🧠 Supervisor',text:'Shift handover complete. 13 sensors active, 7 zones green. Coke Oven Battery operating at standard pressure.',severity:'info'} },
      { at:2, narration:'⏲️ Coke oven gas pressure creeping up...', targetSensor:'PRES-001', targetValue:8, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'PRES-001 reading: 8 mmWC (+3 from baseline). Rate: +1.5/tick. Within operating range but trending up.',severity:'info'} },
      { at:4, narration:'📡 SCADA: Pressure rate exceeds drift threshold', targetSensor:'PRES-001', targetValue:11, highlightAgent:'scada', flowFrom:'sensor',flowTo:'scada', log:{agent:'📡 SCADA',text:'⚠ ANOMALY: PRES-001 at 11 mmWC. Rate +2.0/tick exceeds drift threshold (0.3/tick). Escalating to Supervisor.',severity:'warning'} },
      { at:6, narration:'🧠 Supervisor activates multi-agent analysis', highlightAgent:'supervisor', flowFrom:'scada',flowTo:'supervisor', log:{agent:'🧠 Supervisor',text:'Received SCADA alert. Activating: Predictive (forecast) + Cascade (domino) + Compliance (regulatory). Cross-analysis in progress.',severity:'warning'} },
      { at:7, narration:'📚 RAG: Querying OISD-116 fire protection standard', highlightAgent:'supervisor', flowFrom:'supervisor',flowTo:'rag', targetSensor:'PRES-001', targetValue:13, log:{agent:'📚 RAG',text:'MATCH: OISD-STD-116 §4.3 — "When gas main pressure exceeds 12 mmWC, immediate isolation of gas collecting main is mandatory. Evacuate 50m radius within 2 minutes."\nConfidence: 94% | Source: oisd_116_fire_protection.pdf, Page 47',severity:'rag',isChunk:true} },
      { at:9, narration:'📈 Predictive: Critical breach in ~6 minutes', highlightAgent:'predictive', flowFrom:'supervisor',flowTo:'predictive', log:{agent:'📈 Predictive',text:'Linear regression: slope = +0.94 mmWC/tick. Critical threshold (18 mmWC) breach forecast in 6.2 minutes. Confidence: 89%.',severity:'warning'} },
      { at:10, narration:'🔗 Cascade: CH₄ leak risk from seal failure', highlightAgent:'cascade', flowFrom:'supervisor',flowTo:'cascade', targetSensor:'GAS-001', targetValue:15, log:{agent:'🔗 Cascade',text:'DOMINO RISK: PRES-001 → GAS-001. High pressure forces gas through aging seals → methane leak. CH₄ now at 15% LEL. Explosion risk if ignition source present.',severity:'danger'} },
      { at:12, narration:'⚖️ Compliance: OISD-116 §4.3 VIOLATED', highlightAgent:'compliance', flowFrom:'supervisor',flowTo:'compliance', targetSensor:'PRES-001', targetValue:16, log:{agent:'⚖️ Compliance',text:'VIOLATION: Pressure at 16 mmWC > 12 mmWC limit (OISD-116 §4.3). Mandatory shutdown required. DGMS Form-M auto-generated.',severity:'danger'} },
      { at:13, narration:'🚨 EMERGENCY PROTOCOL — Zone A evacuation', highlightAgent:'supervisor', flowFrom:'supervisor',flowTo:'emergency', targetSensor:'PRES-001', targetValue:18, emergency:true, log:{agent:'🚨 EMERGENCY',text:'EVACUATE ZONE A\n• Fire brigade ETA: 4 min\n• Gas isolation valves GV-A01, GV-A02 closing\n• All hot work permits REVOKED\n• Emergency ventilation ON\n• 15 workers → Assembly Point B',severity:'emergency'} },
      { at:15, narration:'🔧 Equipment: Gas isolation valve closing', highlightAgent:'equipment', emergency:true, log:{agent:'🔧 Equipment',text:'Valve GV-A01: motorized close command sent (ETA 45s). GV-A02: manual backup — operator dispatched from Control Room.',severity:'emergency'} },
      { at:17, narration:'📡 Pressure dropping — isolation taking effect', targetSensor:'PRES-001', targetValue:12, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'Pressure: 18 → 12 mmWC. GV-A01 confirmed CLOSED. Flow rate decreasing. CH₄ stabilizing.',severity:'warning'} },
      { at:19, narration:'🔗 Cascade chain broken — CH₄ dropping', targetSensor:'GAS-001', targetValue:8, highlightAgent:'cascade', log:{agent:'🔗 Cascade',text:'Domino chain PRES→GAS broken. CH₄: 15% → 8% LEL. No further propagation detected.',severity:'warning'} },
      { at:21, narration:'📈 All readings trending to baseline', targetSensor:'PRES-001', targetValue:5, highlightAgent:'predictive', log:{agent:'📈 Predictive',text:'All sensors trending toward baseline. Full normalization in ~2 min. Maintain ventilation per OISD-116 §4.5.',severity:'info'} },
      { at:23, narration:'✅ INCIDENT RESOLVED — Zero casualties', targetSensor:'GAS-001', targetValue:4, resolved:true, log:{agent:'🧠 Supervisor',text:'RESOLVED ✅\n• Peak pressure: 18 mmWC\n• Response time: 13s from first anomaly\n• Outcome: Zero injuries, zero release\n• Prevented: CH₄ explosion (15% LEL peak)\n• Filed: DGMS Form-M + OISD log\n• Action: Inspect GV-A01 seal next shutdown',severity:'rag',isChunk:true} },
    ]
  },

  // ──────────── CONFINED SPACE — H₂S buildup in enclosed area ────────────
  confined: {
    title: '☠️ Confined Space Entry — H₂S Gas Accumulation',
    desc: 'A maintenance crew enters a confined space (storage tank). H₂S accumulates due to residual material. Multi-agent system detects toxic gas, revokes permit, initiates rescue.',
    steps: [
      { at:0, narration:'🟢 Confined space entry permit issued for Tank T-04', log:{agent:'🧠 Supervisor',text:'Permit W-CSE-047 approved. 3 workers entering Tank T-04 for internal inspection. Gas test baseline: H₂S 0.5 ppm (safe < 10 ppm).',severity:'info'} },
      { at:2, narration:'☠️ H₂S sensor detecting gradual rise inside tank', targetSensor:'GAS-003', targetValue:5, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'GAS-003 (H₂S, Zone A): Reading 5 ppm. Baseline was 0.5 ppm. Possible residual sulfide reacting with moisture.',severity:'info'} },
      { at:4, narration:'📡 H₂S climbing — 12 ppm, approaching warning', targetSensor:'GAS-003', targetValue:12, highlightAgent:'scada', flowFrom:'sensor',flowTo:'scada', log:{agent:'📡 SCADA',text:'⚠ H₂S at 12 ppm (warning: 10 ppm). Rate: +3.5 ppm/tick. Workers may not detect — H₂S deadens sense of smell at this level.',severity:'warning'} },
      { at:5, narration:'🧠 Supervisor: Worker safety at risk', highlightAgent:'supervisor', flowFrom:'scada',flowTo:'supervisor', log:{agent:'🧠 Supervisor',text:'CRITICAL: 3 workers inside confined space with rising H₂S. Cross-referencing permit W-CSE-047 with current gas readings. Activating Compliance + Equipment agents.',severity:'warning'} },
      { at:7, narration:'📚 RAG: IS 4263 confined space procedure', highlightAgent:'supervisor', flowFrom:'supervisor',flowTo:'rag', targetSensor:'GAS-003', targetValue:18, log:{agent:'📚 RAG',text:'MATCH: IS 4263 §3.2 — "If H₂S exceeds 10 ppm during confined space work, immediate evacuation mandatory. SCBA required above 20 ppm. Rescue team must be on standby."\nSource: is_4263_confined_space.pdf',severity:'rag',isChunk:true} },
      { at:8, narration:'⚖️ Compliance: Permit REVOKED — evacuation required', highlightAgent:'compliance', flowFrom:'supervisor',flowTo:'compliance', log:{agent:'⚖️ Compliance',text:'PERMIT REVOKED: W-CSE-047 invalidated. H₂S at 18 ppm > 10 ppm limit (IS 4263). Workers must exit immediately. SCBA required for rescue team.',severity:'danger'} },
      { at:10, narration:'🚨 CONFINED SPACE RESCUE initiated', highlightAgent:'supervisor', flowFrom:'supervisor',flowTo:'emergency', targetSensor:'GAS-003', targetValue:22, emergency:true, log:{agent:'🚨 EMERGENCY',text:'RESCUE PROTOCOL\n• Tank T-04 ventilation fans ON (max)\n• Rescue team with SCBA en route\n• Alarm siren at entry point\n• Winch retrieval system activated\n• Medical team on standby',severity:'emergency'} },
      { at:12, narration:'🔧 Ventilation activated — H₂S diluting', highlightAgent:'equipment', targetSensor:'GAS-003', targetValue:15, log:{agent:'🔧 Equipment',text:'Forced ventilation at 500 CFM. H₂S diluting: 22 → 15 ppm. Workers moving toward entry point with rescue team assistance.',severity:'warning'} },
      { at:14, narration:'📡 Workers extracted — H₂S dropping', targetSensor:'GAS-003', targetValue:8, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'All 3 workers safely extracted from Tank T-04. H₂S: 15 → 8 ppm. Ventilation continuing.',severity:'info'} },
      { at:16, narration:'✅ All workers safe — tank ventilating', targetSensor:'GAS-003', targetValue:2, resolved:true, log:{agent:'🧠 Supervisor',text:'RESOLVED ✅\n• All 3 workers extracted safely\n• Peak H₂S: 22 ppm\n• Response: 10s from detection to rescue\n• Root cause: Residual iron sulfide + moisture\n• Action: Mandatory 2-hour ventilation before re-entry\n• Filed: DGMS confined space incident report',severity:'rag',isChunk:true} },
    ]
  },

  // ──────────── SILENT DRIFT — Slow multi-sensor degradation ────────────
  deviance: {
    title: '📊 Silent Drift — Gradual Multi-Sensor Degradation',
    desc: 'No single sensor trips an alarm, but multiple sensors drift simultaneously. Only the AI pattern agent detects the compound risk that humans would miss.',
    steps: [
      { at:0, narration:'🟢 Everything looks normal — but is it?', log:{agent:'🧠 Supervisor',text:'All sensors within normal range individually. No single alarm triggered. Pattern agent monitoring for compound drift signatures.',severity:'info'} },
      { at:2, narration:'📊 CH₄ slightly elevated — still "safe"', targetSensor:'GAS-001', targetValue:12, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'GAS-001 (CH₄): 12% LEL. Within normal range (alarm at 20%). No alert triggered.',severity:'info'} },
      { at:3, narration:'🌡️ Temperature drifting up — within limits', targetSensor:'TEMP-001', targetValue:55, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'TEMP-001: 55°C. Normal range 30-80°C. No individual alert.',severity:'info'} },
      { at:4, narration:'⏲️ Pressure ticking up — still "normal"', targetSensor:'PRES-001', targetValue:7, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'PRES-001: 7 mmWC. Normal range 2-8. At upper end but not alarming alone.',severity:'info'} },
      { at:5, narration:'💨 CO rising subtly...', targetSensor:'GAS-002', targetValue:18, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'GAS-002 (CO): 18 ppm. Warning at 25 ppm. Individual reading: acceptable.',severity:'info'} },
      { at:7, narration:'📊 PATTERN AGENT detects compound anomaly!', highlightAgent:'pattern', flowFrom:'scada',flowTo:'pattern', log:{agent:'📊 Pattern',text:'⚠ COMPOUND DRIFT DETECTED\n4 sensors simultaneously trending up:\n• CH₄: +40% from baseline\n• Temp: +35% from baseline\n• Pressure: +75% from baseline\n• CO: +60% from baseline\n\nNo single alarm triggered, but compound risk score: 0.72 (HIGH). This pattern matches pre-incident signatures from Vizag 2025.',severity:'danger'} },
      { at:9, narration:'🧠 Supervisor: Hidden danger — single sensors blind', highlightAgent:'supervisor', flowFrom:'pattern',flowTo:'supervisor', log:{agent:'🧠 Supervisor',text:'Pattern agent flagged compound drift. Traditional SCADA would have missed this — no single threshold breached. Activating Predictive + Cascade for deep analysis.',severity:'warning'} },
      { at:10, narration:'📈 Predictive: Convergence toward critical in 15 min', highlightAgent:'predictive', flowFrom:'supervisor',flowTo:'predictive', targetSensor:'GAS-001', targetValue:16, log:{agent:'📈 Predictive',text:'Multi-sensor regression: All 4 sensors converging toward critical thresholds simultaneously. ETA to first breach: ~15 minutes. Compound breach risk: ~8 minutes.',severity:'danger'} },
      { at:12, narration:'🔗 Cascade: Thermal-chemical chain identified', highlightAgent:'cascade', flowFrom:'supervisor',flowTo:'cascade', targetSensor:'TEMP-001', targetValue:65, log:{agent:'🔗 Cascade',text:'Chain: Rising temp → faster gas generation → pressure buildup → seal stress → CH₄ leak acceleration. This is a self-reinforcing loop. Intervention needed NOW before it becomes uncontrollable.',severity:'danger'} },
      { at:13, narration:'⚖️ Preventive shutdown recommended', highlightAgent:'compliance', flowFrom:'supervisor',flowTo:'compliance', log:{agent:'⚖️ Compliance',text:'Recommending preventive shutdown of Zone A heating system. OISD-154 §2.1: "When compound risk indicators exceed 0.7, precautionary cooling is mandatory." Filing preventive action report.',severity:'warning'} },
      { at:15, narration:'🔧 Equipment: Controlled cooling initiated', highlightAgent:'equipment', targetSensor:'TEMP-001', targetValue:50, log:{agent:'🔧 Equipment',text:'Zone A heating reduced 40%. Cooling water flow increased. Ventilation boosted to dilute accumulated gases.',severity:'info'} },
      { at:17, narration:'📡 All sensors trending down — drift reversed', targetSensor:'GAS-001', targetValue:8, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'Drift reversed: CH₄ 16→8%, Temp 65→50°C, Pressure dropping, CO stabilizing. Compound risk score: 0.3 (LOW).',severity:'info'} },
      { at:19, narration:'✅ Silent drift caught BEFORE any alarm tripped', targetSensor:'PRES-001', targetValue:4, resolved:true, log:{agent:'🧠 Supervisor',text:'RESOLVED ✅\n• Threat type: Silent compound drift\n• No individual alarm was ever triggered\n• AI Pattern Agent detected what humans couldn\'t\n• Compound risk peak: 0.72\n• Time saved: ~15 min lead time\n• Outcome: Preventive cooling, zero escalation',severity:'rag',isChunk:true} },
    ]
  },

  // ──────────── CASCADE FAILURE — Multi-zone domino effect ────────────
  cascade: {
    title: '🔗 Cascade Failure — Multi-Zone Domino Effect',
    desc: 'A blast furnace temperature spike triggers a chain reaction across zones: pressure surge, gas leak, equipment failure. Tests the full emergency orchestration.',
    steps: [
      { at:0, narration:'🟢 Normal operations — Blast Furnace at standard temp', log:{agent:'🧠 Supervisor',text:'All zones operational. Blast Furnace #1 at 1450°C (normal: 1400-1500°C). Monitoring 7 zones.',severity:'info'} },
      { at:2, narration:'🌡️ BF temperature spiking — cooling system lag', targetSensor:'TEMP-002', targetValue:1550, highlightAgent:'scada', flowFrom:'sensor',flowTo:'scada', log:{agent:'📡 SCADA',text:'⚠ TEMP-002 (Blast Furnace): 1550°C — exceeds upper limit (1500°C). Cooling water flow may be insufficient.',severity:'warning'} },
      { at:3, narration:'🧠 Supervisor: Potential cascade risk from BF', highlightAgent:'supervisor', flowFrom:'scada',flowTo:'supervisor', log:{agent:'🧠 Supervisor',text:'BF overtemp detected. Analyzing cascade paths: BF temp → steel quality → gas generation → pressure → Zone D equipment stress.',severity:'warning'} },
      { at:5, narration:'🔗 Cascade: BF heat → Gas overpressure in Zone A', highlightAgent:'cascade', flowFrom:'supervisor',flowTo:'cascade', targetSensor:'PRES-001', targetValue:14, log:{agent:'🔗 Cascade',text:'CHAIN DETECTED: BF overtemp → increased off-gas volume → coke oven gas main pressure rising → Zone A PRES-001 at 14 mmWC. Two-zone correlation confirmed.',severity:'danger'} },
      { at:6, narration:'🔥 CH₄ leak in Zone A — seal failure from pressure', targetSensor:'GAS-001', targetValue:22, highlightAgent:'cascade', log:{agent:'🔗 Cascade',text:'SECONDARY CASCADE: High pressure → seal failure → CH₄ leak. GAS-001 at 22% LEL (critical: 20%). THREE zones now affected: C (BF), A (gas), D (equipment stress).',severity:'danger'} },
      { at:7, narration:'📚 RAG: Multi-zone emergency protocol', highlightAgent:'supervisor', flowFrom:'supervisor',flowTo:'rag', log:{agent:'📚 RAG',text:'MATCH: OISD-STD-144 §5.2 — "Multi-zone cascade events require Level-3 Emergency response: full plant alert, all zones evacuated, central shutdown initiated within 3 minutes."\nSource: oisd_144_multi_hazard.pdf',severity:'rag',isChunk:true} },
      { at:8, narration:'🚨 LEVEL-3 EMERGENCY — Full plant alert', emergency:true, highlightAgent:'supervisor', flowFrom:'supervisor',flowTo:'emergency', log:{agent:'🚨 EMERGENCY',text:'LEVEL-3 PLANT EMERGENCY\n• ALL ZONES: Evacuation order\n• Blast Furnace: Emergency cooling\n• Gas mains: Full isolation\n• Fire brigade + ambulance dispatched\n• 47 workers → 3 assembly points\n• Central DCS: Automated shutdown sequence',severity:'emergency'} },
      { at:10, narration:'🔧 Equipment: Multi-zone shutdown executing', highlightAgent:'equipment', targetSensor:'TEMP-002', targetValue:1480, log:{agent:'🔧 Equipment',text:'BF emergency cooling activated (+200% water flow). Gas isolation: GV-A01, GV-A02, GV-B01 all closing. DCS auto-shutdown sequence step 3/7.',severity:'emergency'} },
      { at:12, narration:'📡 Temperature dropping — cascade slowing', targetSensor:'PRES-001', targetValue:10, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'BF temp: 1550→1480°C. Gas pressure: 14→10 mmWC. CH₄: 22→16% LEL. Cascade propagation rate decreasing.',severity:'warning'} },
      { at:14, narration:'📈 Predictive: Full normalization in ~5 minutes', targetSensor:'GAS-001', targetValue:10, highlightAgent:'predictive', log:{agent:'📈 Predictive',text:'All cascade chains decelerating. BF cooling effective. Gas isolation holding. ETA to safe levels: ~5 minutes across all zones.',severity:'info'} },
      { at:16, narration:'📡 All zones returning to safe parameters', targetSensor:'GAS-001', targetValue:5, highlightAgent:'scada', log:{agent:'📡 SCADA',text:'Zone A: Gas safe. Zone C: BF cooling. Zone D: Equipment stress normalized. Cascade fully contained.',severity:'info'} },
      { at:18, narration:'✅ Cascade contained — all 47 workers safe', resolved:true, log:{agent:'🧠 Supervisor',text:'RESOLVED ✅\n• Cascade type: BF temp → gas pressure → CH₄ leak\n• Zones affected: 3 (A, C, D)\n• Response: Level-3 emergency in 8s\n• Workers evacuated: 47/47\n• Injuries: Zero\n• Equipment damage: None (preventive shutdown)\n• AI advantage: 6-min earlier detection than traditional SCADA',severity:'rag',isChunk:true} },
    ]
  },

  // ──────────── NORMAL — Peaceful monitoring ────────────
  normal: {
    title: '🟢 Normal Operations — Routine Monitoring',
    desc: 'Standard shift operation. All systems nominal. Demonstrates baseline AI monitoring with no incidents.',
    steps: [
      { at:0, narration:'🟢 All systems nominal — 13 sensors, 7 zones, 0 alerts', log:{agent:'🧠 Supervisor',text:'Morning shift started. All sensors within normal parameters. 20 AI agents active and monitoring.',severity:'info'} },
      { at:3, narration:'📡 Routine scan: All gas levels well below thresholds', highlightAgent:'scada', log:{agent:'📡 SCADA',text:'Routine scan complete. CH₄: 4% LEL (limit: 20%). CO: 12 ppm (limit: 25 ppm). H₂S: 1.2 ppm (limit: 10 ppm). All green.',severity:'info'} },
      { at:6, narration:'📊 Pattern: No anomalous drift in last 30 readings', highlightAgent:'pattern', log:{agent:'📊 Pattern',text:'30-reading window analysis: No compound drift detected. All sensor correlations within expected bounds. Compound risk: 0.08 (NOMINAL).',severity:'info'} },
      { at:9, narration:'⚖️ Compliance: All 5 active permits valid', highlightAgent:'compliance', log:{agent:'⚖️ Compliance',text:'Permit audit: 5 active work permits. All gas tests current (<4 hours old). PPE compliance: 98%. No violations.',severity:'info'} },
      { at:12, narration:'📈 Predictive: No risk trends — stable forecast', highlightAgent:'predictive', log:{agent:'📈 Predictive',text:'24-hour forecast: All sensors stable. No drift patterns detected. Estimated risk for next shift: 0.04 (VERY LOW).',severity:'info'} },
      { at:15, narration:'🟢 Shift proceeding normally — next scan in 30s', log:{agent:'🧠 Supervisor',text:'All checks passed. System health: 100%. Next automated scan cycle in 30 seconds. AI agents on standby.',severity:'info'} },
    ]
  },
};

// Keep vizag as default fallback
const CINEMA_STEPS = SCENARIOS.vizag.steps;

// =============================================================================
export default function ArchitectureView({ sensors = [], onOverride, systemStatus, scenario = 'normal' }) {
  const [selectedId, setSelectedId] = useState(null);
  const [cinemaActive, setCinemaActive] = useState(false);

  // Pick the right scenario sequence (keys match engine scenario IDs)
  const scenarioKey = SCENARIOS[scenario] ? scenario : 'normal';
  const activeScenario = SCENARIOS[scenarioKey];
  const activeSteps = activeScenario.steps;
  const [viewMode, setViewMode] = useState('2d'); // '2d' | '3d'
  const [highlightAgent, setHighlightAgent] = useState(null);
  const [activeFlow, setActiveFlow] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [narration, setNarration] = useState('');
  const [highlightSensor, setHighlightSensor] = useState(null);
  const [activityLog, setActivityLogRaw] = useState([]);
  // Cap log at 50 entries to prevent memory leak
  const setActivityLog = useCallback((updater) => {
    setActivityLogRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return Array.isArray(next) ? next.slice(-50) : next;
    });
  }, []);
  const [warningCount, setWarningCount] = useState(0);
  const [expandedOutput, setExpandedOutput] = useState(null);
  const timersRef = useRef([]);
  const logEndRef = useRef(null);
  const prevScenarioRef = useRef(scenarioKey);

  // Real sensor alerts
  const critCount = sensors.filter(s => s.currentValue >= s.criticalThreshold).length;
  const warnCount = sensors.filter(s => s.currentValue >= s.warningThreshold && s.currentValue < s.criticalThreshold).length;
  const hasAnyCritical = critCount > 0 || isEmergency;
  const hasAnyWarning = warnCount > 0 || hasAnyCritical;

  // ── Auto-sync when scenario changes from header ───────────────────────
  useEffect(() => {
    if (prevScenarioRef.current !== scenarioKey) {
      prevScenarioRef.current = scenarioKey;
      // Reset all cinema state
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
      setIsEmergency(false);
      setHighlightAgent(null);
      setActiveFlow(null);
      setHighlightSensor(null);
      setActivityLog([]);
      setWarningCount(0);
      setNarration(activeSteps[0]?.narration || '🟢 Starting...');
      // Auto-start the demo for the new scenario
      setCinemaActive(true);
    }
  }, [scenarioKey, activeSteps]);

  // No auto-scroll — newest entries rendered at top instead

  // ── Cinematic auto-play (uses activeSteps from scenario) ─────────────────
  useEffect(() => {
    if (!cinemaActive) return;
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    for (const step of activeSteps) {
      const timer = setTimeout(() => {
        setNarration(step.narration);
        if (step.highlightAgent) setHighlightAgent(step.highlightAgent);
        else setHighlightAgent(null);
        if (step.flowFrom && step.flowTo) {
          setActiveFlow({ from: step.flowFrom, to: step.flowTo });
          setTimeout(() => setActiveFlow(null), 1800);
        }
        if (step.emergency) setIsEmergency(true);
        if (step.resolved) setIsEmergency(false);
        if (step.targetSensor && step.targetValue != null) {
          setHighlightSensor(step.targetSensor);
          onOverride?.(step.targetSensor, step.targetValue);
        }
        if (step.log) {
          setActivityLog(prev => [...prev, { ...step.log, time: new Date() }]);
          setWarningCount(prev => prev + 1);
        }
      }, step.at * 1000);
      timersRef.current.push(timer);
    }
    return () => timersRef.current.forEach(t => clearTimeout(t));
  }, [cinemaActive, activeSteps, onOverride]);

  // ── Reactive AI Pipeline — triggers visual agent flow when sensor is manually changed ──
  const reactiveTimersRef = useRef([]);

  const handleManualOverride = useCallback((id, val) => {
    setCinemaActive(false);
    timersRef.current.forEach(t => clearTimeout(t));
    // Clear any previous reactive animation
    reactiveTimersRef.current.forEach(t => clearTimeout(t));
    reactiveTimersRef.current = [];

    onOverride?.(id, val);

    // Find the sensor to determine severity
    const sensor = sensors.find(s => s.id === id);
    if (!sensor) return;

    const isCrit = val >= sensor.criticalThreshold;
    const isWarn = val >= sensor.warningThreshold;
    const isElevated = val >= sensor.warningThreshold * 0.6;
    const sensorLabel = `${sensor.label || sensor.type} (${sensor.id})`;
    const connectedAgents = SENSOR_AGENTS[sensor.type] || [];

    // If reading is low/safe, show agents acknowledging the safe reading
    if (!isElevated) {
      const now = new Date();
      setHighlightSensor(id);
      setHighlightAgent('scada');
      setActiveFlow({ from: 'sensor', to: 'scada' });
      setActivityLog(prev => [...prev, {
        agent: '📡 SCADA', severity: 'info', time: now, sensorId: id,
        text: `✅ ${sensorLabel} reset to safe: ${val.toFixed(1)} ${sensor.unit}. Below all thresholds.`,
      }]);

      const t1 = setTimeout(() => {
        setHighlightAgent('supervisor');
        setActiveFlow({ from: 'scada', to: 'supervisor' });
        setActivityLog(prev => [...prev, {
          agent: '🧠 Supervisor', severity: 'info', time: now,
          text: `${sensorLabel} confirmed safe. Updating risk assessment — monitoring continues.`,
        }]);
      }, 1200);

      const t2 = setTimeout(() => {
        setHighlightAgent(null);
        setActiveFlow(null);
        setHighlightSensor(null);
        setIsEmergency(false);
      }, 2500);

      reactiveTimersRef.current.push(t1, t2);
      setWarningCount(prev => Math.max(0, prev - 1));
      return;
    }

    // ── Build reactive animation sequence ──
    const steps = [];
    const now = new Date();

    // Step 1: SCADA detects the reading (with dedup — skip if same sensor+severity logged recently)
    steps.push({ delay: 0, action: () => {
      setHighlightSensor(id);
      setHighlightAgent('scada');
      setActiveFlow({ from: 'sensor', to: 'scada' });
      setActivityLog(prev => {
        const recentSame = prev.filter(e => e.agent === '📡 SCADA' && e.sensorId === id && (now - e.time) < 15000);
        if (recentSame.length > 0 && recentSame[recentSame.length - 1].severityBand === (isCrit ? 'critical' : isWarn ? 'warning' : 'info')) {
          return prev; // Skip duplicate
        }
        return [...prev, {
          agent: '📡 SCADA', severity: isWarn ? 'warning' : 'info', time: now, sensorId: id,
          severityBand: isCrit ? 'critical' : isWarn ? 'warning' : 'info',
          text: `${sensorLabel}: ${val.toFixed(1)} ${sensor.unit}. ${isCrit ? 'CRITICAL — exceeds threshold (' + sensor.criticalThreshold + ')!' : isWarn ? 'WARNING — above threshold (' + sensor.warningThreshold + ').' : 'Elevated — approaching warning range.'}`,
        }];
      });
      setWarningCount(prev => prev + 1);
    }});

    // Step 2: Data flows to Supervisor
    steps.push({ delay: 1200, action: () => {
      setHighlightAgent('supervisor');
      setActiveFlow({ from: 'scada', to: 'supervisor' });
      setActivityLog(prev => [...prev, {
        agent: '🧠 Supervisor', severity: isCrit ? 'danger' : 'warning', time: now,
        text: `Received ${isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'elevated'} alert from SCADA for ${sensorLabel}. Activating ${connectedAgents.map(a => a.name).join(', ')} for cross-analysis.`,
      }]);
    }});

    // Step 2.5: RAG Knowledge Retrieval
    const ragDocs = {
      CH4: { reg: 'OISD-116 §4.2.3', rule: 'Methane LEL limits: Warning at 10% LEL, Critical at 20% LEL. Mandatory gas-free certification required above 25% LEL.', src: 'DGMS Circular 3/2019' },
      CO: { reg: 'OISD-144 §6.1', rule: 'CO exposure limit: 35 ppm (8hr TWA), 200 ppm (ceiling). Immediate evacuation above 100 ppm per DGMS Tech Circular.', src: 'PESO Act Schedule-III' },
      H2S: { reg: 'OISD-116 §5.3.1', rule: 'H2S threshold: 10 ppm (TWA), 15 ppm (STEL). Toxic gas alarm at 5 ppm. Full-face respirator mandatory above 10 ppm.', src: 'IS 5780:2023' },
      NH3: { reg: 'OISD-163 §3.4', rule: 'Ammonia: 25 ppm (TWA), 35 ppm (STEL). Vapor cloud dispersion modeling required above 50 ppm leak.', src: 'DGMS Safety Manual Ch-12' },
      Temperature: { reg: 'OISD-117 §7.2', rule: 'Process temperature limits per equipment design code. Thermal runaway protocol activates at 105% of design temperature.', src: 'ASME B31.3 / IBR Schedule-II' },
      Pressure: { reg: 'OISD-117 §4.5', rule: 'Relief valve set-point verification. Over-pressurization interlock at 90% MAWP. Emergency depressurization above 95% MAWP.', src: 'PESO Static & Mobile Pressure Vessels Rules' },
    };
    const ragInfo = ragDocs[sensor.type] || { reg: 'OISD-116 General', rule: 'Standard operating procedure for sensor anomalies.', src: 'Company SOP Database' };

    steps.push({ delay: 2000, action: () => {
      setActiveFlow({ from: 'supervisor', to: 'rag' });
      setActivityLog(prev => [...prev, {
        agent: '📚 RAG Retrieval', severity: 'rag', time: now, isChunk: true,
        text: `Querying knowledge base...\n📄 ${ragInfo.reg}: "${ragInfo.rule}"\n📎 Source: ${ragInfo.src}\n🔍 Also retrieved: Equipment log for ${sensorLabel}, Incident history for ${sensor.zoneId}`,
      }]);
    }});

    // Step 3-N: Each connected sub-agent activates sequentially (after RAG)
    connectedAgents.forEach((ag, i) => {
      if (ag.id === 'scada') return; // Already shown
      steps.push({ delay: 3400 + i * 900, action: () => {
        setHighlightAgent(ag.id);
        setActiveFlow({ from: 'supervisor', to: ag.id });

        // Agent-specific RAG-informed messages
        const agentMessages = {
          cascade: `Analyzing domino chains from ${sensor.type} anomaly. Per ${ragInfo.reg}, ${isCrit ? 'HIGH cascade risk — checking connected zones for thermal/pressure propagation.' : 'monitoring linked failure paths per safety case.'}`,
          predictive: `Running regression on ${sensorLabel}. ${isCrit ? `Current trend predicts sustained breach. ${ragInfo.reg} mandates immediate intervention.` : 'Forecasting: threshold approach in estimated time.'}`,
          emergency: `${isCrit ? `EMERGENCY PROTOCOLS per ${ragInfo.src}. Fire brigade and medical teams on standby. ${ragInfo.reg} compliance verified.` : 'Monitoring — no emergency action required yet.'}`,
          evacuation: `${isCrit ? `Evacuation routes for ${sensor.zoneId} per ${ragInfo.reg}. Assembly points identified per company ERP.` : 'Evacuation planning on standby.'}`,
          compliance: `Checking ${ragInfo.reg} for ${sensor.type} at ${val.toFixed(1)} ${sensor.unit}. ${isCrit ? `VIOLATION — mandatory shutdown per ${ragInfo.src}.` : 'Within regulatory limits.'}`,
          environmental: `Ambient conditions assessed per ${ragInfo.src}. ${sensor.type === 'gas' || sensor.type === 'CH4' || sensor.type === 'CO' ? 'Wind dispersion model updated.' : 'Thermal analysis running.'}`,
          maintenance: `Equipment health check per ${ragInfo.reg}. ${isCrit ? 'Valve inspection triggered. Maintenance log updated.' : 'No maintenance action needed.'}`,
          resource: `Worker proximity check for ${sensor.zoneId}. ${isCrit ? `Alert sent per ${ragInfo.src}. ${sensor.zoneId} personnel notified.` : 'All workers in safe positions.'}`,
          digital_twin: `Physics simulation updated: ${sensor.type} = ${val.toFixed(1)}. Model cross-referenced with ${ragInfo.reg}. ${isCrit ? 'Elevated risk confirmed.' : 'Parameters nominal.'}`,
        };
        setActivityLog(prev => [...prev, {
          agent: `${ag.icon} ${ag.name}`, severity: isCrit ? 'danger' : isWarn ? 'warning' : 'info', time: now,
          text: agentMessages[ag.id] || `Processing ${sensorLabel} data per ${ragInfo.reg}.`,
        }]);
      }});
    });

    // Final step: Supervisor conclusion
    const totalDelay = 3400 + connectedAgents.length * 900 + 800;
    steps.push({ delay: totalDelay, action: () => {
      setHighlightAgent('supervisor');
      setActiveFlow(null);
      if (isCrit) {
        setIsEmergency(true);
        setNarration(`🚨 EMERGENCY — ${sensorLabel} at CRITICAL level. Multi-agent response active.`);
      } else if (isWarn) {
        setNarration(`⚠️ WARNING — ${sensorLabel} elevated. AI agents monitoring and ready.`);
      } else {
        setNarration(`📡 Elevated reading on ${sensorLabel}. Agents tracking.`);
      }
      setActivityLog(prev => [...prev, {
        agent: '🧠 Supervisor', severity: isCrit ? 'emergency' : 'info', time: now,
        text: isCrit
          ? `Analysis complete. ${connectedAgents.length} agents processed ${sensorLabel} per ${ragInfo.reg}. EMERGENCY RESPONSE initiated for ${sensor.zoneId}. Regulatory compliance: ${ragInfo.src}.`
          : `Analysis complete. ${connectedAgents.length} agents processed ${sensorLabel}. Decision basis: ${ragInfo.reg}. Situation ${isWarn ? 'under active monitoring per ' + ragInfo.src : 'nominal'}.`,
      }]);
    }});

    // Clear highlights after pipeline completes
    steps.push({ delay: totalDelay + 4000, action: () => {
      setHighlightAgent(null);
      setActiveFlow(null);
      setHighlightSensor(null);
      if (!isCrit) setIsEmergency(false);
    }});

    // Execute the timed sequence
    steps.forEach(step => {
      const t = setTimeout(step.action, step.delay);
      reactiveTimersRef.current.push(t);
    });
  }, [onOverride, sensors]);

  const resetCinema = useCallback(() => {
    setIsEmergency(false);
    setHighlightAgent(null);
    setActiveFlow(null);
    setHighlightSensor(null);
    setActivityLog([]);
    setWarningCount(0);
    setNarration(activeSteps[0]?.narration || '🟢 Starting...');
    sensors.forEach(s => {
      const baseline = s.driftBaseline ?? s.normalRange?.min ?? 0;
      onOverride?.(s.id, baseline);
    });
    setCinemaActive(true);
  }, [sensors, onOverride, activeSteps]);

  return (
    <div style={S.root}>
      <style>{`
        @keyframes flowPulse { 0%{opacity:0;transform:translateX(-8px)} 50%{opacity:1} 100%{opacity:0;transform:translateX(8px)} }
        @keyframes glowRed { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} 50%{box-shadow:0 0 16px 4px rgba(239,68,68,0.35)} }
        @keyframes glowYellow { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)} 50%{box-shadow:0 0 12px 3px rgba(245,158,11,0.25)} }
        @keyframes agentGlow { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pulseHL { 0%,100%{border-color:rgba(139,92,246,0.3)} 50%{border-color:rgba(139,92,246,0.8)} }
        input[type="range"]{-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer}
        input[type="range"]::-webkit-slider-runnable-track{height:4px;background:rgba(255,255,255,0.1);border-radius:2px}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#a78bfa;margin-top:-5px;border:2px solid #0a0e1a}
        .log-scroll::-webkit-scrollbar{width:3px} .log-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .sensor-scroll::-webkit-scrollbar{width:3px} .sensor-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {/* ══════ NARRATION BAR ══════ */}
      <div style={S.narBar}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1, minWidth:0 }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', flexShrink:0,
            background: isEmergency ? '#DC2626' : hasAnyWarning ? '#D97706' : cinemaActive ? '#7C3AED' : '#059669',
            animation: isEmergency ? 'blink 0.6s infinite' : cinemaActive ? 'blink 1.5s infinite' : 'none',
          }} />
          {/* Mode badge */}
          <div style={{
            padding: '1px 6px', borderRadius: '3px', fontSize: '7px', fontWeight: 700,
            letterSpacing: '1px', flexShrink: 0,
            background: cinemaActive ? '#F5F3FF' : '#F0FDF4',
            color: cinemaActive ? '#7C3AED' : '#059669',
            border: `1px solid ${cinemaActive ? '#DDD6FE' : '#D1FAE5'}`,
          }}>
            {cinemaActive ? '▶ DEMO' : '🎛 MANUAL'}
          </div>
          <div style={{ fontSize:'11px', color:'#1A1D26', fontWeight:500, animation:'fadeSlide 0.3s ease', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} key={cinemaActive ? narration : 'manual-' + scenarioKey}>
            {cinemaActive ? narration : `🎛️ Manual Mode — ${activeScenario.title}. Adjust sensors or press ▶ Play Demo.`}
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
          {cinemaActive ? (
            <button onClick={() => { setCinemaActive(false); timersRef.current.forEach(t => clearTimeout(t)); setNarration('Paused'); }} style={{ ...S.btn, background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>⏸ Pause Demo</button>
          ) : (
            <button onClick={resetCinema} style={{ ...S.btn, background: '#F5F3FF', borderColor: '#DDD6FE', color: '#7C3AED' }}>▶ Play Demo</button>
          )}
          <button onClick={() => setViewMode(v => v === '2d' ? '3d' : '2d')} style={{ ...S.btn, background: viewMode === '3d' ? '#F5F3FF' : '#F0F2F5', borderColor: viewMode === '3d' ? '#DDD6FE' : '#D0D5DE', color: viewMode === '3d' ? '#7C3AED' : '#5A6376' }}>
            {viewMode === '3d' ? '🔲 2D View' : '🧊 3D View'}
          </button>
        </div>
      </div>

      {/* ══════ 3D MODE ══════ */}
      {viewMode === '3d' ? (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#5A6376', fontSize:'12px' }}>Loading 3D scene...</div>}>
            <Scene3D
              sensors={sensors}
              highlightAgent={highlightAgent}
              isEmergency={isEmergency}
              hasWarning={hasAnyWarning}
              activeFlow={activeFlow}
              highlightSensor={highlightSensor}
              selectedSensor={selectedId}
              warningCount={warningCount}
              onSensorClick={(id) => setSelectedId(id === selectedId ? null : id)}
            />
          </Suspense>
          {/* Activity Log Overlay */}
          <div style={{
            position: 'absolute', right: '8px', top: '8px', bottom: '8px', width: '260px',
            background: 'rgba(10,14,26,0.88)', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.1)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #D0D5DE', fontSize: '8px', fontWeight: 700, letterSpacing: '1.5px', color: '#5A6376' }}>AGENT ACTIVITY</div>
            <div className="log-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {activityLog.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#9CA3AF', fontSize: '10px' }}>Waiting for sensor events...</div>
              ) : activityLog.map((entry, i) => (
                <div key={i} style={{
                  padding: '5px 7px', borderRadius: '5px', animation: 'fadeSlide 0.3s ease',
                  background: entry.severity === 'emergency' ? 'rgba(239,68,68,0.08)' : entry.severity === 'rag' ? 'rgba(16,185,129,0.06)' : 'rgba(17,24,39,0.4)',
                  border: `1px solid ${entry.severity === 'emergency' ? '#FECACA' : entry.severity === 'rag' ? '#D1FAE5' : '#D0D5DE'}`,
                }}>
                  <div style={{ fontSize: '7px', fontWeight: 700, color: entry.severity === 'emergency' ? '#DC2626' : entry.severity === 'rag' ? '#059669' : entry.severity === 'warning' ? '#D97706' : '#2563EB', marginBottom: '2px' }}>{entry.agent}</div>
                  <div style={{
                    fontSize: '8px', color: '#5A6376', lineHeight: 1.4, whiteSpace: 'pre-wrap',
                    ...(entry.isChunk ? { background: '#F0FDF4', padding: '4px 6px', borderRadius: '3px', borderLeft: '2px solid #059669', fontFamily: "'Courier New',monospace", fontSize: '7.5px' } : {}),
                  }}>{entry.text}</div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
          {/* Sensor control overlay (selected sensor slider) */}
          {selectedId && (() => {
            const s = sensors.find(x => x.id === selectedId);
            if (!s) return null;
            const max = (s.criticalThreshold || 100) * 1.5;
            return (
              <div style={{
                position: 'absolute', left: '8px', bottom: '8px', width: '220px',
                background: 'rgba(10,14,26,0.9)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)',
                padding: '10px', backdropFilter: 'blur(8px)',
              }}>
                <div style={{ fontSize: '10px', color: '#1A1D26', fontWeight: 700, marginBottom: '4px' }}>
                  {TYPE_ICONS[s.type] || '📡'} {s.type} — {s.currentValue.toFixed(1)} {s.unit}
                </div>
                <div style={{ fontSize: '8px', color: '#5A6376', marginBottom: '4px' }}>{s.label}</div>
                <input type="range" min={0} max={max} step={max>100?1:0.1} value={s.currentValue}
                  onChange={e => handleManualOverride(s.id, +e.target.value)} style={{ width: '100%' }} />
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {[{ l:'Safe', v:+(s.warningThreshold*0.1).toFixed(1), c:'#059669' }, { l:'Warn', v:s.warningThreshold, c:'#D97706' }, { l:'Crit', v:s.criticalThreshold, c:'#DC2626' }].map(p => (
                    <button key={p.l} onClick={() => handleManualOverride(s.id, p.v)} style={{
                      flex:1, padding:'3px', borderRadius:'4px', cursor:'pointer',
                      background:`${p.c}15`, border:`1px solid ${p.c}30`, color:p.c,
                      fontSize:'9px', fontWeight:600, fontFamily:'inherit',
                    }}>{p.l}</button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
      <div style={S.main}>

        {/* ─── COL 1: SENSORS ─── */}
        <div style={{ ...S.col, flex: '0 0 240px' }}>
          <div style={S.colLabel}>SENSORS</div>
          <div className="sensor-scroll" style={{ ...S.scroll, gap:'6px' }}>
            {sensors.map(s => {
              const c = getColor(s);
              const isSel = selectedId === s.id;
              const isHL = highlightSensor === s.id;
              const isCrit = s.currentValue >= s.criticalThreshold;
              const isWarn = s.currentValue >= s.warningThreshold && !isCrit;
              const max = (s.criticalThreshold || 100) * 1.5;
              const pct = Math.min(100, (s.currentValue / max) * 100);
              const icon = TYPE_ICONS[s.type] || '📡';

              return (
                <div key={s.id} onClick={() => setSelectedId(isSel ? null : s.id)}
                  style={{
                    padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                    border: `1px solid ${isCrit ? 'rgba(220,38,38,0.3)' : isWarn ? 'rgba(217,119,6,0.25)' : isSel ? '#2563EB' : isHL ? 'rgba(37,99,235,0.3)' : '#D0D5DE'}`,
                    background: isCrit ? '#FEF2F2' : isWarn ? '#FFFBEB' : isSel ? '#EFF6FF' : '#FFFFFF',
                    boxShadow: isCrit ? '0 0 0 1px rgba(220,38,38,0.1)' : isWarn ? '0 0 0 1px rgba(217,119,6,0.08)' : isSel ? '0 2px 8px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.04)',
                    animation: isCrit ? 'glowRed 1.2s infinite' : isWarn ? 'glowYellow 1.5s infinite' : isHL ? 'pulseHL 1s infinite' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                  {/* Top row: icon + label + zone badge */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <span style={{ fontSize:'16px' }}>{icon}</span>
                      <div>
                        <div style={{ color: isCrit ? '#DC2626' : isWarn ? '#D97706' : '#1A1D26', fontSize:'11px', fontWeight:700, lineHeight:1.2 }}>{s.type}</div>
                        <div style={{ fontSize:'7px', color:'#9CA3AF', marginTop:'1px' }}>{s.label || s.id}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize:'7px', fontWeight:600, padding:'2px 5px', borderRadius:'4px',
                      background:'#EFF6FF', color:'#2563EB', letterSpacing:'0.5px',
                    }}>{s.zoneId}</span>
                  </div>
                  {/* Value row */}
                  <div style={{ display:'flex', alignItems:'baseline', gap:'3px', marginBottom:'4px' }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'18px', fontWeight:800, color: c, transition:'color 0.3s', letterSpacing:'-0.5px' }}>
                      {s.currentValue.toFixed(1)}
                    </span>
                    <span style={{ fontSize:'9px', color:'#9CA3AF', fontWeight:500 }}>{s.unit}</span>
                    {(isCrit || isWarn) && (
                      <span style={{
                        fontSize:'7px', fontWeight:700, letterSpacing:'0.5px', marginLeft:'auto',
                        color: isCrit ? '#DC2626' : '#D97706', textTransform: 'uppercase',
                        padding:'1px 4px', borderRadius:'3px',
                        background: isCrit ? '#FEE2E2' : '#FEF3C7',
                      }}>{isCrit ? '⚠ CRIT' : '△ WARN'}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div style={{ width:'100%', height:'3px', background:'#D0D5DE', borderRadius:'2px', position:'relative' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background: c, borderRadius:'2px', transition:'width 0.5s ease' }} />
                  </div>
                  {/* Threshold labels */}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'7px', color:'#9CA3AF', marginTop:'3px' }}>
                    <span>{s.normalRange?.min ?? 0}</span>
                    <span style={{ color:'#D97706' }}>⚠ {s.warningThreshold}</span>
                    <span style={{ color:'#DC2626' }}>● {s.criticalThreshold}</span>
                  </div>
                  {/* Slider when selected */}
                  {isSel && (
                    <div style={{ marginTop:'8px', paddingTop:'8px', borderTop:'1px solid #D0D5DE', animation:'fadeSlide 0.2s ease' }} onClick={e => e.stopPropagation()}>
                      <input type="range" min={0} max={max} step={max>100?1:0.1} value={s.currentValue}
                        onChange={e => handleManualOverride(s.id, +e.target.value)} style={{ width:'100%' }} />
                      <div style={{ display:'flex', gap:'4px', marginTop:'4px' }}>
                        {[{ l:'Safe', v:+(s.warningThreshold*0.1).toFixed(1), c:'#059669' }, { l:'Warn', v:s.warningThreshold, c:'#D97706' }, { l:'Crit', v:s.criticalThreshold, c:'#DC2626' }].map(p => (
                          <button key={p.l} onClick={() => handleManualOverride(s.id, p.v)} style={{
                            flex:1, padding:'4px', borderRadius:'6px', cursor:'pointer',
                            background:`${p.c}10`, border:`1px solid ${p.c}20`, color:p.c,
                            fontSize:'9px', fontWeight:600, fontFamily:'inherit', transition:'all 0.2s',
                          }}>{p.l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CONNECTION ARROWS: Sensor → Sub-Agents ─── */}
        {(() => {
          // Build unique agents list and determine which are connected to selected sensor
          const UNIQUE_AGENTS = [
            { id: 'scada', name: 'SCADA', icon: '📡', color: '#60a5fa', desc: 'Sensor Analysis' },
            { id: 'cascade', name: 'Cascade', icon: '🔗', color: '#ec4899', desc: 'Failure Chains' },
            { id: 'predictive', name: 'Predictive', icon: '📈', color: '#f59e0b', desc: 'Forecasting' },
            { id: 'emergency', name: 'Emergency', icon: '🚨', color: '#ef4444', desc: 'Protocols' },
            { id: 'evacuation', name: 'Evacuation', icon: '🚷', color: '#f97316', desc: 'Route Planner' },
            { id: 'compliance', name: 'Compliance', icon: '⚖️', color: '#a78bfa', desc: 'Regulations' },
            { id: 'environmental', name: 'Environ', icon: '🌿', color: '#22c55e', desc: 'Ambient Monitor' },
            { id: 'maintenance', name: 'Maintenance', icon: '🔧', color: '#f97316', desc: 'Equipment Health' },
            { id: 'resource', name: 'Resource', icon: '👷', color: '#06b6d4', desc: 'Worker Safety' },
            { id: 'digital_twin', name: 'Digital Twin', icon: '🏭', color: '#8b5cf6', desc: 'Physics Engine' },
          ];

          const selSensor = sensors.find(s => s.id === selectedId);
          const connectedAgentIds = selSensor ? (SENSOR_AGENTS[selSensor.type] || []).map(a => a.id) : [];
          const hasSelection = !!selSensor;

          return (
            <>
              {/* Arrow column */}
              <div style={{
                flex: '0 0 28px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', position: 'relative',
              }}>
                <svg width="28" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {/* Static guide lines */}
                  {UNIQUE_AGENTS.map((ag, i) => {
                    const isConn = connectedAgentIds.includes(ag.id);
                    const isAgentActive = highlightAgent === ag.id;
                    const lineColor = isConn ? ag.color : isAgentActive ? ag.color : 'rgba(255,255,255,0.04)';
                    const y = 32 + i * 36;
                    return (
                      <g key={ag.id}>
                        <line x1="0" y1={y} x2="20" y2={y}
                          stroke={lineColor} strokeWidth={isConn ? 1.5 : 0.5}
                          strokeDasharray={isConn ? 'none' : '2,3'}
                          style={{ transition: 'all 0.4s' }}
                        />
                        {/* Arrowhead */}
                        <polygon
                          points={`20,${y-3} 26,${y} 20,${y+3}`}
                          fill={isConn ? ag.color : 'rgba(255,255,255,0.06)'}
                          style={{ transition: 'all 0.4s' }}
                        />
                        {/* Animated dot when connected */}
                        {isConn && (
                          <circle r="2" fill={ag.color} opacity="0.8">
                            <animate attributeName="cx" from="0" to="24" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="cy" values={`${y};${y}`} dur="1.2s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* ─── SUB-AGENTS column — unique cards ─── */}
              <div style={{ ...S.col, flex: '0 0 140px' }}>
                <div style={{ ...S.colLabel, fontSize: '7px', letterSpacing: '1.2px', color: '#5A6376' }}>SUB‑AGENTS</div>
                <div style={{ ...S.scroll, gap: '4px' }}>
                  {UNIQUE_AGENTS.map(ag => {
                    const isConn = connectedAgentIds.includes(ag.id);
                    const isAgentHL = highlightAgent === ag.id;
                    const isLit = isConn || isAgentHL;
                    return (
                      <div key={ag.id} style={{
                        padding: '7px 8px', borderRadius: '10px', position:'relative',
                        background: isLit ? '#FAFBFC' : '#FFFFFF',
                        border: `1px solid ${isLit ? ag.color + '40' : '#D0D5DE'}`,
                        transition: 'all 0.4s ease',
                        transform: isLit ? 'translateX(2px)' : 'translateX(0)',
                        boxShadow: isLit ? `0 2px 8px ${ag.color}15` : '0 1px 3px rgba(0,0,0,0.06)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{
                            fontSize: '14px', width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px',
                            background: isLit ? `${ag.color}15` : '#EBEDF2',
                            transition: 'all 0.3s',
                          }}>{ag.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '9px', fontWeight: 700,
                              color: isLit ? ag.color : '#5A6376',
                              letterSpacing: '0.3px',
                              transition: 'color 0.3s',
                            }}>{ag.name}</div>
                            <div style={{
                              fontSize: '7px', color: isLit ? '#5A6376' : '#9CA3AF',
                              letterSpacing: '0.2px', marginTop: '1px',
                              transition: 'color 0.3s',
                            }}>{ag.desc}</div>
                          </div>
                          {/* Status dot */}
                          {isLit && (
                            <div style={{
                              width:'5px', height:'5px', borderRadius:'50%', flexShrink:0,
                              background: ag.color, boxShadow: `0 0 8px ${ag.color}60`,
                              animation: 'pulse 1.5s infinite',
                            }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* Arrow connector */}
        <div style={{ flex:'0 0 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ color: activeFlow ? '#2563EB' : '#D1D5DB', fontSize:'14px', fontWeight:700, transition:'color 0.3s' }}>›</div>
        </div>

        {/* ─── COL 2: AGENT BRAIN + OUTPUT ─── */}
        <div style={{ ...S.col, flex: '1 1 0', minWidth: 0 }}>
          <div style={S.colLabel}>AI AGENT BRAIN</div>

          {/* Brain card — compact */}
          <div style={{
            ...S.brain,
            borderColor: isEmergency ? 'rgba(220,38,38,0.3)' : hasAnyWarning ? 'rgba(217,119,6,0.2)' : '#D0D5DE',
            padding: '10px',
          }}>
            {/* Header row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px', paddingBottom:'6px', borderBottom:'1px solid #EBEDF2' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{
                  width:'6px', height:'6px', borderRadius:'50%',
                  background: isEmergency ? '#DC2626' : hasAnyWarning ? '#D97706' : '#059669',
                  boxShadow: `0 0 4px ${isEmergency ? '#DC262660' : hasAnyWarning ? '#D9770660' : '#05966940'}`,
                  animation: isEmergency || hasAnyWarning ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ fontSize:'8px', fontWeight:700, color:'#1A1D26', letterSpacing:'0.5px', textTransform:'uppercase' }}>
                  Multi-Agent Orchestrator
                </span>
              </div>
              <span style={{
                fontSize:'6px', fontWeight:600, padding:'1px 5px', borderRadius:'3px',
                background: isEmergency ? '#FEF2F2' : hasAnyWarning ? '#FFFBEB' : '#F0FDF4',
                color: isEmergency ? '#DC2626' : hasAnyWarning ? '#D97706' : '#059669',
                border: `1px solid ${isEmergency ? '#FECACA' : hasAnyWarning ? '#FDE68A' : '#D1FAE5'}`,
              }}>{isEmergency ? 'EMERGENCY' : hasAnyWarning ? 'ALERT' : 'NOMINAL'}</span>
            </div>

            {/* Supervisor — compact, glows when active */}
            {(() => {
              const supActive = highlightAgent === 'supervisor' || hasAnyWarning || isEmergency;
              const supColor = isEmergency ? '#DC2626' : hasAnyWarning ? '#7C3AED' : '#059669';
              return (
                <div style={{
                  textAlign:'center', padding:'6px', marginBottom:'6px',
                  background: supActive ? (isEmergency ? '#FEF2F2' : '#F5F3FF') : '#FAFBFC',
                  border: `1px solid ${supActive ? supColor + '40' : '#EBEDF2'}`,
                  boxShadow: supActive ? `0 0 10px ${supColor}20` : 'none',
                  borderRadius:'8px', transition:'all 0.5s',
                }}>
                  <div style={{ fontSize:'20px', marginBottom:'2px' }}>🧠</div>
                  <div style={{ color: supActive ? supColor : '#1A1D26', fontSize:'10px', fontWeight:800 }}>Supervisor Agent</div>
                  <div style={{ color:'#9CA3AF', fontSize:'7px' }}>Decision Engine · Risk Aggregation</div>
                  {supActive && <div style={{ width:'4px', height:'4px', borderRadius:'50%', background: supColor, margin:'3px auto 0', boxShadow:`0 0 8px ${supColor}`, animation:'pulse 1.5s infinite' }} />}
                </div>
              );
            })()}

            {/* Agent grid — compact 3x2, highlights active agents */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'3px' }}>
              {AGENTS.map(a => {
                const isHL = highlightAgent === a.id;
                // Determine if agent is actively engaged based on system state
                const isActive = isHL || (
                  (a.id === 'scada' && hasAnyWarning) ||
                  (a.id === 'pattern' && hasAnyWarning) ||
                  (a.id === 'predictive' && hasAnyWarning) ||
                  (a.id === 'compliance' && hasAnyCritical) ||
                  (a.id === 'cascade' && hasAnyCritical) ||
                  (a.id === 'equipment' && isEmergency)
                );
                return (
                  <div key={a.id} style={{
                    padding:'4px 3px', borderRadius:'6px', textAlign:'center',
                    background: isHL ? `${a.color}15` : isActive ? `${a.color}08` : '#FAFBFC',
                    border: `1px solid ${isHL ? a.color+'50' : isActive ? a.color+'30' : '#EBEDF2'}`,
                    boxShadow: isHL ? `0 0 8px ${a.color}30` : isActive ? `0 0 4px ${a.color}15` : 'none',
                    transition:'all 0.4s',
                    animation: isHL ? 'agentGlow 0.8s infinite' : 'none',
                  }}>
                    <div style={{ fontSize:'12px' }}>{a.icon}</div>
                    <div style={{ fontSize:'7px', fontWeight:700, color: isHL || isActive ? a.color : '#1A1D26' }}>{a.name}</div>
                    {isActive && <div style={{ width:'4px', height:'4px', borderRadius:'50%', background: a.color, margin:'2px auto 0', boxShadow:`0 0 6px ${a.color}`, animation:'pulse 1.5s infinite' }} />}
                  </div>
                );
              })}
            </div>

            {/* Status bar */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginTop:'6px', paddingTop:'5px', borderTop:'1px solid #EBEDF2',
              fontSize:'7px', color:'#9CA3AF',
            }}>
              <span>{AGENTS.length + 1} agents</span>
              <span style={{ display:'flex', alignItems:'center', gap:'2px' }}>
                <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#059669', display:'inline-block', animation:'pulse 2s infinite' }} />
                Active
              </span>
              <span>{critCount}C · {warnCount}W</span>
            </div>
          </div>

          {/* RAG card */}
          <div style={{
            ...S.dbCard,
            background: activeFlow?.to === 'rag' || activeFlow?.from === 'rag' ? '#ECFDF5' : '#F0FDF4',
            borderColor: activeFlow?.to === 'rag' ? '#059669' : '#D1FAE5',
          }}>
            <span style={{ fontSize:'11px' }}>📚</span>
            <div>
              <div style={{ color:'#059669', fontSize:'8px', fontWeight:700 }}>RAG + Company DB</div>
              <div style={{ color:'#9CA3AF', fontSize:'7px' }}>OISD-116 · DGMS · Equipment logs</div>
            </div>
          </div>

          {/* ── OUTPUT CARDS ── */}
          <div style={{ fontSize:'8px', fontWeight:700, letterSpacing:'1.5px', color:'#9CA3AF', padding:'2px 0', textAlign:'center', textTransform:'uppercase' }}>OUTPUT</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px', flex:1 }}>
            {[
              { icon: '⚠️', t: 'Warning System', id: 'warning', active: hasAnyWarning, c: '#D97706',
                sub: hasAnyWarning ? `${warningCount} alert${warningCount !== 1 ? 's' : ''}` : 'No alerts',
                details: hasAnyWarning ? sensors.filter(s => s.currentValue >= (s.warningThreshold || Infinity)).map(s => `${s.name}: ${s.currentValue.toFixed(1)} ${s.unit || ''} (warn: ${s.warningThreshold})`) : [] },
              { icon: '🚨', t: 'Emergency', id: 'emergency', active: isEmergency, c: '#DC2626',
                sub: isEmergency ? 'Fire brigade contacted' : 'Standby', glow: true,
                details: isEmergency ? ['8-step protocol active', 'All permits REVOKED', 'Gas isolation in progress', 'Evacuation routes calculated', 'DGMS Form-M generated'] : [] },
              { icon: '🚷', t: 'Evacuation', id: 'evacuation', active: isEmergency, c: '#B91C1C',
                sub: isEmergency ? 'Zone A — evacuating' : 'All clear',
                details: isEmergency ? ['BFS shortest path active', 'Assembly Point B designated', 'Headcount verification running', 'Zone A sealed'] : [] },
              { icon: '📄', t: 'Incident Report', id: 'report', active: hasAnyWarning, c: '#2563EB',
                sub: hasAnyWarning ? 'DGMS Form-M ready' : 'No events',
                details: hasAnyWarning ? ['DGMS Form-M auto-generated', 'Evidence chain preserved', 'OISD compliance logged', 'Audit trail complete'] : [] },
            ].map((o, i) => (
              <div key={i} onClick={() => o.active && setExpandedOutput(prev => prev === o.id ? null : o.id)} style={{
                padding: '6px 8px', borderRadius: '8px', display:'flex', flexDirection:'column', gap: expandedOutput === o.id ? '6px' : '0px',
                border: `1px solid ${o.active ? o.c + '30' : '#D0D5DE'}`,
                background: o.active ? (expandedOutput === o.id ? '#F9FAFB' : '#FAFBFC') : '#FFFFFF',
                opacity: o.active ? 1 : 0.6,
                cursor: o.active ? 'pointer' : 'default',
                transition: 'all 0.3s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontSize:'13px' }}>{o.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color: o.active ? o.c : '#9CA3AF', fontSize:'9px', fontWeight:700 }}>{o.t}</div>
                    <div style={{ color: o.active ? '#5A6376' : '#D1D5DB', fontSize:'7px' }}>{o.sub}</div>
                  </div>
                  {o.active && <span style={{ fontSize:'8px', color:'#9CA3AF', transition:'transform 0.3s', transform: expandedOutput === o.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>}
                </div>
                {expandedOutput === o.id && o.details.length > 0 && (
                  <div style={{ borderTop: `1px solid ${o.c}20`, paddingTop:'4px', display:'flex', flexDirection:'column', gap:'2px' }}>
                    {o.details.map((d, j) => (
                      <div key={j} style={{ fontSize:'7px', color:'#4B5563', display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ color: o.c, fontSize:'6px' }}>●</span> {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Arrow connector */}
        <div style={{ flex:'0 0 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ color: hasAnyWarning ? '#D97706' : '#D1D5DB', fontSize:'14px', fontWeight:700, transition:'color 0.3s' }}>›</div>
        </div>

        {/* ─── COL 3: ACTIVITY LOG ─── */}
        <div style={{ ...S.col, flex: '0 0 280px' }}>
          <div style={S.colLabel}>AGENT ACTIVITY</div>
          <div className="log-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'3px' }}>
            {activityLog.length === 0 ? (
              <div style={{ padding:'20px 12px', textAlign:'center', color:'#D1D5DB', fontSize:'10px' }}>
                <div style={{ fontSize:'20px', marginBottom:'4px' }}>📡</div>
                Adjust a sensor to see AI agents respond
              </div>
            ) : [...activityLog].reverse().map((entry, i) => (
              <div key={activityLog.length - 1 - i} style={{
                padding: '5px 8px', borderRadius: '6px', animation: i === 0 ? 'fadeSlide 0.3s ease' : 'none',
                background: entry.severity === 'emergency' ? '#FEF2F2' : entry.severity === 'danger' ? '#FEF2F2' : entry.severity === 'rag' ? '#F0FDF4' : entry.severity === 'warning' ? '#FFFBEB' : '#F8FAFC',
                borderLeft: `3px solid ${entry.severity === 'emergency' ? '#DC2626' : entry.severity === 'danger' ? '#B91C1C' : entry.severity === 'rag' ? '#059669' : entry.severity === 'warning' ? '#D97706' : '#2563EB'}`,
              }}>
                <span style={{ fontSize:'7px', fontWeight:700,
                  color: entry.severity === 'emergency' ? '#DC2626' : entry.severity === 'danger' ? '#B91C1C' : entry.severity === 'rag' ? '#059669' : entry.severity === 'warning' ? '#D97706' : '#2563EB',
                }}>● {entry.agent}</span>
                <div style={{ fontSize:'8px', color:'#5A6376', lineHeight: 1.35, marginTop:'1px' }}>{entry.text}</div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>


      </div>
      )}
    </div>
  );
}

// =============================================================================
const S = {
  root: { display:'flex', flexDirection:'column', height:'100%', width:'100%', fontFamily:"'Inter',system-ui,sans-serif", background:'#EBEDF2', overflow:'hidden' },
  narBar: { display:'flex', alignItems:'center', padding:'6px 14px', gap:'8px', background:'#FFFFFF', borderBottom:'1px solid #D0D5DE', minHeight:'32px', flexShrink:0 },
  btn: { background:'#F0F2F5', border:'1px solid #D0D5DE', color:'#5A6376', padding:'3px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'9px', fontWeight:600, fontFamily:'inherit', transition:'all 0.2s' },
  main: { display:'flex', alignItems:'stretch', flex:1, overflow:'hidden', gap:'2px' },
  col: { display:'flex', flexDirection:'column', gap:'4px', padding:'5px', minWidth:0 },
  colLabel: { fontSize:'8px', fontWeight:700, letterSpacing:'2.5px', color:'#9CA3AF', textAlign:'center', padding:'3px 0', flexShrink:0, textTransform:'uppercase' },
  arrowCol: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', width:'22px', flexShrink:0 },
  scroll: { display:'flex', flexDirection:'column', gap:'4px', flex:1, overflowY:'auto' },
  brain: { padding:'10px', borderRadius:'12px', border:'1px solid #D0D5DE', background:'#FFFFFF', boxShadow:'0 2px 6px rgba(0,0,0,0.06)', transition:'all 0.5s', flexShrink:0 },
  dbCard: { display:'flex', alignItems:'center', gap:'6px', padding:'6px 8px', borderRadius:'8px', border:'1px solid #D1FAE5', background:'#F0FDF4', flexShrink:0, transition:'all 0.5s' },
};
