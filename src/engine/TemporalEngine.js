// ============================================================================
// ShieldAI — Temporal Engine
// Calculates shift-based temporal risk factors: shift phase, proximity to
// shift changes, time-of-day risk, and fatigue accumulation.
// Shift transitions are statistically the most dangerous periods in
// industrial operations.
// ============================================================================

/**
 * Shift duration in simulation seconds (8-hour shift = 480 simulated minutes).
 * In simulation time, 1 tick = 2 seconds, so an 8-hour shift = 480 seconds.
 */
const SHIFT_DURATION = 480; // 8 hours compressed to 480 sim-seconds

/**
 * Shift change buffer zone in simulation seconds.
 * The 30 minutes before/after shift change are highest risk.
 */
const SHIFT_CHANGE_BUFFER = 30; // 30 sim-seconds ≈ 30 minutes real

/**
 * Shift phase definitions:
 * - start:      First 15% of shift (alertness ramping up)
 * - mid:        Core working period (15-75% of shift)
 * - end:        Last 25% of shift (fatigue accumulating)
 * - changeover: Within SHIFT_CHANGE_BUFFER of a shift boundary
 */
const PHASE_BOUNDARIES = {
  start: 0.15,
  mid: 0.75,
  // end: beyond 0.75
};

export class TemporalEngine {
  constructor() {
    this.name = 'Temporal';
  }

  /**
   * Computes temporal risk factors for the current simulation clock.
   *
   * @param {number} simulationClock - Seconds elapsed in simulation.
   * @returns {{
   *   shiftPhase: 'start'|'mid'|'end'|'changeover',
   *   shiftChangeMinutes: number,
   *   timeOfDayFactor: number,
   *   fatigueLevel: 'low'|'moderate'|'high',
   *   hoursIntoShift: number,
   *   shiftNumber: number,
   * }}
   */
  calculate(simulationClock) {
    // Current position within the shift cycle
    const positionInShift = simulationClock % SHIFT_DURATION;
    const shiftProgress = positionInShift / SHIFT_DURATION;
    const shiftNumber = Math.floor(simulationClock / SHIFT_DURATION) + 1;

    // Minutes until/since shift change
    const minutesToShiftEnd = SHIFT_DURATION - positionInShift;
    const minutesSinceShiftStart = positionInShift;
    const shiftChangeMinutes = Math.min(minutesSinceShiftStart, minutesToShiftEnd);

    // Determine shift phase
    let shiftPhase;
    if (shiftChangeMinutes <= SHIFT_CHANGE_BUFFER) {
      shiftPhase = 'changeover';
    } else if (shiftProgress < PHASE_BOUNDARIES.start) {
      shiftPhase = 'start';
    } else if (shiftProgress < PHASE_BOUNDARIES.mid) {
      shiftPhase = 'mid';
    } else {
      shiftPhase = 'end';
    }

    // Time-of-day risk factor
    // Higher during shift transitions and end of shift
    const timeOfDayFactor = this._computeTimeOfDayRisk(shiftProgress, shiftChangeMinutes);

    // Fatigue level
    const fatigueLevel = this._computeFatigueLevel(shiftProgress, shiftPhase);

    // Hours into shift (for display)
    const hoursIntoShift = Math.round((shiftProgress * 8) * 10) / 10;

    return {
      shiftPhase,
      shiftChangeMinutes: Math.round(shiftChangeMinutes),
      timeOfDayFactor,
      fatigueLevel,
      hoursIntoShift,
      shiftNumber,
    };
  }

  /**
   * Computes a time-of-day risk factor (0-1).
   * Shift changeover and end-of-shift periods carry the highest risk.
   *
   * Risk profile (based on industrial safety research):
   * - Start of shift:   0.4 (workers adjusting, not fully alert)
   * - Mid shift:        0.2 (peak performance)
   * - End of shift:     0.6 (fatigue, rushing to finish)
   * - Shift changeover: 0.8 (communication gaps, incomplete handovers)
   *
   * @param {number} progress - 0-1 progress through current shift
   * @param {number} minutesToChange - minutes to nearest shift boundary
   * @returns {number} Risk factor 0-1
   */
  _computeTimeOfDayRisk(progress, minutesToChange) {
    // Base risk from shift position
    let baseRisk;
    if (progress < 0.15) {
      // Start of shift — descending risk
      baseRisk = 0.4 - (progress / 0.15) * 0.2;
    } else if (progress < 0.75) {
      // Mid shift — low and stable
      baseRisk = 0.2;
    } else {
      // End of shift — ascending risk
      const endProgress = (progress - 0.75) / 0.25;
      baseRisk = 0.2 + endProgress * 0.4;
    }

    // Amplify near shift change boundaries
    if (minutesToChange <= SHIFT_CHANGE_BUFFER) {
      const proximity = 1 - (minutesToChange / SHIFT_CHANGE_BUFFER);
      baseRisk = Math.max(baseRisk, 0.5 + proximity * 0.3);
    }

    return Math.min(1, Math.max(0, baseRisk));
  }

  /**
   * Determines fatigue level based on shift progress.
   *
   * @param {number} progress - 0-1 through current shift
   * @param {string} phase - Current shift phase
   * @returns {'low'|'moderate'|'high'}
   */
  _computeFatigueLevel(progress, phase) {
    if (phase === 'changeover') {
      // Changeover can go either way — moderate baseline
      return progress > 0.5 ? 'high' : 'moderate';
    }
    if (progress < 0.4) return 'low';
    if (progress < 0.7) return 'moderate';
    return 'high';
  }
}
