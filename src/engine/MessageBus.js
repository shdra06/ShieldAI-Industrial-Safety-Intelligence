// ============================================================================
// ShieldAI — MessageBus
// Publish-subscribe inter-agent communication infrastructure.
// Agents publish to named topics and subscribe to topics they care about.
// Supports priority channels, message history, and buffered delivery.
// ============================================================================

/**
 * @typedef {Object} BusMessage
 * @property {string} topic      - Topic name (e.g., 'sensor.critical', 'permit.violation')
 * @property {string} sender     - Name of the sending agent
 * @property {*}      payload    - Message data
 * @property {number} priority   - 0 = emergency (highest), 1 = high, 2 = normal, 3 = low
 * @property {number} timestamp  - Unix timestamp of message creation
 * @property {string} id         - Unique message ID
 */

let _messageIdCounter = 0;

export class MessageBus {
  constructor() {
    /** @type {Map<string, Set<function>>} Topic → Set of subscriber callbacks */
    this.subscriptions = new Map();

    /** @type {BusMessage[]} Buffered messages waiting for next delivery cycle */
    this.buffer = [];

    /** @type {BusMessage[]} Rolling history of delivered messages */
    this.history = [];

    /** @type {number} Maximum history entries to retain */
    this.maxHistory = 200;

    /** @type {Map<string, number>} Per-topic message counts for diagnostics */
    this.topicStats = new Map();
  }

  // ── Core API ──────────────────────────────────────────────────────────────

  /**
   * Subscribe to a topic. Returns an unsubscribe function.
   * @param {string} topic - Topic name or '*' for all topics
   * @param {function(BusMessage): void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribe(topic, callback) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic).add(callback);

    return () => {
      const subs = this.subscriptions.get(topic);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this.subscriptions.delete(topic);
      }
    };
  }

  /**
   * Publish a message to a topic. Messages are buffered for batch delivery.
   * Emergency messages (priority 0) are delivered immediately.
   *
   * @param {string} topic    - Topic name
   * @param {string} sender   - Sending agent name
   * @param {*}      payload  - Message data
   * @param {number} [priority=2] - 0=emergency, 1=high, 2=normal, 3=low
   */
  publish(topic, sender, payload, priority = 2) {
    const message = {
      topic,
      sender,
      payload,
      priority,
      timestamp: Date.now(),
      id: `msg-${++_messageIdCounter}`,
    };

    // Track stats
    this.topicStats.set(topic, (this.topicStats.get(topic) || 0) + 1);

    // Emergency messages bypass buffer
    if (priority === 0) {
      this._deliver(message);
      return;
    }

    this.buffer.push(message);
  }

  /**
   * Flush all buffered messages to subscribers. Called once per tick by the
   * Orchestrator after all agents have run.
   * Messages are delivered in priority order (lowest number = highest priority).
   */
  flush() {
    // Sort by priority (emergency first)
    this.buffer.sort((a, b) => a.priority - b.priority);

    for (const message of this.buffer) {
      this._deliver(message);
    }

    this.buffer = [];
  }

  /**
   * Get messages from history matching criteria.
   * @param {object} [filter]
   * @param {string} [filter.topic]   - Filter by topic
   * @param {string} [filter.sender]  - Filter by sender agent
   * @param {number} [filter.since]   - Only messages after this timestamp
   * @param {number} [filter.limit]   - Max results
   * @returns {BusMessage[]}
   */
  query(filter = {}) {
    let results = [...this.history];

    if (filter.topic) {
      results = results.filter((m) => m.topic === filter.topic);
    }
    if (filter.sender) {
      results = results.filter((m) => m.sender === filter.sender);
    }
    if (filter.since) {
      results = results.filter((m) => m.timestamp >= filter.since);
    }

    if (filter.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /**
   * Get diagnostic statistics about message flow.
   * @returns {object}
   */
  getStats() {
    return {
      totalDelivered: this.history.length,
      buffered: this.buffer.length,
      subscriberCount: Array.from(this.subscriptions.values())
        .reduce((sum, set) => sum + set.size, 0),
      topicCount: this.subscriptions.size,
      topicStats: Object.fromEntries(this.topicStats),
    };
  }

  /**
   * Reset the message bus (used on scenario change).
   */
  reset() {
    this.buffer = [];
    this.history = [];
    this.topicStats.clear();
    // Keep subscriptions — agents re-subscribe on construction
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Delivers a single message to all matching subscribers.
   * @param {BusMessage} message
   */
  _deliver(message) {
    // Add to history
    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Deliver to topic-specific subscribers
    const topicSubs = this.subscriptions.get(message.topic);
    if (topicSubs) {
      for (const callback of topicSubs) {
        try {
          callback(message);
        } catch (err) {
          console.error(`[MessageBus] Subscriber error on topic "${message.topic}":`, err);
        }
      }
    }

    // Deliver to wildcard subscribers
    const wildcardSubs = this.subscriptions.get('*');
    if (wildcardSubs) {
      for (const callback of wildcardSubs) {
        try {
          callback(message);
        } catch (err) {
          console.error('[MessageBus] Wildcard subscriber error:', err);
        }
      }
    }
  }
}
