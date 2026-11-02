import type { Tuning } from '../config/tuning';
import type { PetState } from '../state';

type DecayingMeter = 'hunger' | 'thirst' | 'happiness';
const DECAYING: readonly DecayingMeter[] = ['hunger', 'thirst', 'happiness'];

/**
 * Decay progress is kept in integers so that boundaries are exact: one awake check is
 * `DECAY_SCALE` units. 840 is divisible by 4, 5, 6, 7 and 8, so every whole attenuation
 * the rules allow (SLEEP-11: 4 to 8) is exact. Floating point would drift, for instance
 * 24 sleeping checks of 1/6 add up to 3.9999999999999996, one check short of 4.
 */
export const DECAY_SCALE = 840;

/**
 * One 15-minute check of need decay (PACE-01, SLEEP-11).
 *
 * Each meter loses a point every `checksPerPoint` awake checks. While asleep it advances
 * `sleepAttenuation` times slower. An empty meter stays empty and keeps no leftover progress,
 * so feeding it does not cause an instant drop.
 *
 * Education does not decay over time (it only drops from over-play, EDU-04).
 */
export function decayNeeds(pet: PetState, tuning: Tuning): void {
  const step = pet.asleep ? Math.round(DECAY_SCALE / tuning.needs.sleepAttenuation) : DECAY_SCALE;

  for (const meter of DECAYING) {
    if (pet.needs[meter] <= 0) {
      pet.decay[meter] = 0;
      continue;
    }
    const perPoint = tuning.needs.checksPerPoint[meter] * DECAY_SCALE;
    pet.decay[meter] += step;
    while (pet.decay[meter] >= perPoint && pet.needs[meter] > 0) {
      pet.needs[meter] -= 1;
      pet.decay[meter] -= perPoint;
    }
    if (pet.needs[meter] <= 0) pet.decay[meter] = 0;
  }
}
