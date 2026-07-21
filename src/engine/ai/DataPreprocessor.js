/**
 * Prepares sensor data for neural network consumption.
 * Handles normalization, windowing, and batching.
 */
export class DataPreprocessor {
  constructor() {
    this.featureOrder = ['ch4', 'co', 'h2s', 'nh3', 'pressure', 'temperature'];
  }

  /**
   * Extract a feature vector from the current sensor array.
   * Groups sensors by type and takes the MAX value per type per zone.
   * @param {object[]} sensors - Array of sensor objects
   * @returns {number[]} Feature vector of length featureOrder.length
   */
  extractSensorFeatures(sensors) {
    const features = [];
    for (const type of this.featureOrder) {
      const matching = sensors.filter(s => (s.type || '').toLowerCase() === type);
      if (matching.length > 0) {
        features.push(Math.max(...matching.map(s => s.currentValue || 0)));
      } else {
        features.push(0);
      }
    }
    return features;
  }

  /**
   * Extract per-zone sensor features (6 zones × 6 sensor types = 36 features).
   * @param {object[]} sensors
   * @returns {number[]}
   */
  extractZoneSensorFeatures(sensors) {
    const zones = ['Z-A', 'Z-B', 'Z-C', 'Z-D', 'Z-E', 'Z-F'];
    const features = [];
    for (const zone of zones) {
      const zoneSensors = sensors.filter(s => s.zone === zone);
      for (const type of this.featureOrder) {
        const matching = zoneSensors.filter(s => (s.type || '').toLowerCase() === type);
        features.push(matching.length > 0 ? Math.max(...matching.map(s => s.currentValue || 0)) : 0);
      }
    }
    return features;
  }

  /**
   * Min-max normalize a feature vector.
   * @param {number[]} features
   * @param {number[]} mins
   * @param {number[]} maxs
   * @returns {number[]}
   */
  normalize(features, mins, maxs) {
    return features.map((v, i) => {
      const range = (maxs[i] || 1) - (mins[i] || 0);
      return range > 0 ? (v - (mins[i] || 0)) / range : 0;
    });
  }

  /**
   * Z-score normalize features.
   * @param {number[]} features
   * @param {number[]} means
   * @param {number[]} stds
   * @returns {number[]}
   */
  zScoreNormalize(features, means, stds) {
    return features.map((v, i) => {
      const std = stds[i] || 1;
      return (v - (means[i] || 0)) / std;
    });
  }

  /**
   * Create sliding windows from a flat time series.
   * @param {number[][]} data - Array of feature vectors
   * @param {number} windowSize - Window length
   * @param {number} stride - Step between windows (default 1)
   * @returns {number[][][]} Array of windows
   */
  createWindows(data, windowSize, stride = 1) {
    const windows = [];
    for (let i = 0; i <= data.length - windowSize; i += stride) {
      windows.push(data.slice(i, i + windowSize));
    }
    return windows;
  }

  /**
   * Compute running statistics (mean, std) from a data buffer.
   * @param {number[][]} data - Array of feature vectors
   * @returns {{ means: number[], stds: number[], mins: number[], maxs: number[] }}
   */
  computeStats(data) {
    if (data.length === 0) return { means: [], stds: [], mins: [], maxs: [] };

    const numFeatures = data[0].length;
    const means = new Array(numFeatures).fill(0);
    const mins = new Array(numFeatures).fill(Infinity);
    const maxs = new Array(numFeatures).fill(-Infinity);

    for (const row of data) {
      for (let f = 0; f < numFeatures; f++) {
        means[f] += row[f];
        if (row[f] < mins[f]) mins[f] = row[f];
        if (row[f] > maxs[f]) maxs[f] = row[f];
      }
    }
    for (let f = 0; f < numFeatures; f++) means[f] /= data.length;

    const stds = new Array(numFeatures).fill(0);
    for (const row of data) {
      for (let f = 0; f < numFeatures; f++) {
        stds[f] += (row[f] - means[f]) ** 2;
      }
    }
    for (let f = 0; f < numFeatures; f++) {
      stds[f] = Math.sqrt(stds[f] / data.length);
    }

    return { means, stds, mins, maxs };
  }

  /**
   * Augment training data by adding noise.
   * @param {number[][][]} windows - Original windows
   * @param {number} noiseLevel - Std of Gaussian noise (default 0.05)
   * @param {number} copies - Number of augmented copies (default 2)
   * @returns {number[][][]} Original + augmented windows
   */
  augment(windows, noiseLevel = 0.05, copies = 2) {
    const augmented = [...windows];
    for (let c = 0; c < copies; c++) {
      for (const window of windows) {
        const noisy = window.map(reading =>
          reading.map(v => v + (Math.random() * 2 - 1) * noiseLevel)
        );
        augmented.push(noisy);
      }
    }
    return augmented;
  }
}
