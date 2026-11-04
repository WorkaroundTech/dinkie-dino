import type { Action } from '../actions';
import type { Context } from '../context';
import type { PetState } from '../state';
import { conditionsOf } from './conditions';
import type { Condition } from './conditions';

/** The icon the toy blinks slowly to show what would fix the pet's main problem (ATTN-01). */
export type AttentionIcon = Extract<
  Action['kind'],
  'medical' | 'ac' | 'bath' | 'drink' | 'food' | 'pet' | 'lamp'
>;

/** What fixes each condition. Sad is lifted by Pet, the one-tap remedy that is always allowed. */
const FIX: Record<Condition, AttentionIcon> = {
  sick: 'medical',
  tooCold: 'ac',
  tooHot: 'ac',
  dirty: 'bath',
  thirsty: 'drink',
  hungry: 'food',
  sad: 'pet',
};

/**
 * Which problem is "the main one" when there are several (ATTN-02, a proposal). Ordered by how
 * soon each can hurt the pet: sickness and bad temperature start the death clocks in hours, dirt
 * makes the pet sick within hours, thirst kills in about a day, hunger in two, sadness last.
 */
const URGENCY: readonly Condition[] = [
  'sick',
  'tooCold',
  'tooHot',
  'dirty',
  'thirsty',
  'hungry',
  'sad',
];

/**
 * The icon to blink, or null when nothing is wrong. Only one icon ever blinks (ATTN-01). While the
 * pet sleeps, only what works at night counts: a light left on, and a pet suffering from the room
 * (the AC works asleep, SLEEP-09). A locked pet blinks nothing.
 */
export function attentionIcon(pet: Readonly<PetState>, ctx: Context): AttentionIcon | null {
  if (pet.dead || pet.stage === 'final') return null;

  if (pet.asleep) {
    if (pet.lightOn) return 'lamp';
    return pet.room.zone !== 'ok' ? 'ac' : null;
  }

  const found = conditionsOf(pet, ctx);
  const main = URGENCY.find((c) => found.includes(c));
  return main ? FIX[main] : null;
}
