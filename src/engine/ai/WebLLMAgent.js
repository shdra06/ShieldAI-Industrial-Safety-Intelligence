import { AIManager } from './AIManager.js';

/**
 * WebLLM Agent — Runs Llama 3.2 3B directly in the browser via WebGPU.
 * Used as offline fallback when Gemini API is unavailable.
 * 
 * Features:
 * - Lazy initialization (only loads model when first needed)
 * - OpenAI-compatible chat API
 * - Automatic model caching in IndexedDB
 * - Progress tracking during model download
 */
export class WebLLMAgent {
  constructor() {
    this.engine = null;
    this.isReady = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.modelId = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
    this.totalCalls = 0;
    this.avgLatency = 0;
  }

  /**
   * Initialize the WebLLM engine.
   * Downloads the model on first use (~700MB), cached after.
   * @param {function} onProgress - Progress callback
   */
  async initialize(onProgress) {
    if (this.isReady || this.isLoading) return { success: this.isReady };
    
    this.isLoading = true;
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      
      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: (report) => {
          this.loadProgress = report.progress || 0;
          if (onProgress) onProgress({
            progress: this.loadProgress,
            text: report.text || 'Loading model...',
          });
        },
      });
      
      this.isReady = true;
      this.isLoading = false;
      console.log('[WebLLMAgent] Model loaded:', this.modelId);
      return { success: true };
    } catch (err) {
      this.isLoading = false;
      console.error('[WebLLMAgent] Failed to load:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate a response using the local LLM.
   * @param {string} systemPrompt
   * @param {string} userMessage
   * @param {object} options - { temperature, maxTokens }
   * @returns {Promise<object>}
   */
  async chat(systemPrompt, userMessage, { temperature = 0.7, maxTokens = 1024 } = {}) {
    if (!this.isReady) {
      return { success: false, error: 'WebLLM not initialized. Call initialize() first.' };
    }
    
    const startTime = performance.now();
    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      });
      
      const latency = performance.now() - startTime;
      this.totalCalls++;
      this.avgLatency = (this.avgLatency * (this.totalCalls - 1) + latency) / this.totalCalls;
      
      const text = response.choices?.[0]?.message?.content || '';
      
      return {
        success: true,
        text,
        latency,
        tokensGenerated: response.usage?.completion_tokens || 0,
        source: 'webllm',
      };
    } catch (err) {
      return { success: false, error: err.message, source: 'webllm' };
    }
  }

  /**
   * Get the status of the WebLLM agent.
   */
  getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      loadProgress: this.loadProgress,
      modelId: this.modelId,
      totalCalls: this.totalCalls,
      avgLatency: this.avgLatency,
    };
  }

  /**
   * Unload the model and free GPU memory.
   */
  async dispose() {
    if (this.engine) {
      try { await this.engine.unload(); } catch {}
      this.engine = null;
    }
    this.isReady = false;
  }
}
