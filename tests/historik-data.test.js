import { describe, it, expect } from 'vitest';
import {
  EVENT_COLUMNS,
  FALLBACK_HISTORY_2025,
  sortHistoryDescending,
  mergeWithFallback
} from '../js/historik-data.js';

// ---------------------------------------------------------------------------
// sortHistoryDescending
// ---------------------------------------------------------------------------
describe('sortHistoryDescending', () => {
  it('sorts by year descending', () => {
    const docs = [
      { year: 2025, winner: 'A' },
      { year: 2027, winner: 'C' },
      { year: 2026, winner: 'B' }
    ];
    const sorted = sortHistoryDescending(docs);
    expect(sorted.map(d => d.year)).toEqual([2027, 2026, 2025]);
  });

  it('does not mutate the input array', () => {
    const docs = [
      { year: 2025 },
      { year: 2026 }
    ];
    const original = [...docs];
    sortHistoryDescending(docs);
    expect(docs.map(d => d.year)).toEqual(original.map(d => d.year));
  });

  it('treats missing year as 0', () => {
    const docs = [
      { year: 2025 },
      { winner: 'Unknown' }
    ];
    const sorted = sortHistoryDescending(docs);
    expect(sorted[0].year).toBe(2025);
    expect(sorted[1].year).toBeUndefined();
  });

  it('handles empty array', () => {
    expect(sortHistoryDescending([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mergeWithFallback
// ---------------------------------------------------------------------------
describe('mergeWithFallback', () => {
  const fallback = [
    { year: 2025, winner: 'Henrik S' },
    { year: 2024, winner: 'Nisse' }
  ];

  it('returns fallback-only when Firestore is empty', () => {
    const merged = mergeWithFallback([], fallback);
    expect(merged).toHaveLength(2);
    expect(merged.map(d => d.year)).toEqual([2025, 2024]);
  });

  it('includes all Firestore docs plus fallback years not in Firestore', () => {
    const firestoreDocs = [{ year: 2026, winner: 'Alice' }];
    const merged = mergeWithFallback(firestoreDocs, fallback);
    expect(merged).toHaveLength(3);
    expect(merged.map(d => d.year).sort()).toEqual([2024, 2025, 2026]);
  });

  it('excludes fallback entry when year already exists in Firestore', () => {
    const firestoreDocs = [
      { year: 2025, winner: 'Firestore-Henrik' },
      { year: 2026, winner: 'Alice' }
    ];
    const merged = mergeWithFallback(firestoreDocs, fallback);
    expect(merged).toHaveLength(3); // 2024 (fallback) + 2025 + 2026
    const y2025 = merged.filter(d => d.year === 2025);
    expect(y2025).toHaveLength(1);
    expect(y2025[0].winner).toBe('Firestore-Henrik');
  });

  it('does not mutate the firestoreDocs array', () => {
    const firestoreDocs = [{ year: 2026 }];
    mergeWithFallback(firestoreDocs, fallback);
    expect(firestoreDocs).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// FALLBACK_HISTORY_2025 integrity
// ---------------------------------------------------------------------------
describe('FALLBACK_HISTORY_2025', () => {
  it('has the correct top-level fields', () => {
    expect(FALLBACK_HISTORY_2025.year).toBe(2025);
    expect(FALLBACK_HISTORY_2025.winner).toBe('Henrik S');
    expect(FALLBACK_HISTORY_2025.participantCount).toBe(7);
    expect(FALLBACK_HISTORY_2025.participants).toHaveLength(7);
  });

  it('winner matches the rank-1 participant', () => {
    const rank1 = FALLBACK_HISTORY_2025.participants.find(p => p.rank === 1);
    expect(rank1.name).toBe(FALLBACK_HISTORY_2025.winner);
  });

  it('participantCount matches participants length', () => {
    expect(FALLBACK_HISTORY_2025.participantCount)
      .toBe(FALLBACK_HISTORY_2025.participants.length);
  });

  it('every participant has a breakdown with all event IDs', () => {
    const eventIds = EVENT_COLUMNS.map(c => c.id);
    for (const p of FALLBACK_HISTORY_2025.participants) {
      for (const id of eventIds) {
        expect(p.breakdown[id]).toBeDefined();
      }
    }
  });
});
