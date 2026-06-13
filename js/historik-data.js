/**
 * TrelleMasters – History data module (pure functions)
 *
 * Contains the 2025 fallback data and pure functions for sorting and
 * merging Firestore history documents with the fallback. No Firebase
 * imports — fully testable with vitest.
 */

/**
 * Event column definitions — kept in sync with scoreboard.js.
 */
export const EVENT_COLUMNS = [
  { id: 'putt', label: 'Putt' },
  { id: 'chip_spel', label: 'Chip' },
  { id: 'chip_hink', label: 'Hink' },
  { id: 'cttp_56', label: '56m' },
  { id: 'cttp_124', label: '124m' },
  { id: 'drive', label: 'Drive' },
  { id: 'scramble', label: 'Scramble' },
  { id: 'roliga_skott', label: 'Rolig' }
];

/**
 * Hardcoded 2025 results used as a fallback when Firestore has no history
 * documents. The shape matches what buildHistorySnapshot() writes to
 * Firestore so the renderer can treat both sources identically.
 */
export const FALLBACK_HISTORY_2025 = {
  year: 2025,
  date: '2025-07-12',
  winner: 'Henrik S',
  participantCount: 7,
  participants: [
    { rank: 1, name: 'Henrik S', handicap: 27.7, total: 44, breakdown: { putt: 5, chip_spel: 7, chip_hink: 7, cttp_56: 7, cttp_124: 6, drive: 5, scramble: 7, roliga_skott: 0 } },
    { rank: 2, name: 'Pelle', handicap: 24.2, total: 35, breakdown: { putt: 7, chip_spel: 3, chip_hink: 7, cttp_56: 6, cttp_124: 3, drive: 4, scramble: 5, roliga_skott: 0 } },
    { rank: 3, name: 'Nils', handicap: 46, total: 32, breakdown: { putt: 3, chip_spel: 6, chip_hink: 5, cttp_56: 2, cttp_124: 4, drive: 7, scramble: 5, roliga_skott: 0 } },
    { rank: 4, name: 'André', handicap: 30, total: 29, breakdown: { putt: 4, chip_spel: 4, chip_hink: 3, cttp_56: 5, cttp_124: 7, drive: 3, scramble: 3, roliga_skott: 0 } },
    { rank: 4, name: 'Johan', handicap: 40.8, total: 29, breakdown: { putt: 1, chip_spel: 5, chip_hink: 5, cttp_56: 3, cttp_124: 2, drive: 6, scramble: 7, roliga_skott: 0 } },
    { rank: 6, name: 'Rickard', handicap: 32.9, total: 25, breakdown: { putt: 6, chip_spel: 2, chip_hink: 3, cttp_56: 4, cttp_124: 5, drive: 2, scramble: 3, roliga_skott: 0 } },
    { rank: 7, name: 'Henrik L', handicap: 48, total: 11, breakdown: { putt: 2, chip_spel: 2, chip_hink: 3, cttp_56: 1, cttp_124: 1, drive: 1, scramble: 1, roliga_skott: 0 } }
  ]
};

/**
 * Sort history documents by year descending (newest first).
 * Does not mutate the input array.
 *
 * @param {Array<{year?: number}>} docs
 * @returns {Array} new sorted array
 */
export function sortHistoryDescending(docs) {
  return [...docs].sort((a, b) => (b.year || 0) - (a.year || 0));
}

/**
 * Merge Firestore history documents with fallback data.
 *
 * Firestore documents take priority: a fallback entry whose year is already
 * present in the Firestore data is excluded (avoids duplicates once the
 * 2025 results have been written to Firestore via "Avsluta tävling").
 *
 * @param {Array<{year?: number}>} firestoreDocs  documents read from Firestore
 * @param {Array<{year?: number}>} fallback       hardcoded fallback entries
 * @returns {Array} merged array (unsorted — caller sorts)
 */
export function mergeWithFallback(firestoreDocs, fallback) {
  const firestoreYears = new Set(firestoreDocs.map(d => d.year));
  const merged = [...firestoreDocs];
  for (const fb of fallback) {
    if (!firestoreYears.has(fb.year)) {
      merged.push(fb);
    }
  }
  return merged;
}
