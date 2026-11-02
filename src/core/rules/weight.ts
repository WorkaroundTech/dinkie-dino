import type { Context } from '../context';
import type { GameEvent } from '../events';
import { chance } from '../rng';
import type { PetState } from '../state';
import { becomeSick } from './health';

/** Whether the pet is too heavy for its stage (WEIGHT-01). The final form has no weight limit. */
export function isTooHeavy(pet: Readonly<PetState>, ctx: Context): boolean {
  if (pet.stage === 'final') return false;
  return pet.needs.weightKg > ctx.tuning.weight.heavyAboveKg[pet.stage];
}

/**
 * A too heavy pet may fall sick on any awake check, more often before adulthood, and can in the
 * end die of it (the `tooHeavy` death clock in health.ts) (WEIGHT-01).
 */
export function updateWeight(
  pet: PetState,
  ctx: Context,
  tick: number,
  atMs: number,
  awakeInterval: boolean,
  events: GameEvent[],
): void {
  if (!awakeInterval || pet.sick || !isTooHeavy(pet, ctx)) return;
  const { sickChancePerCheck } = ctx.tuning.weight;
  const p = pet.stage === 'adult' ? sickChancePerCheck.adult : sickChancePerCheck.preAdult;
  if (chance(pet.seed, tick, 'heavySick', p)) becomeSick(pet, atMs, 'weight', events);
}
