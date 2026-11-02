import type { Context, Tuning } from '../../src/core';
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

/** The tuning of `calmContext`: no sickness, no dirt, no death. */
export function calmTuning(): Tuning {
  const tuning = structuredClone(DEFAULT_TUNING);
  const never = { min: 1_000_000_000, max: 1_000_000_000 };
  tuning.health.wakeSickChance = { lightOff: 0, lightOn: 0 };
  tuning.health.dirt.thresholdChecks = never;
  tuning.health.deathOnsetChecks = {
    sick: never,
    hunger: never,
    thirst: never,
    lowHappiness: never,
    tooHot: never,
    tooCold: never,
  };
  tuning.temperature.moveChance = 0; // the room stays at 25 degrees
  return tuning;
}

/**
 * A context in which nothing can go wrong: no sickness, no dirt, no death. For tests about
 * growth and the schedule, which would otherwise be cut short by an unattended pet dying.
 * `patch` can switch individual hazards back on.
 */
export function calmContext(
  localTime: LocalTimeFn = fixedOffsetLocalTime(TEST_OFFSET_MINUTES),
  patch?: (tuning: Tuning) => void,
): Context {
  const tuning = calmTuning();
  patch?.(tuning);
  return testContext({ tuning }, localTime);
}
