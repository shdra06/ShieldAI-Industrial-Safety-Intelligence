/**
 * @fileoverview Digital Twin — simplified physics-based plant simulation.
 *
 * Models gas dispersion (Gaussian plume), heat transfer (Newton's cooling),
 * and pressure dynamics (ideal gas law) across an industrial facility's zones.
 * Provides a what-if engine for scenario planning.
 *
 * All computations are pure JavaScript with no external dependencies.
 *
 * @module DigitalTwin
 */

// ─── Physical constants ─────────────────────────────────────────────────────────

/** Standard atmospheric pressure in kPa */
const STD_PRESSURE_KPA = 101.325;

/** Standard ambient temperature in Kelvin */
const STD_TEMP_K = 293.15; // ≈ 20 °C

/** Default heat transfer coefficient (W / (m²·K), simplified) */
const DEFAULT_HEAT_TRANSFER_K = 0.05;

/** Default time step for Euler integration (seconds, normalized) */
const DT = 1.0;

/** Default release height for gas plume (metres) */
const DEFAULT_RELEASE_HEIGHT = 2.0;

/** Default what-if simulation duration (ticks) */
const DEFAULT_WHATIF_DURATION = 15;

/** Zone adjacency chain: Z-A↔Z-B↔Z-C↔Z-D↔Z-E↔Z-F */
const DEFAULT_ADJACENCY = {
  'Z-A': ['Z-B'],
  'Z-B': ['Z-A', 'Z-C'],
  'Z-C': ['Z-B', 'Z-D'],
  'Z-D': ['Z-C', 'Z-E'],
  'Z-E': ['Z-D', 'Z-F'],
  'Z-F': ['Z-E'],
};

// ─── Pasquill-Gifford dispersion coefficients ───────────────────────────────────

/**
 * Pasquill-Gifford stability classes A–F.
 * Each class defines coefficients for σy and σz as power-law functions of
 * downwind distance x (metres):
 *   σy = ay · x^by
 *   σz = az · x^bz
 *
 * Values are simplified empirical fits from Turner (1970).
 * @type {Object<string, { ay: number, by: number, az: number, bz: number }>}
 */
