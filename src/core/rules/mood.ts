import type { Context } from '../context';
import type { PetState } from '../state';
import { SUPER_HAPPY, VERY_HAPPY } from '../state';
import { conditionsOf } from './conditions';

/**
 * Whether the pet is in good enough shape to be taken to SuperHappy (HAP-05, round 17): well fed
 * and watered, well educated, and free of sickness, dirt and temperature trouble. The rule reads
 * the same whether the pet is awake or not; only a won game can use it (rules/play.ts).
 */
export function canBeSuperHappy(pet: Readonly<PetState>, ctx: Context): boolean {
  const { superHappy } = ctx.tuning.care;
  const { hunger, thirst, education } = pet.needs;
  if (hunger < superHappy.minHunger || thirst < superHappy.minThirst) return false;
  if (education < superHappy.minEducation) return false;
  return conditionsOf(pet, ctx).length === 0;
}

/** The highest happiness a won game can take the pet to right now. */
export function playHappinessCap(pet: Readonly<PetState>, ctx: Context): number {
  return canBeSuperHappy(pet, ctx) ? SUPER_HAPPY : VERY_HAPPY;
}
