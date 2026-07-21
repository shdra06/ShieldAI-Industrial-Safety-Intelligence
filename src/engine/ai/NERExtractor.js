/**
 * @file NERExtractor.js
 * @description Named Entity Recognition for industrial safety reports using the HuggingFace Manager.
 */

import { HuggingFaceManager } from './HuggingFaceManager.js';

/**
 * Named Entity Recognition (NER) extractor for safety reports and messages.
 */
export class NERExtractor {
    /**
     * Initializes a new instance of the NERExtractor.
     */
    constructor() {
        /**
         * Indicates if the NER model is loaded and ready.
         * @type {boolean}
         */
        this.ready = false;

        /**
         * The most recent extraction result.
         * @type {Object|null}
         */
        this.lastResult = null;

        /**
         * Rolling buffer of recent entity extractions (max 100 entries).
         * @type {Array<Object>}
         */
        this.entityHistory = [];
        
        /**
         * Maximum number of entries to keep in history.
         * @type {number}
         */
        this.maxHistorySize = 100;
    }

    /**
     * Initializes the extractor by loading the required Hugging Face model.
     * @returns {Promise<void>}
     */
    async init() {
        try {
            console.log('[NERExtractor] Initializing NER model...');
            // Assuming HuggingFaceManager uses a Singleton pattern as requested
            const hfManager = HuggingFaceManager.getInstance();
            await hfManager.loadModel('ner');
            this.ready = true;
            console.log('[NERExtractor] NER model successfully loaded and ready.');
        } catch (error) {
            console.error('[NERExtractor] Failed to initialize NER model:', error);
            this.ready = false;
            throw new Error(`NERExtractor initialization failed: ${error.message}`);
        }
    }

    /**
     * Extracts and categorizes named entities from a safety report text.
     * @param {string} text - The safety report text to process.
     * @returns {Promise<Object>} The extraction results containing raw and categorized entities.
     */
    async extractFromReport(text) {
        if (!this.ready) {
            throw new Error('NERExtractor is not ready. Call init() first.');
        }
        
        if (typeof text !== 'string' || !text.trim()) {
            return {
                success: false,
                raw: [],
                categorized: { persons: [], organizations: [], locations: [], hazards: [] },
                summary: 'No valid text provided for extraction',
                error: 'Invalid input'
            };
        }

        try {
            console.log(`[NERExtractor] Extracting entities from report (length: ${text.length})...`);
            const hfManager = HuggingFaceManager.getInstance();
            const entities = await hfManager.extractEntities(text);

            const categorized = {
                persons: [],
                organizations: [],
                locations: [],
                hazards: []
            };

            // Post-process entities
            const safeEntities = Array.isArray(entities) ? entities : [];
            
            for (const entity of safeEntities) {
                // Ensure entity structure is what we expect
                if (!entity || !entity.type || !entity.text) continue;
                
                const type = String(entity.type).toUpperCase();
                const textVal = String(entity.text).trim();
                
                if (type.includes('PERSON')) {
                    categorized.persons.push(textVal);
                } else if (type.includes('ORG') || type.includes('ORGANIZATION')) {
                    categorized.organizations.push(textVal);
                } else if (type.includes('LOC') || type.includes('LOCATION')) {
                    categorized.locations.push(textVal);
                } else if (type.includes('MISC')) {
                    categorized.hazards.push(textVal);
                }
            }
            
            // Remove duplicates
            categorized.persons = [...new Set(categorized.persons)];
            categorized.organizations = [...new Set(categorized.organizations)];
            categorized.locations = [...new Set(categorized.locations)];
            categorized.hazards = [...new Set(categorized.hazards)];

            // Summary format: "Found X persons, Y locations, Z organization, W hazard entities"
            const summary = `Found ${categorized.persons.length} persons, ${categorized.locations.length} locations, ${categorized.organizations.length} organization, ${categorized.hazards.length} hazard entities`;

            const result = {
                success: true,
                raw: safeEntities,
                categorized,
                summary
            };

            return result;
        } catch (error) {
            console.error('[NERExtractor] Error during entity extraction:', error);
            return {
                success: false,
                raw: [],
                categorized: { persons: [], organizations: [], locations: [], hazards: [] },
                summary: 'Failed to extract entities due to an error',
                error: error.message
            };
        }
    }

    /**
     * Extracts named entities from a collection of agent messages, focusing on critical/emergency severity.
     * @param {Array<{text: string, severity: string, agent: string}>} messages - The array of messages to analyze.
     * @returns {Promise<Object>} The extraction results containing raw and categorized entities.
     */
    async extractFromMessages(messages) {
        if (!Array.isArray(messages)) {
            console.warn('[NERExtractor] Invalid messages format. Expected an array.');
            throw new Error('Messages must be an array.');
        }

        // Concatenates critical/emergency message texts
        const criticalMessages = messages.filter(msg => {
            if (!msg || typeof msg.severity !== 'string') return false;
            const sev = msg.severity.toLowerCase();
            return sev === 'critical' || sev === 'emergency';
        });

        const combinedText = criticalMessages
            .map(msg => msg.text || '')
            .filter(text => typeof text === 'string' && text.trim().length > 0)
            .join('\n');

        if (!combinedText) {
            console.log('[NERExtractor] No critical or emergency messages found to process.');
            const emptyResult = {
                success: true,
                raw: [],
                categorized: { persons: [], organizations: [], locations: [], hazards: [] },
                summary: 'Found 0 persons, 0 locations, 0 organization, 0 hazard entities'
            };
            this._storeResult(emptyResult);
            return emptyResult;
        }

        const result = await this.extractFromReport(combinedText);
        this._storeResult(result);
        return result;
    }

    /**
     * Stores the result in the history buffer and updates the last result.
     * @param {Object} result - The extraction result to store.
     * @private
     */
    _storeResult(result) {
        this.lastResult = result;
        this.entityHistory.push({
            timestamp: Date.now(),
            data: result
        });
        
        if (this.entityHistory.length > this.maxHistorySize) {
            this.entityHistory.shift(); // Remove the oldest entry
        }
    }

    /**
     * Gets the current status of the NERExtractor.
     * @returns {{ ready: boolean, lastResult: Object|null, historyLength: number }} The status object.
     */
    getStatus() {
        return {
            ready: this.ready,
            lastResult: this.lastResult,
            historyLength: this.entityHistory.length
        };
    }
}
