import { describe, it, expect } from 'vitest'
import {
  calculateTournamentPoints,
  calculateScramblePoints,
  calculateTotalScores,
} from '../js/scoring.js'

// ─── calculateTournamentPoints ────────────────────────────────────────────────

describe('calculateTournamentPoints', () => {
  it('ger N poäng till vinnaren och 1 till siste plats (higher_is_better)', () => {
    const entries = [
      { participantId: 'a', rawScore: 10, didNotParticipate: false },
      { participantId: 'b', rawScore: 5,  didNotParticipate: false },
    ]
    const result = calculateTournamentPoints(entries, 2, 'higher_is_better')
    expect(result.find(r => r.participantId === 'a').tournamentPoints).toBe(2)
    expect(result.find(r => r.participantId === 'b').tournamentPoints).toBe(1)
  })

  it('ger N poäng till vinnaren och 1 till siste plats (lower_is_better)', () => {
    const entries = [
      { participantId: 'a', rawScore: 3, didNotParticipate: false },
      { participantId: 'b', rawScore: 7, didNotParticipate: false },
    ]
    const result = calculateTournamentPoints(entries, 2, 'lower_is_better')
    expect(result.find(r => r.participantId === 'a').tournamentPoints).toBe(2)
    expect(result.find(r => r.participantId === 'b').tournamentPoints).toBe(1)
  })

  it('oavgjorda resultat ger samma rank och poäng', () => {
    const entries = [
      { participantId: 'a', rawScore: 10, didNotParticipate: false },
      { participantId: 'b', rawScore: 10, didNotParticipate: false },
      { participantId: 'c', rawScore: 5,  didNotParticipate: false },
    ]
    const result = calculateTournamentPoints(entries, 3, 'higher_is_better')
    const a = result.find(r => r.participantId === 'a')
    const b = result.find(r => r.participantId === 'b')
    expect(a.rank).toBe(1)
    expect(b.rank).toBe(1)
    expect(a.tournamentPoints).toBe(3)
    expect(b.tournamentPoints).toBe(3)
  })

  it('rank efter oavgjord hoppar över plats (rank 3 efter två delade 1:or)', () => {
    const entries = [
      { participantId: 'a', rawScore: 10, didNotParticipate: false },
      { participantId: 'b', rawScore: 10, didNotParticipate: false },
      { participantId: 'c', rawScore: 5,  didNotParticipate: false },
    ]
    const result = calculateTournamentPoints(entries, 3, 'higher_is_better')
    const c = result.find(r => r.participantId === 'c')
    expect(c.rank).toBe(3)
    expect(c.tournamentPoints).toBe(1) // N - 3 + 1 = 1
  })

  it('ej deltagande får 1 poäng och rank null', () => {
    const entries = [
      { participantId: 'a', rawScore: 10, didNotParticipate: false },
      { participantId: 'b', rawScore: 0,  didNotParticipate: true },
    ]
    const result = calculateTournamentPoints(entries, 2, 'higher_is_better')
    const b = result.find(r => r.participantId === 'b')
    expect(b.tournamentPoints).toBe(1)
    expect(b.rank).toBeNull()
    expect(b.didNotParticipate).toBe(true)
  })

  it('returnerar korrekt struktur per deltagare', () => {
    const entries = [{ participantId: 'x', rawScore: 5, didNotParticipate: false }]
    const result = calculateTournamentPoints(entries, 1, 'higher_is_better')
    expect(result[0]).toMatchObject({
      participantId: 'x',
      rawScore: 5,
      didNotParticipate: false,
      rank: 1,
      tournamentPoints: 1,
    })
  })
})

// ─── calculateScramblePoints ──────────────────────────────────────────────────

