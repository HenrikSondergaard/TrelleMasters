import { describe, it, expect } from 'vitest'
import { HCP_BANDS, MOMENTS, getBand, getBandFromInput, getAttempts } from '../js/hcp-tables.js'

// ─── getBand ────────────────────────────────────────
describe('getBand', () => {
  it('returnerar Scratch/Plus för plus-handicap', () => {
    expect(getBand(-2.4).id).toBe('A')
    expect(getBand(-5).id).toBe('A')
  })

  it('returnerar rätt band för vanliga handicaps', () => {
    expect(getBand(0).id).toBe('A')
    expect(getBand(4.9).id).toBe('A')
    expect(getBand(5).id).toBe('B')      // 5 >= 5 i band B
    expect(getBand(14.9).id).toBe('B')
    expect(getBand(15).id).toBe('C')     // 15 >= 15 i band C
    expect(getBand(24.9).id).toBe('C')
    expect(getBand(25).id).toBe('D')     // 25 >= 25 i band D
    expect(getBand(35.9).id).toBe('D')
    expect(getBand(36).id).toBe('E')     // 36 >= 36 i band E
    expect(getBand(54).id).toBe('E')
  })

  it('returnerar extremband för outliers', () => {
    expect(getBand(-5.5).id).toBe('A')
    expect(getBand(60).id).toBe('E')
  })
})

// ─── getBandFromInput ───────────────────────────────
describe('getBandFromInput', () => {
  it('hanterar strängar med kommatecken', () => {
    expect(getBandFromInput('22,3').id).toBe('C')
    expect(getBandFromInput('7,5').id).toBe('B')
  })

  it('hanterar plus-handicap i sträng', () => {
    expect(getBandFromInput('+2.4').id).toBe('A')
    expect(getBandFromInput('+4,9').id).toBe('A')
  })

  it('returnerar null för ogiltig indata', () => {
    expect(getBandFromInput('')).toBeNull()
    expect(getBandFromInput('abc')).toBeNull()
    expect(getBandFromInput('   ')).toBeNull()
  })
})

// ─── getAttempts ────────────────────────────────────
describe('getAttempts', () => {
  it('returnerar rätt antal försök för putt-tävling', () => {
    expect(getAttempts('putt', 'A')).toBe(5)
    expect(getAttempts('putt', 'B')).toBe(6)
    expect(getAttempts('putt', 'C')).toBe(7)
    expect(getAttempts('putt', 'D')).toBe(8)
    expect(getAttempts('putt', 'E')).toBe(10)
  })

  it('returnerar rätt antal försök för longest drive', () => {
    expect(getAttempts('drive', 'A')).toBe(4)
    expect(getAttempts('drive', 'E')).toBe(8)
  })

  it('returnerar 0 för okänt moment', () => {
    expect(getAttempts('nonexistent', 'A')).toBe(0)
  })

  it('returnerar 0 för okänt band', () => {
    expect(getAttempts('putt', 'Z')).toBe(0)
  })

  it('alla moment har 5 band med stigande försök', () => {
    for (const moment of MOMENTS) {
      const attempts = moment.attempts
      expect(attempts).toHaveLength(5)
      // Varje band ska ha minst lika många försök som förra
      for (let i = 1; i < attempts.length; i++) {
        expect(attempts[i]).toBeGreaterThanOrEqual(attempts[i - 1])
      }
    }
  })
})

// ─── HCP_BANDS struktur ─────────────────────────────
describe('HCP_BANDS', () => {
  it('har 5 band från A till E', () => {
    expect(HCP_BANDS).toHaveLength(5)
    expect(HCP_BANDS.map((b) => b.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('täcker hela intervallet +5 till 54', () => {
    expect(HCP_BANDS[0].min).toBe(-5)
    expect(HCP_BANDS[HCP_BANDS.length - 1].max).toBe(54)
  })
})
