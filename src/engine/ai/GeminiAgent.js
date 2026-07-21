import { AIManager } from './AIManager.js';
import { RAGEngine } from './RAGEngine.js';
import { SAFETY_KNOWLEDGE_BASE } from '../../data/rag/safety_knowledge_base.js';
import { generateIndustrialRAGDocuments } from '../../data/rag/industrial_database.js';

// ── Shared RAG singleton ────────────────────────────────────────────────
let _ragInstance = null;

/**
 * Returns the shared, indexed RAGEngine singleton.
 * Loads:
 *   1. 90 safety regulation documents (OSHA, HIRA, Gas Detection, etc.)
 *   2. ~40 industrial database documents (equipment, personnel, chemicals,
 *      maintenance records, incident history, safety systems)
 *
 * The industrial database enables contextual risk assessment — e.g., if gas
 * readings are medium but the equipment is dangerously old/damaged, the AI
 * flags it as HIGH risk by cross-referencing equipment condition.
 *
 * @returns {RAGEngine}
 */
function getRAG() {
  if (!_ragInstance) {
    _ragInstance = new RAGEngine();

    // Load regulatory knowledge base
    _ragInstance.addDocuments(SAFETY_KNOWLEDGE_BASE);

    // Load industrial database (equipment, personnel, chemicals, incidents, etc.)
    const industrialDocs = generateIndustrialRAGDocuments();
    _ragInstance.addDocuments(industrialDocs);

    _ragInstance.buildIndex();

    const stats = _ragInstance.getStats();
    console.log(
      `[GeminiAgent] RAG Engine initialized: ${stats.documentCount} documents ` +
      `(${SAFETY_KNOWLEDGE_BASE.length} regulatory + ${industrialDocs.length} industrial), ` +
      `${stats.vocabularySize} vocabulary terms, categories: ${stats.categories.join(', ')}`
    );
  }
  return _ragInstance;
}

/**
 * @class GeminiAgent
 * Wraps AIManager's Gemini/WebLLM calls with agent-specific context.
 * Each agent creates its own GeminiAgent with a specialized system prompt.
 *
 * @description
 * Provides each autonomous agent with its own "AI brain" that:
 * - Maintains agent-specific system prompts (personality/role)
 * - Tracks conversation memory across ticks for continuity
 * - Throttles LLM calls to only every N simulation ticks
 * - Serializes complex plant state into compact LLM-friendly prompts
 * - Caches last results for inter-tick access
 *
 * @example
 * const safetyBrain = new GeminiAgent({
 *   agentName: 'SafetyDirector',
 *   systemPrompt: 'You are a senior industrial safety analyst...',
 *   callInterval: 10,
 *   jsonSchema: { type: 'object', properties: { riskLevel: { type: 'string' } } },
 * });
 *
 * // Called every tick in the simulation loop
 * const result = await safetyBrain.analyze(plantStateContext);
 */
export class GeminiAgent {
  /**
   * Create a new GeminiAgent instance.
   *
   * @param {object} config - Agent configuration
   * @param {string} config.agentName - Human-readable agent name for logging
   * @param {string} config.systemPrompt - Specialized system prompt defining the agent's role
   * @param {number} [config.callInterval=10] - Only call the LLM every N ticks
   * @param {object|null} [config.jsonSchema=null] - Optional JSON schema for structured output
   */
  constructor({ agentName, systemPrompt, callInterval = 10, jsonSchema = null }) {
    /** @type {string} Human-readable agent name */
    this.agentName = agentName;
    /** @type {string} System prompt defining this agent's AI role */
    this.systemPrompt = systemPrompt;
    /** @type {number} Call interval in simulation ticks */
    this.callInterval = callInterval;
    /** @type {object|null} JSON schema for structured responses */
    this.jsonSchema = jsonSchema;

    /** @type {number} Current tick counter */
    this.tickCount = 0;
    /** @type {object|null} Most recent successful AI result */
    this.lastResult = null;
    /** @type {string|null} Most recent error message */
    this.lastError = null;
    /** @type {number} Tick number of the last LLM call */
    this.lastCallTick = -Infinity;

    /**
     * Conversation memory — stores the last N exchanges for continuity.
     * Each entry: { tick, context (summary), response (truncated) }
     * @type {Array<{tick: number, context: string, response: string}>}
     */
    this.conversationMemory = [];
    /** @type {number} Maximum number of exchanges to retain in memory */
    this.maxMemory = 5;

    /** @type {boolean} Whether an LLM call is currently in-flight */
    this.isProcessing = false;
    /** @type {number} Total successful LLM calls made */
    this.totalCalls = 0;
    /** @type {number} Total errors encountered */
    this.totalErrors = 0;
  }

