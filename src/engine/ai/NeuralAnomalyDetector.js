import * as tf from '@tensorflow/tfjs';

/**
 * LSTM Autoencoder for multi-variate time-series anomaly detection.
 * Trains on "normal" sensor patterns. When it sees data it can't reconstruct
 * well, that's an anomaly.
 */
export class NeuralAnomalyDetector {
  /**
   * @param {object} options
   * @param {number} options.sequenceLength - Number of timesteps per window (default 20)
   * @param {number} options.features - Number of sensor features per timestep (default 6)
   * @param {number} options.latentDim - Bottleneck dimension (default 8)
   * @param {number} options.lstmUnits - LSTM hidden units (default 32)
   */
  constructor({ sequenceLength = 20, features = 6, latentDim = 8, lstmUnits = 32 } = {}) {
    this.sequenceLength = sequenceLength;
    this.features = features;
    this.latentDim = latentDim;
    this.lstmUnits = lstmUnits;

    this.model = null;
    this.isTrained = false;
    this.isTraining = false;
    this.anomalyThreshold = 0;

    // Training data buffer
    this.trainingBuffer = [];  // Collects normal sequences
    this.maxBufferSize = 500;  // Max sequences to store
    this.minTrainingSamples = 50; // Min sequences before training

    // Statistics for normalization
    this.featureMeans = null;  // Float32Array[features]
    this.featureStds = null;   // Float32Array[features]

    // Training history
    this.trainingHistory = {
      losses: [],
      epochs: 0,
      lastTrainTime: null,
    };

    // Current sliding window
    this.currentWindow = [];  // Accumulates readings to form sequences

    this._buildModel();
  }

  /**
   * Build the LSTM Autoencoder model.
   * Architecture:
   *   Encoder: LSTM(lstmUnits) → Dense(latentDim)
   *   Decoder: RepeatVector → LSTM(lstmUnits) → TimeDistributed(Dense(features))
   */
  _buildModel() {
    this.model = tf.sequential();

    // ── Encoder ────────────────────────────────────────────
    this.model.add(tf.layers.lstm({
      units: this.lstmUnits,
      inputShape: [this.sequenceLength, this.features],
      returnSequences: false,
      name: 'encoder_lstm',
    }));
    this.model.add(tf.layers.dense({
      units: this.latentDim,
      activation: 'relu',
      name: 'encoder_bottleneck',
    }));

    // ── Decoder ────────────────────────────────────────────
    this.model.add(tf.layers.repeatVector({ n: this.sequenceLength, name: 'repeat' }));
    this.model.add(tf.layers.lstm({
      units: this.lstmUnits,
      returnSequences: true,
      name: 'decoder_lstm',
    }));
    this.model.add(tf.layers.timeDistributed({
      layer: tf.layers.dense({ units: this.features }),
      name: 'decoder_output',
    }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    });

    console.log('[NeuralAnomalyDetector] Model built:', this.model.summary());
  }

  /**
   * Add a sensor reading to the sliding window.
   * When the window is full (sequenceLength readings), it's added to the training buffer.
   * @param {number[]} reading - Array of sensor values [ch4, co, h2s, nh3, pressure, temp]
   */
  addReading(reading) {
    if (!Array.isArray(reading) || reading.length !== this.features) return;

    this.currentWindow.push([...reading]);

    if (this.currentWindow.length >= this.sequenceLength) {
      // We have a full sequence
      const sequence = this.currentWindow.slice(-this.sequenceLength);
      this.trainingBuffer.push(sequence);

      // Cap buffer size
      if (this.trainingBuffer.length > this.maxBufferSize) {
        this.trainingBuffer.shift();
      }

      // Keep only last sequenceLength readings for sliding window
      this.currentWindow = this.currentWindow.slice(-this.sequenceLength);
    }
  }

  /**
   * Compute feature means and standard deviations from the training buffer.
   */
  _computeStats() {
    if (this.trainingBuffer.length === 0) return;

    const sums = new Float32Array(this.features);
    const sqSums = new Float32Array(this.features);
    let count = 0;

    for (const seq of this.trainingBuffer) {
      for (const reading of seq) {
        for (let f = 0; f < this.features; f++) {
          sums[f] += reading[f];
          sqSums[f] += reading[f] * reading[f];
        }
        count++;
      }
    }

    this.featureMeans = new Float32Array(this.features);
    this.featureStds = new Float32Array(this.features);

    for (let f = 0; f < this.features; f++) {
      this.featureMeans[f] = sums[f] / count;
      const variance = (sqSums[f] / count) - (this.featureMeans[f] * this.featureMeans[f]);
      this.featureStds[f] = Math.sqrt(Math.max(variance, 1e-8)); // Prevent div by zero
    }
  }

  /**
   * Normalize a sequence using computed means and stds.
   * @param {number[][]} sequence
   * @returns {number[][]}
   */
  _normalize(sequence) {
    if (!this.featureMeans) return sequence;
    return sequence.map(reading =>
      reading.map((v, f) => (v - this.featureMeans[f]) / this.featureStds[f])
    );
  }

