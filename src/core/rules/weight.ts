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
  if (!awakeInterval || pet.stage === 'final') return;
  burnOverTime(pet, ctx, tick);
  if (pet.sick || !isTooHeavy(pet, ctx)) return;
  const { sickChancePerCheck } = ctx.tuning.weight;
  const p = pet.stage === 'adult' ? sickChancePerCheck.adult : sickChancePerCheck.preAdult;
  if (chance(pet.seed, tick, 'heavySick', p)) becomeSick(pet, atMs, 'weight', events);
}

/**
 * Weight burns off steadily while awake, with a chance that grows with every kg above the healthy
 * range: slowly just above it, faster when much heavier (round 16).
 */
function burnOverTime(pet: PetState, ctx: Context, tick: number): void {
  if (pet.stage === 'final') return;
  const { weight } = ctx.tuning;
  const excess = pet.needs.weightKg - weight.healthyKg[pet.stage].high;
  if (excess <= 0) return;
  const p = Math.min(1, excess * weight.burnChancePerExcessKg);
  if (chance(pet.seed, tick, 'weightBurn', p)) {
    pet.needs.weightKg = Math.max(weight.minKg, pet.needs.weightKg - weight.burnKg);
  }
}
