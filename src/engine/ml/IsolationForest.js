/**
 * @fileoverview Isolation Forest implementation for multi-variate anomaly detection.
 *
 * This module provides a pure-JavaScript Isolation Forest algorithm suitable for
 * detecting anomalous sensor readings across industrial zones. It operates on
 * feature vectors of 4–20 dimensions (sensor readings) and requires no external
 * libraries.
 *
 * Theory:
 *   Anomalies are "few and different" — they are isolated in fewer random
 *   partitions than normal points. The average path length across an ensemble
 *   of random trees yields an anomaly score in [0, 1].
 *
 * @module IsolationForest
 */

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Euler–Mascheroni constant γ ≈ 0.5772156649 */
const EULER_MASCHERONI = 0.5772156649;

// ─── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Harmonic number approximation H(i) = ln(i) + γ.
 * @param {number} i - Positive integer.
 * @returns {number}
 */
function harmonicNumber(i) {
  if (i <= 0) return 0;
  return Math.log(i) + EULER_MASCHERONI;
}

/**
 * Average path length of an unsuccessful search in a Binary Search Tree.
 *   c(n) = 2·H(n−1) − 2·(n−1)/n
 * @param {number} n - Number of data points.
 * @returns {number}
 */
function averagePathLength(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonicNumber(n - 1) - (2 * (n - 1)) / n;
}

/**
 * Return a random integer in [0, max) using Math.random().
 * @param {number} max
 * @returns {number}
 */
function randInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * Return a random float in [min, max).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randUniform(min, max) {
  return min + Math.random() * (max - min);
}

// ─── IsolationTreeNode ──────────────────────────────────────────────────────────

/**
 * A single node in an Isolation Tree.
 * Internal (split) nodes store a feature index and split value.
 * External (leaf) nodes store the size of the data subset that reached them.
 *
 * @class
 */
class IsolationTreeNode {
  /**
   * @param {Object} opts
   * @param {number} [opts.splitFeature]  - Index of the feature used for splitting.
   * @param {number} [opts.splitValue]    - Threshold value for the split.
   * @param {IsolationTreeNode} [opts.left]  - Left child (values < splitValue).
   * @param {IsolationTreeNode} [opts.right] - Right child (values ≥ splitValue).
   * @param {number} [opts.size]          - Number of samples at a leaf node.
   * @param {boolean} [opts.isLeaf=false] - Whether this node is a leaf.
   */
  constructor({ splitFeature, splitValue, left, right, size, isLeaf = false } = {}) {
    this.splitFeature = splitFeature ?? null;
    this.splitValue = splitValue ?? null;
    this.left = left ?? null;
    this.right = right ?? null;
    this.size = size ?? 0;
    this.isLeaf = isLeaf;
  }
}

// ─── IsolationTree ──────────────────────────────────────────────────────────────

/**
 * A single Isolation Tree built by recursively partitioning data with random
 * feature / split-value pairs until points are isolated or the height limit
 * is reached.
 *
 * @class
 */
class IsolationTree {
  /**
   * @param {number} heightLimit - Maximum depth of the tree.
   */
  constructor(heightLimit) {
    /** @type {number} */
    this.heightLimit = heightLimit;
    /** @type {IsolationTreeNode|null} */
    this.root = null;
  }

  /**
   * Build the tree from a data subset.
   * @param {number[][]} data - Array of feature vectors.
   */
  build(data) {
    this.root = this._buildRecursive(data, 0);
  }

  /**
   * Recursively construct the tree.
   * @param {number[][]} data
   * @param {number} depth
   * @returns {IsolationTreeNode}
   * @private
   */
  _buildRecursive(data, depth) {
    const n = data.length;

    // Base cases: isolated point, empty set, or height limit reached
    if (n <= 1 || depth >= this.heightLimit) {
      return new IsolationTreeNode({ size: n, isLeaf: true });
    }

    const numFeatures = data[0].length;
    const featureIdx = randInt(numFeatures);

    // Compute min/max for the chosen feature
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = data[i][featureIdx];
      if (v < min) min = v;
      if (v > max) max = v;
    }

    // All values identical on this feature → leaf
    if (min === max) {
      return new IsolationTreeNode({ size: n, isLeaf: true });
    }

    const splitValue = randUniform(min, max);

    const leftData = [];
    const rightData = [];
    for (let i = 0; i < n; i++) {
      if (data[i][featureIdx] < splitValue) {
        leftData.push(data[i]);
      } else {
        rightData.push(data[i]);
      }
    }

    return new IsolationTreeNode({
      splitFeature: featureIdx,
      splitValue,
      left: this._buildRecursive(leftData, depth + 1),
      right: this._buildRecursive(rightData, depth + 1),
    });
  }

  /**
   * Compute the path length for a single point through this tree.
   * @param {number[]} point - Feature vector.
   * @returns {number} Path length (depth + adjustment for early-stopped leaves).
   */
  pathLength(point) {
    return this._pathLengthRecursive(point, this.root, 0);
  }

  /**
   * @param {number[]} point
   * @param {IsolationTreeNode} node
   * @param {number} depth
   * @returns {number}
   * @private
   */
  _pathLengthRecursive(point, node, depth) {
    if (node.isLeaf) {
      // Adjustment: add average path length for the remaining unsplit data
      return depth + averagePathLength(node.size);
    }

    if (point[node.splitFeature] < node.splitValue) {
      return this._pathLengthRecursive(point, node.left, depth + 1);
    }
    return this._pathLengthRecursive(point, node.right, depth + 1);
  }
}

// ─── IsolationForest ────────────────────────────────────────────────────────────

