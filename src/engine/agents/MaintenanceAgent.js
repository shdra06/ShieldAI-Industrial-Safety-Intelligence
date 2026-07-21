// ============================================================================
// ShieldAI — Maintenance Agent
// Predictive maintenance and equipment health monitoring.  Models sensor
// degradation curves, tracks maintenance schedules, predicts failure modes,
// monitors calibration drift, and simulates spare parts availability.
// ============================================================================

export class MaintenanceAgent {
  /**
   * Creates a MaintenanceAgent instance.
   * Initialises equipment health tracking, spare parts inventory, and
   * maintenance logging structures.
   *
   * @param {object} [messageBus]  - Optional shared message bus for inter-agent communication.
   * @param {object} [blackboard]  - Optional shared blackboard for cross-agent data.
   */
  constructor(messageBus, blackboard) {
    this.name = 'Maintenance';
    this.messageBus = messageBus ?? null;
    this.blackboard = blackboard ?? null;

    /**
     * Per-sensor equipment health records.
     * @type {Map<string, { healthScore: number, lastMaintenanceTick: number, calibrationDrift: number, driftHistory: number[], failurePrediction: number|null, maintenanceInterval: number, degradationRate: number }>}
     */
    this.equipmentHealth = new Map();

    /**
     * Simulated spare parts inventory keyed by sensor type.
     * @type {Record<string, number>}
     */
    this.sparePartsInventory = {
      CH4: 3,
      CO: 3,
      H2S: 2,
      NH3: 2,
      Temperature: 4,
      Pressure: 3,
    };

    /** @type {number} Internal tick counter. */
    this.tickCount = 0;

    /**
     * Log of all maintenance actions performed during the simulation.
     * @type {{ sensorId: string, tick: number, action: string }[]}
     */
    this.maintenanceLog = [];

    /** Depth of drift history to keep per sensor. */
    this.driftHistoryDepth = 15;

    /**
     * Per-sensor Weibull distribution parameters for RUL estimation.
     * @type {Map<string, { beta: number, eta: number, age: number, healthHistory: number[], failureCount: number }>}
     */
    this.weibullParams = new Map();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Evaluates equipment health, maintenance schedules, calibration drift,
   * failure predictions, and spare parts availability.
   *
   * @param {object[]} sensors         - Current sensor readings.
   * @param {number}   simulationClock - Current simulation tick.
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(sensors, simulationClock) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();
    this.tickCount = simulationClock;

    for (const sensor of sensors) {
      // ── Ensure equipment record exists ──────────────────────────────
      if (!this.equipmentHealth.has(sensor.id)) {
        this._initializeEquipmentRecord(sensor);
      }

      const record = this.equipmentHealth.get(sensor.id);

      // ── 1. Update degradation curve ────────────────────────────────
      this._updateDegradation(sensor.id, sensor, simulationClock, record);

      // ── 2. Check maintenance schedule ──────────────────────────────
      this._checkMaintenanceSchedule(sensor, record, simulationClock, now, messages, riskFactors);

      // ── 3. Detect calibration drift ────────────────────────────────
      this._detectCalibrationDrift(sensor, record, now, messages, riskFactors);

      // ── 4. Predict failure modes ───────────────────────────────────
      this._predictFailureMode(sensor, record, now, messages, riskFactors);

      // ── 5. Equipment health risk factor ────────────────────────────
      this._generateHealthRiskFactor(sensor, record, riskFactors);

      // ── 5b. Weibull RUL estimation ─────────────────────────────────
      const weibullResult = this._weibullRUL(sensor.id, record.healthScore, simulationClock);

      if (weibullResult.rul < 50) {
        const sev = (weibullResult.rul < 20 || weibullResult.reliability < 0.3) ? 'critical' : 'warning';
        messages.push({
          agent: 'Maintenance',
          severity: sev,
          text: `WEIBULL: Sensor ${sensor.id} RUL = ${weibullResult.rul} ticks ` +
                `(reliability: ${weibullResult.reliability}, P(failure next 10): ${weibullResult.pFailure.next10})`,
          timestamp: now,
          zone: sensor.zoneId,
        });
        riskFactors.push({
          sensorId: `weibull-rul-${sensor.id}`,
          value: Math.min(1, 1 - (weibullResult.rul / 50)),
          weight: 0.7,
        });
      }
    }

    // ── 6. Spare parts availability check ────────────────────────────
    this._checkSparePartsAvailability(sensors, now, messages, riskFactors);

    // ── 7. Fleet-wide health summary ─────────────────────────────────
    this._assessFleetHealth(sensors, now, messages, riskFactors);

    // ── Collect Weibull estimates for return object ───────────────────
    const weibullEstimates = [];
    for (const sensor of sensors) {
      const wp = this.weibullParams.get(sensor.id);
      if (wp) {
        weibullEstimates.push({
          sensorId: sensor.id,
          ...this._weibullRUL(sensor.id, this.equipmentHealth.get(sensor.id)?.healthScore ?? 1, simulationClock),
        });
      }
    }

    // Publish to blackboard
    if (this.blackboard) {
      const summary = {};
      for (const [id, rec] of this.equipmentHealth) {
        summary[id] = {
          healthScore: rec.healthScore,
          calibrationDrift: rec.calibrationDrift,
          failurePrediction: rec.failurePrediction,
        };
      }
      this.blackboard.maintenanceState = summary;
    }

    return { messages, riskFactors, weibullEstimates };
  }

