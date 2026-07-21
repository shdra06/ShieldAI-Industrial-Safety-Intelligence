import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, BarChart3, BookOpen, Users, Layers, Award, Network, TrendingUp, GitBranch, ChevronDown, Brain, Cpu, MessageCircle, Database, Sparkles } from 'lucide-react';
import AgentConsole from './AgentConsole.jsx';
import ComparisonPanel from './ComparisonPanel.jsx';
import RegulatoryChat from './RegulatoryChat.jsx';
import WorkerPanel from './WorkerPanel.jsx';
import SwissCheese from './SwissCheese.jsx';
import SafetyScorecard from './SafetyScorecard.jsx';
import AgentNetworkPanel from './AgentNetworkPanel.jsx';
import KnowledgeGraphViz from './KnowledgeGraphViz.jsx';
import { AISettings } from './AISettings.jsx';
import { AIReasoningPanel } from './AIReasoningPanel.jsx';
import { NeuralViz } from './NeuralViz.jsx';
import { AIChatPanel } from './AIChatPanel.jsx';
import { DatasetExplorer } from './DatasetExplorer.jsx';

/**
 * TabPanel — Bottom tabbed panel with primary tabs + "More" overflow menu.
 * Primary: Console, Risk, Workers, Regulations
 * More: Swiss Cheese, Safety Score, Agent Network, Predictions
 */
