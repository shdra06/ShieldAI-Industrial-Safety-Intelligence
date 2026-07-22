import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Components ───────────────────────────────────────────────────────────────
import Header from './components/Header.jsx';
import PlantMap from './components/PlantMap.jsx';
import SCADAMonitor from './components/SCADAMonitor.jsx';
import AgentConsole from './components/AgentConsole.jsx';
import RiskGauge from './components/RiskGauge.jsx';
import PermitBoard from './components/PermitBoard.jsx';
import EmergencyOrchestrator from './components/EmergencyOrchestrator.jsx';
import RegulatoryChat from './components/RegulatoryChat.jsx';
import ComparisonPanel from './components/ComparisonPanel.jsx';
import IncidentTimeline from './components/IncidentTimeline.jsx';
import Sidebar from './components/Sidebar.jsx';
import TabPanel from './components/TabPanel.jsx';
import StatusBar from './components/StatusBar.jsx';
import { AgentFlowMode } from './components/AgentFlowMode.jsx';
import { SensorOverridePanel } from './components/SensorOverridePanel.jsx';
import { SectionBoundary } from './components/ErrorBoundary.jsx';
import DemoMode from './components/DemoMode.jsx';
import ArchitectureView from './components/ArchitectureView.jsx';
import LiveActionPanel from './components/LiveActionPanel.jsx';

// Lazy-load 3D component (heavy) — disabled: drei's async text/shader loading
// conflicts with React Suspense, causing infinite "Loading..." spinner.
// Direct import is fine for hackathon scope.
import Factory3D from './components/Factory3D.jsx';

// ── Engine ───────────────────────────────────────────────────────────────────
import { SimulationEngine } from './engine/SimulationEngine.js';

// ── Data ─────────────────────────────────────────────────────────────────────
import { REGULATIONS, searchRegulations } from './data/regulations.js';

// =============================================================================
// App — Root Component
// Sidebar + Main Canvas layout with 2D/3D toggle
// =============================================================================