  /**
   * Resets all internal maintenance state to defaults.
   */
  reset() {
    this.equipmentHealth.clear();
    this.maintenanceLog = [];
    this.tickCount = 0;
    this.sparePartsInventory = {
      CH4: 3,
      CO: 3,
      H2S: 2,
      NH3: 2,
      Temperature: 4,
      Pressure: 3,
    };
    this.weibullParams.clear();
  }

  // ── Equipment Record Initialisation ────────────────────────────────

  /**
   * Creates the initial equipment health record for a sensor, including
   * type-specific degradation rates and maintenance intervals.
   *
   * @param {object} sensor - Sensor data object.
   * @private
   */
  _initializeEquipmentRecord(sensor) {
    const degradationRate = this._getDegradationRate(sensor.type);
    const maintenanceInterval = this._getMaintenanceInterval(sensor.type);

    this.equipmentHealth.set(sensor.id, {
      healthScore: 0.95 + Math.random() * 0.05, // Start near-new with slight variation
      lastMaintenanceTick: 0,
      calibrationDrift: 0,
      driftHistory: [],
      failurePrediction: null,
      maintenanceInterval,
      degradationRate,
    });
  }

  // ── Degradation Modelling ──────────────────────────────────────────

  /**
   * Updates the equipment degradation curve.  Health degrades exponentially
   * with acceleration when sensors operate near their limits.
   *
   * @param {string} sensorId
   * @param {object} sensor
   * @param {number} simulationClock
   * @param {object} record
   * @private
   */
  _updateDegradation(sensorId, sensor, simulationClock, record) {
    // Base degradation per tick (exponential decay model)
    let degradation = record.degradationRate;

    // Accelerate degradation if sensor is operating near thresholds
    const thresholdRatio = sensor.currentValue / sensor.criticalThreshold;
    if (thresholdRatio > 0.7) {
      degradation *= 1 + (thresholdRatio - 0.7) * 3; // Up to 1.9x acceleration
    }

    // Accelerate degradation if maintenance is overdue
    const ticksSinceMaintenance = simulationClock - record.lastMaintenanceTick;
    if (ticksSinceMaintenance > record.maintenanceInterval) {
      const overdueRatio = ticksSinceMaintenance / record.maintenanceInterval;
      degradation *= 1 + (overdueRatio - 1) * 0.5;
    }

    // Apply degradation (floor at 0)
    record.healthScore = Math.max(0, record.healthScore - degradation);

    // Simulate auto-maintenance when health drops critically low (prevents permanent zero)
    if (record.healthScore < 0.1 && this.sparePartsInventory[sensor.type] > 0) {
      this._performSimulatedMaintenance(sensorId, sensor.type, simulationClock, record);
    }
  }

  // ── Maintenance Schedule ───────────────────────────────────────────

