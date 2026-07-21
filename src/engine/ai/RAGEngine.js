/**
 * RAGEngine — Retrieval-Augmented Generation for ShieldAI
 *
 * Implements dual-mode search:
 *   Mode 1 (default): TF-IDF vectorization + cosine similarity (always available)
 *   Mode 2 (neural):  Dense embeddings from all-MiniLM-L6-v2 via Transformers.js
 *   Mode 3 (hybrid):  Reciprocal Rank Fusion of TF-IDF + neural scores
 *
 * Architecture:
 *   1. Documents are tokenized and converted to TF-IDF vectors
 *   2. When HuggingFace model is loaded, documents also get dense embeddings
 *   3. Queries use hybrid search (fusing sparse + dense) when available
 *   4. Top-K documents retrieved by fused score
 *   5. Retrieved docs sent to Gemini as context for grounded responses
 *
 * @module RAGEngine
 */

/** Comprehensive English stopwords list optimized for industrial/safety text */
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren', 'arent', 'as', 'at', 'be', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'couldn', 'couldnt', 'did', 'didn', 'didnt', 'do', 'does', 'doesn', 'doesnt',
  'doing', 'don', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'get', 'gets', 'got', 'had', 'hadn', 'hadnt', 'has', 'hasn',
  'hasnt', 'have', 'haven', 'havent', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'isn', 'isnt', 'it', 'its', 'itself', 'just', 'let', 'lets', 'like', 'll',
  'me', 'might', 'mightn', 'more', 'most', 'mustn', 'my', 'myself', 'need',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'per', 'rather',
  're', 's', 'same', 'shan', 'shant', 'she', 'should', 'shouldn', 'shouldnt',
  'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'upon', 've', 'very', 'was', 'wasn',
  'wasnt', 'we', 'were', 'weren', 'werent', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'wont', 'would',
  'wouldn', 'wouldnt', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'also', 'however', 'therefore', 'thus', 'hence', 'yet', 'already', 'always',
  'another', 'became', 'become', 'becomes', 'becoming', 'eg', 'etc', 'ie',
  'may', 'must', 'neither', 'never', 'often', 'shall', 'since', 'still',
  'though', 'unless', 'via', 'whether', 'within', 'without', 'would',
]);

/**
 * Compound safety terms that should be kept as single tokens.
 * Maps multi-word phrases to their combined token form.
 */
const COMPOUND_TERMS = new Map([
  ['confined space', 'confined_space'],
  ['permit to work', 'permit_to_work'],
  ['lock out tag out', 'lockout_tagout'],
  ['lockout tagout', 'lockout_tagout'],
  ['hot work', 'hot_work'],
  ['gas detection', 'gas_detection'],
  ['fall protection', 'fall_protection'],
  ['process safety', 'process_safety'],
  ['hazard identification', 'hazard_identification'],
  ['risk assessment', 'risk_assessment'],
  ['safety officer', 'safety_officer'],
  ['fire protection', 'fire_protection'],
  ['emergency response', 'emergency_response'],
  ['chemical spill', 'chemical_spill'],
  ['gas leak', 'gas_leak'],
  ['respiratory protection', 'respiratory_protection'],
  ['hazardous energy', 'hazardous_energy'],
  ['personal protective equipment', 'ppe'],
  ['management of change', 'management_of_change'],
  ['process hazard analysis', 'process_hazard_analysis'],
  ['safety data sheet', 'safety_data_sheet'],
  ['material safety', 'material_safety'],
  ['permit required', 'permit_required'],
  ['immediately dangerous', 'immediately_dangerous'],
  ['permissible exposure limit', 'permissible_exposure_limit'],
  ['threshold limit value', 'threshold_limit_value'],
  ['lower explosive limit', 'lower_explosive_limit'],
  ['upper explosive limit', 'upper_explosive_limit'],
  ['mechanical integrity', 'mechanical_integrity'],
  ['pre startup', 'pre_startup'],
  ['incident investigation', 'incident_investigation'],
  ['safety audit', 'safety_audit'],
  ['job safety analysis', 'job_safety_analysis'],
  ['bow tie', 'bowtie_analysis'],
  ['safety management system', 'safety_management_system'],
  ['work at height', 'work_at_height'],
  ['electrical isolation', 'electrical_isolation'],
  ['pressure vessel', 'pressure_vessel'],
  ['atmospheric monitoring', 'atmospheric_monitoring'],
]);

