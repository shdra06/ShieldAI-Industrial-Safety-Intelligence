// ============================================================================
// ShieldAI — Formatters
// Display formatting utilities for time, sensor values, and durations.
// ============================================================================

/**
 * Formats a Date object as HH:MM:SS (24-hour).
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Formats a Date object as HH:MM:SS.mmm (with milliseconds).
 * @param {Date} date
 * @returns {string}
 */
export function formatTimestamp(date) {
  const d = date instanceof Date ? date : new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * Formats a sensor reading with its unit.
 * @param {number} value - Sensor value
 * @param {string} unit  - Unit label (e.g., 'ppm', '% LEL', '°C')
 * @returns {string} e.g., "15.2 ppm"
 */
export function formatSensorValue(value, unit) {
  if (value == null || isNaN(value)) return `-- ${unit}`;

  // Use appropriate decimal places based on magnitude
  let formatted;
  if (Math.abs(value) >= 100) {
    formatted = value.toFixed(0);
  } else if (Math.abs(value) >= 10) {
    formatted = value.toFixed(1);
  } else {
    formatted = value.toFixed(2);
  }

  return `${formatted} ${unit}`;
}

/**
 * Formats a number as a percentage string.
 * @param {number} value - Value in range [0, 100] or [0, 1] (auto-detected)
 * @returns {string} e.g., "85.2%"
 */
export function formatPercentage(value) {
  if (value == null || isNaN(value)) return '--%';

  // If value is in [0, 1], treat it as a fraction; otherwise treat as percentage
  const pct = value <= 1 && value >= 0 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/**
 * Formats a duration in seconds as a human-readable string.
 * @param {number} seconds
 * @returns {string} e.g., "2m 30s", "1h 5m 12s", "45s"
 */
export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '0s';

  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
}

/**
 * Returns a human-readable "time ago" string.
 * @param {Date|string|number} date
 * @returns {string} e.g., "3 minutes ago", "just now"
 */
export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDay === 1) return '1 day ago';
  return `${diffDay} days ago`;
}