describe('calculateScramblePoints', () => {
  it('returnerar tom array för tom input', () => {
    expect(calculateScramblePoints([], 5)).toEqual([])
  })

  it('2 lag: använder fast poängtabell', () => {
    const teams = [
      { memberIds: ['a', 'b'], scrambleResult: 3 },
      { memberIds: ['c', 'd'], scrambleResult: 5 },
    ]
    const result = calculateScramblePoints(teams, 4)
    const winner = result.find(t => t.scrambleResult === 3)
    const second = result.find(t => t.scrambleResult === 5)
    expect(winner.scrambleRank).toBe(1)
    expect(winner.scramblePoints).toBe(4)          // N
    expect(second.scrambleRank).toBe(2)
    expect(second.scramblePoints).toBe(Math.round(4 * 0.4)) // 2
  })

  it('3 lag: använder fast poängtabell', () => {
    const teams = [
      { memberIds: ['a'], scrambleResult: 2 },
      { memberIds: ['b'], scrambleResult: 4 },
      { memberIds: ['c'], scrambleResult: 6 },
    ]
    const result = calculateScramblePoints(teams, 6)
    const sorted = [...result].sort((a, b) => a.scrambleRank - b.scrambleRank)
    expect(sorted[0].scramblePoints).toBe(6)
    expect(sorted[1].scramblePoints).toBe(Math.round(6 * 0.7)) // 4
    expect(sorted[2].scramblePoints).toBe(Math.round(6 * 0.4)) // 2
  })

  it('4 lag: använder fast poängtabell', () => {
    const teams = [
      { memberIds: ['a'], scrambleResult: 1 },
      { memberIds: ['b'], scrambleResult: 2 },
      { memberIds: ['c'], scrambleResult: 3 },
      { memberIds: ['d'], scrambleResult: 4 },
    ]
    const result = calculateScramblePoints(teams, 8)
    const sorted = [...result].sort((a, b) => a.scrambleRank - b.scrambleRank)
    expect(sorted[0].scramblePoints).toBe(8)
    expect(sorted[1].scramblePoints).toBe(Math.round(8 * 0.75)) // 6
    expect(sorted[2].scramblePoints).toBe(Math.round(8 * 0.5))  // 4
    expect(sorted[3].scramblePoints).toBe(Math.round(8 * 0.25)) // 2
  })

  it('5+ lag: använder linjär fördelning med fallande poäng', () => {
    const teams = Array.from({ length: 5 }, (_, i) => ({
      memberIds: [`p${i}`],
      scrambleResult: i + 1,
    }))
    const result = calculateScramblePoints(teams, 5)
    expect(result).toHaveLength(5)
    const sorted = [...result].sort((a, b) => a.scrambleRank - b.scrambleRank)
    expect(sorted[0].scrambleRank).toBe(1)
    expect(sorted[4].scrambleRank).toBe(5)
    for (let i = 0; i < 4; i++) {
      expect(sorted[i].scramblePoints).toBeGreaterThanOrEqual(sorted[i + 1].scramblePoints)
    }
  })

  it('oavgjorda lag får samma rank och samma (högre) poäng', () => {
    const teams = [
      { memberIds: ['a'], scrambleResult: 3 },
      { memberIds: ['b'], scrambleResult: 3 },
    ]
    const result = calculateScramblePoints(teams, 4)
    expect(result[0].scrambleRank).toBe(1)
    expect(result[1].scrambleRank).toBe(1)
    expect(result[0].scramblePoints).toBe(result[1].scramblePoints)
    expect(result[0].scramblePoints).toBe(4) // N (1:a-plats-poäng)
  })

  it('sorterar lag efter scrambleResult ASC (lägst vinner)', () => {
    const teams = [
      { memberIds: ['x'], scrambleResult: 10 },
      { memberIds: ['y'], scrambleResult: 2 },
    ]
    const result = calculateScramblePoints(teams, 4)
    const y = result.find(t => t.memberIds[0] === 'y')
    expect(y.scrambleRank).toBe(1)
  })
})

// ─── calculateTotalScores ─────────────────────────────────────────────────────

describe('calculateTotalScores', () => {
  it('summerar poäng från flera event', () => {
    const allScores = [
      { participantId: 'p1', eventId: 'e1', tournamentPoints: 5 },
      { participantId: 'p1', eventId: 'e2', tournamentPoints: 3 },
      { participantId: 'p2', eventId: 'e1', tournamentPoints: 2 },
      { participantId: 'p2', eventId: 'e2', tournamentPoints: 4 },
    ]
    const participants = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }]
    const result = calculateTotalScores(allScores, ['e1', 'e2'], participants)
    const alice = result.find(r => r.participantId === 'p1')
    const bob   = result.find(r => r.participantId === 'p2')
    expect(alice.total).toBe(8)
    expect(bob.total).toBe(6)
  })

  it('rankordnar deltagare efter total (högst först)', () => {
    const allScores = [
      { participantId: 'p1', eventId: 'e1', tournamentPoints: 5 },
      { participantId: 'p2', eventId: 'e1', tournamentPoints: 2 },
    ]
    const participants = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }]
    const result = calculateTotalScores(allScores, ['e1'], participants)
    expect(result[0].participantId).toBe('p1')
    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(2)
  })

  it('delade totalpoäng ger samma rank', () => {
    const allScores = [
      { participantId: 'p1', eventId: 'e1', tournamentPoints: 5 },
      { participantId: 'p2', eventId: 'e1', tournamentPoints: 5 },
      { participantId: 'p3', eventId: 'e1', tournamentPoints: 3 },
    ]
    const participants = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
    ]
    const result = calculateTotalScores(allScores, ['e1'], participants)
    const alice   = result.find(r => r.participantId === 'p1')
    const bob     = result.find(r => r.participantId === 'p2')
    const charlie = result.find(r => r.participantId === 'p3')
    expect(alice.rank).toBe(1)
    expect(bob.rank).toBe(1)
    expect(charlie.rank).toBe(3)
  })

  it('bygger korrekt breakdown per event', () => {
    const allScores = [
      { participantId: 'p1', eventId: 'e1', tournamentPoints: 5 },
      { participantId: 'p1', eventId: 'e2', tournamentPoints: 3 },
    ]
    const participants = [{ id: 'p1', name: 'Alice' }]
    const result = calculateTotalScores(allScores, ['e1', 'e2'], participants)
    expect(result[0].breakdown).toEqual({ e1: 5, e2: 3 })
  })

  it('returnerar tom array för inga scores', () => {
    expect(calculateTotalScores([], [], [])).toEqual([])
  })

  it('sätter namn från participants-listan', () => {
    const allScores = [{ participantId: 'p1', eventId: 'e1', tournamentPoints: 10 }]
    const participants = [{ id: 'p1', name: 'Sven Svensson' }]
    const result = calculateTotalScores(allScores, ['e1'], participants)
    expect(result[0].name).toBe('Sven Svensson')
  })

  it('vid lika total sorteras deltagare alfabetiskt på namn', () => {
    const allScores = [
      { participantId: 'p1', eventId: 'e1', tournamentPoints: 5 },
      { participantId: 'p2', eventId: 'e1', tournamentPoints: 5 },
    ]
    const participants = [
      { id: 'p1', name: 'Zebra' },
      { id: 'p2', name: 'Apa' },
    ]
    const result = calculateTotalScores(allScores, ['e1'], participants)
    expect(result[0].name).toBe('Apa')
    expect(result[1].name).toBe('Zebra')
  })
})
