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

// ── Engine ───────────────────────────────────────────────────────────────────
import { SimulationEngine } from './engine/SimulationEngine.js';

// ── Data ─────────────────────────────────────────────────────────────────────
import { REGULATIONS, searchRegulations } from './data/regulations.js';

// =============================================================================
// App — Root Component
// Manages the SimulationEngine lifecycle and distributes state to all widgets.
// =============================================================================

export default function App() {
  // ── Simulation engine ref (persists across renders) ─────────────────────
  const engineRef = useRef(null);

  // ── Core state ──────────────────────────────────────────────────────────
  const [scenario, setScenario] = useState('normal');
  const [simState, setSimState] = useState(null);
  const [sensorHistory, setSensorHistory] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  // ── Initialize engine on mount ──────────────────────────────────────────
  useEffect(() => {
    const engine = new SimulationEngine('normal');
    engineRef.current = engine;

    // Subscribe to state updates from the engine
    const unsubscribe = engine.onUpdate((state) => {
      setSimState(state);
      setIsRunning(state.isRunning);

      // Build sensor history (rolling window of last 30 readings per sensor)
      setSensorHistory((prev) => {
        const next = { ...prev };
        for (const sensor of state.sensors) {
          if (!next[sensor.id]) next[sensor.id] = [];
          next[sensor.id] = [...next[sensor.id].slice(-29), sensor.currentValue];
        }
        return next;
      });
    });

    // Start immediately
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
    if (engineRef.current) {
      engineRef.current.setScenario(newScenario);
      engineRef.current.start();
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

  // Compute risk scores per zone for the plant map
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
    // Also map short form (e.g. 'Z-A' -> 'A') for PlantMap compatibility
    const shortId = zone.id.replace('Z-', '');
    zoneRiskScores[shortId] = score;
  }

  // Build risk factors for comparison panel
  const agentResults = simState?.agentResults ?? {};
  const riskFactors = {
    gas: 0,
    permit: 0,
    ppe: 0,
    pattern: 0,
    maintenance: 0,
  };

  if (agentResults.scada?.riskFactors) {
    const gasFactors = agentResults.scada.riskFactors;
    riskFactors.gas = gasFactors.length > 0
      ? Math.max(...gasFactors.map((f) => (f.value || 0) * (f.weight || 0))) * 100
      : 0;
  }
  if (agentResults.permit?.riskFactors) {
    const permitFactors = agentResults.permit.riskFactors;
    riskFactors.permit = permitFactors.length > 0
      ? Math.max(...permitFactors.map((f) => (f.value || 0) * (f.weight || 0))) * 100
      : 0;
  }
  if (agentResults.vision?.riskFactors) {
    const visionFactors = agentResults.vision.riskFactors;
    riskFactors.ppe = visionFactors.length > 0
      ? Math.max(...visionFactors.map((f) => (f.value || 0) * (f.weight || 0))) * 100
      : 0;
  }
  if (agentResults.pattern?.riskFactors) {
    const patternFactors = agentResults.pattern.riskFactors;
    riskFactors.pattern = patternFactors.length > 0
      ? Math.max(...patternFactors.map((f) => (f.value || 0) * (f.weight || 0))) * 100
      : 0;
  }

  // Emergency active state
  const emergencyActive = systemStatus === 'emergency' || (emergencyProtocol && emergencyProtocol.length > 0);

  // Simulation time as a Date for the header clock
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0); // Shift starts at 08:00
  const simulationTime = new Date(baseTime.getTime() + simulationClock * 1000);

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Header
        scenario={scenario}
        onScenarioChange={handleScenarioChange}
        systemStatus={systemStatus}
        riskScore={Math.round(riskScore * 100)}
        simulationTime={simulationTime}
      />

      {/* ── Dashboard Grid ──────────────────────────────────────────── */}
      <main className="dashboard">
        {/* Plant Map (spans 2 rows) */}
        <section className="plant-map-wrapper">
          <PlantMap
            zones={zones}
            workers={workers}
            permits={permits}
            riskScores={zoneRiskScores}
          />
        </section>

        {/* SCADA Monitor */}
        <section className="scada-wrapper">
          <SCADAMonitor
            sensors={sensors}
            sensorHistory={sensorHistory}
          />
        </section>

        {/* Risk Gauge */}
        <section className="risk-gauge-wrapper">
          <RiskGauge
            compoundRisk={Math.round(riskScore * 100)}
            singleSensorRisk={Math.round(singleSensorRisk * 100)}
            status={systemStatus}
          />
        </section>

        {/* Risk Comparison */}
        <section className="comparison-wrapper">
          <ComparisonPanel
            compoundRisk={Math.round(riskScore * 100)}
            singleSensorRisk={Math.round(singleSensorRisk * 100)}
            riskFactors={riskFactors}
          />
        </section>

        {/* Incident Pattern Intelligence */}
        <section className="incidents-wrapper">
          <IncidentTimeline matchedIncidents={matchedIncidents} />
        </section>

        {/* Agent Console */}
        <section className="agent-console-wrapper">
          <AgentConsole messages={messages} />
        </section>

        {/* Regulatory Chat */}
        <section className="regulatory-wrapper">
          <RegulatoryChat
            regulations={REGULATIONS}
            searchRegulations={searchRegulations}
          />
        </section>
      </main>

      {/* ── Emergency Overlay (fixed position, outside grid) ─────── */}
      {emergencyActive && (
        <EmergencyOrchestrator
          active={emergencyActive}
          protocol={emergencyProtocol}
          incidentReport={null}
        />
      )}
    </div>
  );
}