/**
 * Isolation Forest ensemble for unsupervised anomaly detection.
 *
 * @example
 * ```js
 * const forest = new IsolationForest({ numTrees: 100, sampleSize: 256, contamination: 0.1 });
 * forest.fit(trainingData);               // trainingData: number[][]
 * const result = forest.predict(point);   // { anomalyScore, isAnomaly, pathLength }
 * ```
 *
 * @export
 * @class IsolationForest
 */
export class IsolationForest {
  /**
   * Create an Isolation Forest.
   *
   * @param {Object} opts
   * @param {number} [opts.numTrees=100]        - Number of isolation trees in the ensemble.
   * @param {number} [opts.sampleSize=256]      - Subsample size drawn for each tree.
   * @param {number} [opts.contamination=0.1]   - Expected proportion of anomalies (0–1).
   *        Used to derive the anomaly score threshold after fitting.
   */
  constructor({ numTrees = 100, sampleSize = 256, contamination = 0.1 } = {}) {
    /** @type {number} */
    this.numTrees = numTrees;
    /** @type {number} */
    this.sampleSize = sampleSize;
    /** @type {number} */
    this.contamination = contamination;

    /** @type {IsolationTree[]} */
    this._trees = [];
    /** @type {number} Height limit = ceil(log2(sampleSize)) */
    this._heightLimit = Math.ceil(Math.log2(sampleSize));
    /** @type {number} c(sampleSize) — normalization constant */
    this._c = averagePathLength(sampleSize);
    /** @type {number} Score threshold derived from contamination */
    this._threshold = 0.5;
    /** @type {boolean} Whether fit() has been called */
    this._fitted = false;
  }

  /**
   * Fit the forest to training data.
   *
   * Builds `numTrees` isolation trees from random subsamples of the training
   * data, then computes the anomaly score threshold from the contamination
   * parameter by scoring all training points and choosing the appropriate
   * percentile.
   *
   * @param {number[][]} data - Training data; each element is a feature vector
   *        of equal length (4–20 features).
   * @throws {Error} If data is empty or vectors have inconsistent lengths.
   */
  fit(data) {
    if (!data || data.length === 0) {
      throw new Error('IsolationForest.fit(): training data must be a non-empty array.');
    }

    const numFeatures = data[0].length;
    if (numFeatures < 1) {
      throw new Error('IsolationForest.fit(): feature vectors must have at least 1 feature.');
    }
    for (let i = 1; i < data.length; i++) {
      if (data[i].length !== numFeatures) {
        throw new Error(
          `IsolationForest.fit(): inconsistent feature vector length at index ${i} ` +
          `(expected ${numFeatures}, got ${data[i].length}).`
        );
      }
    }

    // Effective sample size (cap at data length)
    const effectiveSampleSize = Math.min(this.sampleSize, data.length);
    this._c = averagePathLength(effectiveSampleSize);

    // Build ensemble
    this._trees = [];
    for (let t = 0; t < this.numTrees; t++) {
      const subsample = this._subsample(data, effectiveSampleSize);
      const tree = new IsolationTree(this._heightLimit);
      tree.build(subsample);
      this._trees.push(tree);
    }

    // Determine threshold from contamination by scoring the training data
    const scores = data.map((point) => this._computeAnomalyScore(point));
    scores.sort((a, b) => a - b);

    const thresholdIndex = Math.floor((1 - this.contamination) * scores.length);
    this._threshold = scores[Math.min(thresholdIndex, scores.length - 1)];
    this._fitted = true;
  }

  /**
   * Predict whether a single point is anomalous.
   *
   * @param {number[]} point - Feature vector to evaluate.
   * @returns {{ anomalyScore: number, isAnomaly: boolean, pathLength: number }}
   *   - `anomalyScore` — value in [0, 1]; closer to 1 = more anomalous.
   *   - `isAnomaly` — true if anomalyScore exceeds the contamination-derived threshold.
   *   - `pathLength` — average path length across all trees (before normalization).
   * @throws {Error} If the forest has not been fitted.
   */
  predict(point) {
    if (!this._fitted) {
      throw new Error('IsolationForest.predict(): call fit() before predict().');
    }

    const avgPathLength = this._averagePathLength(point);
    const anomalyScore = this._computeAnomalyScore(point);
    const isAnomaly = anomalyScore >= this._threshold;

    return { anomalyScore, isAnomaly, pathLength: avgPathLength };
  }

  /**
   * Predict anomaly scores for a batch of points.
   *
   * @param {number[][]} data - Array of feature vectors.
   * @returns {Array<{ anomalyScore: number, isAnomaly: boolean, pathLength: number }>}
   */
  predictBatch(data) {
    return data.map((point) => this.predict(point));
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Draw a random subsample (without replacement) of the given size.
   * Uses Fisher–Yates partial shuffle for efficiency.
   *
   * @param {number[][]} data
   * @param {number} size
   * @returns {number[][]}
   * @private
   */
  _subsample(data, size) {
    const n = data.length;
    if (size >= n) return data.slice();

    // Partial Fisher–Yates shuffle
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < size; i++) {
      const j = i + randInt(n - i);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const result = new Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = data[indices[i]];
    }
    return result;
  }

  /**
   * Compute the average path length of a point across all trees.
   * @param {number[]} point
   * @returns {number}
   * @private
   */
  _averagePathLength(point) {
    let total = 0;
    for (const tree of this._trees) {
      total += tree.pathLength(point);
    }
    return total / this._trees.length;
  }

  /**
   * Compute the anomaly score for a point.
   *   score = 2^( −E(h(x)) / c(n) )
   *
   * @param {number[]} point
   * @returns {number} Anomaly score in [0, 1].
   * @private
   */
  _computeAnomalyScore(point) {
    const avgPath = this._averagePathLength(point);
    if (this._c === 0) return 0.5; // degenerate case
    return Math.pow(2, -(avgPath / this._c));
  }
}
