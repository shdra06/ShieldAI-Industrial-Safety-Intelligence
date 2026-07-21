import * as tf from '@tensorflow/tfjs';

/**
 * Feedforward Neural Network for multi-class risk classification.
 * Classifies plant state into: Normal, Elevated, Warning, Critical, Emergency
 */
export class RiskClassifier {
  static CLASSES = ['Normal', 'Elevated', 'Warning', 'Critical', 'Emergency'];

  constructor({ inputFeatures = 24, hiddenUnits = [64, 32] } = {}) {
    this.inputFeatures = inputFeatures;
    this.hiddenUnits = hiddenUnits;
    this.numClasses = RiskClassifier.CLASSES.length;

    this.model = null;
    this.isTrained = false;
    this.isTraining = false;

    this.trainingData = { features: [], labels: [] };
    this.maxTrainingSize = 2000;
    this.minTrainingSamples = 100;

    // Feature normalization
    this.featureMins = null;
    this.featureMaxs = null;

    this.trainingHistory = { losses: [], accuracies: [], epochs: 0 };

    this._buildModel();
  }

  _buildModel() {
    this.model = tf.sequential();

    // Hidden layer 1
    this.model.add(tf.layers.dense({
      units: this.hiddenUnits[0],
      inputShape: [this.inputFeatures],
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: 'hidden_1',
    }));
    this.model.add(tf.layers.dropout({ rate: 0.3, name: 'dropout_1' }));

    // Hidden layer 2
    this.model.add(tf.layers.dense({
      units: this.hiddenUnits[1],
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: 'hidden_2',
    }));
    this.model.add(tf.layers.dropout({ rate: 0.2, name: 'dropout_2' }));

    // Output layer
    this.model.add(tf.layers.dense({
      units: this.numClasses,
      activation: 'softmax',
      name: 'output',
    }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
  }

  /**
   * Extract features from the current plant state for classification.
   * @param {object} state - Full plant state
   * @returns {number[]} Feature vector of length inputFeatures
   */
  extractFeatures(state) {
    const features = [];

    // Sensor values (normalized to 0-1 range using critical thresholds)
    const sensors = state.sensors || [];
    const sensorTypes = ['ch4', 'co', 'h2s', 'nh3', 'pressure', 'temperature'];

    for (const type of sensorTypes) {
      const typeSensors = sensors.filter(s => (s.type || '').toLowerCase() === type);
      if (typeSensors.length > 0) {
        const maxVal = Math.max(...typeSensors.map(s => s.currentValue || 0));
        const maxCrit = Math.max(...typeSensors.map(s => s.criticalThreshold || 100));
        features.push(maxVal / (maxCrit || 1));  // Normalized 0-1
        features.push(typeSensors.filter(s => (s.currentValue || 0) > (s.warningThreshold || Infinity)).length / typeSensors.length); // Fraction in warning
      } else {
        features.push(0, 0);
      }
    }
    // 12 features so far

    // Risk score (1 feature)
    features.push(state.riskScore || 0);

    // Number of active alerts by severity (4 features)
    const messages = state.messages || [];
    features.push(messages.filter(m => m.severity === 'info').length / 20);
    features.push(messages.filter(m => m.severity === 'warning').length / 10);
    features.push(messages.filter(m => m.severity === 'critical').length / 5);
    features.push(messages.filter(m => m.severity === 'emergency').length / 3);

    // Permit risk (1 feature)
    const permits = state.permits || [];
    const maxPermitRisk = permits.length > 0
      ? Math.max(...permits.map(p => p.riskScore || 0)) / 100
      : 0;
    features.push(maxPermitRisk);

    // Worker density in high-risk zones (1 feature)
    features.push(Math.min((state.workers || []).length / 15, 1));

    // Compliance score (1 feature)
    features.push((state.complianceScores?.overall || 100) / 100);

    // Agent agreement (1 feature)
    features.push(state.agentAgreement || 1);

    // Cascade chains active (1 feature)
    features.push(Math.min((state.cascadeChains || []).length / 5, 1));

    // Statistical alerts (1 feature)
    features.push(Math.min((state.statisticalAlerts || []).length / 10, 1));

    // Pad or truncate to exactly inputFeatures
    while (features.length < this.inputFeatures) features.push(0);
    return features.slice(0, this.inputFeatures);
  }

  /**
   * Add a labeled training sample.
   * @param {number[]} features - Feature vector
   * @param {number} classIndex - 0=Normal, 1=Elevated, 2=Warning, 3=Critical, 4=Emergency
   */
  addSample(features, classIndex) {
    if (classIndex < 0 || classIndex >= this.numClasses) return;
    this.trainingData.features.push(features);
    this.trainingData.labels.push(classIndex);
    if (this.trainingData.features.length > this.maxTrainingSize) {
      this.trainingData.features.shift();
      this.trainingData.labels.shift();
    }
  }

  /**
   * Auto-label a sample based on the current risk score.
   * @param {number} riskScore - Risk score in [0, 1]
   * @returns {number} Class index (0-4)
   */
  autoLabel(riskScore) {
    if (riskScore < 0.25) return 0;  // Normal
    if (riskScore < 0.50) return 1;  // Elevated
    if (riskScore < 0.75) return 2;  // Warning
    if (riskScore < 0.90) return 3;  // Critical
    return 4;  // Emergency
  }

  /**
   * Train the classifier.
   * @param {object} options
   * @param {number} options.epochs - Training epochs (default 50)
   * @param {number} options.batchSize - Batch size (default 32)
   * @param {function} options.onEpochEnd - Callback per epoch
   * @returns {Promise<object>} Training result
   */
  async train({ epochs = 50, batchSize = 32, onEpochEnd } = {}) {
    if (this.trainingData.features.length < this.minTrainingSamples) {
      return { success: false, error: `Need ${this.minTrainingSamples} samples, have ${this.trainingData.features.length}` };
    }
    if (this.isTraining) return { success: false, error: 'Already training' };

    this.isTraining = true;
    try {
      const xs = tf.tensor2d(this.trainingData.features);
      const ys = tf.oneHot(tf.tensor1d(this.trainingData.labels, 'int32'), this.numClasses);

      const history = await this.model.fit(xs, ys, {
        epochs, batchSize, shuffle: true, validationSplit: 0.15,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.trainingHistory.losses.push(logs.loss);
            this.trainingHistory.accuracies.push(logs.acc);
            this.trainingHistory.epochs++;
            if (onEpochEnd) onEpochEnd(epoch, logs);
          }
        }
      });

      xs.dispose();
      ys.dispose();

      this.isTrained = true;
      this.isTraining = false;

      const finalAcc = history.history.acc?.slice(-1)[0] || 0;
      console.log(`[RiskClassifier] Trained. Accuracy: ${(finalAcc * 100).toFixed(1)}%`);

      return { success: true, accuracy: finalAcc, epochs };
    } catch (err) {
      this.isTraining = false;
      return { success: false, error: err.message };
    }
  }