export default function App() {
  // ── Simulation engine ref ───────────────────────────────────────────────
  const engineRef = useRef(null);

  // ── Core state ──────────────────────────────────────────────────────────
  const [scenario, setScenario] = useState('normal');
  const [simState, setSimState] = useState(null);
  const [sensorHistory, setSensorHistory] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState('3d'); // '2d' or '3d'
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [agentModeActive, setAgentModeActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scadaOpen, setScadaOpen] = useState(true);
  const [tabPanelOpen, setTabPanelOpen] = useState(true);
  const [emergencyDismissed, setEmergencyDismissed] = useState(false);
  const [sensorPanelOpen, setSensorPanelOpen] = useState(false);
  const [incidentsPrevented, setIncidentsPrevented] = useState(0);
  const [demoModeActive, setDemoModeActive] = useState(false);

  // ── Initialize engine on mount ──────────────────────────────────────────
  useEffect(() => {
    const engine = new SimulationEngine('normal');
    engineRef.current = engine;

    const unsubscribe = engine.onUpdate((state) => {
      setSimState(state);
      setIsRunning(state.isRunning);
      setLastUpdateTime(new Date());

      // Build sensor history (rolling window of last 30 readings)
      setSensorHistory((prev) => {
        const next = { ...prev };
        for (const sensor of state.sensors) {
          if (!next[sensor.id]) next[sensor.id] = [];
          next[sensor.id] = [...next[sensor.id].slice(-29), sensor.currentValue];
        }
        return next;
      });
    });

    engine.start();

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  // ── Scenario change handler ─────────────────────────────────────────────
  const handleScenarioChange = useCallback((newScenario) => {
    setScenario(newScenario);
    setSensorHistory({});
    setEmergencyDismissed(false);
    setIncidentsPrevented(0);
    if (engineRef.current) {
      engineRef.current.setScenario(newScenario);
      engineRef.current.start();
    }
  }, []);

  // ── Auto-reset to normal after scenario completes ────────────────────────
  const scenarioComplete = simState?.scenarioComplete ?? false;
  useEffect(() => {
    if (scenarioComplete && scenario !== 'normal') {
      const timer = setTimeout(() => {
        handleScenarioChange('normal');
      }, 8000); // Wait 8 seconds after demo ends, then reset
      return () => clearTimeout(timer);
    }
  }, [scenarioComplete, scenario, handleScenarioChange]);

  // ── Sensor override handler (from 3D control panel) ─────────────────────
  const handleSensorOverride = useCallback((sensorId, newValue) => {
    if (engineRef.current) {
      engineRef.current.setSensorValue(sensorId, newValue);
    }
  }, []);

  // ── Derive props from simState ──────────────────────────────────────────
  const riskScore = simState?.riskScore ?? 0;
  const singleSensorRisk = simState?.singleSensorRisk ?? 0;
  const systemStatus = simState?.status ?? 'normal';
  const sensors = simState?.sensors ?? [];
  const permits = simState?.permits ?? [];
  const workers = simState?.workers ?? [];
  const zones = simState?.zones ?? [];
  const messages = simState?.messageLog ?? [];
  const emergencyProtocol = simState?.emergencyProtocol ?? null;
  const matchedIncidents = simState?.matchedIncidents ?? [];
  const simulationClock = simState?.simulationClock ?? 0;

  // ── NEW: Extract new engine fields with safe defaults ────────────────────
  const swissCheese = simState?.swissCheese ?? {
    layers: [
      { name: 'Engineering Controls', holes: [], integrity: 0.95 },
      { name: 'Administrative Controls', holes: [], integrity: 0.90 },
      { name: 'Supervision', holes: [], integrity: 0.85 },
      { name: 'Human Factors', holes: [], integrity: 0.80 },
      { name: 'PPE / Last Defense', holes: [], integrity: 0.92 },
    ],
    alignmentScore: 0,
    trajectoryBlocked: true,
  };

  const temporalRisk = simState?.temporalRisk ?? {
    shiftPhase: 'mid',
    shiftChangeMinutes: 120,
    timeOfDayFactor: 0.3,
    fatigueLevel: 'low',
  };

  const compoundLeadTime = simState?.compoundLeadTime ?? 0;
  const workerAlerts = simState?.workerAlerts ?? [];

  // ── 20-Agent Architecture: Extract new state fields ─────────────────────
  const anomalies = simState?.anomalies ?? [];
  const sensorHealth = simState?.sensorHealth ?? [];
  const behaviorAlerts = simState?.behaviorAlerts ?? [];
  const heatMap = simState?.heatMap ?? {};
  const permitRiskScores = simState?.permitRiskScores ?? [];
  const nearMisses = simState?.nearMisses ?? [];
  const complianceScores = simState?.complianceScores ?? {};
  const stagingActions = simState?.stagingActions ?? [];
  const protocolType = simState?.protocolType ?? null;
  const resourceStatus = simState?.resourceStatus ?? {};
  const cascadeChains = simState?.cascadeChains ?? [];
  const crossZoneCorrelations = simState?.crossZoneCorrelations ?? [];
  const predictions = simState?.predictions ?? [];
  const recommendations = simState?.recommendations ?? [];
  const coverageMap = simState?.coverageMap ?? {};
  const situationClass = simState?.situationClass ?? 'Normal Operations';
  const agentAgreement = simState?.agentAgreement ?? 1;
  const escalationLevel = simState?.escalationLevel ?? 0;
  const agentHealth = simState?.agentHealth ?? {};
  const systemHealth = simState?.systemHealth ?? {};
  const agentCount = simState?.agentCount ?? 18;
  const agentProfiles = simState?.agentProfiles ?? {};
  const tierBreakdown = simState?.tierBreakdown ?? { tier1: 13, tier2: 3, tier3: 2 };

  // ── AI Layer: Extract neural + LLM state ────────────────────────────────
  const neuralAnomaly = simState?.neuralAnomaly ?? { isAnomaly: false, anomalyScore: 0, status: 'collecting_data' };
  const riskClassification = simState?.riskClassification ?? { class: 'Unknown', confidence: 0, status: 'not_trained' };
  const aiReasoning = simState?.aiReasoning ?? null;
  const aiReasoningSource = simState?.aiReasoningSource ?? 'none';
  const neuralDetectorStatus = simState?.neuralDetectorStatus ?? {};
  const riskClassifierStatus = simState?.riskClassifierStatus ?? {};

  // ── ML Layer: Isolation Forest + Explainability ─────────────────────────
  const isolationForestResult = simState?.isolationForestResult ?? { anomalyScore: 0, isAnomaly: false, status: 'collecting_data' };
  const isolationForestTrained = simState?.isolationForestTrained ?? false;
  const explanation = simState?.explanation ?? null;

  // ── HuggingFace Transformers.js ─────────────────────────────────────────
  const hfStatus = simState?.hfStatus ?? { models: {}, readyCount: 0, totalModels: 3 };
  const hfModelsLoaded = simState?.hfModelsLoaded ?? false;
  const nerResult = simState?.nerResult ?? null;
  const safetyClassification = simState?.safetyClassification ?? null;

  // ── Build sensorsByType from sensors array (BUG FIX for SCADAMonitor) ──
  const sensorsByType = simState?.sensorsByType ?? (() => {
    const byType = {};
    for (const sensor of sensors) {
      const type = sensor.type ?? sensor.id?.split('-')[0] ?? sensor.id;
      if (!byType[type]) {
        byType[type] = sensor;
      }
    }
    return byType;
  })();

  // Compute risk scores per zone (both long + short IDs)
  const zoneRiskScores = {};
  for (const zone of zones) {
    const zoneSensors = sensors.filter((s) => s.zoneId === zone.id);
    let maxRisk = 0;
    for (const s of zoneSensors) {
      const ratio = s.currentValue / (s.criticalThreshold || 100);
      if (ratio > maxRisk) maxRisk = ratio;
    }
    const score = Math.min(maxRisk, 1);
    zoneRiskScores[zone.id] = score;
    zoneRiskScores[zone.id.replace('Z-', '')] = score;
  }

  // Build risk factors for comparison panel
  const agentResults = simState?.agentResults ?? {};
  const riskFactors = { gas: 0, permit: 0, ppe: 0, pattern: 0, maintenance: 0 };

  if (agentResults.scada?.riskFactors) {
    const f = agentResults.scada.riskFactors;
    riskFactors.gas = f.length > 0 ? Math.max(...f.map((x) => (x.value || 0) * (x.weight || 0))) * 100 : 0;
  }
  if (agentResults.permit?.riskFactors) {
    const f = agentResults.permit.riskFactors;
    riskFactors.permit = f.length > 0 ? Math.max(...f.map((x) => (x.value || 0) * (x.weight || 0))) * 100 : 0;
  }
  if (agentResults.vision?.riskFactors) {
    const f = agentResults.vision.riskFactors;
    riskFactors.ppe = f.length > 0 ? Math.max(...f.map((x) => (x.value || 0) * (x.weight || 0))) * 100 : 0;
  }
  if (agentResults.pattern?.riskFactors) {
    const f = agentResults.pattern.riskFactors;
    riskFactors.pattern = f.length > 0 ? Math.max(...f.map((x) => (x.value || 0) * (x.weight || 0))) * 100 : 0;
  }

  // Compound risk % (must be defined before emergencyActive)
  const compoundRiskPct = Math.round(riskScore * 100);
  const singleRiskPct = Math.round(singleSensorRisk * 100);

  // Emergency state — only truly active when risk is genuinely extreme
  const emergencyActive = !emergencyDismissed && compoundRiskPct >= 90;

  // ── Emergency zones for incident report ──────────────────────────────────
  const emergencyZones = zones
    .filter(z => (zoneRiskScores[z.id] ?? 0) >= 0.85)
    .map(z => z.id);

  // Simulation time
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0);
  const simulationTime = new Date(baseTime.getTime() + simulationClock * 1000);

  // Last update string
  const lastUpdateStr = lastUpdateTime
    ? `${Math.round((Date.now() - lastUpdateTime.getTime()) / 1000)}s ago`
    : 'connecting...';

  // (compoundRiskPct and singleRiskPct defined above, before emergencyActive)

  // Threat count for header
  const threatCount = messages.filter(
    m => m?.severity === 'critical' || m?.severity === 'emergency' || m?.severity === 'danger'
  ).length;

  // Swiss cheese alignment for header/sidebar
  const swissCheeseAlignment = swissCheese?.alignmentScore ?? 0;

  // ── Incidents Prevented Counter ──────────────────────────────────────────
  // Increment when compound risk detects a threat that single sensor misses
  useEffect(() => {
    if (compoundRiskPct >= 50 && singleRiskPct < 30 && compoundLeadTime > 0) {
      setIncidentsPrevented(prev => prev + 1);
    }
  }, [compoundRiskPct >= 50 && singleRiskPct < 30]);

  return (
    <div className={`app ${emergencyActive ? 'app-emergency' : ''}`}>
      {/* ── Demo Mode (Full-Screen Overlay) ────────────────────── */}
      {demoModeActive && (
        <DemoMode onExit={() => setDemoModeActive(false)} />
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <Header
        scenario={scenario}
        onScenarioChange={handleScenarioChange}
        systemStatus={systemStatus}
        riskScore={compoundRiskPct}
        simulationTime={simulationTime}
        threatCount={threatCount}
        agentModeActive={agentModeActive}
        onToggleAgentMode={() => setAgentModeActive(!agentModeActive)}
        compoundLeadTime={compoundLeadTime}
        compoundRisk={compoundRiskPct}
        incidentsPrevented={incidentsPrevented}
        onDemoMode={() => setDemoModeActive(true)}
      />

      {/* ── Agent Flow Mode (Full-Screen Overlay) ──────────────── */}
      {agentModeActive ? (
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <SectionBoundary name="Agent Flow Mode">
            <AgentFlowMode
              agentResults={agentResults}
              agentHealth={agentHealth}
              agentProfiles={agentProfiles}
              situationClass={situationClass}
              agentAgreement={agentAgreement}
              escalationLevel={escalationLevel}
              cascadeChains={cascadeChains}
              riskScore={riskScore}
              neuralAnomaly={neuralAnomaly}
              riskClassification={riskClassification}
              aiReasoning={aiReasoning}
              sensors={sensors}
            />
          </SectionBoundary>
        </div>
      ) : (
      <>
      <div className="workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SectionBoundary name="Architecture View">
          <ArchitectureView
            sensors={sensors}
            onOverride={handleSensorOverride}
            systemStatus={systemStatus}
            agentResults={agentResults}
            scenario={scenario}
          />
        </SectionBoundary>
      </div>
      </>
      )}
    </div>
  );
}
