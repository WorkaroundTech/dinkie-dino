import type { Tuning } from './tuning';
import { DEFAULT_TUNING } from './tuning';

/**
 * How much attention the room asks for (decision of round 15):
 * - `normal`: the AC wants a look about every 4 hours;
 * - `relaxed`: about every 8 hours, because the room drifts half as fast.
 * Everything else is the same in both.
 */
export type Pacing = 'normal' | 'relaxed';

export const PACINGS: readonly Pacing[] = ['normal', 'relaxed'];

/** The tuning for a pacing: a copy, so callers may adjust it freely. */
export function tuningForPacing(pacing: Pacing): Tuning {
  const tuning = structuredClone(DEFAULT_TUNING);
  if (pacing === 'relaxed')
    tuning.temperature.moveChance = DEFAULT_TUNING.temperature.moveChance / 2;
  return tuning;
}
