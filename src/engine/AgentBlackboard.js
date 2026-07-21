// ============================================================================
// ShieldAI — Agent Blackboard
// Shared knowledge base where agents read and write findings for other agents
// to consume. Implements namespaced key-value storage with temporal decay,
// conflict resolution, and snapshot capabilities.
// ============================================================================

/**
 * @typedef {Object} BlackboardEntry
 * @property {string} key        - Full key (namespace:name)
 * @property {string} namespace  - Owning agent's namespace
 * @property {*}      value      - Stored value
 * @property {number} timestamp  - When the entry was written
 * @property {number} ttl        - Time-to-live in milliseconds (0 = no expiry)
 * @property {number} priority   - Priority for conflict resolution (higher wins)
 * @property {string} writer     - Name of the agent that wrote this entry
 */

export class AgentBlackboard {
  constructor() {
    /** @type {Map<string, BlackboardEntry>} All entries keyed by full key */
    this.entries = new Map();

    /** @type {object[]} Snapshot history for audit */
    this.snapshots = [];

    /** @type {number} Max snapshots to retain */
    this.maxSnapshots = 20;
  }

  // ── Write API ─────────────────────────────────────────────────────────────

  /**
   * Write a value to the blackboard.
   * @param {string} namespace - Agent namespace (e.g., 'scada', 'vision')
   * @param {string} name      - Entry name (e.g., 'criticalSensors', 'fatigueWorkers')
   * @param {*}      value     - Value to store
   * @param {object} [options]
   * @param {number} [options.ttl=30000]    - Time-to-live in ms (default 30s)
   * @param {number} [options.priority=1]   - Priority for conflict resolution
   */
  write(namespace, name, value, options = {}) {
    const key = `${namespace}:${name}`;
    const ttl = options.ttl ?? 30000;
    const priority = options.priority ?? 1;
    const now = Date.now();

    // Conflict resolution: only overwrite if new priority >= existing
    const existing = this.entries.get(key);
    if (existing && existing.namespace !== namespace && existing.priority > priority) {
      return; // Lower priority write rejected
    }

    this.entries.set(key, {
      key,
      namespace,
      value,
      timestamp: now,
      ttl,
      priority,
      writer: namespace,
    });
  }

  // ── Read API ──────────────────────────────────────────────────────────────

  /**
   * Read a value from the blackboard.
   * @param {string} namespace - Agent namespace
   * @param {string} name      - Entry name
   * @returns {*|undefined} The stored value, or undefined if not found/expired
   */
  read(namespace, name) {
    const key = `${namespace}:${name}`;
    const entry = this.entries.get(key);

    if (!entry) return undefined;

    // Check TTL
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Read all entries from a specific namespace.
   * @param {string} namespace
   * @returns {Object<string, *>} Key-value pairs (without namespace prefix)
   */
  readNamespace(namespace) {
    const result = {};
    const prefix = `${namespace}:`;
    const now = Date.now();

    for (const [key, entry] of this.entries) {
      if (key.startsWith(prefix)) {
        // Check TTL
        if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
          this.entries.delete(key);
          continue;
        }
        const name = key.slice(prefix.length);
        result[name] = entry.value;
      }
    }

    return result;
  }

  /**
   * Check if a key exists and is not expired.
   * @param {string} namespace
   * @param {string} name
   * @returns {boolean}
   */
  has(namespace, name) {
    return this.read(namespace, name) !== undefined;
  }

  /**
   * Read entries across all namespaces matching a name pattern.
   * Useful for coordinator agents aggregating data from multiple specialists.
   * @param {string} name - Entry name to search across all namespaces
   * @returns {Array<{namespace: string, value: *}>}
   */
  readAcrossNamespaces(name) {
    const results = [];
    const now = Date.now();
    const suffix = `:${name}`;

    for (const [key, entry] of this.entries) {
      if (key.endsWith(suffix)) {
        if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
          this.entries.delete(key);
          continue;
        }
        results.push({
          namespace: entry.namespace,
          value: entry.value,
        });
      }
    }

    return results;
  }

  // ── Maintenance ───────────────────────────────────────────────────────────

  /**
   * Remove expired entries. Called periodically by the Orchestrator.
   * @returns {number} Number of entries purged
   */
  purgeExpired() {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of this.entries) {
      if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
        this.entries.delete(key);
        purged++;
      }
    }

    return purged;
  }

  /**
   * Take a snapshot of the current blackboard state for audit purposes.
   * @returns {object} The snapshot
   */
  takeSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      entryCount: this.entries.size,
      entries: {},
    };

    for (const [key, entry] of this.entries) {
      snapshot.entries[key] = {
        value: entry.value,
        writer: entry.writer,
        age: Date.now() - entry.timestamp,
      };
    }

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  /**
   * Get diagnostic information about the blackboard.
   * @returns {object}
   */
  getStats() {
    const namespaces = new Set();
    for (const entry of this.entries.values()) {
      namespaces.add(entry.namespace);
    }

    return {
      totalEntries: this.entries.size,
      namespaces: [...namespaces],
      namespaceCount: namespaces.size,
      snapshotCount: this.snapshots.length,
    };
  }

  /**
   * Reset the blackboard (used on scenario change).
   */
  reset() {
    this.entries.clear();
    this.snapshots = [];
  }
}
