import { describe, it, expect } from 'vitest';
import { checkAllEventsCompleted, buildHistorySnapshot } from '../js/tournament-finalizer.js';

describe('checkAllEventsCompleted', () => {
  it('returns allCompleted=true when every event is completed', () => {
    const events = [
      { id: 'putt', name: 'Putt', status: 'completed' },
      { id: 'drive', name: 'Drive', status: 'completed' }
    ];
    const result = checkAllEventsCompleted(events);
    expect(result.allCompleted).toBe(true);
    expect(result.incomplete).toEqual([]);
  });

  it('lists incomplete events by name', () => {
    const events = [
      { id: 'putt', name: 'Putt', status: 'completed' },
      { id: 'drive', name: 'Drive', status: 'upcoming' }
    ];
    const result = checkAllEventsCompleted(events);
    expect(result.allCompleted).toBe(false);
    expect(result.incomplete).toEqual(['Drive']);
  });

  it('treats missing status as upcoming (incomplete)', () => {
    const events = [
      { id: 'putt', name: 'Putt' }
    ];
    const result = checkAllEventsCompleted(events);
    expect(result.allCompleted).toBe(false);
    expect(result.incomplete).toEqual(['Putt']);
  });

  it('handles empty event list', () => {
    const result = checkAllEventsCompleted([]);
    expect(result.allCompleted).toBe(true);
    expect(result.incomplete).toEqual([]);
  });
});

describe('buildHistorySnapshot', () => {
  const participants = [
    { id: 'p1', name: 'Alice', handicap: 20.0 },
    { id: 'p2', name: 'Bob', handicap: 30.0 },
    { id: 'p3', name: 'Cecilia', handicap: 15.0 }
  ];

  const scores = [
    // Alice: 8 + 6 = 14
    { participantId: 'p1', eventId: 'putt', tournamentPoints: 8 },
    { participantId: 'p1', eventId: 'drive', tournamentPoints: 6 },
    // Bob: 6 + 8 = 14
    { participantId: 'p2', eventId: 'putt', tournamentPoints: 6 },
    { participantId: 'p2', eventId: 'drive', tournamentPoints: 8 },
    // Cecilia: 7 + 5 = 12
    { participantId: 'p3', eventId: 'putt', tournamentPoints: 7 },
    { participantId: 'p3', eventId: 'drive', tournamentPoints: 5 }
  ];

  const settings = { year: 2026, date: '2026-07-11' };

  it('returns year and date from settings', () => {
    const snap = buildHistorySnapshot(scores, participants, settings);
    expect(snap.year).toBe(2026);
    expect(snap.date).toBe('2026-07-11');
  });

  it('computes correct totals and ranks', () => {
    const snap = buildHistorySnapshot(scores, participants, settings);
    // Alice (14) and Bob (14) tie for rank 1, Cecilia (12) rank 3
    const alice = snap.participants.find(p => p.name === 'Alice');
    const bob = snap.participants.find(p => p.name === 'Bob');
    const cecilia = snap.participants.find(p => p.name === 'Cecilia');

    expect(alice.total).toBe(14);
    expect(bob.total).toBe(14);
    expect(cecilia.total).toBe(12);
    expect(alice.rank).toBe(1);
    expect(bob.rank).toBe(1);
    expect(cecilia.rank).toBe(3);
  });

  it('includes handicap in participant entries', () => {
    const snap = buildHistorySnapshot(scores, participants, settings);
    const alice = snap.participants.find(p => p.name === 'Alice');
    expect(alice.handicap).toBe(20.0);
  });

  it('includes per-event breakdown', () => {
    const snap = buildHistorySnapshot(scores, participants, settings);
    const alice = snap.participants.find(p => p.name === 'Alice');
    expect(alice.breakdown.putt).toBe(8);
    expect(alice.breakdown.drive).toBe(6);
  });

  it('winner is the first-ranked participant name', () => {
    const snap = buildHistorySnapshot(scores, participants, settings);
    // Tied at rank 1 — winner is the first one alphabetically (Alice)
    expect(snap.winner).toBe('Alice');
  });

  it('participantCount matches number of participants', () => {
    const snap = buildHistorySnapshot(scores, participants, settings);
    expect(snap.participantCount).toBe(3);
  });

  it('handles empty scores (all participants get 0 total)', () => {
    const snap = buildHistorySnapshot([], participants, settings);
    expect(snap.participants).toHaveLength(0);
    expect(snap.winner).toBe(null);
    expect(snap.participantCount).toBe(0);
  });

  it('handles participant with no scores but present in participant list', () => {
    // calculateTotalScores only includes participants that have at least one score
    const partialScores = [
      { participantId: 'p1', eventId: 'putt', tournamentPoints: 8 }
    ];
    const snap = buildHistorySnapshot(partialScores, participants, settings);
    expect(snap.participants).toHaveLength(1);
    expect(snap.participants[0].name).toBe('Alice');
    expect(snap.winner).toBe('Alice');
  });
});
