import type { Context } from '../context';
import type { PetState } from '../state';

/**
 * What the pet can be in (COND-01). Hungry and thirsty have no sprite of their own (round 16);
 * they are shown on the Check screen and make the pet beep.
 */
export type Condition = 'sick' | 'tooCold' | 'tooHot' | 'sad' | 'dirty' | 'hungry' | 'thirsty';

/** The conditions that have their own sprite, from the most urgent: sick, too cold / too hot, sad, dirty. */
const WITH_SPRITE: readonly Condition[] = ['sick', 'tooCold', 'tooHot', 'sad', 'dirty'];

/**
 * The conditions the pet is in, in that order, with hungry and thirsty last (they only matter for
 * the beep and the Check screen). Hungry, thirsty and sad mean the meter is completely empty
 * (round 16); what they cause starts at the following check.
 */
export function conditionsOf(pet: Readonly<PetState>, ctx: Context): Condition[] {
  const { conditions } = ctx.tuning;
  const found: Condition[] = [];
  if (pet.sick) found.push('sick');
  if (pet.room.zone === 'tooCold') found.push('tooCold');
  if (pet.room.zone === 'tooHot') found.push('tooHot');
  if (pet.needs.happiness <= conditions.sadAtOrBelow) found.push('sad');
  if (pet.dirt.dirty) found.push('dirty');
  if (pet.needs.hunger <= conditions.hungryAtOrBelow) found.push('hungry');
  if (pet.needs.thirst <= conditions.thirstyAtOrBelow) found.push('thirsty');
  return found;
}

/** The sprite to show right now: the most urgent condition that has one, if any. */
export function displayCondition(pet: Readonly<PetState>, ctx: Context): Condition | null {
  const found = conditionsOf(pet, ctx);
  return WITH_SPRITE.find((c) => found.includes(c)) ?? null;
}

/**
 * Whether the pet is calling for attention, which the app turns into a beep (every 5 minutes, the
 * same tune for every condition, COND-02). A locked pet and a sleeping pet do not call.
 */
export function needsAttention(pet: Readonly<PetState>, ctx: Context): boolean {
  if (pet.dead || pet.stage === 'final' || pet.asleep) return false;
  return conditionsOf(pet, ctx).length > 0;
}
