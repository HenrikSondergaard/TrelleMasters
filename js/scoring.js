/**
 * TrelleMasters 2026 – Scoring Module
 * ES module that provides tournament point calculation,
 * scramble point distribution, and total-score aggregation.
 */

/**
 * Calculate tournament points for individual event results.
 *
 * @param {Array<{participantId: string|number, rawScore: number, didNotParticipate: boolean}>} entries
 * @param {number} N – total number of approved participants
 * @param {'higher_is_better'|'lower_is_better'} scoreDirection
 * @returns {Array<{participantId, rawScore, didNotParticipate, rank: number|null, tournamentPoints: number}>}
 */
export function calculateTournamentPoints(entries, N, scoreDirection) {
  const competing = entries.filter(e => !e.didNotParticipate);
  const notCompeting = entries.filter(e => e.didNotParticipate);

  // Sort competing entries by rawScore
  if (scoreDirection === 'higher_is_better') {
    competing.sort((a, b) => b.rawScore - a.rawScore); // DESC
  } else {
    competing.sort((a, b) => a.rawScore - b.rawScore); // ASC
  }

  // Assign ranks with ties (same score → same rank)
  // Must use a loop, not .map(), because we reference previous element
  const ranked = [];
  for (let idx = 0; idx < competing.length; idx++) {
    const entry = competing[idx];
    let rank;
    if (idx === 0) {
      rank = 1;
    } else {
      const prev = ranked[idx - 1];
      rank = entry.rawScore === prev.rawScore ? prev.rank : idx + 1;
    }
    ranked.push({ ...entry, rank });
  }

  // Convert rank → tournament points: N - rank + 1 (tied entries all get higher points)
  const results = ranked.map(entry => ({
    participantId: entry.participantId,
    rawScore: entry.rawScore,
    didNotParticipate: false,
    rank: entry.rank,
    tournamentPoints: N - entry.rank + 1
  }));

  // Non-participants get 1 point, rank = null
  for (const entry of notCompeting) {
    results.push({
      participantId: entry.participantId,
      rawScore: entry.rawScore,
      didNotParticipate: true,
      rank: null,
      tournamentPoints: 1
    });
  }

  return results;
}

/**
 * Points tables keyed by team count.
 * Index 0 = points for 1st place, etc.
 */
const SCRAMBLE_POINTS_TABLE = {
  2: (N) => [N, Math.round(N * 0.4)],
  3: (N) => [N, Math.round(N * 0.7), Math.round(N * 0.4)],
  4: (N) => [N, Math.round(N * 0.75), Math.round(N * 0.5), Math.round(N * 0.25)]
};

/**
 * Linear distribution from N down to max(1, round(N/numTeams)).
 */
function linearPoints(N, numTeams) {
  const low = Math.max(1, Math.round(N / numTeams));
  const points = [];
  for (let i = 0; i < numTeams; i++) {
    const value = N - (i * (N - low) / (numTeams - 1));
    points.push(Math.round(value));
  }
  return points;
}

/**
 * Calculate scramble points for team-based events.
 *
 * @param {Array<{memberIds: Array, scrambleResult: number}>} teams
 * @param {number} N – total approved participants
 * @returns {Array<{memberIds: Array, scrambleResult: number, scrambleRank: number, scramblePoints: number}>}
 */
export function calculateScramblePoints(teams, N) {
  const numTeams = teams.length;
  if (numTeams === 0) return [];

  // Sort teams by scrambleResult ASC (lower is better in golf scramble)
  const sorted = [...teams].sort((a, b) => a.scrambleResult - b.scrambleResult);

  // Determine points table
  let pointsTable;
  if (SCRAMBLE_POINTS_TABLE[numTeams]) {
    pointsTable = SCRAMBLE_POINTS_TABLE[numTeams](N);
  } else {
    pointsTable = linearPoints(N, numTeams);
  }

  // Assign ranks with ties (same scrambleResult → same rank, same points)
  // Must use a loop, not .map(), because we reference previous element
  const results = [];
  for (let idx = 0; idx < sorted.length; idx++) {
    const team = sorted[idx];
    let rank;
    if (idx === 0) {
      rank = 1;
    } else {
      const prev = results[idx - 1];
      rank = team.scrambleResult === prev.scrambleResult ? prev.scrambleRank : idx + 1;
    }

    // Points for tied teams: use the higher points value (points of the earliest rank in the tie group)
    const points = pointsTable[rank - 1];

    results.push({
      ...team,
      scrambleRank: rank,
      scramblePoints: points
    });
  }

  return results;
}

/**
 * Calculate total scores across all events and produce a ranked leaderboard.
 *
 * @param {Array<{participantId: string|number, eventId: string|number, tournamentPoints: number}>} allScores
 * @param {Array<string|number>} eventIds – ordered list of event IDs for breakdown columns
 * @param {Array<{id: string|number, name: string}>} participants – participant info
 * @returns {Array<{participantId, name, rank, total, breakdown: Object}>}
 */
export function calculateTotalScores(allScores, eventIds, participants) {
  // Build a map of participantId → name
  const nameMap = new Map(participants.map(p => [p.id, p.name]));

  // Accumulate totals and per-event breakdowns
  const totals = new Map();

  for (const score of allScores) {
    if (!totals.has(score.participantId)) {
      totals.set(score.participantId, {
        participantId: score.participantId,
        name: nameMap.get(score.participantId) || score.participantId,
        total: 0,
        breakdown: {}
      });
    }
    const entry = totals.get(score.participantId);
    entry.total += score.tournamentPoints;
    entry.breakdown[score.eventId] = score.tournamentPoints;
  }

  // Convert to array and sort: total DESC, then name ASC for ties
  const leaderboard = Array.from(totals.values());
  leaderboard.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });

  // Assign overall ranks (ties allowed)
  leaderboard.forEach((entry, idx) => {
    if (idx === 0) {
      entry.rank = 1;
    } else {
      const prev = leaderboard[idx - 1];
      entry.rank = prev.total === entry.total ? prev.rank : idx + 1;
    }
  });

  return leaderboard;
}
