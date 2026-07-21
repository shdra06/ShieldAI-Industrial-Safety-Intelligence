/**
 * @module SafetyClassifier
 * @description Zero-shot incident classifier for industrial safety using HuggingFace Transformers.js.
 */

import { HuggingFaceManager } from './HuggingFaceManager.js';

const SAFETY_CATEGORIES = [
  'gas leak or toxic exposure',
  'fire or explosion hazard',
  'equipment malfunction or failure',
  'worker injury or health emergency',
  'electrical hazard',
  'structural collapse risk',
  'environmental contamination',
  'permit violation or compliance issue',
  'PPE violation or missing protection',
  'confined space hazard',
  'fall or height hazard',
  'normal operations',
];

const SEVERITY_LABELS = [
  'critical emergency requiring immediate action',
  'serious hazard requiring urgent attention',
  'moderate risk requiring monitoring',
  'low risk advisory',
  'routine normal condition',
];

/**
 * Class representing the SafetyClassifier.
 */
export class SafetyClassifier {
  /**
   * Create a SafetyClassifier.
   */
  constructor() {
    this.ready = false;
    this.classificationHistory = [];
    this.lastClassification = null;
    this.maxHistoryLength = 200;
  }

  /**
   * Initializes the zeroShot model via HuggingFaceManager.
   * @returns {Promise<boolean>} True if successfully initialized.
   */
  async init() {
    try {
      console.log('[SafetyClassifier] Initializing zero-shot model...');
      await HuggingFaceManager.getInstance().loadZeroShotModel();
      this.ready = true;
      console.log('[SafetyClassifier] Initialization complete.');
      return true;
    } catch (error) {
      console.error('[SafetyClassifier] Error during initialization:', error);
      this.ready = false;
      return false;
    }
  }

  /**
   * Classifies text against safety categories and potentially severity labels.
   * @param {string} text - The text to classify.
   * @returns {Promise<Object>} Classification result.
   */
  async classifyIncident(text) {
    if (!text || typeof text !== 'string') {
      console.warn('[SafetyClassifier] Invalid text provided for classification.');
      return { success: false, error: 'Invalid text' };
    }
    
    if (!this.ready) {
      console.warn('[SafetyClassifier] Classifier is not ready. Call init() first.');
      return { success: false, error: 'Not initialized' };
    }

    try {
      console.log(`[SafetyClassifier] Classifying incident: "${text.substring(0, 50)}..."`);
      
      const categoryResult = await HuggingFaceManager.getInstance().zeroShotClassify(text, SAFETY_CATEGORIES);
      
      if (!categoryResult || !categoryResult.success) {
        return { success: false, error: 'Category classification failed' };
      }

      const topCategory = categoryResult.labels[0];
      const topConfidence = categoryResult.scores[0];
      const allScores = categoryResult.labels.map((label, index) => ({
        label,
        score: categoryResult.scores[index]
      }));

      let severity = 'unknown';

      if (topCategory !== 'normal operations' && topConfidence > 0.3) {
        const severityResult = await HuggingFaceManager.getInstance().zeroShotClassify(text, SEVERITY_LABELS);
        if (severityResult && severityResult.success) {
          severity = severityResult.labels[0];
        }
      } else if (topCategory === 'normal operations') {
        severity = 'routine normal condition';
      }

      const result = {
        success: true,
        category: topCategory,
        confidence: topConfidence,
        allScores: allScores,
        severity: severity,
        timestamp: Date.now()
      };

      this.lastClassification = result;
      this.classificationHistory.push(result);

      if (this.classificationHistory.length > this.maxHistoryLength) {
        this.classificationHistory.shift();
      }

      return result;
    } catch (error) {
      console.error('[SafetyClassifier] Error classifying incident:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Classifies a batch of texts.
   * @param {string[]} texts - Array of texts to classify.
   * @returns {Promise<Array>} Array of classification results.
   */
  async classifyBatch(texts) {
    if (!Array.isArray(texts)) {
      console.warn('[SafetyClassifier] classifyBatch requires an array of texts.');
      return [];
    }

    const results = [];
    for (const text of texts) {
      const result = await this.classifyIncident(text);
      results.push(result);
    }
    return results;
  }

  /**
   * Classifies agent messages, filtering by severity and providing a summary.
   * @param {Array} messages - Array of agent messages: [{text, severity, agent}]
   * @returns {Promise<Object>} Object containing individual classifications and a summary.
   */
  async classifyAgentMessages(messages) {
    if (!Array.isArray(messages)) {
      console.warn('[SafetyClassifier] classifyAgentMessages requires an array of messages.');
      return { classifications: [], summary: {} };
    }

    try {
      const targetSeverities = ['warning', 'critical', 'emergency'];
      const filteredMessages = messages.filter(msg => 
        msg && msg.text && msg.severity && targetSeverities.includes(msg.severity.toLowerCase())
      );

      const classifications = [];
      const categoryDistribution = {};
      const severityDistribution = {};

      for (const msg of filteredMessages) {
        const result = await this.classifyIncident(msg.text);
        if (result && result.success) {
          classifications.push({
            message: msg,
            classification: result
          });

          categoryDistribution[result.category] = (categoryDistribution[result.category] || 0) + 1;
          severityDistribution[result.severity] = (severityDistribution[result.severity] || 0) + 1;
        }
      }

      let dominantCategory = null;
      let maxCatCount = 0;
      for (const [cat, count] of Object.entries(categoryDistribution)) {
        if (count > maxCatCount) {
          maxCatCount = count;
          dominantCategory = cat;
        }
      }

      let dominantSeverity = null;
      let maxSevCount = 0;
      for (const [sev, count] of Object.entries(severityDistribution)) {
        if (count > maxSevCount) {
          maxSevCount = count;
          dominantSeverity = sev;
        }
      }

      return {
        classifications,
        summary: {
          categoryDistribution,
          dominantCategory,
          dominantSeverity,
          totalClassified: classifications.length
        }
      };
    } catch (error) {
      console.error('[SafetyClassifier] Error classifying agent messages:', error);
      return { classifications: [], summary: {} };
    }
  }

  /**
   * Gets the top N most frequent categories from history.
   * @param {number} n - Number of top categories to return.
   * @returns {Array} Array of top categories with their counts.
   */
  getTopCategories(n = 5) {
    try {
      const counts = {};
      for (const item of this.classificationHistory) {
        if (item && item.category) {
          counts[item.category] = (counts[item.category] || 0) + 1;
        }
      }

      const sortedCategories = Object.keys(counts)
        .map(category => ({ category, count: counts[category] }))
        .sort((a, b) => b.count - a.count);

      return sortedCategories.slice(0, n);
    } catch (error) {
      console.error('[SafetyClassifier] Error getting top categories:', error);
      return [];
    }
  }

  /**
   * Returns the current status of the classifier.
   * @returns {Object} Status object.
   */
  getStatus() {
    return {
      ready: this.ready,
      totalClassified: this.classificationHistory.length,
      lastClassification: this.lastClassification,
      topCategories: this.getTopCategories(5)
    };
  }
}
