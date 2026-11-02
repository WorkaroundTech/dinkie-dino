import type { Pacing } from './config/profiles';
import { PACINGS } from './config/profiles';
import { TICK_MINUTES, clock } from './time';

/** Player-controlled settings that the simulation depends on. */
export interface Settings {
  /** Morning wake-up, minutes since midnight (TIME-05). */
  wakeMinutes: number;
  /**
   * The latest bedtime the player allows (SLEEP-05/07, round 16). Each stage goes to bed at its
   * own time, but never later than this, so someone who cannot stay up for an adult pet can have
   * it sleep earlier.
   */
  latestBedtimeMinutes: number;
  /** Rounds in a game of Jokenpo, 3 to 5; the majority of the rounds decides the game (PLAY-01). */
  jokenpoRounds: number;
  /** How much attention the room asks for: about every 4 hours, or every 8 (doc 15). */
  pacing: Pacing;
}

export const DEFAULT_SETTINGS: Settings = {
  wakeMinutes: clock(7), // proposed default (TIME-05)
  latestBedtimeMinutes: clock(22), // SLEEP-05: an adult goes to bed at 22:00
  jokenpoRounds: 3, // PLAY-01 default
  pacing: 'normal',
};

/** A game has 3 to 5 rounds (PLAY-01). */
export const JOKENPO_ROUNDS_RANGE = { min: 3, max: 5 } as const;

/** Wake-up must fall between 06:00 and 09:00 (TIME-05). */
export const WAKE_RANGE = { min: clock(6), max: clock(9) } as const;
/** The latest bedtime can be set from the blobs' own bedtime up to just before midnight. */
export const LATEST_BEDTIME_RANGE = { min: clock(19), max: clock(23, 45) } as const;

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

  if (!onGrid(settings.latestBedtimeMinutes)) {
    errors.push(`latest bedtime must be a multiple of ${TICK_MINUTES} minutes`);
  } else if (
    settings.latestBedtimeMinutes < LATEST_BEDTIME_RANGE.min ||
    settings.latestBedtimeMinutes > LATEST_BEDTIME_RANGE.max
  ) {
    errors.push('latest bedtime must be between 19:00 and 23:45');
  }

  const rounds = settings.jokenpoRounds;
  if (
    !Number.isInteger(rounds) ||
    rounds < JOKENPO_ROUNDS_RANGE.min ||
    rounds > JOKENPO_ROUNDS_RANGE.max
  ) {
    errors.push('a game of Jokenpo has 3 to 5 rounds');
  }

  if (!PACINGS.includes(settings.pacing)) errors.push('pacing must be normal or relaxed');

  return errors;
}
