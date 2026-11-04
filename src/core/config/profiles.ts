import type { Tuning } from './tuning';
import { DEFAULT_TUNING } from './tuning';

/**
 * How much attention the room asks for (decision of round 15):
 * - `normal`: the AC wants a look about every 4 hours;
 * - `relaxed`: about every 8 hours, because the room drifts half as fast.
 * Everything else is the same in both, except what a lapse of the room costs the care score: the
 * room slips out of the comfort band several times as often on normal pacing, so a lapse costs
 * 0.5 point there and 2 on relaxed. That way the room weighs about the same in the score whichever
 * pacing is chosen (round 18, tuned with the simulator).
 */
export type Pacing = 'normal' | 'relaxed';

export const PACINGS: readonly Pacing[] = ['normal', 'relaxed'];

/** What a care mistake of the room (too hot, too cold) costs on the relaxed pacing. */
const RELAXED_ROOM_MISTAKE_POINTS = 2;

/** The tuning for a pacing: a copy, so callers may adjust it freely. */
export function tuningForPacing(pacing: Pacing): Tuning {
  const tuning = structuredClone(DEFAULT_TUNING);
  if (pacing === 'relaxed') {
    tuning.temperature.moveChance = DEFAULT_TUNING.temperature.moveChance / 2;
    tuning.careScore.mistakes.tooHot.points = RELAXED_ROOM_MISTAKE_POINTS;
    tuning.careScore.mistakes.tooCold.points = RELAXED_ROOM_MISTAKE_POINTS;
  }
  return tuning;
}
