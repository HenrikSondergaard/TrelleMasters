/**
 * TrelleMasters 2026 – Team Generator Module
 * ES module that provides serpentine-draft team generation
 * and manual team adjustment helpers.
 */

/**
 * Generate teams using a serpentine (snake) draft based on handicap.
 *
 * @param {Array<{id: string|number, name: string, handicap: number}>} participants
 * @param {number} numTeams – desired number of teams
 * @returns {Array<{name: string, members: Array, averageHandicap: number}>}
 */
export function generateTeams(participants, numTeams) {
  if (numTeams < 1) throw new Error('numTeams must be at least 1');
  if (participants.length === 0) return [];

  // Sort participants by handicap ASC (lowest first = strongest)
  const sorted = [...participants].sort((a, b) => a.handicap - b.handicap);

  // Initialise empty teams
  const teams = Array.from({ length: numTeams }, (_, i) => ({
    name: `Lag ${i + 1}`,
    members: [],
    averageHandicap: 0
  }));

  // Serpentine draft
  sorted.forEach((player, idx) => {
    const round = Math.floor(idx / numTeams);
    const posInRound = idx % numTeams;

    // Even rounds → forward, odd rounds → backward
    let teamIndex;
    if (round % 2 === 0) {
      teamIndex = posInRound;
    } else {
      teamIndex = numTeams - 1 - posInRound;
    }

    // Clamp in case player count < team count
    teamIndex = Math.min(teamIndex, numTeams - 1);

    teams[teamIndex].members.push(player);
  });

  // Calculate average handicaps
  return recalculateAverages(teams);
}

/**
 * Recalculate averageHandicap for each team.
 *
 * @param {Array<{members: Array<{handicap: number}>}>} teams
 * @returns {Array} – the same teams array with updated averageHandicap
 */
export function recalculateAverages(teams) {
  for (const team of teams) {
    if (team.members.length === 0) {
      team.averageHandicap = 0;
    } else {
      const sum = team.members.reduce((acc, m) => acc + m.handicap, 0);
      team.averageHandicap = Math.round((sum / team.members.length) * 10) / 10;
    }
  }
  return teams;
}

/**
 * Move a player from one team to another and recalculate averages.
 *
 * @param {Array} teams – current teams array
 * @param {string|number} playerId – id of the player to move
 * @param {number} fromTeamIndex – index of the source team
 * @param {number} toTeamIndex – index of the destination team
 * @returns {Array} – updated teams array
 */
export function movePlayerBetweenTeams(teams, playerId, fromTeamIndex, toTeamIndex) {
  if (fromTeamIndex === toTeamIndex) return teams;

  const fromTeam = teams[fromTeamIndex];
  const toTeam = teams[toTeamIndex];

  // Find and remove the player from the source team
  const playerIdx = fromTeam.members.findIndex(m => m.id === playerId);
  if (playerIdx === -1) {
    throw new Error(`Player with id ${playerId} not found in team ${fromTeamIndex}`);
  }

  const [player] = fromTeam.members.splice(playerIdx, 1);

  // Add the player to the destination team
  toTeam.members.push(player);

  // Recalculate averages
  return recalculateAverages(teams);
}
