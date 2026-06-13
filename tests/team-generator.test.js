import { describe, it, expect } from 'vitest'
import {
  generateTeams,
  recalculateAverages,
  movePlayerBetweenTeams,
} from '../js/team-generator.js'

// ─── generateTeams ────────────────────────────────────────────────────────────

describe('generateTeams', () => {
  it('kastar fel om numTeams < 1', () => {
    expect(() => generateTeams([], 0)).toThrow('numTeams must be at least 1')
  })

  it('returnerar tom array om inga deltagare', () => {
    expect(generateTeams([], 2)).toEqual([])
  })

  it('skapar rätt antal lag', () => {
    const players = makePlayers(4)
    expect(generateTeams(players, 2)).toHaveLength(2)
    expect(generateTeams(players, 3)).toHaveLength(3)
  })

  it('fördelar alla spelare i lagen', () => {
    const players = makePlayers(6)
    const teams = generateTeams(players, 2)
    const total = teams.reduce((sum, t) => sum + t.members.length, 0)
    expect(total).toBe(6)
  })

  it('serpentin-draft: första rundan fram, andra rundan baklänges', () => {
    // 4 spelare, 2 lag, sorterade handicap ASC: A(5), B(10), C(15), D(20)
    // idx 0 → lag 0 (A), idx 1 → lag 1 (B)
    // idx 2 → lag 1 (C, baklänges), idx 3 → lag 0 (D, baklänges)
    const players = [
      { id: 1, name: 'A', handicap: 5 },
      { id: 2, name: 'B', handicap: 10 },
      { id: 3, name: 'C', handicap: 15 },
      { id: 4, name: 'D', handicap: 20 },
    ]
    const teams = generateTeams(players, 2)
    const ids0 = teams[0].members.map(m => m.id)
    const ids1 = teams[1].members.map(m => m.id)
    expect(ids0).toContain(1) // A (starkast)
    expect(ids0).toContain(4) // D (sämst)
    expect(ids1).toContain(2) // B
    expect(ids1).toContain(3) // C
  })

  it('beräknar snitthandicap korrekt', () => {
    const players = [
      { id: 1, name: 'A', handicap: 10 },
      { id: 2, name: 'B', handicap: 20 },
    ]
    const teams = generateTeams(players, 1)
    expect(teams[0].averageHandicap).toBe(15)
  })

  it('hanterar färre spelare än lag', () => {
    const players = [{ id: 1, name: 'A', handicap: 5 }]
    const teams = generateTeams(players, 3)
    expect(teams).toHaveLength(3)
    const total = teams.reduce((sum, t) => sum + t.members.length, 0)
    expect(total).toBe(1)
  })

  it('lagnamn är "Lag 1", "Lag 2" etc.', () => {
    const teams = generateTeams(makePlayers(2), 2)
    expect(teams[0].name).toBe('Lag 1')
    expect(teams[1].name).toBe('Lag 2')
  })

  it('plus-handicap (-2.4) sorteras som starkast spelare', () => {
    // +2.4 (stored as -2.4) ska vara först i serpentine-draft
    const players = [
      { id: 1, name: 'Regular', handicap: 22.3 },
      { id: 2, name: 'Scratch', handicap: 0 },
      { id: 3, name: 'Plus',    handicap: -2.4 },
      { id: 4, name: 'High',    handicap: 36 },
    ]
    const teams = generateTeams(players, 2)
    // Sorted ASC: Plus(-2.4), Scratch(0), Regular(22.3), High(36)
    // Round 1 forward: Plus→Lag1, Scratch→Lag2
    // Round 2 reverse: Regular→Lag2, High→Lag1
    expect(teams[0].members.map(m => m.name)).toEqual(['Plus', 'High'])
    expect(teams[1].members.map(m => m.name)).toEqual(['Scratch', 'Regular'])
  })
})

// ─── recalculateAverages ──────────────────────────────────────────────────────

