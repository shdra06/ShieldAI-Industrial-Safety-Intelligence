import React, { useMemo } from 'react';
import {
  Cpu, Database, TrendingDown, Layers, Activity,
  BarChart3, Zap, Circle, AlertCircle, CheckCircle2,
  Download, Loader, Tag, Shield,
} from 'lucide-react';

/* ── Style Constants ─────────────────────────────────────────── */

const GLASS = {
  background: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(99, 102, 241, 0.15)',
  borderRadius: '16px',
  padding: '20px',
};

const GLASS_INNER = {
  background: 'rgba(30, 41, 59, 0.6)',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.08)',
  padding: '14px',
};

const CLASS_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];
const CLASS_LABELS = ['Normal', 'Elevated', 'Warning', 'Critical', 'Emergency'];

function anomalyBarColor(score) {
  if (score >= 0.8) return '#ef4444';
  if (score >= 0.5) return '#f97316';
  if (score >= 0.3) return '#eab308';
  return '#22c55e';
}

function statusIndicator(isReady, isTraining) {
  if (isTraining) return { color: '#eab308', label: 'Training…', icon: Activity };
  if (isReady) return { color: '#22c55e', label: 'Ready', icon: CheckCircle2 };
  return { color: '#64748b', label: 'Collecting Data', icon: Circle };
}

/* ── SVG Sparkline (loss curve) ──────────────────────────────── */