  /**
   * Called every tick. Only actually calls the LLM every `callInterval` ticks.
   * Returns the cached result on non-call ticks.
   *
   * @param {object} context - Agent-specific context data to analyze. Can include:
   *   - sensors: Array of sensor readings
   *   - riskScore: Overall risk score (0-1)
   *   - alerts: Array of active alerts
   *   - agentResults: Map of other agent findings
   *   - neuralAnomalies: Neural network anomaly detection output
   *   - workers: Array of on-site workers
   *   - permits: Array of active permits
   * @returns {Promise<object|null>} AI analysis result or null (if not yet available)
   */
  async analyze(context) {
    this.tickCount++;

    // Not time to call yet — return cached result
    if (this.tickCount - this.lastCallTick < this.callInterval) {
      return this.lastResult;
    }

    // Prevent concurrent calls
    if (this.isProcessing) return this.lastResult;

    this.isProcessing = true;
    this.lastCallTick = this.tickCount;

    try {
      const aiManager = AIManager.getInstance();

      // Build the user prompt with context + memory
      const userPrompt = this._buildPrompt(context);

      const response = await aiManager.callGemini({
        systemPrompt: this.systemPrompt,
        userPrompt,
        jsonSchema: this.jsonSchema,
        temperature: 0.4, // Lower temp for safety-critical analysis
      });

      if (response.success) {
        this.lastResult = {
          ...response,
          agentName: this.agentName,
          tick: this.tickCount,
          timestamp: new Date().toISOString(),
        };
        this.lastError = null;
        this.totalCalls++;

        // Add to conversation memory
        this.conversationMemory.push({
          tick: this.tickCount,
          context: this._summarizeContext(context),
          response: typeof response.data === 'string'
            ? response.data.substring(0, 500)
            : JSON.stringify(response.data).substring(0, 500),
        });
        if (this.conversationMemory.length > this.maxMemory) {
          this.conversationMemory.shift();
        }
      } else {
        this.lastError = response.error;
        this.totalErrors++;
      }
    } catch (err) {
      this.lastError = err.message;
      this.totalErrors++;
    } finally {
      this.isProcessing = false;
    }

    return this.lastResult;
  }

  /**
   * Build the user prompt with context and conversation memory.
   * Injects the last 3 exchanges from memory for continuity,
   * then appends the full serialized current context.
   *
   * @param {object} context - Current plant state context
   * @returns {string} Formatted prompt string
   * @private
   */
  _buildPrompt(context) {
    const parts = [];

    // Add conversation memory for continuity
    if (this.conversationMemory.length > 0) {
      parts.push('=== PREVIOUS ANALYSES ===');
      for (const mem of this.conversationMemory.slice(-3)) {
        parts.push(`[Tick ${mem.tick}] ${mem.response}`);
      }
      parts.push('=== END PREVIOUS ===\n');
    }

    // ── RAG: Retrieve relevant safety documents ───────────────────────
    try {
      const rag = getRAG();
      const ragQuery = this._buildRAGQuery(context);
      if (ragQuery) {
        const ragContext = rag.getContext(ragQuery, 1500);
        if (ragContext && !ragContext.includes('No relevant documents')) {
          parts.push(ragContext);
          parts.push('');
        }
      }
    } catch (e) {
      // RAG is optional — don't block on failure
      console.warn('[GeminiAgent] RAG lookup failed:', e.message);
    }

    // Add current context
    parts.push('=== CURRENT PLANT STATE (Tick ' + this.tickCount + ') ===');
    if (typeof context === 'string') {
      parts.push(context);
    } else {
      // Serialize context intelligently (limit size)
      parts.push(this._serializeContext(context));
    }
    parts.push('=== END CURRENT STATE ===');
    parts.push('\nAnalyze the above using the safety knowledge base context and provide your assessment.');

    return parts.join('\n');
  }

  /**
   * Build a RAG search query from the current context.
   * Extracts the most relevant keywords from alerts, sensor readings, and agent results.
   * @param {object} context
   * @returns {string|null} Query string for RAG search
   * @private
   */
  _buildRAGQuery(context) {
    if (!context) return null;
    const queryParts = [];

    // Add critical alert text
    if (context.alerts?.length > 0) {
      const criticalAlerts = context.alerts
        .filter(a => a.severity === 'critical' || a.severity === 'emergency')
        .slice(0, 3)
        .map(a => a.text || a.message || '')
        .filter(Boolean);
      queryParts.push(...criticalAlerts);
    }

    // Add sensor types that are near or above warning thresholds
    // Also query for equipment condition to enable contextual risk assessment
    if (context.sensors) {
      for (const s of context.sensors) {
        if (s.currentValue > (s.warningThreshold || Infinity)) {
          queryParts.push(`${s.type || s.id} high reading safety procedure`);
          // Cross-reference equipment: search for equipment age/condition in sensor's zone
          queryParts.push(`equipment age condition ${s.zoneId || ''} ${s.id} inspection overdue`);
        }
      }
    }

    // Fallback: use risk level — also include general equipment context
    if (queryParts.length === 0 && context.riskScore > 0.3) {
      queryParts.push('industrial safety risk assessment procedure');
      queryParts.push('equipment failure risk critical maintenance overdue');
    }

    return queryParts.length > 0 ? queryParts.join(' ') : null;
  }