  /**
   * Classify a plant state.
   * @param {number[]} features
   * @returns {{ class: string, classIndex: number, confidence: number, probabilities: object[], status: string }}
   */
  classify(features) {
    if (!this.isTrained) {
      return { class: 'Unknown', classIndex: -1, confidence: 0, probabilities: [], status: 'not_trained' };
    }

    const input = tf.tensor2d([features]);
    const probs = this.model.predict(input).arraySync()[0];
    input.dispose();

    const maxIdx = probs.indexOf(Math.max(...probs));

    return {
      class: RiskClassifier.CLASSES[maxIdx],
      classIndex: maxIdx,
      confidence: probs[maxIdx],
      probabilities: RiskClassifier.CLASSES.map((c, i) => ({ class: c, probability: probs[i] })),
      status: 'active',
    };
  }

  /**
   * Get training status and statistics.
   * @returns {object}
   */
  getStatus() {
    return {
      isTrained: this.isTrained,
      isTraining: this.isTraining,
      samplesCollected: this.trainingData.features.length,
      minRequired: this.minTrainingSamples,
      trainingHistory: { ...this.trainingHistory },
    };
  }

  /**
   * Reset all state.
   */
  reset() {
    this.trainingData = { features: [], labels: [] };
    this.isTrained = false;
    this.trainingHistory = { losses: [], accuracies: [], epochs: 0 };
    this._buildModel();
  }

  /**
   * Dispose of TF.js resources.
   */
  dispose() {
    if (this.model) this.model.dispose();
  }
}