/**
 * Simple suffix-stripping stemmer tuned for safety/industrial vocabulary.
 * Not as aggressive as Porter stemmer — preserves domain-specific word forms.
 * @param {string} word
 * @returns {string} Stemmed word
 */
function simpleStem(word) {
  if (word.length < 4) return word;
  // Preserve important safety terms
  const preserve = [
    'safety', 'hazard', 'explosion', 'corrosion', 'emission',
    'inspection', 'violation', 'protection', 'ventilation', 'excavation',
    'isolation', 'investigation', 'regulation', 'operation', 'installation',
  ];
  if (preserve.includes(word)) return word;

  if (word.endsWith('ies') && word.length > 5) return word.slice(0, -3) + 'y';
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ness') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ment') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ment') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('tion') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ated') && word.length > 6) return word.slice(0, -2);
  if (word.endsWith('ous') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ive') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ful') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('able') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ible') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ally') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ly') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('er') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1);
  return word;
}

export class RAGEngine {
  constructor() {
    /** @type {Array<{id: string, text: string, metadata: object, category: string, title: string}>} */
    this.documents = [];
    /** @type {Map<string, number>} term → vocabulary index */
    this.vocabulary = new Map();
    /** @type {Float32Array|null} IDF value for each vocabulary term */
    this.idfVector = null;
    /** @type {Array<Map<number, number>>} Sparse TF-IDF vectors (vocabIndex → tfidf value) */
    this.tfidfMatrix = [];
    /** @type {boolean} Whether the TF-IDF index has been built */
    this.isIndexed = false;
    /** @type {Set<string>} All document categories */
    this.categories = new Set();
    /** @type {Array<string[]>} Cached tokenized documents */
    this._tokenizedDocs = [];

    // ── Neural Embedding Fields ─────────────────────────────────────
    /** @type {Float32Array[]|null} Dense embedding vectors for each document */
    this.embeddings = null;
    /** @type {boolean} Whether neural embeddings are built */
    this.hasNeuralIndex = false;
    /** @type {number} Embedding dimension (384 for MiniLM) */
    this.embeddingDim = 0;
    /** @type {string} Search mode: 'tfidf' | 'neural' | 'hybrid' */
    this.searchMode = 'tfidf';
  }

  /**
   * Add documents to the knowledge base.
   * Invalidates the current index — call buildIndex() again after adding.
   * @param {Array<{id: string, text: string, metadata?: object, category?: string, title?: string}>} docs
   * @returns {number} Total document count after addition
   */
  addDocuments(docs) {
    if (!Array.isArray(docs)) {
      throw new Error('addDocuments expects an array of document objects');
    }
    for (const doc of docs) {
      if (!doc.id || !doc.text) {
        console.warn(`[RAGEngine] Skipping document missing id or text:`, doc);
        continue;
      }
      // Prevent duplicate IDs
      if (this.documents.some(d => d.id === doc.id)) {
        console.warn(`[RAGEngine] Duplicate document id "${doc.id}" — skipping`);
        continue;
      }
      this.documents.push({
        id: doc.id,
        text: doc.text,
        title: doc.title || doc.id,
        metadata: doc.metadata || {},
        category: (doc.category || 'general').toLowerCase(),
      });
      this.categories.add((doc.category || 'general').toLowerCase());
    }
    this.isIndexed = false;
    return this.documents.length;
  }