describe('recalculateAverages', () => {
  it('beräknar snitthandicap', () => {
    const teams = [{ members: [{ handicap: 10 }, { handicap: 20 }] }]
    expect(recalculateAverages(teams)[0].averageHandicap).toBe(15)
  })

  it('avrundar till en decimal', () => {
    const teams = [{ members: [{ handicap: 7 }, { handicap: 8 }, { handicap: 9 }] }]
    expect(recalculateAverages(teams)[0].averageHandicap).toBe(8)
  })

  it('avrundar korrekt för icke-jämna decimaler', () => {
    // (5 + 6) / 2 = 5.5 → avrundat 1 decimal = 5.5
    const teams = [{ members: [{ handicap: 5 }, { handicap: 6 }] }]
    expect(recalculateAverages(teams)[0].averageHandicap).toBe(5.5)
  })

  it('sätter 0 för tomt lag', () => {
    const teams = [{ members: [] }]
    expect(recalculateAverages(teams)[0].averageHandicap).toBe(0)
  })

  it('uppdaterar alla lag i en batch', () => {
    const teams = [
      { members: [{ handicap: 10 }] },
      { members: [{ handicap: 20 }, { handicap: 30 }] },
    ]
    const result = recalculateAverages(teams)
    expect(result[0].averageHandicap).toBe(10)
    expect(result[1].averageHandicap).toBe(25)
  })
})

// ─── movePlayerBetweenTeams ───────────────────────────────────────────────────

describe('movePlayerBetweenTeams', () => {
  it('flyttar spelare från ett lag till ett annat', () => {
    const teams = makeTeams([
      [{ id: 'p1', handicap: 10 }, { id: 'p2', handicap: 20 }],
      [{ id: 'p3', handicap: 30 }],
    ])
    const result = movePlayerBetweenTeams(teams, 'p1', 0, 1)
    expect(result[0].members.map(m => m.id)).toEqual(['p2'])
    expect(result[1].members.map(m => m.id)).toContain('p1')
  })

  it('returnerar oförändrat objekt om from === to', () => {
    const teams = makeTeams([[{ id: 'p1', handicap: 10 }]])
    const result = movePlayerBetweenTeams(teams, 'p1', 0, 0)
    expect(result).toBe(teams)
  })

  it('kastar fel om spelaren inte finns i källaget', () => {
    const teams = makeTeams([
      [{ id: 'p1', handicap: 10 }],
      [],
    ])
    expect(() => movePlayerBetweenTeams(teams, 'nonexistent', 0, 1)).toThrow()
  })

  it('räknar om snitthandicap efter flytt', () => {
    const teams = makeTeams([
      [{ id: 'p1', handicap: 10 }, { id: 'p2', handicap: 20 }],
      [{ id: 'p3', handicap: 30 }],
    ])
    const result = movePlayerBetweenTeams(teams, 'p1', 0, 1)
    expect(result[0].averageHandicap).toBe(20)  // bara p2 kvar
    expect(result[1].averageHandicap).toBe(20)  // (p3:30 + p1:10) / 2
  })

  it('tar bort spelaren ur källaget', () => {
    const teams = makeTeams([
      [{ id: 'p1', handicap: 5 }, { id: 'p2', handicap: 15 }],
      [{ id: 'p3', handicap: 25 }],
    ])
    const result = movePlayerBetweenTeams(teams, 'p2', 0, 1)
    expect(result[0].members.map(m => m.id)).not.toContain('p2')
  })
})

// ─── Hjälpfunktioner ──────────────────────────────────────────────────────────

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Spelare ${i + 1}`,
    handicap: (i + 1) * 5,
  }))
}

function makeTeams(memberGroups) {
  return memberGroups.map((members, i) => ({
    name: `Lag ${i + 1}`,
    members,
    averageHandicap: members.length
      ? members.reduce((s, m) => s + m.handicap, 0) / members.length
      : 0,
  }))
}
