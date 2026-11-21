import { describe, expect, it } from 'vitest';
import { QUADRANT_INFO, QUADRANT_LIST, quadrantFor } from './quadrants';
import { isQuadrant, QUADRANTS } from './todo';

describe('quadrants (REQUIREMENTS §4)', () => {
  it.each([
    { urgent: true, important: true, expected: 'Q1', label: 'Do Now' },
    { urgent: false, important: true, expected: 'Q2', label: 'Schedule' },
    { urgent: true, important: false, expected: 'Q3', label: 'Delegate' },
    { urgent: false, important: false, expected: 'Q4', label: 'Delete' },
  ] as const)(
    'urgent=$urgent, important=$important → $expected ($label)',
    ({ urgent, important, expected, label }) => {
      expect(quadrantFor({ urgent, important })).toBe(expected);
      expect(QUADRANT_INFO[expected]).toMatchObject({ id: expected, urgent, important, label });
    },
  );

  it('lists quadrants in Q1–Q4 order', () => {
    expect(QUADRANT_LIST.map((q) => q.id)).toEqual([...QUADRANTS]);
  });

  it('isQuadrant accepts only Q1–Q4', () => {
    expect(QUADRANTS.every(isQuadrant)).toBe(true);
    for (const value of ['Q5', 'q1', '', null, undefined, 1]) {
      expect(isQuadrant(value)).toBe(false);
    }
  });
});
