/**
 * TrelleMasters 2026 – Handicap-fördelningstabeller
 *
 * Definierar hur många försök/slag varje spelare får i varje moment,
 * baserat på handicap. Syftet är att alla ska ha en chans — från
 * plus-handicap-spelare till de med hcp 54.
 */

// ─── Handicap-band ──────────────────────────────────
// Plus-handicap lagras internt som negativa tal (se handicap-utils.js).
export const HCP_BANDS = [
  { id: 'A', label: 'Scratch / Plus', min: -5,  max: 5,   emoji: '🏌️' },
  { id: 'B', label: 'Låg',            min: 5,   max: 15,  emoji: '👍' },
  { id: 'C', label: 'Medel',          min: 15,  max: 25,  emoji: '😊' },
  { id: 'D', label: 'Hög',            min: 25,  max: 36,  emoji: '💪' },
  { id: 'E', label: 'Max',            min: 36,  max: 54,  emoji: '🌟' },
];

// ─── Moment-definitioner ────────────────────────────
// attempts[i] motsvarar antalet försök i HCP_BANDS[i].
export const MOMENTS = [
  {
    id: 'putt',
    name: 'Putt-tävling',
    emoji: '⛳',
    rule: 'Bästa 3 puttar räknas',
    attempts: [5, 6, 7, 8, 10],
  },
  {
    id: 'chipping',
    name: 'Chipping-spel',
    emoji: '🎯',
    rule: 'Bästa omgången räknas',
    attempts: [6, 7, 8, 9, 10],
  },
  {
    id: 'hink',
    name: 'Chip i hink',
    emoji: '🪣',
    rule: 'Boll i hinken = 1 poäng',
    attempts: [5, 6, 7, 8, 10],
  },
  {
    id: 'ctp-56',
    name: 'Closest to the pin 56m',
    emoji: '📌',
    rule: 'Bästa försöket räknas',
    attempts: [3, 4, 5, 6, 8],
  },
  {
    id: 'ctp-124',
    name: 'Closest to the pin 124m',
    emoji: '📏',
    rule: 'Bästa försöket räknas',
    attempts: [3, 4, 5, 6, 8],
  },
  {
    id: 'drive',
    name: 'Longest drive',
    emoji: '💥',
    rule: 'Längsta slaget räknas',
    attempts: [4, 5, 6, 7, 8],
  },
];

/**
 * Hittar rätt handicap-band för ett givet handicap-värde.
 * @param {number} hcp — Handicap (internt format: plus = negativt)
 * @returns {object} Band-objekt från HCP_BANDS
 */
export function getBand(hcp) {
  for (const band of HCP_BANDS) {
    if (hcp >= band.min && hcp < band.max) return band;
  }
  // Hcp 54.0 hamnar i sista bandet (max är inklusivt där)
  if (hcp >= 54) return HCP_BANDS[HCP_BANDS.length - 1];
  // Plus-handicap under -5 (t.ex. -5.5)
  if (hcp < -5) return HCP_BANDS[0];
  return HCP_BANDS[0];
}

/**
 * Hittar rätt band baserat på en sträng (t.ex. "22.3" eller "+2.4").
 * @param {string} hcpStr
 * @returns {object|null} Band-objekt eller null vid ogiltig indata
 */
export function getBandFromInput(hcpStr) {
  let value;
  const trimmed = hcpStr.trim();

  if (trimmed.startsWith('+')) {
    value = -Math.abs(parseFloat(trimmed.slice(1).replace(',', '.')));
  } else {
    value = parseFloat(trimmed.replace(',', '.'));
  }

  if (isNaN(value)) return null;
  return getBand(value);
}

/**
 * Returnerar antal försök för ett specifikt moment och handicap-band.
 * @param {string} momentId
 * @param {string} bandId
 * @returns {number}
 */
export function getAttempts(momentId, bandId) {
  const moment = MOMENTS.find((m) => m.id === momentId);
  if (!moment) return 0;

  const bandIndex = HCP_BANDS.findIndex((b) => b.id === bandId);
  if (bandIndex === -1) return 0;

  return moment.attempts[bandIndex];
}
