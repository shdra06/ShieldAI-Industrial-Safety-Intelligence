import { GoogleGenAI } from '@google/genai';

/**
 * @class AIManager
 * Singleton managing all AI resources for ShieldAI.
 * Handles Gemini API, WebLLM (browser LLM), and TF.js model lifecycle.
 *
 * @description
 * Central hub that agents call to get AI capabilities. Provides:
 * - Gemini API integration with rate limiting
 * - WebLLM browser-local LLM as offline fallback
 * - TensorFlow.js model registration and lifecycle
 * - Automatic fallback from Gemini → WebLLM when rate-limited or offline
 * - Event system for status updates
 * - Usage statistics tracking
 *
 * @example
 * const ai = AIManager.getInstance();
 * await ai.initGemini('YOUR_API_KEY');
 * const result = await ai.callGemini({
 *   systemPrompt: 'You are a safety analyst.',
 *   userPrompt: 'Analyze sensor data...',
 * });
 */
export class AIManager {
  /**
   * Creates or returns the singleton AIManager instance.
   * @constructor
   */
  constructor() {
    // Enforce singleton
    if (AIManager._instance) return AIManager._instance;
    AIManager._instance = this;

    // --- Gemini API ---
    /** @type {GoogleGenAI|null} */
    this.geminiClient = null;
    /** @type {string} Default Gemini model identifier */
    this.geminiModel = 'gemini-2.5-flash';
    /** @type {boolean} Whether the Gemini API is initialized and ready */
    this.geminiReady = false;
    /** @type {string|null} Stored API key */
    this.apiKey = null;

    // --- WebLLM (offline fallback) ---
    /** @type {object|null} WebLLM engine instance */
    this.webllmEngine = null;
    /** @type {boolean} Whether WebLLM is loaded and ready */
    this.webllmReady = false;
    /** @type {string} WebLLM model identifier */
    this.webllmModel = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
    /** @type {number} Current model load progress (0-1) */
    this.webllmLoadProgress = 0;

    // --- TensorFlow.js Models ---
    /** @type {object|null} LSTM Autoencoder for anomaly detection */
    this.anomalyDetector = null;
    /** @type {object|null} Feedforward NN for risk classification */
    this.riskClassifier = null;
    /** @type {boolean} Whether any TF.js model is registered */
    this.tfReady = false;

    // --- Rate Limiting ---
    /** @type {number} Number of Gemini calls in the current minute window */
    this.geminiCallCount = 0;
    /** @type {number} Timestamp of the last rate-limit window reset */
    this.geminiLastReset = Date.now();
    /** @type {number} Maximum allowed calls per minute (free tier limit) */
    this.maxCallsPerMinute = 15;
    /** @type {Array} Queue for rate-limited calls */
    this.callQueue = [];

    // --- Statistics ---
    /** @type {object} Aggregated usage statistics across all AI backends */
    this.stats = {
      geminiCalls: 0,
      geminiErrors: 0,
      geminiAvgLatency: 0,
      webllmCalls: 0,
      webllmErrors: 0,
      webllmAvgLatency: 0,
      tfInferences: 0,
      tfTrainingEpochs: 0,
    };

    // --- Event listeners ---
    /** @type {Map<string, Array<function>>} Event name → listener functions */
    this._listeners = new Map();
  }

  /**
   * Returns the singleton AIManager instance, creating it if necessary.
   * @returns {AIManager} The singleton instance
   */
  static getInstance() {
    if (!AIManager._instance) new AIManager();
    return AIManager._instance;
  }

  // ── Gemini API ────────────────────────────────────────────────