const PG_COEFFICIENTS = Object.freeze({
  A: { ay: 0.3658, by: 0.9031, az: 0.192,  bz: 0.9360 },
  B: { ay: 0.2751, by: 0.9031, az: 0.156,  bz: 0.9031 },
  C: { ay: 0.2090, by: 0.9031, az: 0.116,  bz: 0.8855 },
  D: { ay: 0.1471, by: 0.9031, az: 0.079,  bz: 0.8650 },
  E: { ay: 0.1046, by: 0.9031, az: 0.063,  bz: 0.8550 },
  F: { ay: 0.0722, by: 0.9031, az: 0.053,  bz: 0.8400 },
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Determine the Pasquill-Gifford stability class based on wind speed and solar
 * radiation (simplified look-up).
 *
 * @param {number} windSpeed      - Wind speed in m/s.
 * @param {number} solarRadiation - Solar radiation in W/m² (0 = night).
 * @returns {'A'|'B'|'C'|'D'|'E'|'F'}
 * @private
 */
function determineStabilityClass(windSpeed, solarRadiation) {
  const isNight = solarRadiation <= 50;
  if (isNight) {
    return windSpeed < 3 ? 'F' : windSpeed < 5 ? 'E' : 'D';
  }
  // Daytime
  if (windSpeed < 2) return solarRadiation > 600 ? 'A' : 'B';
  if (windSpeed < 3) return solarRadiation > 600 ? 'A' : solarRadiation > 300 ? 'B' : 'C';
  if (windSpeed < 5) return solarRadiation > 600 ? 'B' : solarRadiation > 300 ? 'C' : 'D';
  return solarRadiation > 300 ? 'C' : 'D';
}

/**
 * Compute the Gaussian plume dispersion coefficients σy and σz.
 *
 * @param {string} stabilityClass - Pasquill-Gifford class (A–F).
 * @param {number} x              - Downwind distance in metres.
 * @returns {{ sigmaY: number, sigmaZ: number }}
 * @private
 */
function dispersionCoefficients(stabilityClass, x) {
  const pg = PG_COEFFICIENTS[stabilityClass] || PG_COEFFICIENTS.D;
  const xAbs = Math.max(Math.abs(x), 1); // avoid zero
  return {
    sigmaY: pg.ay * Math.pow(xAbs, pg.by),
    sigmaZ: pg.az * Math.pow(xAbs, pg.bz),
  };
}

/**
 * Convert degrees to radians.
 * @param {number} deg
 * @returns {number}
 * @private
 */
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Deep-clone a simple object (JSON-safe).
 * @param {*} obj
 * @returns {*}
 * @private
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─── DigitalTwin ────────────────────────────────────────────────────────────────

/**
 * Simplified physics-based digital twin of an industrial plant.
 *
 * Models:
 *   A. Gaussian plume gas dispersion
 *   B. Newton's-law heat transfer between adjacent zones
 *   C. Ideal-gas pressure dynamics in confined spaces
 *   D. What-if scenario engine
 *
 * @example
 * ```js
 * const twin = new DigitalTwin(zones, sensors);
 * const predictions = twin.tick(currentState, envData, clock);
 * const scenario = twin.whatIf({ sensorOverrides: { 'CH4-ZA': 100 }, windSpeed: 20 });
 * ```
 *
 * @export
 * @class DigitalTwin
 */
export class DigitalTwin {
  /**
   * Create a DigitalTwin instance.
   *
   * @param {Array<{
   *   id: string,
   *   name: string,
   *   centroid: { x: number, y: number, z: number },
   *   volume: number,
   *   isConfined: boolean,
   *   adjacentZones?: string[]
   * }>} zones - Zone definitions.
   *
   * @param {Array<{
   *   id: string,
   *   zoneId: string,
   *   type: string
   * }>} sensors - Sensor definitions mapped to zones.
   */
  constructor(zones, sensors) {
    /** @type {Map<string, Object>} */
    this._zones = new Map();
    for (const z of zones) {
      this._zones.set(z.id, {
        ...z,
        adjacentZones: z.adjacentZones || DEFAULT_ADJACENCY[z.id] || [],
      });
    }

    /** @type {Map<string, Object>} */
    this._sensors = new Map();
    for (const s of sensors) {
      this._sensors.set(s.id, { ...s });
    }

    /** @type {Map<string, Object>} Per-zone physics state */
    this._state = new Map();

    /** @type {number} Current simulation tick */
    this._tick = 0;

    this._initState();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Advance the simulation by one time step and return physics predictions.
   *
   * @param {Object<string, number>} currentState - Sensor readings keyed by sensor ID.
   * @param {{
   *   windSpeed: number,
   *   windDirection: number,
   *   ambientTemp: number,
   *   solarRadiation?: number
   * }} environmentalData - Current environmental conditions.
   * @param {number} simulationClock - Current simulation tick number.
   * @returns {{
   *   tick: number,
   *   gasConcentrations: Object<string, number>,
   *   temperatures: Object<string, number>,
   *   pressures: Object<string, number>,
   *   alerts: Array<{ zoneId: string, type: string, value: number, threshold: number }>
   * }}
   */
  tick(currentState, environmentalData, simulationClock) {
    this._tick = simulationClock;

    // A. Gas dispersion
    const gasConcentrations = this._computeGasDispersion(currentState, environmentalData);

    // B. Heat transfer
    const temperatures = this._computeHeatTransfer(currentState, environmentalData);

    // C. Pressure dynamics
    const pressures = this._computePressureDynamics(temperatures);

    // Update internal state
    for (const [zoneId, zState] of this._state) {
      zState.gasConcentration = gasConcentrations[zoneId] ?? zState.gasConcentration;
      zState.temperature = temperatures[zoneId] ?? zState.temperature;
      zState.pressure = pressures[zoneId] ?? zState.pressure;
      zState.lastUpdated = simulationClock;
    }

    // Generate alerts
    const alerts = this._generateAlerts(gasConcentrations, temperatures, pressures);

    return {
      tick: simulationClock,
      gasConcentrations,
      temperatures,
      pressures,
      alerts,
    };
  }

  /**
   * Run a what-if scenario simulation.
   *
   * Temporarily overrides sensor readings and/or environmental conditions,
   * then steps the physics models forward for a specified duration.
   *
   * @param {{
   *   sensorOverrides?: Object<string, number>,
   *   windSpeed?: number,
   *   windDirection?: number,
   *   ambientTemp?: number,
   *   solarRadiation?: number,
   *   duration?: number
   * }} scenario - Hypothetical conditions to simulate.
   * @returns {{
   *   timeline: Array<Object>,
   *   affectedZones: Array<{ zoneId: string, maxGas: number, maxTemp: number, severity: string }>,
   *   summary: string
   * }}
   */
  whatIf(scenario) {
    const duration = scenario.duration ?? DEFAULT_WHATIF_DURATION;

    // Snapshot current state so we can restore later
    const savedState = deepClone(Array.from(this._state.entries()));
    const savedTick = this._tick;

    // Build base sensor readings from current state
    const baseSensorState = {};
    for (const [sId, sensor] of this._sensors) {
      const zState = this._state.get(sensor.zoneId);
      baseSensorState[sId] = zState ? zState.gasConcentration : 0;
    }

    // Apply sensor overrides
    const sensorState = { ...baseSensorState, ...(scenario.sensorOverrides || {}) };

    // Build environmental data
    const envData = {
      windSpeed: scenario.windSpeed ?? 5,
      windDirection: scenario.windDirection ?? 0,
      ambientTemp: scenario.ambientTemp ?? 20,
      solarRadiation: scenario.solarRadiation ?? 400,
    };

    const timeline = [];
    const zoneMaxGas = {};
    const zoneMaxTemp = {};

    for (const [zoneId] of this._zones) {
      zoneMaxGas[zoneId] = 0;
      zoneMaxTemp[zoneId] = -Infinity;
    }

    // Step forward
    for (let t = 1; t <= duration; t++) {
      const result = this.tick(sensorState, envData, savedTick + t);
      timeline.push({ ...result });

      // Track maxima
      for (const [zoneId] of this._zones) {
        zoneMaxGas[zoneId] = Math.max(zoneMaxGas[zoneId], result.gasConcentrations[zoneId] ?? 0);
        zoneMaxTemp[zoneId] = Math.max(zoneMaxTemp[zoneId], result.temperatures[zoneId] ?? 0);
      }
    }

    // Determine affected zones
    const affectedZones = [];
    for (const [zoneId] of this._zones) {
      const maxGas = zoneMaxGas[zoneId];
      const maxTemp = zoneMaxTemp[zoneId];
      let severity = 'None';
      if (maxGas > 50 || maxTemp > 80) severity = 'Critical';
      else if (maxGas > 25 || maxTemp > 60) severity = 'High';
      else if (maxGas > 10 || maxTemp > 45) severity = 'Moderate';
      else if (maxGas > 2 || maxTemp > 30) severity = 'Low';

      if (severity !== 'None') {
        affectedZones.push({ zoneId, maxGas, maxTemp, severity });
      }
    }

    // Generate summary
    const summary = this._generateWhatIfSummary(scenario, affectedZones, duration);

    // Restore state
    this._state = new Map(savedState.map(([k, v]) => [k, v]));
    this._tick = savedTick;

    return { timeline, affectedZones, summary };
  }

  /**
   * Return the current internal physics state of all zones.
   *
   * @returns {Object<string, {
   *   gasConcentration: number,
   *   temperature: number,
   *   pressure: number,
   *   lastUpdated: number
   * }>}
   */
  getPhysicsState() {
    const result = {};
    for (const [zoneId, zState] of this._state) {
      result[zoneId] = {
        gasConcentration: zState.gasConcentration,
        temperature: zState.temperature,
        pressure: zState.pressure,
        lastUpdated: zState.lastUpdated,
      };
    }
    return result;
  }

  /**
   * Reset all physics state to initial conditions.
   */
  reset() {
    this._tick = 0;
    this._initState();
  }

  // ─── Private: Initialization ────────────────────────────────────────────────

  /**
   * Initialize per-zone physics state to ambient defaults.
   * @private
   */
  _initState() {
    this._state = new Map();
    for (const [zoneId, zone] of this._zones) {
      this._state.set(zoneId, {
        gasConcentration: 0,
        temperature: 20, // °C
        pressure: STD_PRESSURE_KPA,
        referenceTemp: STD_TEMP_K, // Kelvin (for ideal gas)
        referencePressure: STD_PRESSURE_KPA,
        volume: zone.volume || 1000, // m³
        isConfined: zone.isConfined || false,
        lastUpdated: 0,
      });
    }
  }

  // ─── Private: Gas Dispersion (Gaussian Plume) ──────────────────────────────

  /**
   * Compute gas concentrations at each zone centroid using the Gaussian plume model.
   *
   * For each gas-emitting sensor, a plume is projected downwind and the
   * concentration is evaluated at every zone's centroid.
   *
   * C(x,y,z) = (Q / (2π·u·σy·σz)) × exp(-y²/(2σy²))
   *          × [ exp(-(z-H)²/(2σz²)) + exp(-(z+H)²/(2σz²)) ]
   *
   * @param {Object<string, number>} sensorState
   * @param {{ windSpeed: number, windDirection: number, solarRadiation?: number }} envData
   * @returns {Object<string, number>} Zone ID → gas concentration (ppm).
   * @private
   */
  _computeGasDispersion(sensorState, envData) {
    const result = {};
    const windSpeed = Math.max(envData.windSpeed, 0.5); // avoid division by zero
    const windDirRad = degToRad(envData.windDirection);
    const stabilityClass = determineStabilityClass(windSpeed, envData.solarRadiation ?? 400);

    // Initialise concentrations to zero
    for (const [zoneId] of this._zones) {
      result[zoneId] = 0;
    }

    // For each sensor reading, model a plume
    for (const [sensorId, sensor] of this._sensors) {
      const reading = sensorState[sensorId];
      if (reading === undefined || reading <= 0) continue;

      // Only gas-type sensors produce plumes
      if (!this._isGasSensor(sensor.type)) continue;

      const sourceZone = this._zones.get(sensor.zoneId);
      if (!sourceZone) continue;

      const Q = reading; // emission rate proportional to sensor reading
      const H = DEFAULT_RELEASE_HEIGHT;

      // Evaluate concentration at each zone centroid
      for (const [targetId, targetZone] of this._zones) {
        if (targetId === sensor.zoneId) {
          // Source zone gets the full reading
          result[targetId] += Q;
          continue;
        }

        const dx = targetZone.centroid.x - sourceZone.centroid.x;
        const dy = targetZone.centroid.y - sourceZone.centroid.y;
        const dz = (targetZone.centroid.z || 0) - (sourceZone.centroid.z || 0);

        // Rotate into wind-aligned coordinates
        const cosW = Math.cos(windDirRad);
        const sinW = Math.sin(windDirRad);
        const xWind = dx * cosW + dy * sinW;   // downwind distance
        const yWind = -dx * sinW + dy * cosW;  // crosswind distance

        // Only compute for points downwind (x > 0)
        if (xWind <= 0) continue;

        const { sigmaY, sigmaZ } = dispersionCoefficients(stabilityClass, xWind);

        // Guard against tiny sigma values
        if (sigmaY < 0.01 || sigmaZ < 0.01) continue;

        const expY = Math.exp(-(yWind * yWind) / (2 * sigmaY * sigmaY));
        const expZ1 = Math.exp(-((dz - H) * (dz - H)) / (2 * sigmaZ * sigmaZ));
        const expZ2 = Math.exp(-((dz + H) * (dz + H)) / (2 * sigmaZ * sigmaZ));

        const concentration =
          (Q / (2 * Math.PI * windSpeed * sigmaY * sigmaZ)) * expY * (expZ1 + expZ2);

        result[targetId] += concentration;
      }
    }

    return result;
  }

  // ─── Private: Heat Transfer ────────────────────────────────────────────────

  /**
   * Model temperature changes via Newton's law of cooling with inter-zone
   * conduction using Euler integration.
   *
   *   dT/dt = −k·(T − T_ambient) + Q_source + Σ k_adj·(T_neighbor − T)
   *
   * @param {Object<string, number>} sensorState
   * @param {{ ambientTemp: number }} envData
   * @returns {Object<string, number>} Zone ID → new temperature (°C).
   * @private
   */
  _computeHeatTransfer(sensorState, envData) {
    const result = {};
    const ambientTemp = envData.ambientTemp ?? 20;

    for (const [zoneId, zone] of this._zones) {
      const zState = this._state.get(zoneId);
      const currentTemp = zState.temperature;

      // Heat source from temperature sensors in this zone
      let qSource = 0;
      for (const [sId, sensor] of this._sensors) {
        if (sensor.zoneId === zoneId && this._isTemperatureSensor(sensor.type)) {
          const reading = sensorState[sId];
          if (reading !== undefined) {
            // The sensor reading drives toward the reported temperature
            qSource += (reading - currentTemp) * 0.1;
          }
        }
      }

      // Cooling toward ambient
      let dTdt = -DEFAULT_HEAT_TRANSFER_K * (currentTemp - ambientTemp) + qSource;

      // Conduction from adjacent zones
      const adjacentIds = zone.adjacentZones || [];
      for (const adjId of adjacentIds) {
        const adjState = this._state.get(adjId);
        if (adjState) {
          dTdt += DEFAULT_HEAT_TRANSFER_K * 0.5 * (adjState.temperature - currentTemp);
        }
      }

      // Euler step
      result[zoneId] = currentTemp + dTdt * DT;
    }

    return result;
  }

  // ─── Private: Pressure Dynamics ────────────────────────────────────────────

  /**
   * Model pressure changes in confined zones using the ideal gas law.
   *
   *   P₁V₁/T₁ = P₂V₂/T₂  ⟹  P₂ = P₁ · T₂/T₁  (constant volume)
   *
   * @param {Object<string, number>} temperatures - Updated zone temperatures.
   * @returns {Object<string, number>} Zone ID → pressure (kPa).
   * @private
   */
  _computePressureDynamics(temperatures) {
    const result = {};

    for (const [zoneId] of this._zones) {
      const zState = this._state.get(zoneId);

      if (zState.isConfined) {
        // Convert temperatures to Kelvin
        const T1 = zState.referenceTemp; // Kelvin
        const T2 = (temperatures[zoneId] ?? 20) + 273.15; // °C → K
        const P1 = zState.referencePressure;

        // Ideal gas: P2 = P1 * (T2 / T1) — volume assumed constant
        result[zoneId] = P1 * (T2 / T1);
      } else {
        // Open zones maintain atmospheric pressure with slight fluctuation
        result[zoneId] = STD_PRESSURE_KPA;
      }
    }

    return result;
  }

  // ─── Private: Alert Generation ─────────────────────────────────────────────

  /**
   * Check physics predictions against safety thresholds and generate alerts.
   *
   * @param {Object<string, number>} gas
   * @param {Object<string, number>} temp
   * @param {Object<string, number>} pressure
   * @returns {Array<{ zoneId: string, type: string, value: number, threshold: number }>}
   * @private
   */
  _generateAlerts(gas, temp, pressure) {
    const alerts = [];

    for (const [zoneId] of this._zones) {
      // Gas thresholds (ppm)
      if ((gas[zoneId] ?? 0) > 25) {
        alerts.push({ zoneId, type: 'GAS_HIGH', value: gas[zoneId], threshold: 25 });
      }
      // Temperature thresholds (°C)
      if ((temp[zoneId] ?? 0) > 60) {
        alerts.push({ zoneId, type: 'TEMP_HIGH', value: temp[zoneId], threshold: 60 });
      }
      // Pressure thresholds (kPa)
      if ((pressure[zoneId] ?? STD_PRESSURE_KPA) > 115) {
        alerts.push({ zoneId, type: 'PRESSURE_HIGH', value: pressure[zoneId], threshold: 115 });
      }
    }

    return alerts;
  }

  // ─── Private: Sensor type checks ──────────────────────────────────────────

  /**
   * Check if a sensor type represents a gas sensor.
   * @param {string} type
   * @returns {boolean}
   * @private
   */
  _isGasSensor(type) {
    const gasTypes = ['gas', 'ch4', 'h2s', 'co', 'methane', 'voc', 'combustible'];
    return gasTypes.includes((type || '').toLowerCase());
  }

  /**
   * Check if a sensor type represents a temperature sensor.
   * @param {string} type
   * @returns {boolean}
   * @private
   */
  _isTemperatureSensor(type) {
    const tempTypes = ['temperature', 'temp', 'thermal', 'heat'];
    return tempTypes.includes((type || '').toLowerCase());
  }

  // ─── Private: What-If Summary ─────────────────────────────────────────────

  /**
   * Generate a human-readable summary for a what-if scenario result.
   *
   * @param {Object} scenario
   * @param {Array<{ zoneId: string, severity: string }>} affectedZones
   * @param {number} duration
   * @returns {string}
   * @private
   */
  _generateWhatIfSummary(scenario, affectedZones, duration) {
    const overrides = scenario.sensorOverrides
      ? Object.entries(scenario.sensorOverrides)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : 'none';

    const critical = affectedZones.filter((z) => z.severity === 'Critical');
    const high = affectedZones.filter((z) => z.severity === 'High');

    const parts = [
      `What-if simulation ran for ${duration} ticks with overrides: [${overrides}].`,
    ];

    if (scenario.windSpeed !== undefined) {
      parts.push(`Wind speed set to ${scenario.windSpeed} m/s.`);
    }
    if (scenario.windDirection !== undefined) {
      parts.push(`Wind direction set to ${scenario.windDirection}°.`);
    }

    if (critical.length > 0) {
      parts.push(
        `CRITICAL impact in ${critical.map((z) => z.zoneId).join(', ')}. Immediate action required.`
      );
    }
    if (high.length > 0) {
      parts.push(`High impact in ${high.map((z) => z.zoneId).join(', ')}.`);
    }
    if (affectedZones.length === 0) {
      parts.push('No significant impact predicted.');
    }

    return parts.join(' ');
  }
}
