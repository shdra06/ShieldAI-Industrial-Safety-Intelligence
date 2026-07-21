// ============================================================================
// ShieldAI — Environmental Agent
// Monitors external environmental factors affecting industrial safety including
// simulated weather conditions, wind-gas dispersal patterns, temperature
// extremes, visibility, and atmospheric pressure changes.
// ============================================================================

export class EnvironmentalAgent {
  /**
   * Creates an EnvironmentalAgent instance.
   * Initializes simulated weather state, history buffer, and zone-wind
   * exposure lookup used for gas dispersal risk calculations.
   *
   * @param {object} [messageBus]  - Optional shared message bus for inter-agent communication.
   * @param {object} [blackboard]  - Optional shared blackboard for cross-agent data.
   */
  constructor(messageBus, blackboard) {
    this.name = 'Environmental';
    this.messageBus = messageBus ?? null;
    this.blackboard = blackboard ?? null;

    /** @type {{ windDirection: number, windSpeed: number, temperature: number, humidity: number, visibility: number, pressure: number }} */
    this.weatherState = {
      windDirection: 180,   // degrees (0 = N, 90 = E, 180 = S, 270 = W)
      windSpeed: 8,         // km/h
      temperature: 28,      // °C
      humidity: 55,         // %
      visibility: 8,        // km
      pressure: 1013,       // hPa
    };

    /** @type {object[]} Rolling window of the last 20 weather snapshots. */
    this.weatherHistory = [];
    this.historyDepth = 20;

    /** @type {number} Last simulationClock tick when weather was updated. */
    this.lastUpdateTick = 0;

    /**
     * Approximate bearing from plant centre to each zone centroid (degrees).
     * Used to determine upwind / downwind exposure.
     * @type {Record<string, number>}
     */
    this.zoneBearings = {
      'Z-A': 0,
      'Z-B': 60,
      'Z-C': 120,
      'Z-D': 180,
      'Z-E': 240,
      'Z-F': 300,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Evaluates environmental conditions and their impact on plant safety.
   *
   * @param {object[]} sensors         - Current sensor readings.
   * @param {object[]} zones           - Zone definitions.
   * @param {number}   simulationClock - Current simulation tick.
   * @returns {{ messages: object[], riskFactors: object[] }}
   */
  evaluate(sensors, zones, simulationClock) {
    const messages = [];
    const riskFactors = [];
    const now = new Date();

    // ── 1. Update simulated weather ──────────────────────────────────
    this._updateWeather(simulationClock);

    // ── 2. Wind-gas dispersal risk per zone ──────────────────────────
    this._calculateWindDispersalRisk(zones, sensors, now, messages, riskFactors);

    // ── 3. Temperature extremes ──────────────────────────────────────
    this._assessTemperatureExtremes(sensors, now, messages, riskFactors);

    // ── 4. Visibility conditions ─────────────────────────────────────
    this._assessVisibility(zones, now, messages, riskFactors);

    // ── 5. Atmospheric pressure effects on confined spaces ───────────
    this._assessAtmosphericPressure(sensors, now, messages, riskFactors);

    // ── 6. Composite environmental risk per zone ─────────────────────
    this._generateCompositeRisk(zones, now, messages, riskFactors);

    // ── 7. Weather trend alerts ──────────────────────────────────────
    this._assessWeatherTrends(now, messages, riskFactors);

    // Publish to blackboard for other agents
    if (this.blackboard) {
      this.blackboard.environmentalState = { ...this.weatherState };
    }

    return { messages, riskFactors };
  }

  /**
   * Resets all internal state to defaults.
   */
  reset() {
    this.weatherState = {
      windDirection: 180,
      windSpeed: 8,
      temperature: 28,
      humidity: 55,
      visibility: 8,
      pressure: 1013,
    };
    this.weatherHistory = [];
    this.lastUpdateTick = 0;
  }

  // ── Weather Simulation ─────────────────────────────────────────────

  /**
   * Updates the simulated weather state using sine-wave diurnal cycles
   * combined with Perlin-style noise for realistic variation.
   *
   * @param {number} tick - Current simulation tick.
   * @private
   */
  _updateWeather(tick) {
    if (tick === this.lastUpdateTick) return;
    this.lastUpdateTick = tick;

    // Diurnal period: ~720 ticks ≈ 24 simulated hours
    const diurnalPhase = (tick / 720) * 2 * Math.PI;
    // Synoptic period: ~4320 ticks ≈ multi-day weather pattern
    const synopticPhase = (tick / 4320) * 2 * Math.PI;

    // Wind direction: slow rotation with gusts
    this.weatherState.windDirection =
      (180 + 60 * Math.sin(synopticPhase) + this._addNoise(0, 15) + 360) % 360;

    // Wind speed: diurnal pattern (stronger afternoon) + weather system influence
    this.weatherState.windSpeed = Math.max(0, Math.min(40,
      8 + 6 * Math.sin(diurnalPhase - Math.PI / 4) +
      8 * Math.sin(synopticPhase) +
      this._addNoise(0, 3)
    ));

    // Temperature: diurnal cycle (peak at tick ≈ 450 in a 720-tick day)
    this.weatherState.temperature = Math.max(-10, Math.min(50,
      28 + 12 * Math.sin(diurnalPhase - Math.PI / 3) +
      5 * Math.sin(synopticPhase * 0.7) +
      this._addNoise(0, 1.5)
    ));

    // Humidity: inverse correlation with temperature
    this.weatherState.humidity = Math.max(20, Math.min(100,
      55 - 15 * Math.sin(diurnalPhase - Math.PI / 3) +
      10 * Math.sin(synopticPhase * 1.3) +
      this._addNoise(0, 5)
    ));

    // Visibility: generally good but drops in high humidity / weather events
    const humidityFactor = this.weatherState.humidity > 85 ? (this.weatherState.humidity - 85) / 15 : 0;
    this.weatherState.visibility = Math.max(0.2, Math.min(10,
      8 - 4 * humidityFactor +
      2 * Math.sin(synopticPhase * 0.5) +
      this._addNoise(0, 0.5)
    ));

    // Atmospheric pressure: synoptic-scale changes
    this.weatherState.pressure = Math.max(950, Math.min(1050,
      1013 + 15 * Math.sin(synopticPhase) +
      5 * Math.sin(synopticPhase * 2.7) +
      this._addNoise(0, 2)
    ));

    // Store snapshot
    this.weatherHistory.push({ ...this.weatherState, tick });
    if (this.weatherHistory.length > this.historyDepth) {
      this.weatherHistory.shift();
    }
  }

  // ── Wind-Gas Dispersal ─────────────────────────────────────────────

  /**
   * Calculates gas dispersal risk for each zone based on wind conditions
   * and current gas sensor readings.  Downwind zones from a gas leak
   * receive elevated risk even if their own sensors are within limits.
   *
   * @param {object[]} zones
   * @param {object[]} sensors
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _calculateWindDispersalRisk(zones, sensors, now, messages, riskFactors) {
    const { windDirection, windSpeed } = this.weatherState;
    const gasSensors = sensors.filter((s) =>
      ['CH4', 'CO', 'H2S', 'NH3'].includes(s.type)
    );

    // Identify zones with elevated gas readings
    const elevatedZones = new Map();
    for (const sensor of gasSensors) {
      const ratio = sensor.currentValue / sensor.warningThreshold;
      if (ratio > 0.5) {
        if (!elevatedZones.has(sensor.zoneId) || elevatedZones.get(sensor.zoneId) < ratio) {
          elevatedZones.set(sensor.zoneId, ratio);
        }
      }
    }

    // For each zone, calculate downwind exposure from elevated zones
    for (const zone of zones) {
      const exposure = this._getZoneWindExposure(zone.id, windDirection);
      const windFactor = Math.min(1, windSpeed / 25); // Normalize 0-1

      let dispersalRisk = 0;
      for (const [srcZoneId, gasRatio] of elevatedZones) {
        if (srcZoneId === zone.id) continue;
        const srcExposure = this._getZoneWindExposure(srcZoneId, windDirection);
        // Source upwind (low exposure) + target downwind (high exposure) = high dispersal
        const dispersalPath = Math.max(0, exposure - srcExposure);
        dispersalRisk += dispersalPath * gasRatio * windFactor * 0.6;
      }
      dispersalRisk = Math.min(1, dispersalRisk);

      if (dispersalRisk > 0.15) {
        riskFactors.push({
          sensorId: `env-wind-dispersal-${zone.id}`,
          value: dispersalRisk,
          weight: 0.7,
        });
      }

      if (dispersalRisk > 0.5) {
        messages.push({
          agent: 'Environmental',
          severity: dispersalRisk > 0.75 ? 'critical' : 'warning',
          text: `WIND DISPERSAL: Zone ${zone.id} (${zone.name}) is downwind of gas release. ` +
                `Wind ${windDirection.toFixed(0)}° at ${windSpeed.toFixed(1)} km/h. ` +
                `Dispersal risk: ${(dispersalRisk * 100).toFixed(0)}%.`,
          timestamp: now,
          zone: zone.id,
        });
      }
    }
  }

  // ── Temperature Extremes ───────────────────────────────────────────

  /**
   * Assesses temperature-related risks: heat stress, cold stress, and
   * equipment reliability degradation at extreme temperatures.
   *
   * @param {object[]} sensors
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _assessTemperatureExtremes(sensors, now, messages, riskFactors) {
    const envTemp = this.weatherState.temperature;

    // Heat stress assessment
    if (envTemp > 35) {
      const heatRisk = Math.min(1, (envTemp - 35) / 15); // 0 at 35°C, 1 at 50°C
      const severity = envTemp > 45 ? 'emergency' : envTemp > 40 ? 'critical' : 'warning';

      riskFactors.push({
        sensorId: 'env-heat-stress',
        value: heatRisk,
        weight: 0.65,
      });

      messages.push({
        agent: 'Environmental',
        severity,
        text: `HEAT STRESS: Ambient temperature ${envTemp.toFixed(1)}°C. ` +
              `${envTemp > 40 ? 'Mandatory hydration breaks required. ' : ''}` +
              `${envTemp > 45 ? 'Consider suspending outdoor operations. ' : ''}` +
              `Worker performance degraded by ~${(heatRisk * 30).toFixed(0)}%.`,
        timestamp: now,
      });
    }

    // Cold stress assessment
    if (envTemp < 5) {
      const coldRisk = Math.min(1, (5 - envTemp) / 15); // 0 at 5°C, 1 at -10°C
      const severity = envTemp < -5 ? 'critical' : 'warning';

      riskFactors.push({
        sensorId: 'env-cold-stress',
        value: coldRisk,
        weight: 0.55,
      });

      messages.push({
        agent: 'Environmental',
        severity,
        text: `COLD STRESS: Ambient temperature ${envTemp.toFixed(1)}°C. ` +
              `Risk of hypothermia and reduced dexterity. ` +
              `Equipment may experience increased brittleness.`,
        timestamp: now,
      });
    }

    // Equipment reliability at extreme temperatures
    if (envTemp > 45) {
      const equipRisk = Math.min(1, (envTemp - 45) / 5);
      riskFactors.push({
        sensorId: 'env-equip-temp',
        value: equipRisk,
        weight: 0.5,
      });

      // Cross-reference with temperature sensors showing unusual readings
      const tempSensors = sensors.filter((s) => s.type === 'Temperature');
      for (const ts of tempSensors) {
        if (ts.currentValue > ts.normalRange.max * 0.9) {
          messages.push({
            agent: 'Environmental',
            severity: 'warning',
            text: `EQUIPMENT THERMAL: Sensor ${ts.label} reading ${ts.currentValue.toFixed(1)}${ts.unit} ` +
                  `may be influenced by extreme ambient temperature (${envTemp.toFixed(1)}°C).`,
            timestamp: now,
            zone: ts.zoneId,
          });
        }
      }
    }
  }

  // ── Visibility Assessment ──────────────────────────────────────────

  /**
   * Assesses visibility conditions and their impact on safety monitoring
   * and worker awareness.
   *
   * @param {object[]} zones
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _assessVisibility(zones, now, messages, riskFactors) {
    const vis = this.weatherState.visibility;

    if (vis < 3) {
      // Reduced visibility degrades visual monitoring effectiveness
      const visRisk = Math.min(1, (3 - vis) / 2.8); // 0 at 3km, ~1 at 0.2km
      const severity = vis < 0.5 ? 'critical' : vis < 1 ? 'warning' : 'info';

      riskFactors.push({
        sensorId: 'env-visibility',
        value: visRisk,
        weight: 0.45,
      });

      messages.push({
        agent: 'Environmental',
        severity,
        text: `LOW VISIBILITY: ${vis.toFixed(1)} km. ` +
              `${vis < 1 ? 'Visual leak detection severely compromised. ' : 'Reduced monitoring effectiveness. '}` +
              `${vis < 0.5 ? 'Consider activating additional automated monitoring. ' : ''}` +
              `Humidity: ${this.weatherState.humidity.toFixed(0)}%.`,
        timestamp: now,
      });

      // Per-zone visibility risk amplification for high-hazard zones
      for (const zone of zones) {
        if (zone.hazardClass === 'Zone 0' || zone.hazardClass === 'Zone 1') {
          riskFactors.push({
            sensorId: `env-vis-zone-${zone.id}`,
            value: visRisk * 0.8,
            weight: 0.4,
          });
        }
      }
    }
  }

  // ── Atmospheric Pressure ───────────────────────────────────────────

  /**
   * Assesses atmospheric pressure changes and their effect on confined
   * space oxygen concentrations and pressure-sensitive equipment.
   *
   * @param {object[]} sensors
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _assessAtmosphericPressure(sensors, now, messages, riskFactors) {
    const currentPressure = this.weatherState.pressure;

    // Detect rapid pressure drops (storm fronts)
    if (this.weatherHistory.length >= 5) {
      const oldPressure = this.weatherHistory[this.weatherHistory.length - 5].pressure;
      const pressureDelta = currentPressure - oldPressure;

      // Rapid drop > 5 hPa over 5 snapshots indicates approaching weather system
      if (pressureDelta < -5) {
        const dropRate = Math.abs(pressureDelta);
        const pressureRisk = Math.min(1, dropRate / 15);

        riskFactors.push({
          sensorId: 'env-pressure-drop',
          value: pressureRisk,
          weight: 0.55,
        });

        messages.push({
          agent: 'Environmental',
          severity: dropRate > 10 ? 'critical' : 'warning',
          text: `PRESSURE DROP: Atmospheric pressure falling rapidly (${pressureDelta.toFixed(1)} hPa). ` +
                `Current: ${currentPressure.toFixed(0)} hPa. ` +
                `Possible weather front approaching. Confined space O₂ levels may fluctuate.`,
          timestamp: now,
        });
      }
    }

    // Low absolute pressure affects confined space O2
    if (currentPressure < 990) {
      const lowPressureRisk = Math.min(1, (990 - currentPressure) / 40);

      // Cross-reference with pressure sensors
      const pressureSensors = sensors.filter((s) => s.type === 'Pressure');
      for (const ps of pressureSensors) {
        riskFactors.push({
          sensorId: `env-atm-pressure-${ps.id}`,
          value: lowPressureRisk * 0.7,
          weight: 0.5,
        });
      }

      messages.push({
        agent: 'Environmental',
        severity: currentPressure < 970 ? 'critical' : 'warning',
        text: `LOW PRESSURE: Atmospheric pressure ${currentPressure.toFixed(0)} hPa is below normal. ` +
              `Confined space ventilation may be inadequate. Verify O₂ levels manually.`,
        timestamp: now,
      });
    }
  }

  // ── Composite Risk ─────────────────────────────────────────────────

  /**
   * Generates a composite environmental risk factor per zone that combines
   * wind, temperature, visibility, and pressure effects.
   *
   * @param {object[]} zones
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _generateCompositeRisk(zones, now, messages, riskFactors) {
    const { windSpeed, temperature, visibility, pressure } = this.weatherState;

    // Normalized sub-scores
    const windScore = Math.min(1, windSpeed / 35);
    const tempScore = temperature > 35
      ? Math.min(1, (temperature - 35) / 15)
      : temperature < 5
        ? Math.min(1, (5 - temperature) / 15)
        : 0;
    const visScore = visibility < 5 ? Math.min(1, (5 - visibility) / 4.8) : 0;
    const pressScore = pressure < 1000 ? Math.min(1, (1000 - pressure) / 50) : 0;

    const composite = (windScore * 0.3 + tempScore * 0.3 + visScore * 0.2 + pressScore * 0.2);

    if (composite > 0.2) {
      for (const zone of zones) {
        riskFactors.push({
          sensorId: `env-composite-${zone.id}`,
          value: Math.min(1, composite),
          weight: 0.35,
        });
      }
    }

    if (composite > 0.5) {
      messages.push({
        agent: 'Environmental',
        severity: composite > 0.75 ? 'critical' : 'warning',
        text: `ENVIRONMENTAL COMPOSITE: Overall environmental risk elevated (${(composite * 100).toFixed(0)}%). ` +
              `Wind: ${windSpeed.toFixed(1)} km/h, Temp: ${temperature.toFixed(1)}°C, ` +
              `Vis: ${visibility.toFixed(1)} km, Pressure: ${pressure.toFixed(0)} hPa.`,
        timestamp: now,
      });
    }
  }

  // ── Weather Trends ─────────────────────────────────────────────────

  /**
   * Analyses weather history for deteriorating trends and generates
   * early-warning messages before conditions become hazardous.
   *
   * @param {Date}     now
   * @param {object[]} messages
   * @param {object[]} riskFactors
   * @private
   */
  _assessWeatherTrends(now, messages, riskFactors) {
    if (this.weatherHistory.length < 6) return;

    const recent = this.weatherHistory.slice(-6);
    const windTrend = recent[recent.length - 1].windSpeed - recent[0].windSpeed;
    const tempTrend = recent[recent.length - 1].temperature - recent[0].temperature;
    const visTrend = recent[recent.length - 1].visibility - recent[0].visibility;

    // Rapidly increasing wind
    if (windTrend > 10) {
      messages.push({
        agent: 'Environmental',
        severity: 'warning',
        text: `WIND TREND: Wind speed increasing rapidly (+${windTrend.toFixed(1)} km/h over recent period). ` +
              `Current: ${this.weatherState.windSpeed.toFixed(1)} km/h. Secure loose materials.`,
        timestamp: now,
      });
      riskFactors.push({
        sensorId: 'env-wind-trend',
        value: Math.min(1, windTrend / 20),
        weight: 0.4,
      });
    }

    // Rapidly rising temperature
    if (tempTrend > 5) {
      messages.push({
        agent: 'Environmental',
        severity: 'info',
        text: `TEMP TREND: Temperature rising rapidly (+${tempTrend.toFixed(1)}°C). ` +
              `Current: ${this.weatherState.temperature.toFixed(1)}°C. Monitor for heat stress.`,
        timestamp: now,
      });
    }

    // Rapidly deteriorating visibility
    if (visTrend < -3) {
      messages.push({
        agent: 'Environmental',
        severity: 'warning',
        text: `VISIBILITY TREND: Visibility dropping (${visTrend.toFixed(1)} km change). ` +
              `Current: ${this.weatherState.visibility.toFixed(1)} km. Fog/mist developing.`,
        timestamp: now,
      });
    }
  }

  // ── Utility Methods ────────────────────────────────────────────────

  /**
   * Calculates a zone's downwind exposure factor (0 = fully upwind,
   * 1 = fully downwind) relative to the current wind direction.
   *
   * @param {string} zoneId        - Zone identifier (e.g. 'Z-A').
   * @param {number} windDirection - Wind origin in degrees (0 = N).
   * @returns {number} Exposure factor 0-1.
   * @private
   */
  _getZoneWindExposure(zoneId, windDirection) {
    const zoneBearing = this.zoneBearings[zoneId] ?? 0;
    // Wind blows FROM windDirection, so downwind = windDirection + 180
    const downwindBearing = (windDirection + 180) % 360;
    // Angular difference between zone bearing and downwind direction
    let angleDiff = Math.abs(zoneBearing - downwindBearing);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    // 0° diff = fully downwind (exposure 1), 180° diff = fully upwind (exposure 0)
    return 1 - angleDiff / 180;
  }

  /**
   * Generates pseudo-random noise centred on a value.
   *
   * @param {number} centre    - Centre value.
   * @param {number} amplitude - Maximum deviation.
   * @returns {number} Noisy value.
   * @private
   */
  _addNoise(centre, amplitude) {
    return centre + (Math.random() - 0.5) * 2 * amplitude;
  }
}