  /**
   * Checks whether a sensor is due or overdue for scheduled maintenance
   * and generates escalating alerts.
   *
   * @param {object}   sensor
   * @param {object}   record
   * @param {number}   simulationClock
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _checkMaintenanceSchedule(sensor, record, simulationClock, now, messages, riskFactors) {
    const ticksSinceMaintenance = simulationClock - record.lastMaintenanceTick;
    const overdueRatio = ticksSinceMaintenance / record.maintenanceInterval;

    if (overdueRatio >= 2.0) {
      // Critically overdue: 2x the interval
      messages.push({
        agent: 'Maintenance',
        severity: 'critical',
        text: `MAINTENANCE CRITICAL: ${sensor.label} (${sensor.id}) is ${(overdueRatio).toFixed(1)}x overdue ` +
              `for scheduled maintenance (${ticksSinceMaintenance} ticks since last service). ` +
              `Health: ${(record.healthScore * 100).toFixed(0)}%. Sensor readings may be unreliable.`,
        timestamp: now,
        zone: sensor.zoneId,
      });
      riskFactors.push({
        sensorId: `maint-overdue-${sensor.id}`,
        value: Math.min(1, overdueRatio / 3),
        weight: 0.7,
      });
    } else if (overdueRatio >= 1.0) {
      // Due / slightly overdue
      messages.push({
        agent: 'Maintenance',
        severity: 'warning',
        text: `MAINTENANCE DUE: ${sensor.label} (${sensor.id}) has exceeded scheduled maintenance interval. ` +
              `Overdue by ${(ticksSinceMaintenance - record.maintenanceInterval)} ticks. ` +
              `Health: ${(record.healthScore * 100).toFixed(0)}%.`,
        timestamp: now,
        zone: sensor.zoneId,
      });
      riskFactors.push({
        sensorId: `maint-overdue-${sensor.id}`,
        value: Math.min(1, (overdueRatio - 1) * 0.5 + 0.3),
        weight: 0.5,
      });
    } else if (overdueRatio >= 0.85) {
      // Approaching maintenance window
      messages.push({
        agent: 'Maintenance',
        severity: 'info',
        text: `MAINTENANCE UPCOMING: ${sensor.label} (${sensor.id}) approaching scheduled maintenance ` +
              `(${((1 - overdueRatio) * record.maintenanceInterval).toFixed(0)} ticks remaining).`,
        timestamp: now,
        zone: sensor.zoneId,
      });
    }
  }

  // ── Calibration Drift Detection ────────────────────────────────────

  /**
   * Monitors sensor calibration drift by comparing current readings
   * against the baseline (midpoint of normal range).  Flags sensors
   * that have drifted beyond acceptable tolerances.
   *
   * @param {object}   sensor
   * @param {object}   record
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _detectCalibrationDrift(sensor, record, now, messages, riskFactors) {
    const baseline = (sensor.normalRange.min + sensor.normalRange.max) / 2;
    const range = sensor.normalRange.max - sensor.normalRange.min;
    if (range === 0) return;

    // Current drift as a proportion of the normal range
    const currentDrift = Math.abs(sensor.currentValue - baseline) / range;
    record.calibrationDrift = currentDrift;

    // Track drift history for trend analysis
    record.driftHistory.push(currentDrift);
    if (record.driftHistory.length > this.driftHistoryDepth) {
      record.driftHistory.shift();
    }

    if (currentDrift > 0.25) {
      // Sensor readings are unreliable
      messages.push({
        agent: 'Maintenance',
        severity: 'critical',
        text: `CALIBRATION UNRELIABLE: ${sensor.label} (${sensor.id}) has drifted ${(currentDrift * 100).toFixed(0)}% ` +
              `from baseline. Current: ${sensor.currentValue.toFixed(2)} ${sensor.unit}, ` +
              `Baseline: ${baseline.toFixed(2)} ${sensor.unit}. Sensor readings cannot be trusted.`,
        timestamp: now,
        zone: sensor.zoneId,
      });
      riskFactors.push({
        sensorId: `maint-calibration-${sensor.id}`,
        value: Math.min(1, currentDrift),
        weight: 0.8,
      });
    } else if (currentDrift > 0.10) {
      // Recalibration recommended
      messages.push({
        agent: 'Maintenance',
        severity: 'warning',
        text: `CALIBRATION DRIFT: ${sensor.label} (${sensor.id}) has drifted ${(currentDrift * 100).toFixed(0)}% ` +
              `from baseline (${baseline.toFixed(2)} ${sensor.unit}). Recalibration recommended.`,
        timestamp: now,
        zone: sensor.zoneId,
      });
      riskFactors.push({
        sensorId: `maint-calibration-${sensor.id}`,
        value: currentDrift * 0.8,
        weight: 0.5,
      });
    }
  }

  // ── Failure Mode Prediction ────────────────────────────────────────

  /**
   * Uses drift rate trends and health score to predict when a sensor
   * is likely to fail.  Generates early warnings with estimated
   * ticks-to-failure.
   *
   * @param {object}   sensor
   * @param {object}   record
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _predictFailureMode(sensor, record, now, messages, riskFactors) {
    const history = record.driftHistory;
    if (history.length < 5) {
      record.failurePrediction = null;
      return;
    }

    // Calculate drift rate: average increase per tick over the last 5 readings
    const recentSlice = history.slice(-5);
    let totalDriftChange = 0;
    for (let i = 1; i < recentSlice.length; i++) {
      totalDriftChange += recentSlice[i] - recentSlice[i - 1];
    }
    const avgDriftRate = totalDriftChange / (recentSlice.length - 1);

    // If drift is increasing, predict when it will reach failure threshold (0.5)
    if (avgDriftRate > 0.001) {
      const currentDrift = record.calibrationDrift;
      const failureThreshold = 0.5;
      const ticksToFailure = Math.max(0, (failureThreshold - currentDrift) / avgDriftRate);
      record.failurePrediction = ticksToFailure;

      if (ticksToFailure < 50) {
        const severity = ticksToFailure < 15 ? 'emergency' : ticksToFailure < 30 ? 'critical' : 'warning';
        messages.push({
          agent: 'Maintenance',
          severity,
          text: `FAILURE PREDICTION: ${sensor.label} (${sensor.id}) — predicted failure in ` +
                `~${ticksToFailure.toFixed(0)} ticks based on drift rate (${(avgDriftRate * 100).toFixed(2)}%/tick). ` +
                `Health: ${(record.healthScore * 100).toFixed(0)}%. ` +
                `${ticksToFailure < 15 ? 'IMMEDIATE replacement recommended.' : 'Schedule proactive maintenance.'}`,
          timestamp: now,
          zone: sensor.zoneId,
        });
        riskFactors.push({
          sensorId: `maint-failure-${sensor.id}`,
          value: Math.min(1, 1 - (ticksToFailure / 50)),
          weight: 0.75,
        });
      }
    } else {
      // Drift is stable or decreasing — no failure predicted
      record.failurePrediction = null;
    }

    // Health-based failure risk (independent of drift)
    if (record.healthScore < 0.3) {
      const healthFailureRisk = 1 - record.healthScore;
      messages.push({
        agent: 'Maintenance',
        severity: record.healthScore < 0.15 ? 'emergency' : 'critical',
        text: `EQUIPMENT DEGRADED: ${sensor.label} (${sensor.id}) health at ${(record.healthScore * 100).toFixed(0)}%. ` +
              `${record.healthScore < 0.15 ? 'Imminent failure risk.' : 'Accelerated degradation detected.'} ` +
              `Type: ${sensor.type}. Zone: ${sensor.zoneId}.`,
        timestamp: now,
        zone: sensor.zoneId,
      });
      riskFactors.push({
        sensorId: `maint-health-${sensor.id}`,
        value: healthFailureRisk,
        weight: 0.8,
      });
    }
  }

  // ── Equipment Health Risk Factor ───────────────────────────────────

  /**
   * Generates a continuous risk factor based on equipment health score.
   *
   * @param {object}   sensor
   * @param {object}   record
   * @param {object[]} riskFactors
   * @private
   */
  _generateHealthRiskFactor(sensor, record, riskFactors) {
    if (record.healthScore < 0.8) {
      riskFactors.push({
        sensorId: `maint-degradation-${sensor.id}`,
        value: Math.min(1, 1 - record.healthScore),
        weight: 0.45,
      });
    }
  }

