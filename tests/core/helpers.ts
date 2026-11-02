import type { Context } from '../../src/core';
import { DEFAULT_SETTINGS, DEFAULT_TUNING, fixedOffsetLocalTime } from '../../src/core';
import type { LocalTimeFn } from '../../src/core';

/** Local offset used by the tests: UTC-3, no daylight saving. */
export const TEST_OFFSET_MINUTES = -180;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Midnight of local day 0 of the tests (a Monday), as UTC ms. */
const DAY0_UTC_MS = Date.UTC(2026, 0, 5) - TEST_OFFSET_MINUTES * MINUTE;

/** UTC ms of a local time on test day `day` (0 = Monday), e.g. `at(0, 15, 30)`. */
export function at(day: number, hours: number, minutes = 0): number {
  return DAY0_UTC_MS + day * DAY + (hours * 60 + minutes) * MINUTE;
}

/** Like `at`, for a time zone with a fixed UTC offset other than the default test one. */
export function atOffset(offsetMinutes: number, day: number, hours: number, minutes = 0): number {
  return (
    Date.UTC(2026, 0, 5) - offsetMinutes * MINUTE + day * DAY + (hours * 60 + minutes) * MINUTE
  );
}

export function testContext(
  overrides: Partial<Context> = {},
  localTime: LocalTimeFn = fixedOffsetLocalTime(TEST_OFFSET_MINUTES),
): Context {
  return { settings: DEFAULT_SETTINGS, tuning: DEFAULT_TUNING, localTime, ...overrides };
}