  /**
   * Train the autoencoder on the collected normal data.
   * @param {object} options
   * @param {number} options.epochs - Training epochs (default 30)
   * @param {number} options.batchSize - Batch size (default 16)
   * @param {function} options.onEpochEnd - Callback per epoch
   * @returns {Promise<object>} Training result
   */
  async train({ epochs = 30, batchSize = 16, onEpochEnd } = {}) {
    if (this.trainingBuffer.length < this.minTrainingSamples) {
      return {
        success: false,
        error: `Need ${this.minTrainingSamples} sequences, have ${this.trainingBuffer.length}`,
      };
    }

    if (this.isTraining) {
      return { success: false, error: 'Already training' };
    }

    this.isTraining = true;
    const startTime = performance.now();

    try {
      // Compute normalization stats
      this._computeStats();

      // Normalize all sequences
      const normalizedData = this.trainingBuffer.map(seq => this._normalize(seq));

      // Convert to tensor: [samples, sequenceLength, features]
      const tensorData = tf.tensor3d(normalizedData);

      // Train: autoencoder tries to reconstruct its input
      const history = await this.model.fit(tensorData, tensorData, {
        epochs,
        batchSize,
        shuffle: true,
        validationSplit: 0.1,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.trainingHistory.losses.push(logs.loss);
            this.trainingHistory.epochs++;
            if (onEpochEnd) onEpochEnd(epoch, logs);
          },
        },
      });

      // Compute anomaly threshold from training data reconstruction errors
      const predictions = this.model.predict(tensorData);
      const errors = tf.losses.meanSquaredError(tensorData, predictions)
        .mean(-1)  // Mean over features
        .arraySync();  // Convert to JS array

      // Threshold = mean + 2*std of reconstruction errors
      const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
      const stdError = Math.sqrt(
        errors.reduce((a, b) => a + (b - meanError) ** 2, 0) / errors.length
      );
      this.anomalyThreshold = meanError + 2 * stdError;

      // Cleanup tensors
      tensorData.dispose();
      predictions.dispose();

      this.isTrained = true;
      this.isTraining = false;
      this.trainingHistory.lastTrainTime = performance.now() - startTime;

      console.log(`[NeuralAnomalyDetector] Training complete in ${this.trainingHistory.lastTrainTime.toFixed(0)}ms`);
      console.log(`  Threshold: ${this.anomalyThreshold.toFixed(6)}, Final loss: ${history.history.loss.slice(-1)[0].toFixed(6)}`);

      return {
        success: true,
        epochs,
        finalLoss: history.history.loss.slice(-1)[0],
        threshold: this.anomalyThreshold,
        trainingTime: this.trainingHistory.lastTrainTime,
        samples: this.trainingBuffer.length,
      };
    } catch (err) {
      this.isTraining = false;
      console.error('[NeuralAnomalyDetector] Training failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Detect anomalies in the current sliding window.
   * @returns {object} { isAnomaly, reconstructionError, confidence, threshold, details }
   */
  detect() {
    if (!this.isTrained || this.currentWindow.length < this.sequenceLength) {
      return {
        isAnomaly: false,
        reconstructionError: 0,
        confidence: 0,
        threshold: this.anomalyThreshold,
        status: !this.isTrained ? 'not_trained' : 'insufficient_data',
      };
    }

    const sequence = this.currentWindow.slice(-this.sequenceLength);
    const normalized = this._normalize(sequence);

    // Create tensor and predict
    const inputTensor = tf.tensor3d([normalized]);
    const outputTensor = this.model.predict(inputTensor);

    // Calculate per-feature reconstruction errors
    const errorTensor = inputTensor.sub(outputTensor).square();
    const perFeatureError = errorTensor.mean([0, 1]).arraySync(); // Mean over batch and time
    const totalError = errorTensor.mean().arraySync();

    // Cleanup
    inputTensor.dispose();
    outputTensor.dispose();
    errorTensor.dispose();

    // Anomaly score (0-1, higher = more anomalous)
    const anomalyScore = Math.min(totalError / (this.anomalyThreshold * 3), 1.0);
    const isAnomaly = totalError > this.anomalyThreshold;

    // Find which features contribute most to the error
    const featureNames = ['CH4', 'CO', 'H2S', 'NH3', 'Pressure', 'Temperature'];
    const topContributors = perFeatureError
      .map((err, i) => ({ feature: featureNames[i] || `F${i}`, error: err }))
      .sort((a, b) => b.error - a.error)
      .slice(0, 3);

    return {
      isAnomaly,
      anomalyScore,
      reconstructionError: totalError,
      threshold: this.anomalyThreshold,
      confidence: isAnomaly ? Math.min((totalError / this.anomalyThreshold - 1) * 2, 1) : 0,
      topContributors,
      status: 'active',
    };
  }

  /**
   * Get training status and statistics.
   */
  getStatus() {
    return {
      isTrained: this.isTrained,
      isTraining: this.isTraining,
      bufferSize: this.trainingBuffer.length,
      minRequired: this.minTrainingSamples,
      readyToTrain: this.trainingBuffer.length >= this.minTrainingSamples,
      threshold: this.anomalyThreshold,
      trainingHistory: { ...this.trainingHistory },
      windowSize: this.currentWindow.length,
      modelParams: {
        sequenceLength: this.sequenceLength,
        features: this.features,
        latentDim: this.latentDim,
        lstmUnits: this.lstmUnits,
      },
    };
  }

  /**
   * Reset all state.
   */
  reset() {
    this.trainingBuffer = [];
    this.currentWindow = [];
    this.featureMeans = null;
    this.featureStds = null;
    this.isTrained = false;
    this.isTraining = false;
    this.anomalyThreshold = 0;
    this.trainingHistory = { losses: [], epochs: 0, lastTrainTime: null };
    this._buildModel();
  }

  /**
   * Dispose of TF.js resources.
   */
  dispose() {
    if (this.model) this.model.dispose();
  }
}
