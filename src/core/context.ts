import type { Tuning } from './config/tuning';
import { DEFAULT_TUNING } from './config/tuning';
import type { Settings } from './settings';
import { DEFAULT_SETTINGS } from './settings';
import type { LocalTimeFn } from './time';

/**
 * Everything the engine needs besides the pet itself. The core never reads the clock or the
 * time zone on its own: both come in through here.
 *
 * Note for the app layer: bring the pet up to date (`advance`) before applying a change to
 * `settings`, so a new wake-up or bedtime only affects the future (TIME-05).
 */
export interface Context {
  settings: Settings;
  tuning: Tuning;
  localTime: LocalTimeFn;
}

export function defaultContext(localTime: LocalTimeFn): Context {
  return { settings: DEFAULT_SETTINGS, tuning: DEFAULT_TUNING, localTime };
}
