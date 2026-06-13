/**
 * TrelleMasters 2026 – Handicap Utilities
 *
 * Handles parsing and formatting of golf handicaps, including
 * plus-handicaps (better than scratch, e.g. +2.4).
 *
 * Internal convention:
 *   - Regular handicap 22.3 → stored as  22.3
 *   - Plus handicap   +2.4 → stored as -2.4
 *
 * This keeps ascending sort correct (lowest = strongest) for
 * serpentine draft in team-generator.js without any changes.
 */

/** Lower/upper bounds for a valid handicap value. */
export const HANDICAP_MIN = -10;  // allows plus handicaps down to +10
export const HANDICAP_MAX = 54;

/**
 * Parse a user-entered handicap string into the internal numeric form.
 *
 * Accepted formats:
 *   "22.3"  → 22.3   (regular handicap)
 *   "+2.4"  → -2.4   (plus handicap)
 *   "-2.4"  → -2.4   (already in internal form)
 *   "2.4"   → 2.4    (regular handicap)
 *
 * @param {string} input – raw user input
 * @returns {{ ok: true, value: number } | { ok: false, error: string }}
 */
export function parseHandicap(input) {
  if (input === null || input === undefined) {
    return { ok: false, error: 'Handicap måste anges.' };
  }

  const trimmed = String(input).trim();

  if (trimmed === '') {
    return { ok: false, error: 'Handicap måste anges.' };
  }

  // Strip leading "+" and convert to number.
  // "+2.4" → -2.4,  "22.3" → 22.3,  "-2.4" → -2.4
  let normalized = trimmed;
  let isPlus = false;

  if (normalized.startsWith('+')) {
    isPlus = true;
    normalized = normalized.slice(1);
  }

  // Accept Swedish decimal comma (e.g. "22,3" → "22.3")
  normalized = normalized.replace(',', '.');

  const num = parseFloat(normalized);

  if (isNaN(num)) {
    return { ok: false, error: 'Handicap måste vara ett giltigt tal.' };
  }

  // A value explicitly typed with "-" is already the internal form.
  const value = isPlus ? -Math.abs(num) : num;

  // Normalize -0 to 0 (otherwise "+0" would be stored as -0)
  const cleanValue = Object.is(value, -0) ? 0 : value;

  if (cleanValue < HANDICAP_MIN || cleanValue > HANDICAP_MAX) {
    return { ok: false, error: `Handicap måste vara mellan ${formatHandicap(HANDICAP_MIN)} och ${HANDICAP_MAX}.` };
  }

  return { ok: true, value: cleanValue };
}

/**
 * Format an internal numeric handicap for display.
 *
 *   -2.4  → "+2.4"   (plus handicap)
 *    22.3 → "22.3"   (regular)
 *
 * @param {number} hcp – internal numeric handicap
 * @param {number} [decimals=1] – number of decimal places
 * @returns {string}
 */
export function formatHandicap(hcp, decimals = 1) {
  if (typeof hcp !== 'number' || isNaN(hcp)) return '—';

  if (hcp < 0) {
    return '+' + Math.abs(hcp).toFixed(decimals);
  }
  return hcp.toFixed(decimals);
}
