import { pipeline, env } from '@huggingface/transformers';

// Configure environment for browser use
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Model registry defining available Transformers.js models.
 */
const MODELS = {
  embeddings: {
    id: 'Xenova/all-MiniLM-L6-v2',
    task: 'feature-extraction',
    size: '~22MB',
    description: 'Semantic embeddings for neural RAG search',
  },
  zeroShot: {
    id: 'Xenova/distilbart-mnli-12-3',
    task: 'zero-shot-classification',
    size: '~150MB',
    description: 'Zero-shot classification of safety incidents',
  },
  ner: {
    id: 'Xenova/bert-base-NER',
    task: 'token-classification',
    size: '~110MB',
    description: 'Named entity extraction from safety reports',
  },
};

/**
 * Manager class for HuggingFace Transformers.js models.
 * Handles lazy-loading, caching, and running inference pipelines.
 */
export class HuggingFaceManager {
  static _instance = null;

  /**
   * Private constructor for singleton pattern.
   */
  constructor() {
    if (HuggingFaceManager._instance) {
      return HuggingFaceManager._instance;
    }
    
    this.pipelines = {};
    this.loadingStatus = {};
    this.loadProgress = {};
    this.errors = {};
    this._listeners = new Map();
    
    // Initialize statuses
    Object.keys(MODELS).forEach((key) => {
      this.loadingStatus[key] = 'idle';
      this.loadProgress[key] = 0;
      this.errors[key] = null;
    });

    HuggingFaceManager._instance = this;
  }

  /**
   * Retrieves the singleton instance of HuggingFaceManager.
   * @returns {HuggingFaceManager} The singleton instance.
   */
  static getInstance() {
    if (!HuggingFaceManager._instance) {
      HuggingFaceManager._instance = new HuggingFaceManager();
    }
    return HuggingFaceManager._instance;
  }