function LossSparkline({ losses = [], width = 160, height = 40 }) {
  if (losses.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '10px', color: '#475569' }}>No data yet</span>
      </div>
    );
  }

  const maxVal = Math.max(...losses) || 1;
  const minVal = Math.min(...losses);
  const range = maxVal - minVal || 1;
  const padY = 4;

  const points = losses.map((v, i) => {
    const x = (i / (losses.length - 1)) * width;
    const y = padY + ((maxVal - v) / range) * (height - padY * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Filled area */}
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill="url(#sparkGrad)"
      />
      {/* Line */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {losses.length > 0 && (() => {
        const lastX = width;
        const lastY = padY + ((maxVal - losses[losses.length - 1]) / range) * (height - padY * 2);
        return <circle cx={lastX} cy={lastY} r="2.5" fill="#818cf8" />;
      })()}
    </svg>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export function NeuralViz({
  neuralDetectorStatus,
  riskClassifierStatus,
  neuralAnomaly,
  riskClassification,
  isolationForestResult = {},
  isolationForestTrained = false,
  explanation = null,
  hfStatus = {},
  hfModelsLoaded = false,
  nerResult = null,
  safetyClassification = null,
}) {
  const detector = neuralDetectorStatus || {};
  const classifier = riskClassifierStatus || {};

  const detectorInfo = statusIndicator(detector.isTrained, detector.isTraining);
  const classifierInfo = statusIndicator(classifier.isTrained, classifier.isTraining);
  const DetectorIcon = detectorInfo.icon;
  const ClassifierIcon = classifierInfo.icon;

  const detectorLosses = detector.trainingHistory?.losses || [];
  const classifierLosses = classifier.trainingHistory?.losses || [];

  const bufferFill = detector.bufferSize != null
    ? Math.min(1, detector.bufferSize / (detector.minRequired || 50))
    : 0;

  const anomalyScore = neuralAnomaly?.anomalyScore || 0;
  const probs = riskClassification?.probabilities || [];

  return (
    <div style={GLASS}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={20} color="#a78bfa" />
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            NEURAL NETWORKS
          </span>
        </div>
      </div>

      {/* ── Anomaly Detector Section ───────────────────── */}
      <div style={{ ...GLASS_INNER, marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Anomaly Detector</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <DetectorIcon size={11} color={detectorInfo.color} style={detector.isTraining ? { animation: 'spin 1.5s linear infinite' } : {}} />
            <span style={{ fontSize: '10px', color: detectorInfo.color, fontWeight: 600 }}>{detectorInfo.label}</span>
          </div>
        </div>

        {/* Architecture */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px',
          padding: '6px 10px', borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.5)',
        }}>
          <Zap size={10} color="#64748b" />
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>
            Input → LSTM({detector.modelParams?.lstmUnits || 32}) → Dense({detector.modelParams?.latentDim || 8}) → LSTM({detector.modelParams?.lstmUnits || 32}) → Output
          </span>
        </div>

        {/* Buffer Progress */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              <Database size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Buffer
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {detector.bufferSize ?? 0}/{detector.minRequired || 50} sequences
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{
              width: `${bufferFill * 100}%`, height: '100%', borderRadius: '3px',
              background: bufferFill >= 1
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #64748b, #94a3b8)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Training Loss Sparkline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>
              <TrendingDown size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Loss Curve ({detector.trainingHistory?.epochs || 0} epochs)
            </div>
            <LossSparkline losses={detectorLosses} width={140} height={36} />
          </div>
          {/* Realtime Anomaly Bar */}
          {neuralAnomaly && neuralAnomaly.status !== 'not_ready' && (
            <div style={{ textAlign: 'right', minWidth: '80px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Anomaly</div>
              <div style={{
                width: '80px', height: '14px', borderRadius: '7px',
                background: 'rgba(15, 23, 42, 0.6)', overflow: 'hidden',
                border: neuralAnomaly.isAnomaly ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
              }}>
                <div style={{
                  width: `${Math.min(100, anomalyScore * 100)}%`,
                  height: '100%', borderRadius: '7px',
                  background: `linear-gradient(90deg, #22c55e, ${anomalyBarColor(anomalyScore)})`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{
                fontSize: '11px', fontWeight: 700, marginTop: '2px',
                color: anomalyBarColor(anomalyScore),
              }}>
                {(anomalyScore * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Top Contributors */}
        {neuralAnomaly?.isAnomaly && neuralAnomaly.topContributors?.length > 0 && (
          <div style={{ marginTop: '10px', padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <div style={{ fontSize: '10px', color: '#f87171', fontWeight: 600, marginBottom: '4px' }}>
              <AlertCircle size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Top Contributing Features
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {neuralAnomaly.topContributors.slice(0, 5).map((c, i) => (
                <span key={i} style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5',
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {typeof c === 'string' ? c : c.feature || c.name || `F${i}`}
                  {c.contribution != null && ` (${(c.contribution * 100).toFixed(0)}%)`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Risk Classifier Section ────────────────────── */}
      <div style={GLASS_INNER}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={14} color="#a78bfa" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Risk Classifier</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ClassifierIcon size={11} color={classifierInfo.color} style={classifier.isTraining ? { animation: 'spin 1.5s linear infinite' } : {}} />
            <span style={{ fontSize: '10px', color: classifierInfo.color, fontWeight: 600 }}>{classifierInfo.label}</span>
          </div>
        </div>

        {/* Architecture */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px',
          padding: '6px 10px', borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.5)',
        }}>
          <Zap size={10} color="#64748b" />
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>
            Input(24) → Dense(64, ReLU) → Dropout → Dense(32, ReLU) → Dropout → Softmax(5)
          </span>
        </div>

        {/* Training Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>
              <TrendingDown size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Loss ({classifier.trainingHistory?.epochs || 0} epochs)
            </div>
            <LossSparkline losses={classifierLosses} width={140} height={36} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Samples</div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
              {classifier.samplesCollected ?? 0}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>/{classifier.minRequired || 100}</span>
          </div>
        </div>

        {/* 5-Class Probability Bars */}
        {probs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {CLASS_LABELS.map((label, i) => {
              const prob = probs[i] || 0;
              const isActive = riskClassification?.classIndex === i;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '68px', fontSize: '10px', textAlign: 'right',
                    color: isActive ? CLASS_COLORS[i] : '#475569',
                    fontWeight: isActive ? 700 : 400,
                  }}>
                    {label}
                  </span>
                  <div style={{
                    flex: 1, height: '10px', borderRadius: '5px',
                    background: 'rgba(15, 23, 42, 0.6)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${prob * 100}%`, height: '100%', borderRadius: '5px',
                      background: isActive
                        ? `linear-gradient(90deg, ${CLASS_COLORS[i]}88, ${CLASS_COLORS[i]})`
                        : `${CLASS_COLORS[i]}30`,
                      transition: 'width 0.5s ease',
                      boxShadow: isActive ? `0 0 8px ${CLASS_COLORS[i]}40` : 'none',
                    }} />
                  </div>
                  <span style={{
                    width: '36px', fontSize: '10px', textAlign: 'right',
                    color: isActive ? CLASS_COLORS[i] : '#475569', fontWeight: 600,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {(prob * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Isolation Forest Card ────────────────────────── */}
      <div style={GLASS_INNER}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Layers size={16} color="#22d3ee" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            ISOLATION FOREST
          </span>
          {(() => {
            const info = statusIndicator(isolationForestTrained, false);
            const Icon = info.icon;
            return (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon size={12} color={info.color} />
                <span style={{ fontSize: '10px', color: info.color }}>{info.label}</span>
              </span>
            );
          })()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Anomaly Score</div>
            <div style={{
              fontSize: '20px', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace',
              color: anomalyBarColor(isolationForestResult?.anomalyScore || 0),
            }}>
              {((isolationForestResult?.anomalyScore || 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Status</div>
            <div style={{
              fontSize: '14px', fontWeight: 700,
              color: isolationForestResult?.isAnomaly ? '#ef4444' : '#22c55e',
            }}>
              {isolationForestResult?.isAnomaly ? '⚠ ANOMALY' : '✓ Normal'}
            </div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Path Length</div>
            <div style={{
              fontSize: '20px', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace',
              color: '#94a3b8',
            }}>
              {(isolationForestResult?.pathLength || 0).toFixed(1)}
            </div>
          </div>
        </div>
        {/* Dual Detection Agreement */}
        {isolationForestTrained && neuralAnomaly?.anomalyScore != null && (
          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ fontSize: '10px', color: '#a5b4fc', fontWeight: 600, marginBottom: '4px' }}>
              🔗 DUAL DETECTION CONSENSUS
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
              LSTM: {neuralAnomaly.isAnomaly ? '⚠ Anomaly' : '✓ Normal'}
              {' | '}
              IForest: {isolationForestResult?.isAnomaly ? '⚠ Anomaly' : '✓ Normal'}
              {' → '}
              <span style={{
                fontWeight: 700,
                color: (neuralAnomaly.isAnomaly && isolationForestResult?.isAnomaly) ? '#ef4444'
                  : (neuralAnomaly.isAnomaly || isolationForestResult?.isAnomaly) ? '#f97316'
                  : '#22c55e'
              }}>
                {(neuralAnomaly.isAnomaly && isolationForestResult?.isAnomaly) ? 'CONFIRMED ANOMALY'
                  : (neuralAnomaly.isAnomaly || isolationForestResult?.isAnomaly) ? 'SINGLE DETECTOR'
                  : 'CONSENSUS: NORMAL'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Explainability Card ──────────────────────────── */}
      {explanation && (
        <div style={GLASS_INNER}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <BarChart3 size={16} color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              SHAP-LIKE EXPLAINABILITY
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 8px',
              borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
            }}>
              {explanation.severity || 'Unknown'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', lineHeight: '1.5' }}>
            {explanation.explanation}
          </div>
          {/* Top contributor bars */}
          {explanation.topContributors && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {explanation.topContributors.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '80px', fontSize: '10px', textAlign: 'right', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(Math.abs(c.shapleyValue) * 200, 100)}%`,
                      height: '100%', borderRadius: '4px',
                      background: c.shapleyValue > 0
                        ? 'linear-gradient(90deg, #ef444488, #ef4444)'
                        : 'linear-gradient(90deg, #22c55e88, #22c55e)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{
                    width: '44px', fontSize: '10px', textAlign: 'right', fontWeight: 600,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: c.shapleyValue > 0 ? '#ef4444' : '#22c55e',
                  }}>
                    {c.shapleyValue > 0 ? '+' : ''}{(c.shapleyValue * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HuggingFace Model Status Dashboard ────────────── */}
      <div style={GLASS_INNER}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Download size={16} color="#a78bfa" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            HUGGINGFACE TRANSFORMERS.JS
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 8px',
            borderRadius: '4px',
            background: hfModelsLoaded ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
            color: hfModelsLoaded ? '#22c55e' : '#eab308',
          }}>
            {hfModelsLoaded ? `${hfStatus?.readyCount || 0}/3 Ready` : 'Loading...'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(hfStatus?.models || {}).map(([key, model]) => {
            const isReady = model?.status === 'ready';
            const isLoading = model?.status === 'loading';
            const progress = model?.progress || 0;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '8px',
                background: isReady ? 'rgba(34,197,94,0.06)' : 'rgba(15,23,42,0.5)',
                border: `1px solid ${isReady ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.06)'}`,
              }}>
                {isReady ? <CheckCircle2 size={12} color="#22c55e" />
                  : isLoading ? <Loader size={12} color="#eab308" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Circle size={12} color="#64748b" />}
                <span style={{ fontSize: '10px', color: '#94a3b8', flex: 1 }}>
                  {model?.id || key}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>{model?.size || ''}</span>
                {isLoading && (
                  <div style={{ width: '50px', height: '4px', borderRadius: '2px', background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${progress}%`, height: '100%', borderRadius: '2px',
                      background: 'linear-gradient(90deg, #a78bfa, #818cf8)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NER Extraction Results ─────────────────────── */}
      {nerResult && nerResult.categorized && (
        <div style={GLASS_INNER}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Tag size={16} color="#06b6d4" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              BERT-NER ENTITY EXTRACTION
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
            {nerResult.summary || 'No entities detected'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[['persons', '👤', '#818cf8'], ['organizations', '🏢', '#f59e0b'],
              ['locations', '📍', '#22c55e'], ['hazards', '⚠️', '#ef4444']].map(([cat, icon, color]) => {
              const items = nerResult.categorized?.[cat] || [];
              return (
                <div key={cat} style={{
                  background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '8px',
                }}>
                  <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {icon} {cat}
                  </div>
                  {items.length === 0 ? (
                    <div style={{ fontSize: '10px', color: '#475569' }}>—</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {items.slice(0, 5).map((e, i) => (
                        <span key={i} style={{
                          fontSize: '9px', padding: '1px 5px', borderRadius: '4px',
                          background: `${color}15`, color: color, border: `1px solid ${color}30`,
                        }}>
                          {typeof e === 'string' ? e : e.word || e.text || JSON.stringify(e)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Zero-Shot Safety Classification ───────────── */}
      {safetyClassification && safetyClassification.summary && (
        <div style={GLASS_INNER}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Shield size={16} color="#f97316" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              ZERO-SHOT SAFETY CLASSIFICATION
            </span>
            {safetyClassification.summary.dominantCategory && (
              <span style={{
                marginLeft: 'auto', fontSize: '9px', fontWeight: 700, padding: '2px 8px',
                borderRadius: '4px', background: 'rgba(249,115,22,0.15)', color: '#f97316',
              }}>
                {safetyClassification.summary.dominantCategory}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Classified</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f97316', fontFamily: '"JetBrains Mono", monospace' }}>
                {safetyClassification.summary.totalClassified || 0}
              </div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Categories</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', fontFamily: '"JetBrains Mono", monospace' }}>
                {Object.keys(safetyClassification.summary.categoryDistribution || {}).length}
              </div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Severity</div>
              <div style={{
                fontSize: '11px', fontWeight: 700,
                color: safetyClassification.summary.dominantSeverity?.includes('critical') ? '#ef4444'
                  : safetyClassification.summary.dominantSeverity?.includes('serious') ? '#f97316'
                  : '#22c55e',
              }}>
                {safetyClassification.summary.dominantSeverity?.split(' ')[0] || 'N/A'}
              </div>
            </div>
          </div>
          {/* Category distribution bars */}
          {safetyClassification.summary.categoryDistribution && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(safetyClassification.summary.categoryDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, count]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '120px', fontSize: '9px', textAlign: 'right', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat}
                    </span>
                    <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(count / (safetyClassification.summary.totalClassified || 1) * 100, 100)}%`,
                        height: '100%', borderRadius: '3px',
                        background: 'linear-gradient(90deg, #f9731688, #f97316)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ width: '20px', fontSize: '9px', color: '#f97316', fontWeight: 600 }}>
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