  /**
   * Initialize Gemini API with the provided key.
   * Tests the connection with a simple call to verify the key is valid.
   *
   * @param {string} apiKey - Google AI Studio API key
   * @returns {Promise<{success: boolean, error?: string}>} Initialization result
   */
  async initGemini(apiKey) {
    try {
      this.apiKey = apiKey;
      this.geminiClient = new GoogleGenAI({ apiKey });
      // Test connection with a simple call
      const response = await this.geminiClient.models.generateContent({
        model: this.geminiModel,
        contents: 'Respond with only the word "ready".',
      });
      this.geminiReady = true;
      this._emit('gemini:ready');
      console.log('[AIManager] Gemini API initialized successfully');
      return { success: true };
    } catch (err) {
      this.geminiReady = false;
      this._emit('gemini:error', err.message);
      console.error('[AIManager] Gemini init failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Call Gemini with rate limiting and automatic fallback to WebLLM.
   *
   * Rate limiting: Tracks calls per minute and falls back to WebLLM
   * when the free-tier limit is exceeded. The rate window resets every 60s.
   *
   * @param {object} options - Call configuration
   * @param {string} options.systemPrompt - System instruction for the model
   * @param {string|object} options.userPrompt - User prompt content
   * @param {object} [options.jsonSchema] - Optional JSON schema for structured output
   * @param {number} [options.temperature=0.7] - Sampling temperature (0-2)
   * @returns {Promise<{success: boolean, data?: any, raw?: string, latency?: number, source?: string, error?: string}>}
   */
  async callGemini({ systemPrompt, userPrompt, jsonSchema, temperature = 0.7 }) {
    // Rate limiting check
    const now = Date.now();
    if (now - this.geminiLastReset > 60000) {
      this.geminiCallCount = 0;
      this.geminiLastReset = now;
    }

    // If rate limited or not ready, fall back to WebLLM
    if (!this.geminiReady || this.geminiCallCount >= this.maxCallsPerMinute) {
      if (this.webllmReady) {
        return this.callWebLLM({ systemPrompt, userPrompt });
      }
      return { success: false, error: 'AI not available (rate limited, no fallback)' };
    }

    const startTime = performance.now();
    try {
      this.geminiCallCount++;

      /** @type {object} Generation config */
      const config = { temperature };
      if (jsonSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = jsonSchema;
      }

      const response = await this.geminiClient.models.generateContent({
        model: this.geminiModel,
        systemInstruction: systemPrompt,
        contents: userPrompt,
        config,
      });

      const latency = performance.now() - startTime;
      this.stats.geminiCalls++;
      this.stats.geminiAvgLatency =
        (this.stats.geminiAvgLatency * (this.stats.geminiCalls - 1) + latency) / this.stats.geminiCalls;

      const text = response.text;
      let parsed = text;
      if (jsonSchema) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
      }

      return { success: true, data: parsed, raw: text, latency, source: 'gemini' };
    } catch (err) {
      this.stats.geminiErrors++;
      console.error('[AIManager] Gemini call failed:', err.message);
      // Fallback to WebLLM
      if (this.webllmReady) {
        return this.callWebLLM({ systemPrompt, userPrompt });
      }
      return { success: false, error: err.message, source: 'gemini' };
    }
  }

  // ── WebLLM (Offline Fallback) ─────────────────────────────────

  /**
   * Initialize WebLLM with a browser-local model.
   * Uses dynamic import to avoid loading the WebLLM library when not needed.
   *
   * @param {function} [onProgress] - Progress callback receiving { progress, text }
   * @returns {Promise<{success: boolean, error?: string}>} Initialization result
   */
  async initWebLLM(onProgress) {
    try {
      // Dynamic import to avoid loading WebLLM when not needed
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      this.webllmEngine = await CreateMLCEngine(this.webllmModel, {
        initProgressCallback: (report) => {
          this.webllmLoadProgress = report.progress || 0;
          this._emit('webllm:progress', report);
          if (onProgress) onProgress(report);
        },
      });

      this.webllmReady = true;
      this._emit('webllm:ready');
      console.log('[AIManager] WebLLM initialized with', this.webllmModel);
      return { success: true };
    } catch (err) {
      this.webllmReady = false;
      this._emit('webllm:error', err.message);
      console.error('[AIManager] WebLLM init failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Call the browser-local LLM via WebLLM.
   *
   * @param {object} options - Call configuration
   * @param {string} options.systemPrompt - System instruction
   * @param {string|object} options.userPrompt - User prompt (objects are JSON-serialized)
   * @returns {Promise<{success: boolean, data?: any, raw?: string, latency?: number, source?: string, error?: string}>}
   */
  async callWebLLM({ systemPrompt, userPrompt }) {
    if (!this.webllmReady || !this.webllmEngine) {
      return { success: false, error: 'WebLLM not initialized' };
    }
    const startTime = performance.now();
    try {
      const reply = await this.webllmEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt) },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const latency = performance.now() - startTime;
      this.stats.webllmCalls++;
      this.stats.webllmAvgLatency =
        (this.stats.webllmAvgLatency * (this.stats.webllmCalls - 1) + latency) / this.stats.webllmCalls;

      const text = reply.choices?.[0]?.message?.content || '';
      let parsed = text;
      try { parsed = JSON.parse(text); } catch { /* not JSON, keep as text */ }

      return { success: true, data: parsed, raw: text, latency, source: 'webllm' };
    } catch (err) {
      this.stats.webllmErrors++;
      return { success: false, error: err.message, source: 'webllm' };
    }
  }

  // ── TensorFlow.js Models ──────────────────────────────────────

  /**
   * Register a TF.js model with the manager.
   * Supports 'anomalyDetector' (LSTM Autoencoder) and 'riskClassifier' (Feedforward NN).
   *
   * @param {string} name - Model name ('anomalyDetector' or 'riskClassifier')
   * @param {object} model - TF.js LayersModel instance
   */
  registerModel(name, model) {
    if (name === 'anomalyDetector') this.anomalyDetector = model;
    else if (name === 'riskClassifier') this.riskClassifier = model;
    this.tfReady = !!(this.anomalyDetector || this.riskClassifier);
    this._emit('tf:model-registered', name);
  }

  // ── Status ────────────────────────────────────────────────────

  /**
   * Get a comprehensive status snapshot of all AI subsystems.
   *
   * @returns {{
   *   gemini: { ready: boolean, model: string, callsThisMinute: number, maxCallsPerMinute: number },
   *   webllm: { ready: boolean, model: string, loadProgress: number },
   *   tensorflow: { ready: boolean, anomalyDetector: boolean, riskClassifier: boolean },
   *   stats: object
   * }}
   */
  getStatus() {
    return {
      gemini: {
        ready: this.geminiReady,
        model: this.geminiModel,
        callsThisMinute: this.geminiCallCount,
        maxCallsPerMinute: this.maxCallsPerMinute,
      },
      webllm: {
        ready: this.webllmReady,
        model: this.webllmModel,
        loadProgress: this.webllmLoadProgress,
      },
      tensorflow: {
        ready: this.tfReady,
        anomalyDetector: !!this.anomalyDetector,
        riskClassifier: !!this.riskClassifier,
      },
      stats: { ...this.stats },
    };
  }

  // ── Event System ──────────────────────────────────────────────

  /**
   * Register an event listener.
   *
   * Supported events:
   * - 'gemini:ready' - Gemini API initialized
   * - 'gemini:error' - Gemini API error (data: error message)
   * - 'webllm:ready' - WebLLM model loaded
   * - 'webllm:progress' - WebLLM loading progress (data: { progress, text })
   * - 'webllm:error' - WebLLM error (data: error message)
   * - 'tf:model-registered' - TF.js model registered (data: model name)
   *
   * @param {string} event - Event name
   * @param {function} fn - Listener function
   */
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
  }

  /**
   * Remove an event listener.
   * @param {string} event - Event name
   * @param {function} fn - Listener function to remove
   */
  off(event, fn) {
    if (!this._listeners.has(event)) return;
    const arr = this._listeners.get(event);
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    if (!this._listeners.has(event)) return;
    for (const fn of this._listeners.get(event)) {
      try { fn(data); } catch (e) { console.error('[AIManager] Event error:', e); }
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────

  /**
   * Dispose of all AI resources and reset the singleton.
   * Unloads WebLLM engine and disposes TF.js models.
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.webllmEngine) {
      try { await this.webllmEngine.unload(); } catch { /* ignore unload errors */ }
    }
    if (this.anomalyDetector?.dispose) this.anomalyDetector.dispose();
    if (this.riskClassifier?.dispose) this.riskClassifier.dispose();
    this.geminiReady = false;
    this.webllmReady = false;
    this.tfReady = false;
    AIManager._instance = null;
  }
}
