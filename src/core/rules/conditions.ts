import type { Context } from '../context';
import type { PetState } from '../state';

/** What the pet can be seen to suffer from (COND-01). Each has its own sprites. */
export type Condition = 'sick' | 'tooCold' | 'tooHot' | 'hungry' | 'thirsty' | 'dirty' | 'sad';

/**
 * The conditions the pet is in, most urgent first. When several apply the UI shows the first one.
 * The order is a proposal (Q-COND-1): sick, too cold / too hot, hungry, thirsty, dirty, sad.
 */
export function conditionsOf(pet: Readonly<PetState>, ctx: Context): Condition[] {
  const { conditions } = ctx.tuning;
  const found: Condition[] = [];
  if (pet.sick) found.push('sick');
  if (pet.room.zone === 'tooCold') found.push('tooCold');
  if (pet.room.zone === 'tooHot') found.push('tooHot');
  if (pet.needs.hunger <= conditions.hungryAtOrBelow) found.push('hungry');
  if (pet.needs.thirst <= conditions.thirstyAtOrBelow) found.push('thirsty');
  if (pet.dirt.dirty) found.push('dirty');
  if (pet.needs.happiness <= conditions.sadAtOrBelow) found.push('sad');
  return found;
}

/** The condition to show right now, if any. */
export function displayCondition(pet: Readonly<PetState>, ctx: Context): Condition | null {
  return conditionsOf(pet, ctx)[0] ?? null;
}

/**
 * Whether the pet is calling for attention, which the app turns into a beep from time to time
 * (COND-02). A locked pet and a sleeping pet do not call.
 */
export function needsAttention(pet: Readonly<PetState>, ctx: Context): boolean {
  if (pet.dead || pet.stage === 'final' || pet.asleep) return false;
  return conditionsOf(pet, ctx).length > 0;
}
