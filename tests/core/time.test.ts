import { describe, expect, it } from 'vitest';
import { TICK_MS, tickIndexAt, tickStartMs, ticksBetween } from '../../src/core/time';

describe('15-minute grid (TIME-06)', () => {
  it('maps instants to the check that contains them', () => {
    expect(tickIndexAt(0)).toBe(0);
    expect(tickIndexAt(TICK_MS - 1)).toBe(0);
    expect(tickIndexAt(TICK_MS)).toBe(1);
  });

  it('round-trips a tick index through its start time', () => {
    expect(tickIndexAt(tickStartMs(123_456))).toBe(123_456);
  });

  it('lists the checks to process in order', () => {
    expect(ticksBetween(10, 14 * TICK_MS + 5)).toEqual([11, 12, 13, 14]);
  });

  it('returns nothing when the clock did not advance or went back (TIME-04)', () => {
    expect(ticksBetween(10, 10 * TICK_MS + 1)).toEqual([]);
    expect(ticksBetween(10, 3 * TICK_MS)).toEqual([]);
  });

  it('is the same whether opened once late or in pieces', () => {
    const late = ticksBetween(0, 96 * TICK_MS);
    const pieces = [
      ...ticksBetween(0, 30 * TICK_MS),
      ...ticksBetween(30, 70 * TICK_MS),
      ...ticksBetween(70, 96 * TICK_MS),
    ];
    expect(pieces).toEqual(late);
  });
});