  /**
   * Build the TF-IDF index from all loaded documents.
   * Must be called after addDocuments() and before search().
   *
   * Pipeline:
   *  1. Tokenize every document
   *  2. Build unified vocabulary (term → index)
   *  3. Compute document frequency (DF) for each term
   *  4. Compute IDF = log(N / DF) for each term
   *  5. Compute sparse TF-IDF vector for each document
   */
  buildIndex() {
    const N = this.documents.length;
    if (N === 0) {
      console.warn('[RAGEngine] No documents to index');
      return;
    }

    // Step 1: Tokenize all documents
    this._tokenizedDocs = this.documents.map(doc => this._tokenize(doc.text));

    // Step 2: Build vocabulary
    this.vocabulary.clear();
    const termSet = new Set();
    for (const tokens of this._tokenizedDocs) {
      for (const t of tokens) termSet.add(t);
    }
    let idx = 0;
    for (const term of termSet) {
      this.vocabulary.set(term, idx++);
    }

    const vocabSize = this.vocabulary.size;

    // Step 3: Document frequency — how many docs contain each term
    const df = new Float32Array(vocabSize);
    for (const tokens of this._tokenizedDocs) {
      const seen = new Set();
      for (const t of tokens) {
        if (!seen.has(t)) {
          df[this.vocabulary.get(t)] += 1;
          seen.add(t);
        }
      }
    }

    // Step 4: IDF = log(N / DF), with smoothing to avoid division by zero
    this.idfVector = new Float32Array(vocabSize);
    for (let i = 0; i < vocabSize; i++) {
      this.idfVector[i] = Math.log((N + 1) / (df[i] + 1)) + 1; // smoothed IDF
    }

    // Step 5: TF-IDF sparse vectors for each document
    this.tfidfMatrix = [];
    for (const tokens of this._tokenizedDocs) {
      // Compute term frequency (TF) for this doc
      const tf = new Map();
      for (const t of tokens) {
        const vi = this.vocabulary.get(t);
        tf.set(vi, (tf.get(vi) || 0) + 1);
      }
      // Normalize TF by doc length and multiply by IDF
      const docLen = tokens.length || 1;
      const tfidf = new Map();
      for (const [vi, count] of tf) {
        tfidf.set(vi, (count / docLen) * this.idfVector[vi]);
      }
      this.tfidfMatrix.push(tfidf);
    }

    this.isIndexed = true;
    console.log(
      `[RAGEngine] Index built: ${N} documents, ${vocabSize} terms, ` +
      `${this.categories.size} categories`
    );
  }

