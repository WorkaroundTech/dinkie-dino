import type { Tuning } from '../config/tuning';
import { rand } from '../rng';
import type { Diet, PetState, Species } from '../state';

interface Group {
  key: keyof Diet;
  species: Species;
}

const MEAT: Group = { key: 'meat', species: 'trex' };
const PLANT: Group = { key: 'plant', species: 'bronto' };
const NOODLES: Group = { key: 'noodles', species: 'triceratops' };
const GROUPS: readonly Group[] = [MEAT, PLANT, NOODLES];

/**
 * Species from the meals eaten while a small or big blob (SPEC-01…06):
 * - a group with more than half of the meals wins outright;
 * - otherwise a random draw weighted by each group's share;
 * - with no meals at all (which starvation should prevent, DEATH-05) every species is equally
 *   likely, so a pet can never be left without one.
 * The draw is a pure function of the pet's seed and wake-up count, so it cannot be re-rolled.
 */
export function decideSpecies(pet: Readonly<PetState>, tuning: Tuning): Species {
  const total = pet.diet.meat + pet.diet.plant + pet.diet.noodles;
  const u = rand(pet.seed, pet.wakeUps, 'species');

  if (total === 0) return pick(u, [1 / 3, 2 / 3]);

  for (const group of GROUPS) {
    if (pet.diet[group.key] / total > tuning.species.majorityShare) return group.species;
  }
  return pick(u, [pet.diet.meat / total, (pet.diet.meat + pet.diet.plant) / total]);
}

/** Picks MEAT, PLANT or NOODLES from a draw `u` and the two cumulative boundaries. */
function pick(u: number, [meatEnd, plantEnd]: [number, number]): Species {
  if (u < meatEnd) return MEAT.species;
  if (u < plantEnd) return PLANT.species;
  return NOODLES.species;
}