  /**
   * Registers an event listener.
   * @param {string} event - The event name.
   * @param {Function} fn - The callback function.
   */
  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(fn);
  }

  /**
   * Removes an event listener.
   * @param {string} event - The event name.
   * @param {Function} fn - The callback function.
   */
  off(event, fn) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(fn);
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} event - The event name.
   * @param {any} data - The data to pass to callbacks.
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(data);
        } catch (error) {
          console.error(`[HuggingFaceManager] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Checks if a model is successfully loaded and ready.
   * @param {string} modelKey - The model key from MODELS.
   * @returns {boolean} True if ready, false otherwise.
   */
  isModelReady(modelKey) {
    return this.loadingStatus[modelKey] === 'ready' && !!this.pipelines[modelKey];
  }

  /**
   * Lazy-loads a single model pipeline.
   * @param {string} modelKey - The model key to load (e.g., 'embeddings').
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async loadModel(modelKey) {
    if (!MODELS[modelKey]) {
      const errorMsg = `Invalid model key: ${modelKey}`;
      console.error(`[HuggingFaceManager] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    if (this.isModelReady(modelKey)) {
      return { success: true };
    }

    if (this.loadingStatus[modelKey] === 'loading') {
      console.warn(`[HuggingFaceManager] Model ${modelKey} is already loading.`);
    }

    try {
      this.loadingStatus[modelKey] = 'loading';
      this.errors[modelKey] = null;
      this._emit('model:status', { modelKey, status: 'loading' });

      const modelConfig = MODELS[modelKey];
      
      this.pipelines[modelKey] = await pipeline(modelConfig.task, modelConfig.id, {
        progress_callback: (progressInfo) => {
          if (progressInfo && progressInfo.status === 'progress' && progressInfo.progress !== undefined) {
            this.loadProgress[modelKey] = progressInfo.progress;
            this._emit('model:progress', { modelKey, progress: progressInfo.progress });
          }
        },
      });

      this.loadingStatus[modelKey] = 'ready';
      this.loadProgress[modelKey] = 100;
      this._emit('model:ready', { modelKey });
      console.log(`[HuggingFaceManager] Successfully loaded model: ${modelKey}`);
      
      return { success: true };
    } catch (error) {
      console.error(`[HuggingFaceManager] Error loading model ${modelKey}:`, error);
      this.loadingStatus[modelKey] = 'error';
      this.errors[modelKey] = error.message || String(error);
      this._emit('model:error', { modelKey, error: this.errors[modelKey] });
      return { success: false, error: this.errors[modelKey] };
    }
  }

  /**
   * Loads all available models sequentially.
   * @returns {Promise<Array<{success: boolean, error?: string}>>}
   */
  async loadAll() {
    console.log(`[HuggingFaceManager] Starting sequential load of all models.`);
    const results = [];
    for (const key of Object.keys(MODELS)) {
      const result = await this.loadModel(key);
      results.push(result);
    }
    return results;
  }

  /**
   * Generates embeddings for a given text.
   * @param {string} text - The input text.
   * @returns {Promise<{success: boolean, embedding?: Float32Array, error?: string}>}
   */
  async embed(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid input text for embedding.' };
    }

    const modelKey = 'embeddings';
    if (!this.isModelReady(modelKey)) {
      const loadResult = await this.loadModel(modelKey);
      if (!loadResult.success) return loadResult;
    }

    try {
      const embedder = this.pipelines[modelKey];
      const result = await embedder(text, { pooling: 'mean', normalize: true });
      return { success: true, embedding: result.data };
    } catch (error) {
      console.error(`[HuggingFaceManager] Embedding error:`, error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Generates embeddings for an array of texts.
   * @param {string[]} texts - Array of input texts.
   * @returns {Promise<{success: boolean, embeddings?: Float32Array[], error?: string}>}
   */
  async embedBatch(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return { success: false, error: 'Invalid input for batch embedding.' };
    }

    const modelKey = 'embeddings';
    if (!this.isModelReady(modelKey)) {
      const loadResult = await this.loadModel(modelKey);
      if (!loadResult.success) return loadResult;
    }

    try {
      const embedder = this.pipelines[modelKey];
      const result = await embedder(texts, { pooling: 'mean', normalize: true });
      
      const embeddings = [];
      
      if (result.tolist) {
        // Handle tensor-like objects that provide tolist()
        const list = result.tolist();
        for (const item of list) {
          embeddings.push(new Float32Array(item));
        }
      } else if (result.dims && result.data) {
        // Handle raw flat array with dimensions [batchSize, embedDim]
        const batchSize = result.dims[0];
        const embedDim = result.dims[1];
        
        for (let i = 0; i < batchSize; i++) {
          const start = i * embedDim;
          const end = start + embedDim;
          embeddings.push(result.data.slice(start, end));
        }
      } else {
        throw new Error("Unexpected embedding output format.");
      }
      
      return { success: true, embeddings };
    } catch (error) {
      console.error(`[HuggingFaceManager] Batch embedding error:`, error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Performs zero-shot classification on a text against given labels.
   * @param {string} text - The input text.
   * @param {string[]} labels - Array of candidate labels.
   * @returns {Promise<{success: boolean, labels?: string[], scores?: number[], topLabel?: string, topScore?: number, error?: string}>}
   */
  async classify(text, labels) {
    if (!text || !Array.isArray(labels) || labels.length === 0) {
      return { success: false, error: 'Invalid input or labels for classification.' };
    }

    const modelKey = 'zeroShot';
    if (!this.isModelReady(modelKey)) {
      const loadResult = await this.loadModel(modelKey);
      if (!loadResult.success) return loadResult;
    }

    try {
      const classifier = this.pipelines[modelKey];
      const result = await classifier(text, labels, { multi_label: false });
      
      return {
        success: true,
        labels: result.labels,
        scores: result.scores,
        topLabel: result.labels[0],
        topScore: result.scores[0],
      };
    } catch (error) {
      console.error(`[HuggingFaceManager] Classification error:`, error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Extracts named entities from text and merges consecutive tokens of the same entity type.
   * @param {string} text - The input text.
   * @returns {Promise<{success: boolean, entities?: Array<{entity: string, word: string, score: number, start: number, end: number}>, error?: string}>}
   */
  async extractEntities(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid input text for NER.' };
    }

    const modelKey = 'ner';
    if (!this.isModelReady(modelKey)) {
      const loadResult = await this.loadModel(modelKey);
      if (!loadResult.success) return loadResult;
    }

    try {
      const extractor = this.pipelines[modelKey];
      const rawEntities = await extractor(text);
      
      if (!rawEntities || rawEntities.length === 0) {
        return { success: true, entities: [] };
      }

      // Group consecutive tokens with same entity type (B-PER, I-PER -> merge)
      const mergedEntities = [];
      let currentEntity = null;

      for (const token of rawEntities) {
        const entityLabel = token.entity_group || token.entity || '';
        
        const isBegin = entityLabel.startsWith('B-');
        const isInside = entityLabel.startsWith('I-');
        const baseType = (isBegin || isInside) ? entityLabel.substring(2) : entityLabel;

        const isContinuation = currentEntity && (isInside || (!isBegin && baseType === currentEntity.entity));

        if (isContinuation) {
          // Merge token logic (handling subwords and spaces)
          const wordPart = token.word.startsWith('##') ? token.word.substring(2) : ` ${token.word}`;
          currentEntity.word += wordPart;
          currentEntity.end = token.end !== undefined ? token.end : currentEntity.end;
          currentEntity.score = (currentEntity.score + token.score) / 2; // Average score
        } else {
          if (currentEntity) {
            mergedEntities.push(currentEntity);
          }
          currentEntity = {
            entity: baseType,
            word: token.word.startsWith('##') ? token.word.substring(2) : token.word,
            score: token.score,
            start: token.start !== undefined ? token.start : 0,
            end: token.end !== undefined ? token.end : 0,
          };
        }
      }

      if (currentEntity) {
        mergedEntities.push(currentEntity);
      }

      // Final string cleanup
      mergedEntities.forEach(ent => {
        ent.word = ent.word.replace(/\s+/g, ' ').trim();
      });

      return { success: true, entities: mergedEntities };
    } catch (error) {
      console.error(`[HuggingFaceManager] NER error:`, error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Retrieves the comprehensive status of all models.
   * @returns {Object} Status object with details per model.
   */
  getStatus() {
    let readyCount = 0;
    const modelsStatus = Object.fromEntries(
      Object.entries(MODELS).map(([key, model]) => {
        const status = this.loadingStatus[key] || 'idle';
        if (status === 'ready') readyCount++;
        
        return [key, {
          id: model.id,
          task: model.task,
          size: model.size,
          status,
          progress: this.loadProgress[key] || 0,
          error: this.errors[key] || null,
        }];
      })
    );

    return {
      models: modelsStatus,
      readyCount,
      totalModels: Object.keys(MODELS).length,
    };
  }
}