  // ── Spare Parts Availability ───────────────────────────────────────

  /**
   * Checks spare parts inventory levels and generates warnings when
   * stock is low for any sensor type currently deployed.
   *
   * @param {object[]} sensors
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _checkSparePartsAvailability(sensors, now, messages, riskFactors) {
    // Count sensors by type
    const typeCounts = new Map();
    for (const sensor of sensors) {
      typeCounts.set(sensor.type, (typeCounts.get(sensor.type) || 0) + 1);
    }

    for (const [type, count] of typeCounts) {
      const stock = this.sparePartsInventory[type] ?? 0;
      const stockRatio = stock / Math.max(1, count); // Parts per deployed sensor

      if (stock === 0) {
        messages.push({
          agent: 'Maintenance',
          severity: 'critical',
          text: `SPARE PARTS DEPLETED: No spare ${type} sensors available. ` +
                `${count} deployed sensor(s) have no backup. ` +
                `Any failure will result in monitoring gap.`,
          timestamp: now,
        });
        riskFactors.push({
          sensorId: `maint-spares-${type}`,
          value: 0.7,
          weight: 0.55,
        });
      } else if (stockRatio < 0.5) {
        messages.push({
          agent: 'Maintenance',
          severity: 'warning',
          text: `SPARE PARTS LOW: Only ${stock} spare ${type} sensor(s) for ${count} deployed. ` +
                `Reorder recommended.`,
          timestamp: now,
        });
        riskFactors.push({
          sensorId: `maint-spares-${type}`,
          value: 0.3,
          weight: 0.35,
        });
      }
    }
  }

  // ── Fleet Health Summary ───────────────────────────────────────────

  /**
   * Generates a fleet-wide health summary when the average equipment
   * health drops below acceptable levels.
   *
   * @param {object[]} sensors
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _assessFleetHealth(sensors, now, messages, riskFactors) {
    if (sensors.length === 0) return;

    let totalHealth = 0;
    let criticalCount = 0;
    let overdueCount = 0;

    for (const sensor of sensors) {
      const record = this.equipmentHealth.get(sensor.id);
      if (!record) continue;
      totalHealth += record.healthScore;
      if (record.healthScore < 0.3) criticalCount++;
      const overdueRatio = (this.tickCount - record.lastMaintenanceTick) / record.maintenanceInterval;
      if (overdueRatio >= 1.0) overdueCount++;
    }

    const avgHealth = totalHealth / sensors.length;

    if (avgHealth < 0.5 || criticalCount > 2) {
      messages.push({
        agent: 'Maintenance',
        severity: avgHealth < 0.35 ? 'emergency' : 'critical',
        text: `FLEET HEALTH: Average equipment health at ${(avgHealth * 100).toFixed(0)}%. ` +
              `${criticalCount} sensor(s) in critical condition, ${overdueCount} overdue for maintenance. ` +
              `${avgHealth < 0.35 ? 'Facility-wide maintenance shutdown recommended.' : 'Prioritise critical equipment.'}`,
        timestamp: now,
      });
      riskFactors.push({
        sensorId: 'maint-fleet-health',
        value: Math.min(1, 1 - avgHealth),
        weight: 0.6,
      });
    }
  }

  // ── Simulated Maintenance ──────────────────────────────────────────

  /**
   * Performs simulated maintenance on a sensor: restores health, resets
   * calibration drift, consumes a spare part, and logs the action.
   *
   * @param {string} sensorId
   * @param {string} sensorType
   * @param {number} simulationClock
   * @param {object} record
   * @private
   */
  _performSimulatedMaintenance(sensorId, sensorType, simulationClock, record) {
    // Consume spare part
    if (this.sparePartsInventory[sensorType] > 0) {
      this.sparePartsInventory[sensorType]--;
    }

    // Restore health (not quite to 100% — refurbished)
    record.healthScore = 0.85 + Math.random() * 0.1;
    record.lastMaintenanceTick = simulationClock;
    record.calibrationDrift = 0;
    record.driftHistory = [];
    record.failurePrediction = null;

    this.maintenanceLog.push({
      sensorId,
      tick: simulationClock,
      action: `Auto-maintenance performed. Spare ${sensorType} consumed. ` +
              `Health restored to ${(record.healthScore * 100).toFixed(0)}%.`,
    });
  }

