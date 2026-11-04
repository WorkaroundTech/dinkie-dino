import type { Tuning } from '../config/tuning';
import type { GameEvent } from '../events';
import type { PetState, Stage } from '../state';
import { careVerdict, lifeExtension } from './care';
import { decideSpecies } from './species';

/** The care stage a pet with this many wake-ups belongs to (LIFE table). */
export function stageForWakeUps(wakeUps: number, tuning: Tuning): Exclude<Stage, 'final'> {
  const at = tuning.growth.arrivalWakeUps;
  if (wakeUps >= at.adult) return 'adult';
  if (wakeUps >= at.teen) return 'teen';
  if (wakeUps >= at.legs) return 'legs';
  if (wakeUps >= at.tail) return 'tail';
  if (wakeUps >= at.bigBlob) return 'bigBlob';
  return 'smallBlob';
}

/**
 * The growth step of the morning routine: called right after a wake-up has been counted
 * (LIFE-02, LIFE-03). Moves the pet to its next stage, or turns it into its final form on
 * its drawn wake-up (LIFE-04).
 */
export function applyMorningGrowth(
  pet: PetState,
  atMs: number,
  tuning: Tuning,
  events: GameEvent[],
): void {
  if (pet.stage === 'final') return;

  // On the drawn wake-up a well cared for pet lives on, once, by up to the rest of the way to the
  // longest life (CARE-07); then it transforms on the new day.
  if (pet.wakeUps >= pet.finalFormAtWakeUp && !pet.care.extended) {
    pet.care.extended = true;
    const extra = lifeExtension(pet, tuning);
    if (extra > 0) {
      pet.finalFormAtWakeUp += extra;
      events.push({ type: 'lifeExtended', atMs, extraWakeUps: extra });
    }
  }

  if (pet.wakeUps >= pet.finalFormAtWakeUp) {
    pet.stage = 'final';
    pet.finalForm = careVerdict(pet, tuning);
    events.push({ type: 'finalForm', atMs, form: pet.finalForm });
    return;
  }

  const next = stageForWakeUps(pet.wakeUps, tuning);
  if (next !== pet.stage) {
    events.push({ type: 'grew', atMs, from: pet.stage, to: next });
    pet.stage = next;
  }

  // The species shows as soon as the pet becomes a blob with a tail (SPEC-04).
  if (pet.stage === 'tail' && pet.species === null) {
    pet.species = decideSpecies(pet, tuning);
    events.push({ type: 'species', atMs, species: pet.species });
  }
}
