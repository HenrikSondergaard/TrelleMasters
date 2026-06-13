import { describe, it, expect } from 'vitest'
import { parseHandicap, formatHandicap, HANDICAP_MIN, HANDICAP_MAX } from '../js/handicap-utils.js'

// ─── parseHandicap ────────────────────────────────────────────────────────────

describe('parseHandicap', () => {
  it('parsar vanlig handicap utan tecken', () => {
    expect(parseHandicap('22.3')).toEqual({ ok: true, value: 22.3 })
  })

  it('parsar vanlig handicap med kommatecken (svenskt format)', () => {
    expect(parseHandicap('22,3')).toEqual({ ok: true, value: 22.3 })
  })

  it('parsar plus-handicap med + tecken (t.ex. +2.4 → -2.4)', () => {
    expect(parseHandicap('+2.4')).toEqual({ ok: true, value: -2.4 })
  })

  it('parsar redan negativt värde (t.ex. -2.4)', () => {
    expect(parseHandicap('-2.4')).toEqual({ ok: true, value: -2.4 })
  })

  it('hanterar blanksteg runt värdet', () => {
    expect(parseHandicap('  27.7  ')).toEqual({ ok: true, value: 27.7 })
  })

  it('hanterar + med blanksteg', () => {
    expect(parseHandicap('  +1.5  ')).toEqual({ ok: true, value: -1.5 })
  })

  it('hanterar heltal', () => {
    expect(parseHandicap('5')).toEqual({ ok: true, value: 5 })
    expect(parseHandicap('+3')).toEqual({ ok: true, value: -3 })
  })

  it('returnerar fel för tom sträng', () => {
    const result = parseHandicap('')
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returnerar fel för null/undefined', () => {
    expect(parseHandicap(null).ok).toBe(false)
    expect(parseHandicap(undefined).ok).toBe(false)
  })

  it('returnerar fel för ogiltig text', () => {
    expect(parseHandicap('abc').ok).toBe(false)
    expect(parseHandicap('tjugo').ok).toBe(false)
  })

  it('validerar övre gräns (54)', () => {
    expect(parseHandicap('54').ok).toBe(true)
    expect(parseHandicap('55').ok).toBe(false)
  })

  it('validerar undre gräns (plus-handicap)', () => {
    // HANDICAP_MIN is -10 (i.e. +10 in golf terms)
    expect(parseHandicap('+10').ok).toBe(true)
    expect(parseHandicap('+11').ok).toBe(false)
  })

  it('säkerställer att + alltid ger negativt värde även för +0', () => {
    // +0 should be 0 (scratch), not negative
    expect(parseHandicap('+0')).toEqual({ ok: true, value: 0 })
  })
})

// ─── formatHandicap ───────────────────────────────────────────────────────────

describe('formatHandicap', () => {
  it('formaterar vanlig handicap med en decimal', () => {
    expect(formatHandicap(22.3)).toBe('22.3')
    expect(formatHandicap(5)).toBe('5.0')
    expect(formatHandicap(0)).toBe('0.0')
  })

  it('formaterar plus-handicap med + tecken', () => {
    expect(formatHandicap(-2.4)).toBe('+2.4')
    expect(formatHandicap(-1.5)).toBe('+1.5')
  })

  it('returnerar — för ogiltiga värden', () => {
    expect(formatHandicap(NaN)).toBe('—')
    expect(formatHandicap('inte ett nummer')).toBe('—')
    expect(formatHandicap(null)).toBe('—')
    expect(formatHandicap(undefined)).toBe('—')
  })

  it('stödjer anpassat antal decimaler', () => {
    expect(formatHandicap(22.35, 2)).toBe('22.35')
    expect(formatHandicap(-2.4, 0)).toBe('+2')
  })

  it('round-trip: format → parse → format bevarar värde', () => {
    const testValues = [22.3, 5, 0, -2.4, -1.5, 54]
    for (const val of testValues) {
      const formatted = formatHandicap(val)
      const parsed = parseHandicap(formatted)
      expect(parsed.ok).toBe(true)
      expect(parsed.value).toBe(val)
    }
  })
})

// ─── Konstanter ───────────────────────────────────────────────────────────────

describe('konstanter', () => {
  it('HANDICAP_MIN tillåter plus-handicap', () => {
    expect(HANDICAP_MIN).toBeLessThan(0)
  })

  it('HANDICAP_MAX är 54', () => {
    expect(HANDICAP_MAX).toBe(54)
  })
})