export default function TabPanel({
  messages = [],
  compoundRisk,
  singleSensorRisk,
  riskFactors = [],
  regulations = [],
  searchRegulations,
  workers = [],
  workerAlerts = [],
  temporalRisk = {},
  swissCheese = {},
  compoundLeadTime = 0,
  zones = [],
  riskScores = {},
  permits = [],
  matchedIncidents = [],
  riskScore = 0,
  swissCheeseAlignment = 0,
  sensors = [],
  agentResults = {},
  agentHealth = {},
  agentProfiles = {},
  situationClass = 'Normal Operations',
  agentAgreement = 1,
  escalationLevel = 0,
  tierBreakdown = { tier1: 13, tier2: 3, tier3: 2 },
  agentCount = 18,
  cascadeChains = [],
  predictions = [],
  recommendations = [],
  coverageMap = {},
  // AI Layer props
  aiReasoning = null,
  aiReasoningSource = 'none',
  neuralAnomaly = {},
  riskClassification = {},
  neuralDetectorStatus = {},
  riskClassifierStatus = {},
  // ML Layer props
  isolationForestResult = {},
  isolationForestTrained = false,
  explanation = null,
  // HuggingFace Transformers.js props
  hfStatus = {},
  hfModelsLoaded = false,
  nerResult = null,
  safetyClassification = null,
}) {
  const [activeTab, setActiveTab] = useState('console');
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Primary tabs (always visible)
  const primaryTabs = [
    { id: 'console', label: 'Console', icon: MessageSquare, count: messages.length },
    { id: 'analysis', label: 'Risk', icon: BarChart3 },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'regulations', label: 'Regulations', icon: BookOpen },
  ];

  // Overflow tabs (inside "More" dropdown)
  const overflowTabs = [
    { id: 'aiChat', label: 'AI Chat', icon: MessageCircle },
    { id: 'agentNetwork', label: 'Agent Network', icon: Network, count: agentCount },
    { id: 'knowledgeGraph', label: 'Knowledge Graph', icon: GitBranch },
    { id: 'aiReasoning', label: 'AI Reasoning', icon: Sparkles },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp, count: predictions.length || undefined },
    { id: 'swisscheese', label: 'Swiss Cheese Model', icon: Layers },
    { id: 'neural', label: 'Neural Networks', icon: Cpu },
    { id: 'safety', label: 'Safety Scorecard', icon: Award },
    { id: 'dataset', label: 'Indian Dataset', icon: Database },
    { id: 'architecture', label: 'Architecture', icon: Cpu },
    { id: 'ai', label: 'AI Settings', icon: Brain },
  ];

  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);
  const activeOverflowTab = overflowTabs.find((t) => t.id === activeTab);

  const selectTab = (id) => {
    setActiveTab(id);
    setShowMore(false);
  };

  return (
    <div className="tab-panel-container">
      <div className="tab-panel">
        {/* ── Tab Bar ── */}
        <div className="tab-bar">
          {/* Primary tabs */}
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => selectTab(tab.id)}
              >
                <Icon size={11} />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span className="tab-count">{tab.count > 99 ? '99+' : tab.count}</span>
                )}
              </button>
            );
          })}

          {/* Separator */}
          <div className="tab-separator" />

          {/* More dropdown */}
          <div className="tab-more-wrapper" ref={moreRef}>
            <button
              className={`tab-btn tab-more-btn ${isOverflowActive ? 'active' : ''}`}
              onClick={() => setShowMore(!showMore)}
            >
              {isOverflowActive && activeOverflowTab ? (
                <>
                  {React.createElement(activeOverflowTab.icon, { size: 11 })}
                  <span>{activeOverflowTab.label}</span>
                </>
              ) : (
                <span>More</span>
              )}
              <ChevronDown size={10} style={{ opacity: 0.5, transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {showMore && (
              <div className="tab-dropdown">
                {overflowTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={`tab-dropdown-item ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => selectTab(tab.id)}
                    >
                      <Icon size={12} />
                      <span>{tab.label}</span>
                      {tab.count != null && (
                        <span className="tab-dropdown-count">{tab.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="tab-content" role="tabpanel">
          {activeTab === 'architecture' && (
            <div style={{ padding: '1rem', color: '#e2e8f0', fontSize: '12px', lineHeight: '1.6' }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '14px' }}>🏗️ ShieldAI System Architecture</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)' }}>
                  <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>AI Engine</div>
                  <div>• Gemini 2.5 Flash — Supervisor reasoning</div>
                  <div>• 18 Multi-Agent System (3-tier hierarchy)</div>
                  <div>• RAG Engine — TF-IDF + Neural Embeddings (RRF)</div>
                  <div>• HuggingFace Transformers.js (3 models)</div>
                  <div>• Isolation Forest anomaly detection</div>
                </div>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)' }}>
                  <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>Data Layer</div>
                  <div>• 130+ RAG documents (OISD, Factory Act, DGMS)</div>
                  <div>• Industrial DB — Equipment age, maintenance, chemicals</div>
                  <div>• Real-time sensor simulation (Digital Twin)</div>
                  <div>• Physics-based gas dispersion & heat transfer</div>
                  <div>• Holt-Winters predictive forecasting</div>
                </div>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>Safety Intelligence</div>
                  <div>• Compound Risk Detection (multi-sensor correlation)</div>
                  <div>• Swiss Cheese Model barrier analysis</div>
                  <div>• Cascade/Domino failure propagation</div>
                  <div>• Digital Permit Intelligence</div>
                  <div>• Emergency Response Orchestrator</div>
                </div>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)' }}>
                  <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>Visualization</div>
                  <div>• 3D React Three Fiber Digital Twin</div>
                  <div>• Interactive sensor click-to-inspect</div>
                  <div>• Geospatial risk heatmap</div>
                  <div>• Agent network flow visualization</div>
                  <div>• Knowledge graph (equipment-permit-risk)</div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)' }}>
                <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>Key Innovation</div>
                <div style={{ color: '#fbbf24' }}>"Data present, but unacted upon" — The problem is not the absence of technology. It is the absence of a unified intelligence layer. ShieldAI fuses sensor data + equipment age + permit status + shift patterns + regulatory knowledge into a single predictive layer that acts BEFORE incidents, not after.</div>
              </div>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#60a5fa' }}>N</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Plants Supported</div>
                  <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>Horizontally scalable</div>
                </div>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>10K+</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Sensors per Plant</div>
                  <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>Real-time streaming</div>
                </div>
                <div style={{ background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>18→N</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Agent Plug-in System</div>
                  <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>Add agents dynamically</div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: 'rgba(30,40,65,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>Deployment Architecture</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div>• Edge nodes at each plant for low-latency</div>
                  <div>• Cloud aggregation for cross-plant analytics</div>
                  <div>• Data-driven config — add plants via JSON</div>
                  <div>• Modular agents — plug in domain-specific</div>
                  <div>• RAG corpus scales with document count</div>
                  <div>• WebSocket-ready for real SCADA integration</div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'console' && <AgentConsole messages={messages} />}
          {activeTab === 'analysis' && (
            <ComparisonPanel
              compoundRisk={compoundRisk}
              singleSensorRisk={singleSensorRisk}
              riskFactors={riskFactors}
              compoundLeadTime={compoundLeadTime}
              swissCheeseAlignment={swissCheeseAlignment}
              temporalRisk={temporalRisk}
            />
          )}
          {activeTab === 'workers' && (
            <WorkerPanel workers={workers} workerAlerts={workerAlerts} temporalRisk={temporalRisk} />
          )}
          {activeTab === 'swisscheese' && <SwissCheese swissCheese={swissCheese} />}
          {activeTab === 'safety' && (
            <SafetyScorecard
              riskScore={riskScore}
              singleSensorRisk={singleSensorRisk / 100}
              zones={zones} riskScores={riskScores}
              workers={workers} permits={permits}
              matchedIncidents={matchedIncidents} swissCheese={swissCheese}
            />
          )}
          {activeTab === 'regulations' && (
            <RegulatoryChat regulations={regulations} searchRegulations={searchRegulations} />
          )}
          {activeTab === 'agentNetwork' && (
            <AgentNetworkPanel
              agentResults={agentResults} agentHealth={agentHealth}
              agentProfiles={agentProfiles} situationClass={situationClass}
              agentAgreement={agentAgreement} escalationLevel={escalationLevel}
              tierBreakdown={tierBreakdown} agentCount={agentCount}
              cascadeChains={cascadeChains} predictions={predictions}
              recommendations={recommendations} coverageMap={coverageMap}
            />
          )}
          {activeTab === 'knowledgeGraph' && (
            <KnowledgeGraphViz
              zones={zones}
              workers={workers}
              permits={permits}
              sensors={sensors}
              riskScores={riskScores}
            />
          )}
          {activeTab === 'predictions' && (
            <div className="predictions-tab-content">
              <div className="predictions-header">
                <TrendingUp size={14} />
                <span>Predictive Forecasts</span>
              </div>
              {predictions.length === 0 ? (
                <div className="predictions-empty">No active predictions.</div>
              ) : (
                <div className="predictions-list">
                  {predictions.map((pred, i) => (
                    <div key={i} className={`prediction-card ${pred.severity || 'info'}`}>
                      <div className="prediction-card-header">
                        <span className="prediction-type">{pred.type || 'Forecast'}</span>
                        <span className="prediction-confidence">
                          {pred.confidence ? `${Math.round(pred.confidence * 100)}%` : '—'}
                        </span>
                      </div>
                      <p className="prediction-text">{pred.message || pred.description || JSON.stringify(pred)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'ai' && <AISettings />}
          {activeTab === 'aiReasoning' && (
            <AIReasoningPanel
              aiReasoning={aiReasoning}
              aiReasoningSource={aiReasoningSource}
              neuralAnomaly={neuralAnomaly}
              riskClassification={riskClassification}
            />
          )}
          {activeTab === 'neural' && (
            <NeuralViz
              neuralDetectorStatus={neuralDetectorStatus}
              riskClassifierStatus={riskClassifierStatus}
              neuralAnomaly={neuralAnomaly}
              riskClassification={riskClassification}
              isolationForestResult={isolationForestResult}
              isolationForestTrained={isolationForestTrained}
              explanation={explanation}
              hfStatus={hfStatus}
              hfModelsLoaded={hfModelsLoaded}
              nerResult={nerResult}
              safetyClassification={safetyClassification}
            />
          )}
          {activeTab === 'aiChat' && <AIChatPanel />}
          {activeTab === 'dataset' && <DatasetExplorer />}
        </div>
      </div>
    </div>
  );
}