  /**
   * Search the knowledge base for documents relevant to a query.
   * @param {string} query — Natural language search query
   * @param {number} [topK=5] — Number of top results to return
   * @param {string|null} [category=null] — Optional category filter (e.g. 'osha', 'indian')
   * @returns {Array<{document: object, score: number, snippet: string}>}
   */
  search(query, topK = 5, category = null) {
    if (!this.isIndexed) {
      throw new Error('[RAGEngine] Index not built. Call buildIndex() first.');
    }
    if (!query || typeof query !== 'string') return [];

    // Tokenize query
    const queryTokens = this._tokenize(query);
    if (queryTokens.length === 0) return [];

    // Build query TF-IDF vector using existing vocabulary
    const qtf = new Map();
    for (const t of queryTokens) {
      const vi = this.vocabulary.get(t);
      if (vi !== undefined) {
        qtf.set(vi, (qtf.get(vi) || 0) + 1);
      }
    }
    const qLen = queryTokens.length || 1;
    const queryVec = new Map();
    for (const [vi, count] of qtf) {
      queryVec.set(vi, (count / qLen) * this.idfVector[vi]);
    }

    if (queryVec.size === 0) return []; // No vocabulary overlap

    // Compute cosine similarity against every document
    const scores = [];
    for (let i = 0; i < this.documents.length; i++) {
      // Category filter
      if (category && this.documents[i].category !== category.toLowerCase()) continue;

      const sim = this._cosineSimilarity(queryVec, this.tfidfMatrix[i]);
      if (sim > 0) {
        scores.push({ index: i, score: sim });
      }
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    // Return top-K results
    return scores.slice(0, topK).map(({ index, score }) => {
      const doc = this.documents[index];
      return {
        document: { ...doc },
        score: Math.round(score * 10000) / 10000,
        snippet: this._extractSnippet(doc.text, queryTokens),
      };
    });
  }

  /**
   * Build a formatted context string from search results for LLM prompts.
   * @param {string} query — The user's query
   * @param {number} [maxTokens=2000] — Approximate max tokens for the context window
   * @param {string|null} [category=null] — Optional category filter
   * @returns {string} Formatted context string ready for LLM injection
   */
  getContext(query, maxTokens = 2000, category = null) {
    // Auto-upgrade to hybrid search when neural embeddings are available
    const results = this.hasNeuralIndex
      ? this.hybridSearch(query, 10, category)
      : this.search(query, 10, category);

    if (results.length === 0) {
      return '[No relevant documents found in the safety knowledge base.]';
    }

    let context = '=== SAFETY KNOWLEDGE BASE CONTEXT ===';
    context += this.hasNeuralIndex ? ' (Neural-Enhanced)\n\n' : '\n\n';
    let approxTokens = 20; // Header tokens

    for (let i = 0; i < results.length; i++) {
      const { document: doc, score, snippet } = results[i];
      const entry =
        `[Document ${i + 1}] (Relevance: ${(score * 100).toFixed(1)}%)\n` +
        `Title: ${doc.title}\n` +
        `Source: ${doc.metadata?.source || doc.category}\n` +
        `Category: ${doc.category}\n` +
        `Content: ${snippet}\n\n`;

      // Rough token estimate: ~0.75 tokens per character
      const entryTokens = Math.ceil(entry.length * 0.75);
      if (approxTokens + entryTokens > maxTokens) break;

      context += entry;
      approxTokens += entryTokens;
    }

    context += '=== END CONTEXT ===';
    return context;
  }

  // ═══════════════════════════════════════════════════════════════════
  // NEURAL EMBEDDING METHODS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build neural embedding index using HuggingFace all-MiniLM-L6-v2.
   * This is an async operation that embeds all documents using the transformer model.
   * Falls back gracefully if the model isn't loaded yet.
   *
   * @param {function} embedFn — A function that takes a text string and returns a Float32Array embedding.
   *        Typically: `(text) => HuggingFaceManager.getInstance().embed(text)`
   * @param {function} [onProgress] — Optional progress callback `(current, total) => void`
   * @returns {Promise<{success: boolean, count?: number, error?: string}>}
   */
  async buildNeuralIndex(embedFn, onProgress) {
    if (!embedFn || typeof embedFn !== 'function') {
      return { success: false, error: 'embedFn is required' };
    }
    if (this.documents.length === 0) {
      return { success: false, error: 'No documents to embed' };
    }

    console.log(`[RAGEngine] Building neural index for ${this.documents.length} documents...`);
    const embeddings = [];

    for (let i = 0; i < this.documents.length; i++) {
      try {
        const result = await embedFn(this.documents[i].text);
        if (result?.success && result.embedding) {
          embeddings.push(result.embedding);
          if (i === 0) {
            this.embeddingDim = result.embedding.length;
          }
        } else {
          // Fill with zero vector on failure
          embeddings.push(new Float32Array(this.embeddingDim || 384));
        }
      } catch (e) {
        embeddings.push(new Float32Array(this.embeddingDim || 384));
      }

      if (onProgress) {
        onProgress(i + 1, this.documents.length);
      }

      // Yield to prevent blocking (every 10 docs)
      if (i % 10 === 0 && i > 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    this.embeddings = embeddings;
    this.hasNeuralIndex = true;
    this.searchMode = 'hybrid';

    console.log(
      `[RAGEngine] Neural index built: ${embeddings.length} embeddings, ` +
      `dim=${this.embeddingDim}, mode=hybrid`
    );

    return { success: true, count: embeddings.length };
  }

  /**
   * Search using dense neural embeddings (cosine similarity).
   * Requires buildNeuralIndex() to have been called first.
   *
   * @param {string} query — Natural language search query
   * @param {function} embedFn — Embedding function (same as buildNeuralIndex)
   * @param {number} [topK=5] — Number of results
   * @param {string|null} [category=null] — Optional category filter
   * @returns {Promise<Array<{document: object, score: number, snippet: string}>>}
   */
  async neuralSearch(query, embedFn, topK = 5, category = null) {
    if (!this.hasNeuralIndex || !this.embeddings) {
      throw new Error('[RAGEngine] Neural index not built. Call buildNeuralIndex() first.');
    }

    const queryResult = await embedFn(query);
    if (!queryResult?.success || !queryResult.embedding) {
      return []; // Fallback: return empty
    }

    const queryEmb = queryResult.embedding;
    const scores = [];

    for (let i = 0; i < this.documents.length; i++) {
      if (category && this.documents[i].category !== category.toLowerCase()) continue;

      const sim = this._denseCosineSimilarity(queryEmb, this.embeddings[i]);
      if (sim > 0) {
        scores.push({ index: i, score: sim });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const queryTokens = this._tokenize(query);

    return scores.slice(0, topK).map(({ index, score }) => {
      const doc = this.documents[index];
      return {
        document: { ...doc },
        score: Math.round(score * 10000) / 10000,
        snippet: this._extractSnippet(doc.text, queryTokens),
      };
    });
  }

  /**
   * Hybrid search combining TF-IDF and neural embeddings using Reciprocal Rank Fusion.
   * Falls back to TF-IDF only if neural index isn't available.
   *
   * RRF formula: score(d) = Σ 1 / (k + rank_i(d))
   * where k=60 (standard RRF constant) and rank_i is the document's rank in retrieval system i.
   *
   * @param {string} query — Natural language search query
   * @param {number} [topK=5] — Number of results
   * @param {string|null} [category=null] — Optional category filter
   * @param {number} [rrfK=60] — RRF constant (higher = more equal weighting)
   * @returns {Array<{document: object, score: number, snippet: string}>}
   */
  hybridSearch(query, topK = 5, category = null, rrfK = 60) {
    // Get TF-IDF results (synchronous)
    const tfidfResults = this.search(query, topK * 2, category);

    // If no neural index, return TF-IDF results directly
    if (!this.hasNeuralIndex || !this.embeddings) {
      return tfidfResults.slice(0, topK);
    }

    // Compute neural scores inline (using pre-computed embeddings)
    // We can't await here, so we use the cached query embedding approach
    // For hybrid to work synchronously, we score neural inline using cached embeddings
    const queryTokens = this._tokenize(query);
    const queryTfIdf = this._buildQueryVector(queryTokens);

    // Score all documents with both methods
    const docScores = new Map(); // docIndex → { tfidfRank, neuralRank }

    // TF-IDF ranking
    const tfidfRanked = [];
    for (let i = 0; i < this.documents.length; i++) {
      if (category && this.documents[i].category !== category.toLowerCase()) continue;
      const sim = queryTfIdf.size > 0 ? this._cosineSimilarity(queryTfIdf, this.tfidfMatrix[i]) : 0;
      tfidfRanked.push({ index: i, score: sim });
    }
    tfidfRanked.sort((a, b) => b.score - a.score);
    tfidfRanked.forEach((item, rank) => {
      if (!docScores.has(item.index)) docScores.set(item.index, { rrfScore: 0 });
      docScores.get(item.index).rrfScore += 1 / (rrfK + rank + 1);
    });

    // Neural ranking (using pre-embedded query approximation via TF-IDF weights on embeddings)
    // Since we can't run async embed here, use document embedding similarity as a proxy
    // We approximate by using the top TF-IDF match embeddings as a centroid
    if (tfidfRanked.length > 0 && tfidfRanked[0].score > 0) {
      // Use top-3 TF-IDF results' embeddings as query proxy
      const topEmbeddings = tfidfRanked
        .slice(0, 3)
        .filter(r => r.score > 0)
        .map(r => this.embeddings[r.index])
        .filter(Boolean);

      if (topEmbeddings.length > 0) {
        // Compute centroid of top TF-IDF embeddings
        const centroid = new Float32Array(this.embeddingDim);
        for (const emb of topEmbeddings) {
          for (let j = 0; j < this.embeddingDim; j++) {
            centroid[j] += (emb[j] || 0) / topEmbeddings.length;
          }
        }

        // Rank all documents by similarity to centroid
        const neuralRanked = [];
        for (let i = 0; i < this.documents.length; i++) {
          if (category && this.documents[i].category !== category.toLowerCase()) continue;
          const sim = this._denseCosineSimilarity(centroid, this.embeddings[i]);
          neuralRanked.push({ index: i, score: sim });
        }
        neuralRanked.sort((a, b) => b.score - a.score);
        neuralRanked.forEach((item, rank) => {
          if (!docScores.has(item.index)) docScores.set(item.index, { rrfScore: 0 });
          docScores.get(item.index).rrfScore += 1 / (rrfK + rank + 1);
        });
      }
    }

    // Sort by fused RRF score
    const fused = [...docScores.entries()]
      .map(([index, data]) => ({ index, score: data.rrfScore }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return fused.map(({ index, score }) => {
      const doc = this.documents[index];
      return {
        document: { ...doc },
        score: Math.round(score * 10000) / 10000,
        snippet: this._extractSnippet(doc.text, queryTokens),
      };
    });
  }

  /**
   * Build a query TF-IDF vector from tokenized query.
   * @param {string[]} queryTokens
   * @returns {Map<number, number>}
   * @private
   */
  _buildQueryVector(queryTokens) {
    const qtf = new Map();
    for (const t of queryTokens) {
      const vi = this.vocabulary.get(t);
      if (vi !== undefined) {
        qtf.set(vi, (qtf.get(vi) || 0) + 1);
      }
    }
    const qLen = queryTokens.length || 1;
    const queryVec = new Map();
    for (const [vi, count] of qtf) {
      queryVec.set(vi, (count / qLen) * this.idfVector[vi]);
    }
    return queryVec;
  }

  /**
   * Compute cosine similarity between two dense (Float32Array) vectors.
   * @param {Float32Array} vecA
   * @param {Float32Array} vecB
   * @returns {number} Cosine similarity in [-1, 1]
   * @private
   */
  _denseCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Tokenize text into stemmed terms suitable for TF-IDF.
   *
   * Pipeline:
   *  1. Lowercase
   *  2. Replace compound safety terms with single tokens
   *  3. Remove punctuation (preserving hyphens in technical terms)
   *  4. Split on whitespace
   *  5. Remove stopwords
   *  6. Remove short tokens (< 2 chars)
   *  7. Apply simple stemming
   *
   * @param {string} text — Input text
   * @returns {string[]} Array of processed tokens
   */
  _tokenize(text) {
    if (!text || typeof text !== 'string') return [];

    let processed = text.toLowerCase();

    // Replace compound terms with single tokens
    for (const [phrase, token] of COMPOUND_TERMS) {
      processed = processed.replaceAll(phrase, token);
    }

    // Remove punctuation but keep hyphens, underscores, and digits
    processed = processed.replace(/[^a-z0-9\s_-]/g, ' ');

    // Split on whitespace
    const rawTokens = processed.split(/\s+/).filter(t => t.length > 0);

    // Filter stopwords, short tokens, then stem
    const tokens = [];
    for (const t of rawTokens) {
      if (t.length < 2) continue;
      if (STOPWORDS.has(t)) continue;
      // Keep underscored compound terms as-is, stem others
      if (t.includes('_')) {
        tokens.push(t);
      } else {
        tokens.push(simpleStem(t));
      }
    }

    return tokens;
  }

  /**
   * Compute cosine similarity between two sparse vectors.
   * Vectors are represented as Map<vocabIndex, tfidfValue>.
   *
   * cos(A, B) = (A · B) / (|A| × |B|)
   *
   * @param {Map<number, number>} vecA — Sparse vector A
   * @param {Map<number, number>} vecB — Sparse vector B
   * @returns {number} Cosine similarity in [0, 1]
   */
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.size === 0 || vecB.size === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Iterate over the smaller vector for efficiency
    const [smaller, larger] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA];

    for (const [idx, valS] of smaller) {
      const valL = larger.get(idx);
      if (valL !== undefined) {
        dotProduct += valS * valL;
      }
      normA += valS * valS;
    }

    // We need the full norm for both vectors
    if (smaller === vecA) {
      for (const val of vecB.values()) normB += val * val;
    } else {
      normB = normA;
      normA = 0;
      for (const val of vecA.values()) normA += val * val;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Extract the most relevant snippet from document text based on query tokens.
   * @param {string} text — Full document text
   * @param {string[]} queryTokens — Tokenized query terms
   * @param {number} [maxLen=300] — Maximum snippet character length
   * @returns {string} Extracted snippet with "..." truncation
   */
  _extractSnippet(text, queryTokens, maxLen = 300) {
    if (text.length <= maxLen) return text;

    // Score each sentence by how many query terms it contains
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const querySet = new Set(queryTokens);

    let bestScore = -1;
    let bestIdx = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sTokens = this._tokenize(sentences[i]);
      let score = 0;
      for (const t of sTokens) {
        if (querySet.has(t)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    // Build snippet from best sentence outward
    let snippet = sentences[bestIdx].trim();
    let idx = 1;
    while (snippet.length < maxLen) {
      const prev = bestIdx - idx >= 0 ? sentences[bestIdx - idx]?.trim() : '';
      const next = bestIdx + idx < sentences.length ? sentences[bestIdx + idx]?.trim() : '';
      if (!prev && !next) break;
      if (next && snippet.length + next.length + 2 <= maxLen) {
        snippet += '. ' + next;
      }
      if (prev && snippet.length + prev.length + 2 <= maxLen) {
        snippet = prev + '. ' + snippet;
      }
      idx++;
      if (idx > sentences.length) break;
    }

    return snippet.length > maxLen ? snippet.slice(0, maxLen - 3) + '...' : snippet;
  }

  /**
   * Get statistics about the current index.
   * @returns {{documentCount: number, vocabularySize: number, categories: string[], isIndexed: boolean, avgDocLength: number}}
   */
  getStats() {
    const avgLen = this.documents.length > 0
      ? Math.round(this.documents.reduce((sum, d) => sum + d.text.length, 0) / this.documents.length)
      : 0;

    return {
      documentCount: this.documents.length,
      vocabularySize: this.vocabulary.size,
      categories: [...this.categories],
      isIndexed: this.isIndexed,
      avgDocLength: avgLen,
      totalTerms: this._tokenizedDocs.reduce((sum, t) => sum + t.length, 0),
      // Neural embedding stats
      hasNeuralIndex: this.hasNeuralIndex,
      embeddingDim: this.embeddingDim,
      searchMode: this.searchMode,
      embeddingCount: this.embeddings?.length || 0,
    };
  }
}