  /**
   * Serialize context to a compact string for the prompt.
   * Handles sensors, risk scores, alerts, agent results, neural anomalies,
   * workers, and permits — truncating at 3000 chars to stay within token limits.
   *
   * @param {object} context - Plant state context object
   * @returns {string} Human-readable serialized context
   * @private
   */
  _serializeContext(context) {
    if (!context) return 'No data available.';

    const lines = [];

    // Sensors summary
    if (context.sensors) {
      lines.push('SENSORS:');
      for (const s of context.sensors) {
        const pct = s.criticalThreshold ? Math.round((s.currentValue / s.criticalThreshold) * 100) : '?';
        lines.push(`  ${s.id}: ${s.currentValue} ${s.unit || ''} (${pct}% of critical)`);
      }
    }

    // Risk score
    if (context.riskScore !== undefined) {
      lines.push(`\nOVERALL RISK: ${(context.riskScore * 100).toFixed(1)}%`);
    }

    // Active alerts
    if (context.alerts && context.alerts.length > 0) {
      lines.push(`\nACTIVE ALERTS (${context.alerts.length}):`);
      for (const a of context.alerts.slice(0, 10)) {
        lines.push(`  [${a.severity || 'info'}] ${a.text || a.message || JSON.stringify(a)}`);
      }
    }

    // Agent results summary
    if (context.agentResults) {
      lines.push('\nAGENT FINDINGS:');
      for (const [name, result] of Object.entries(context.agentResults)) {
        if (!result) continue;
        const msgCount = result.messages?.length || 0;
        const maxRisk = result.riskFactors?.length > 0
          ? Math.max(...result.riskFactors.map(r => r.value || 0)).toFixed(2)
          : '0.00';
        const severity = result.messages?.filter(m => m.severity === 'critical' || m.severity === 'emergency').length || 0;
        lines.push(`  ${name}: ${msgCount} msgs, max risk ${maxRisk}, ${severity} critical`);
      }
    }

    // Neural network results
    if (context.neuralAnomalies) {
      lines.push(`\nNEURAL ANOMALY SCORE: ${context.neuralAnomalies.score?.toFixed(3) || 'N/A'}`);
      lines.push(`  isAnomaly: ${context.neuralAnomalies.isAnomaly}`);
    }

    // Workers
    if (context.workers) {
      lines.push(`\nWORKERS: ${context.workers.length} on-site`);
    }

    // Permits
    if (context.permits) {
      const active = context.permits.filter(p => (p.status || '').toLowerCase() === 'active').length;
      lines.push(`\nPERMITS: ${active} active of ${context.permits.length} total`);
    }

    // Truncate if too long
    const result = lines.join('\n');
    return result.length > 3000 ? result.substring(0, 3000) + '\n... (truncated)' : result;
  }

  /**
   * Create a brief summary of context for memory storage.
   * Captures only the most important signals (risk score, alert count)
   * to keep memory entries compact.
   *
   * @param {object} context - Plant state context object
   * @returns {string} Compact summary string
   * @private
   */
  _summarizeContext(context) {
    if (!context) return 'empty';
    const risk = context.riskScore !== undefined ? `risk=${(context.riskScore * 100).toFixed(0)}%` : '';
    const alerts = context.alerts?.length ? `alerts=${context.alerts.length}` : '';
    return [risk, alerts].filter(Boolean).join(', ') || 'data provided';
  }

  /**
   * Get the status of this AI agent.
   *
   * @returns {{
   *   agentName: string,
   *   tickCount: number,
   *   totalCalls: number,
   *   totalErrors: number,
   *   hasResult: boolean,
   *   lastError: string|null,
   *   lastCallTick: number,
   *   isProcessing: boolean,
   *   memorySize: number,
   *   source: string
   * }}
   */
  getStatus() {
    return {
      agentName: this.agentName,
      tickCount: this.tickCount,
      totalCalls: this.totalCalls,
      totalErrors: this.totalErrors,
      hasResult: !!this.lastResult,
      lastError: this.lastError,
      lastCallTick: this.lastCallTick,
      isProcessing: this.isProcessing,
      memorySize: this.conversationMemory.length,
      source: this.lastResult?.source || 'none',
    };
  }

  /**
   * Reset the agent state. Clears tick counter, results, errors,
   * and conversation memory. Useful when restarting a simulation.
   */
  reset() {
    this.tickCount = 0;
    this.lastResult = null;
    this.lastError = null;
    this.lastCallTick = -Infinity;
    this.conversationMemory = [];
    this.isProcessing = false;
  }
}
