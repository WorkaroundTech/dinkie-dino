import { TICK_MINUTES, clock } from './time';

/** Player-controlled settings that the simulation depends on. */
export interface Settings {
  /** Morning wake-up, minutes since midnight (TIME-05). */
  wakeMinutes: number;
  /** Bedtime of an adult; younger stages go to bed earlier (SLEEP-05/07). */
  adultBedtimeMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  wakeMinutes: clock(7), // proposed default (TIME-05)
  adultBedtimeMinutes: clock(22), // SLEEP-05
};

/** Wake-up must fall between 06:00 and 09:00 (TIME-05). */
export const WAKE_RANGE = { min: clock(6), max: clock(9) } as const;
/** Proposed bounds for the adult bedtime; the real toy's range is not known. */
export const ADULT_BEDTIME_RANGE = { min: clock(20), max: clock(23, 45) } as const;

/**
 * Problems with a settings object, or an empty list when it is fine. Every scheduled time
 * must be a multiple of 15 minutes so it lands exactly on a check (decision A3).
 */
export function validateSettings(settings: Settings): string[] {
  const errors: string[] = [];
  const onGrid = (m: number) => Number.isInteger(m) && m % TICK_MINUTES === 0;

  if (!onGrid(settings.wakeMinutes)) {
    errors.push(`wake-up must be a multiple of ${TICK_MINUTES} minutes`);
  } else if (settings.wakeMinutes < WAKE_RANGE.min || settings.wakeMinutes > WAKE_RANGE.max) {
    errors.push('wake-up must be between 06:00 and 09:00');
  }

  if (!onGrid(settings.adultBedtimeMinutes)) {
    errors.push(`adult bedtime must be a multiple of ${TICK_MINUTES} minutes`);
  } else if (
    settings.adultBedtimeMinutes < ADULT_BEDTIME_RANGE.min ||
    settings.adultBedtimeMinutes > ADULT_BEDTIME_RANGE.max
  ) {
    errors.push('adult bedtime must be between 20:00 and 23:45');
  }

  return errors;
}
