// ============================================================================
// ShieldAI — Architecture View v4 (2D/3D + Cinematic + Smart Sensors + Log)
// ============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
const Scene3D = lazy(() => import('./Scene3D.jsx').catch(() => ({
  default: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '12px' }}>3D scene failed to load. Try refreshing.</div>
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

function getColor(s) {
  if (!s) return '#334155';
  const r = s.currentValue / (s.criticalThreshold || 100);
  return r >= 1 ? '#ef4444' : r >= 0.5 ? '#f59e0b' : '#10b981';
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
  const [activityLog, setActivityLog] = useState([]);
  const [warningCount, setWarningCount] = useState(0);
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

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog]);

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

  const handleManualOverride = useCallback((id, val) => {
    setCinemaActive(false);
    timersRef.current.forEach(t => clearTimeout(t));
    onOverride?.(id, val);
  }, [onOverride]);

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
            background: isEmergency ? '#ef4444' : hasAnyWarning ? '#f59e0b' : cinemaActive ? '#a78bfa' : '#10b981',
            animation: isEmergency ? 'blink 0.6s infinite' : cinemaActive ? 'blink 1.5s infinite' : 'none',
          }} />
          {/* Mode badge */}
          <div style={{
            padding: '1px 6px', borderRadius: '3px', fontSize: '7px', fontWeight: 700,
            letterSpacing: '1px', flexShrink: 0,
            background: cinemaActive ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.15)',
            color: cinemaActive ? '#a78bfa' : '#10b981',
            border: `1px solid ${cinemaActive ? '#a78bfa30' : '#10b98130'}`,
          }}>
            {cinemaActive ? '▶ DEMO' : '🎛 MANUAL'}
          </div>
          <div style={{ fontSize:'11px', color:'#e2e8f0', fontWeight:500, animation:'fadeSlide 0.3s ease', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} key={cinemaActive ? narration : 'manual-' + scenarioKey}>
            {cinemaActive ? narration : `🎛️ Manual Mode — ${activeScenario.title}. Adjust sensors or press ▶ Play Demo.`}
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
          {cinemaActive ? (
            <button onClick={() => { setCinemaActive(false); timersRef.current.forEach(t => clearTimeout(t)); setNarration('Paused'); }} style={{ ...S.btn, background: 'rgba(239,68,68,0.15)', borderColor: '#ef444440', color: '#ef4444' }}>⏸ Pause Demo</button>
          ) : (
            <button onClick={resetCinema} style={{ ...S.btn, background: 'rgba(139,92,246,0.15)', borderColor: '#a78bfa40', color: '#a78bfa' }}>▶ Play Demo</button>
          )}
          <button onClick={() => setViewMode(v => v === '2d' ? '3d' : '2d')} style={{ ...S.btn, background: viewMode === '3d' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)', borderColor: viewMode === '3d' ? '#a78bfa' : 'rgba(255,255,255,0.1)', color: viewMode === '3d' ? '#a78bfa' : '#94a3b8' }}>
            {viewMode === '3d' ? '🔲 2D View' : '🧊 3D View'}
          </button>
        </div>
      </div>

      {/* ══════ 3D MODE ══════ */}
      {viewMode === '3d' ? (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#475569', fontSize:'12px' }}>Loading 3D scene...</div>}>
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
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '8px', fontWeight: 700, letterSpacing: '1.5px', color: '#334155' }}>AGENT ACTIVITY</div>
            <div className="log-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {activityLog.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#1e293b', fontSize: '10px' }}>Waiting for sensor events...</div>
              ) : activityLog.map((entry, i) => (
                <div key={i} style={{
                  padding: '5px 7px', borderRadius: '5px', animation: 'fadeSlide 0.3s ease',
                  background: entry.severity === 'emergency' ? 'rgba(239,68,68,0.08)' : entry.severity === 'rag' ? 'rgba(16,185,129,0.06)' : 'rgba(17,24,39,0.4)',
                  border: `1px solid ${entry.severity === 'emergency' ? '#ef444430' : entry.severity === 'rag' ? '#10b98130' : 'rgba(255,255,255,0.04)'}`,
                }}>
                  <div style={{ fontSize: '7px', fontWeight: 700, color: entry.severity === 'emergency' ? '#ef4444' : entry.severity === 'rag' ? '#10b981' : entry.severity === 'warning' ? '#f59e0b' : '#60a5fa', marginBottom: '2px' }}>{entry.agent}</div>
                  <div style={{
                    fontSize: '8px', color: '#94a3b8', lineHeight: 1.4, whiteSpace: 'pre-wrap',
                    ...(entry.isChunk ? { background: 'rgba(16,185,129,0.05)', padding: '4px 6px', borderRadius: '3px', borderLeft: '2px solid #10b981', fontFamily: "'Courier New',monospace", fontSize: '7.5px' } : {}),
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
                <div style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: 700, marginBottom: '4px' }}>
                  {TYPE_ICONS[s.type] || '📡'} {s.type} — {s.currentValue.toFixed(1)} {s.unit}
                </div>
                <div style={{ fontSize: '8px', color: '#475569', marginBottom: '4px' }}>{s.label}</div>
                <input type="range" min={0} max={max} step={max>100?1:0.1} value={s.currentValue}
                  onChange={e => handleManualOverride(s.id, +e.target.value)} style={{ width: '100%' }} />
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {[{ l:'Safe', v:+(s.warningThreshold*0.1).toFixed(1), c:'#10b981' }, { l:'Warn', v:s.warningThreshold, c:'#f59e0b' }, { l:'Crit', v:s.criticalThreshold, c:'#ef4444' }].map(p => (
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

        {/* ─── COL 1: SENSORS (sorted by severity) ─── */}
        <div style={{ ...S.col, flex: '0 0 220px' }}>
          <div style={S.colLabel}>SENSORS</div>
          <div className="sensor-scroll" style={S.scroll}>
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
                    padding: '7px 9px', borderRadius: '7px', cursor: 'pointer',
                    border: `1.5px solid ${isCrit ? '#ef4444' : isWarn ? '#f59e0b' : isSel ? '#a78bfa' : isHL ? '#a78bfa50' : 'rgba(255,255,255,0.05)'}`,
                    background: isCrit ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(245,158,11,0.05)' : isSel ? 'rgba(139,92,246,0.06)' : 'rgba(17,24,39,0.5)',
                    animation: isCrit ? 'glowRed 1.2s infinite' : isWarn ? 'glowYellow 1.5s infinite' : isHL ? 'pulseHL 1s infinite' : 'none',
                    transition: 'all 0.3s',
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                      <span style={{ fontSize:'13px' }}>{icon}</span>
                      <span style={{ color: isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#e2e8f0', fontSize:'10px', fontWeight:700 }}>{s.type}</span>
                      <span style={{ color:'#334155', fontSize:'8px' }}>{s.zoneId}</span>
                    </div>
                    <span style={{ fontFamily:'monospace', fontSize:'13px', fontWeight:800, color: c, transition:'color 0.3s' }}>
                      {s.currentValue.toFixed(1)}
                      <span style={{ fontSize:'8px', color:'#475569', marginLeft:'1px' }}>{s.unit}</span>
                    </span>
                  </div>
                  {/* Status tag */}
                  {(isCrit || isWarn) && (
                    <div style={{ fontSize:'7px', fontWeight:700, letterSpacing:'0.5px', marginTop:'3px',
                      color: isCrit ? '#ef4444' : '#f59e0b', textTransform: 'uppercase',
                    }}>{isCrit ? '⚠ CRITICAL — ABOVE THRESHOLD' : '△ WARNING — ELEVATED'}</div>
                  )}
                  {/* Bar */}
                  <div style={{ width:'100%', height:'3px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', marginTop:'4px', position:'relative' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:c, borderRadius:'2px', transition:'width 0.5s ease' }} />
                  </div>
                  {/* Slider */}
                  {isSel && (
                    <div style={{ marginTop:'6px', animation:'fadeSlide 0.2s ease' }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize:'8px', color:'#475569', marginBottom:'3px' }}>{s.label}</div>
                      <input type="range" min={0} max={max} step={max>100?1:0.1} value={s.currentValue}
                        onChange={e => handleManualOverride(s.id, +e.target.value)} style={{ width:'100%' }} />
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'7px', color:'#334155' }}>
                        <span>0</span><span style={{ color:'#f59e0b' }}>⚠{s.warningThreshold}</span><span style={{ color:'#ef4444' }}>🔴{s.criticalThreshold}</span>
                      </div>
                      <div style={{ display:'flex', gap:'3px', marginTop:'3px' }}>
                        {[{ l:'Safe', v:+(s.warningThreshold*0.1).toFixed(1), c:'#10b981' }, { l:'Warn', v:s.warningThreshold, c:'#f59e0b' }, { l:'Crit', v:s.criticalThreshold, c:'#ef4444' }].map(p => (
                          <button key={p.l} onClick={() => handleManualOverride(s.id, p.v)} style={{
                            flex:1, padding:'2px', borderRadius:'3px', cursor:'pointer',
                            background:`${p.c}12`, border:`1px solid ${p.c}25`, color:p.c,
                            fontSize:'8px', fontWeight:600, fontFamily:'inherit',
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

        {/* ─── ARROWS LEFT ─── */}
        <div style={S.arrowCol}>
          {sensors.slice(0,6).map((s,i) => {
            const active = s.currentValue >= (s.warningThreshold||1)*0.3;
            const isFlowing = activeFlow?.from === 'sensor';
            return <div key={s.id} style={{
              color: isFlowing ? '#a78bfa' : active ? getColor(s) : '#111827',
              fontSize:'13px', fontWeight:700,
              animation: isFlowing ? `flowPulse 0.5s infinite ${i*0.06}s` : active ? `flowPulse 1.2s infinite ${i*0.1}s` : 'none',
            }}>→</div>;
          })}
        </div>

        {/* ─── COL 2: AGENT BRAIN + ACTIVITY LOG ─── */}
        <div style={{ ...S.col, flex: '1 1 auto' }}>
          <div style={S.colLabel}>AI AGENT BRAIN</div>

          {/* Brain card */}
          <div style={{ ...S.brain, borderColor: isEmergency ? '#ef444460' : hasAnyWarning ? '#f59e0b40' : '#a78bfa20' }}>
            <div style={{ textAlign:'center', padding:'4px',
              background: highlightAgent === 'supervisor' ? 'rgba(139,92,246,0.1)' : 'transparent',
              borderRadius:'8px', transition:'background 0.5s',
              animation: highlightAgent === 'supervisor' ? 'agentGlow 0.8s infinite' : 'none',
            }}>
              <div style={{ fontSize:'22px' }}>🧠</div>
              <div style={{ color:'#e2e8f0', fontSize:'11px', fontWeight:700 }}>Supervisor</div>
              <div style={{ color:'#475569', fontSize:'7px' }}>Gemini 2.5 Flash</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'3px', marginTop:'4px' }}>
              {AGENTS.map(a => {
                const isHL = highlightAgent === a.id;
                return (
                  <div key={a.id} style={{
                    padding:'4px', borderRadius:'5px', textAlign:'center',
                    background: isHL ? `${a.color}18` : 'transparent',
                    border: `1px solid ${isHL ? a.color+'50' : 'rgba(255,255,255,0.04)'}`,
                    transition:'all 0.4s', color: a.color,
                    animation: isHL ? 'agentGlow 0.8s infinite' : 'none',
                  }}>
                    <div style={{ fontSize:'12px' }}>{a.icon}</div>
                    <div style={{ fontSize:'7px', fontWeight:600 }}>{a.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RAG card */}
          <div style={{
            ...S.dbCard,
            background: activeFlow?.to === 'rag' || activeFlow?.from === 'rag' ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.02)',
            borderColor: activeFlow?.to === 'rag' ? '#10b981' : 'rgba(16,185,129,0.15)',
          }}>
            <span style={{ fontSize:'13px' }}>📚</span>
            <div>
              <div style={{ color:'#10b981', fontSize:'9px', fontWeight:700 }}>RAG + Company DB</div>
              <div style={{ color:'#334155', fontSize:'7px' }}>OISD-116 · DGMS · Equipment logs</div>
            </div>
          </div>

          {/* ── ACTIVITY LOG ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', marginTop:'4px', minHeight:0 }}>
            <div style={{ fontSize:'8px', fontWeight:700, letterSpacing:'1.5px', color:'#334155', padding:'2px 0' }}>AGENT ACTIVITY</div>
            <div className="log-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'3px' }}>
              {activityLog.length === 0 ? (
                <div style={{ padding:'12px', textAlign:'center', color:'#1e293b', fontSize:'10px' }}>
                  Waiting for sensor events...
                </div>
              ) : activityLog.map((entry, i) => (
                <div key={i} style={{
                  padding: '6px 8px', borderRadius: '6px', animation: 'fadeSlide 0.3s ease',
                  background: entry.severity === 'emergency' ? 'rgba(239,68,68,0.08)' : entry.severity === 'danger' ? 'rgba(239,68,68,0.05)' : entry.severity === 'rag' ? 'rgba(16,185,129,0.06)' : entry.severity === 'warning' ? 'rgba(245,158,11,0.04)' : 'rgba(17,24,39,0.4)',
                  border: `1px solid ${entry.severity === 'emergency' ? '#ef444430' : entry.severity === 'danger' ? '#ef444420' : entry.severity === 'rag' ? '#10b98130' : entry.severity === 'warning' ? '#f59e0b20' : 'rgba(255,255,255,0.04)'}`,
                }}>
                  <div style={{ fontSize:'8px', fontWeight:700,
                    color: entry.severity === 'emergency' ? '#ef4444' : entry.severity === 'danger' ? '#dc2626' : entry.severity === 'rag' ? '#10b981' : entry.severity === 'warning' ? '#f59e0b' : '#60a5fa',
                    marginBottom:'2px',
                  }}>{entry.agent}</div>
                  <div style={{
                    fontSize:'9px', color: entry.severity === 'emergency' ? '#fca5a5' : '#94a3b8',
                    lineHeight: 1.4, whiteSpace: 'pre-wrap',
                    ...(entry.isChunk ? {
                      background: 'rgba(16,185,129,0.06)', padding: '6px 8px', borderRadius: '4px',
                      borderLeft: '3px solid #10b981', marginTop: '2px', fontSize: '8.5px',
                      fontFamily: "'Courier New', monospace",
                    } : {}),
                  }}>{entry.text}</div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* ─── ARROWS RIGHT ─── */}
        <div style={S.arrowCol}>
          <div style={{ color: activeFlow?.to === 'emergency' ? '#ef4444' : hasAnyWarning ? '#f59e0b' : '#111827', fontSize:'13px', fontWeight:700,
            animation: activeFlow?.to === 'emergency' ? 'flowPulse 0.4s infinite' : hasAnyWarning ? 'flowPulse 1s infinite' : 'none' }}>→</div>
          <div style={{ color: isEmergency ? '#ef4444' : '#111827', fontSize:'13px', fontWeight:700,
            animation: isEmergency ? 'flowPulse 0.5s infinite' : 'none' }}>→</div>
        </div>

        {/* ─── COL 3: OUTPUTS ─── */}
        <div style={{ ...S.col, flex: '0 0 200px' }}>
          <div style={S.colLabel}>OUTPUT</div>
          {[
            { icon: '⚠️', t: 'Warning System', active: hasAnyWarning, c: '#f59e0b',
              sub: hasAnyWarning ? `${warningCount} alert${warningCount !== 1 ? 's' : ''} raised` : 'Monitoring — no alerts',
              detail: hasAnyWarning ? 'Pressure anomaly detected in Zone A gas main. All linked sensors under watch.' : null },
            { icon: '🚨', t: 'Emergency Services', active: isEmergency, c: '#ef4444',
              sub: isEmergency ? 'CONTACTED — Fire brigade en route' : 'On standby — no incidents',
              detail: isEmergency ? 'Rourkela Fire Station notified at 08:00:29. ETA: 4 minutes. Ambulance dispatched.' : null, glow: true },
            { icon: '🚷', t: 'Auto-Evacuation', active: isEmergency, c: '#dc2626',
              sub: isEmergency ? 'Zone A LOCKED — 15 workers evacuating' : 'All zones accessible',
              detail: isEmergency ? 'Assembly Point B activated. Headcount verification in progress.' : null },
            { icon: '📄', t: 'Incident Report', active: hasAnyWarning, c: '#60a5fa',
              sub: hasAnyWarning ? 'DGMS Form-M auto-generated' : 'No reportable events',
              detail: hasAnyWarning ? 'Regulatory incident report prepared per DGMS guidelines. Ready for supervisor sign-off.' : null },
          ].map((o, i) => (
            <div key={i} style={{
              padding: '8px 10px', borderRadius: '7px',
              border: `1px solid ${o.active ? o.c + '40' : 'rgba(255,255,255,0.04)'}`,
              background: o.active && o.glow ? 'rgba(239,68,68,0.06)' : 'rgba(17,24,39,0.5)',
              opacity: o.active ? 1 : 0.4,
              animation: o.active && o.glow ? 'glowRed 1s infinite' : 'none',
              transition: 'all 0.5s',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom: o.detail ? '4px' : 0 }}>
                <span style={{ fontSize:'14px' }}>{o.icon}</span>
                <div>
                  <div style={{ color: o.active ? o.c : '#475569', fontSize:'10px', fontWeight:700, transition:'color 0.5s' }}>{o.t}</div>
                  <div style={{ color: o.active ? '#94a3b8' : '#1e293b', fontSize:'8px' }}>{o.sub}</div>
                </div>
              </div>
              {o.detail && o.active && (
                <div style={{ fontSize:'8px', color:'#475569', lineHeight:1.3, paddingTop:'4px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                  {o.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

// =============================================================================
const S = {
  root: { display:'flex', flexDirection:'column', height:'100%', width:'100%', fontFamily:"'Inter',system-ui,sans-serif", background:'#0a0e1a', overflow:'hidden' },
  narBar: { display:'flex', alignItems:'center', padding:'6px 14px', gap:'8px', background:'rgba(17,24,39,0.7)', borderBottom:'1px solid rgba(148,163,184,0.08)', minHeight:'32px', flexShrink:0 },
  btn: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8', padding:'3px 10px', borderRadius:'4px', cursor:'pointer', fontSize:'9px', fontWeight:600, fontFamily:'inherit' },
  main: { display:'flex', alignItems:'stretch', flex:1, overflow:'hidden' },
  col: { display:'flex', flexDirection:'column', gap:'4px', padding:'6px', minWidth:0 },
  colLabel: { fontSize:'8px', fontWeight:700, letterSpacing:'2px', color:'#334155', textAlign:'center', padding:'2px 0', flexShrink:0 },
  arrowCol: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', width:'22px', flexShrink:0 },
  scroll: { display:'flex', flexDirection:'column', gap:'3px', flex:1, overflowY:'auto' },
  brain: { padding:'8px', borderRadius:'10px', border:'1px solid rgba(139,92,246,0.2)', background:'rgba(139,92,246,0.02)', transition:'all 0.5s', flexShrink:0 },
  dbCard: { display:'flex', alignItems:'center', gap:'6px', padding:'6px 8px', borderRadius:'6px', border:'1px solid rgba(16,185,129,0.15)', flexShrink:0, transition:'all 0.5s' },
};