  // ── Configuration Helpers ──────────────────────────────────────────

  /**
   * Returns the base degradation rate per tick for a given sensor type.
   * Gas sensors degrade faster due to exposure to corrosive atmospheres.
   *
   * @param {string} type - Sensor type.
   * @returns {number} Degradation rate per tick.
   * @private
   */
  _getDegradationRate(type) {
    const rates = {
      CH4: 0.0012,
      CO: 0.0010,
      H2S: 0.0015,   // H2S is highly corrosive to sensors
      NH3: 0.0011,
      Temperature: 0.0005,
      Pressure: 0.0006,
    };
    return rates[type] ?? 0.0008;
  }

  /**
   * Returns the recommended maintenance interval (in ticks) for a sensor type.
   *
   * @param {string} type - Sensor type.
   * @returns {number} Maintenance interval in ticks.
   * @private
   */
  _getMaintenanceInterval(type) {
    const intervals = {
      CH4: 200,
      CO: 220,
      H2S: 180,      // More frequent due to faster degradation
      NH3: 210,
      Temperature: 350,
      Pressure: 300,
    };
    return intervals[type] ?? 250;
  }

  // ── Weibull RUL Estimation ────────────────────────────────────────────

  /**
   * Estimates Remaining Useful Life using the Weibull distribution.
   *
   * Weibull Hazard Function: h(t) = (β/η) × (t/η)^(β-1)
   * Reliability Function:    R(t) = exp(-(t/η)^β)
   *
   * β (shape): <1 = infant mortality, 1 = random, >1 = wear-out (most equipment)
   * η (scale): characteristic life (time at which 63.2% have failed)
   *
   * @param {string} sensorId - Sensor identifier.
   * @param {number} health   - Current health score [0, 1].
   * @param {number} age      - Current tick count (equipment age).
   * @returns {{ rul: number, reliability: number, hazardRate: number, beta: number, eta: number, pFailure: object, confidence: number, mode: string }}
   * @private
   */
  _weibullRUL(sensorId, health, age) {
    let params = this.weibullParams.get(sensorId);
    if (!params) {
      // Initialize with typical equipment parameters
      // β > 1 means wear-out failures (typical for industrial sensors)
      params = {
        beta: 2.5,   // Shape: wear-out mode
        eta: 500,    // Scale: expected life ~500 ticks
        age: 0,
        healthHistory: [],
        failureCount: 0
      };
      this.weibullParams.set(sensorId, params);
    }

    params.age = age;
    params.healthHistory.push(health);
    if (params.healthHistory.length > 50) params.healthHistory.shift();

    // Adaptive β estimation from health degradation curve
    if (params.healthHistory.length >= 10) {
      // If degradation is accelerating, increase β (wear-out)
      const recent = params.healthHistory.slice(-10);
      const earlyRate = (recent[4] - recent[0]) / 5;
      const lateRate = (recent[9] - recent[5]) / 5;
      if (lateRate < earlyRate && earlyRate < 0) {
        // Degradation accelerating → increase β
        params.beta = Math.min(params.beta * 1.02, 5.0);
      }
    }

    const { beta, eta } = params;

    // Current reliability
    const reliability = Math.exp(-Math.pow(age / eta, beta));

    // Hazard rate (instantaneous failure rate)
    const hazardRate = (beta / eta) * Math.pow(age / eta, beta - 1);

    // Conditional RUL: E[T-t | T>t]
    // Approximation: RUL ≈ η × Γ(1 + 1/β) - t for Weibull
    // Using gamma function approximation: Γ(1+1/β) ≈ exp(-0.5772/β) for β>1
    const gammaApprox = Math.exp(-0.5772156649 / beta);
    const meanLife = eta * gammaApprox;
    const rul = Math.max(0, meanLife - age);

    // Confidence based on data amount
    const confidence = Math.min(params.healthHistory.length / 30, 1);

    // Probability of failure in next N ticks
    const pFailure10 = 1 - Math.exp(-Math.pow((age + 10) / eta, beta)) / Math.exp(-Math.pow(age / eta, beta));
    const pFailure25 = 1 - Math.exp(-Math.pow((age + 25) / eta, beta)) / Math.exp(-Math.pow(age / eta, beta));
    const pFailure50 = 1 - Math.exp(-Math.pow((age + 50) / eta, beta)) / Math.exp(-Math.pow(age / eta, beta));

    return {
      rul: Math.round(rul),
      reliability: Math.round(reliability * 1000) / 1000,
      hazardRate: Math.round(hazardRate * 10000) / 10000,
      beta: Math.round(params.beta * 100) / 100,
      eta: params.eta,
      pFailure: {
        next10: Math.round(pFailure10 * 100) / 100,
        next25: Math.round(pFailure25 * 100) / 100,
        next50: Math.round(pFailure50 * 100) / 100,
      },
      confidence,
      mode: beta > 1 ? 'wear-out' : beta === 1 ? 'random' : 'infant-mortality'
    };
  }
}
