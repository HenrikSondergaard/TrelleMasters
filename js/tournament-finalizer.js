/**
 * TrelleMasters 2026 – Tournament Finalizer
 *
 * Pure functions for finalising a tournament:
 *   – checkAllEventsCompleted: validate every event is done
 *   – buildHistorySnapshot:    compute final standings + assemble a
 *                              history document for Firestore
 *
 * Uses the same scoring aggregation as scoreboard.js.
 */
import { calculateTotalScores } from './scoring.js';

/**
 * Event IDs in canonical display order.
 * Kept in sync with scoreboard.js EVENT_COLUMNS.
 */
export const EVENT_IDS = [
  'putt', 'chip_spel', 'chip_hink',
  'cttp_56', 'cttp_124', 'drive',
  'scramble', 'roliga_skott'
];

/**
 * Check whether every event has been marked `completed`.
 *
 * @param {Array<{status?: string, name?: string, id?: string}>} events
 * @returns {{ allCompleted: boolean, incomplete: string[] }}
 *          incomplete = display names of events not yet completed
 */
export function checkAllEventsCompleted(events) {
  const incomplete = events
    .filter(ev => (ev.status || 'upcoming') !== 'completed')
    .map(ev => ev.name || ev.id || 'Okänt moment');
  return { allCompleted: incomplete.length === 0, incomplete };
}

/**
 * Build a history-snapshot document from the current tournament data.
 *
 * The scoring is identical to what the scoreboard displays so that the
 * archived result always matches the live table.
 *
 * @param {Array<{participantId: (string|number), eventId: string, tournamentPoints: number}>} allScores
 * @param {Array<{id: (string|number), name: string, handicap?: number}>} participants
 *        approved participants
 * @param {{year: number, date: string}} settings
 * @returns {{year: number, date: string, winner: (string|null), participantCount: number, participants: Array<{rank, name, handicap, total, breakdown}>}}
 */
export function buildHistorySnapshot(allScores, participants, settings) {
  const leaderboard = calculateTotalScores(allScores, EVENT_IDS, participants);

  const snapshotParticipants = leaderboard.map(entry => {
    const p = participants.find(pp => pp.id === entry.participantId);
    return {
      rank: entry.rank,
      name: entry.name,
      handicap: p ? p.handicap : null,
      total: entry.total,
      breakdown: entry.breakdown || {}
    };
  });

  const winner = snapshotParticipants.length > 0 ? snapshotParticipants[0].name : null;

  return {
    year: settings.year,
    date: settings.date,
    winner,
    participantCount: snapshotParticipants.length,
    participants: snapshotParticipants
  };
}
