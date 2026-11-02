import type { Tuning } from '../config/tuning';
import type { Settings } from '../settings';
import type { PetState, Stage } from '../state';
import type { LocalTime } from '../time';
import { isNight } from '../time';

/**
 * When a pet of this stage goes to bed, in minutes since midnight: the adult bedtime plus
 * the stage's offset (SLEEP-05/06/07). The final form never sleeps, so it reports the adult time.
 */
export function bedtimeMinutes(stage: Stage, settings: Settings, tuning: Tuning): number {
  if (stage === 'final') return settings.adultBedtimeMinutes;
  return settings.adultBedtimeMinutes + tuning.sleep.bedtimeOffsetMinutes[stage];
}

/**
 * Brings `pet.asleep` in line with the schedule at this local time and reports the change.
 * Waking and falling asleep are driven by the state flag itself, so a daylight-saving jump
 * or a repeated hour can never fire a wake-up twice (TIME-04).
 */
export function updateSleep(
  pet: PetState,
  local: LocalTime,
  settings: Settings,
  tuning: Tuning,
): 'fellAsleep' | 'woke' | null {
  const night = isNight(
    local.minutes,
    bedtimeMinutes(pet.stage, settings, tuning),
    settings.wakeMinutes,
  );
  if (night && !pet.asleep) {
    pet.asleep = true;
    return 'fellAsleep';
  }
  if (!night && pet.asleep) {
    pet.asleep = false;
    return 'woke';
  }
  return null;
}
