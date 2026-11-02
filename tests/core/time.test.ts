import { describe, expect, it } from 'vitest';
import {
  TICK_MS,
  clock,
  fixedOffsetLocalTime,
  isNight,
  systemLocalTime,
  tickIndexAt,
  tickStartMs,
  ticksBetween,
} from '../../src/core/time';

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

describe('local time', () => {
  const HOUR = 3_600_000;

  it('applies a fixed offset and keeps day and minutes consistent', () => {
    const utcMinus3 = fixedOffsetLocalTime(-180);
    // 1970-01-01 03:00 UTC is local midnight at UTC-3.
    expect(utcMinus3(3 * HOUR)).toEqual({ day: 0, minutes: 0 });
    expect(utcMinus3(3 * HOUR - 60_000)).toEqual({ day: -1, minutes: 1439 });
    expect(utcMinus3(3 * HOUR + 7 * HOUR + 30 * 60_000)).toEqual({ day: 0, minutes: clock(7, 30) });
  });

  it('moves to the next local day at local midnight', () => {
    const f = fixedOffsetLocalTime(60);
    const before = f(23 * HOUR - 60_000); // 22:59 UTC = 23:59 local
    const after = f(23 * HOUR); // 00:00 local next day
    expect(after.day).toBe(before.day + 1);
    expect(after.minutes).toBe(0);
  });

  it('reads the device zone for the system clock', () => {
    const ms = Date.UTC(2026, 5, 15, 12, 34);
    const d = new Date(ms);
    const lt = systemLocalTime(ms);
    expect(lt.minutes).toBe(d.getHours() * 60 + d.getMinutes());
    expect(systemLocalTime(ms + 24 * HOUR).day).toBeGreaterThan(lt.day);
  });
});

describe('night window (SLEEP-01)', () => {
  const bed = clock(19);
  const wake = clock(7);

  it('is night from bedtime across midnight until wake-up', () => {
    expect(isNight(clock(18, 45), bed, wake)).toBe(false);
    expect(isNight(clock(19), bed, wake)).toBe(true);
    expect(isNight(clock(23, 59), bed, wake)).toBe(true);
    expect(isNight(clock(0), bed, wake)).toBe(true);
    expect(isNight(clock(6, 45), bed, wake)).toBe(true);
    expect(isNight(clock(7), bed, wake)).toBe(false);
    expect(isNight(clock(12), bed, wake)).toBe(false);
  });
});
