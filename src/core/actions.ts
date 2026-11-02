import type { Context } from './context';
import type { GameEvent } from './events';
import { chance } from './rng';
import { bathOpen, bathe, cure } from './rules/health';
import { raise } from './rules/meters';
import type { PetState } from './state';
import { METER_MAX, isHalted } from './state';

export type FoodType = 'hamburger' | 'chicken' | 'apple' | 'carrot' | 'iceCream' | 'noodles';

/**
 * What the player can do. Check and Clock only look at things, so they never change the pet
 * and are always allowed. More actions arrive with the rules they depend on.
 */
export type Action =
  | { kind: 'drink' }
  | { kind: 'food'; food: FoodType }
  | { kind: 'lamp' }
  | { kind: 'pet' }
  | { kind: 'educate' }
  | { kind: 'bath' }
  | { kind: 'medical' }
  | { kind: 'check' }
  | { kind: 'clock' };

/** Why the pet turned an action down; the UI plays the head shake for all of them. */
export type Refusal =
  | 'locked' // dead, or in the locked final form (LIFE-05)
  | 'asleep' // only Lamp, Check and Clock work at night (SLEEP-09)
  | 'sick' // a sick pet refuses everything except Medicine, Lamp, Check, Clock and AC (SICK-01/02)
  | 'full' // a full pet refuses food and drink (Q-FOOD-3 default)
  | 'bathClosed' // Bath is only open when DIRTY or in the hour before bedtime (DIRT-06)
  | 'notSick'; // Medicine only works on a sick pet (MED-04)

export interface ActionResult {
  state: PetState;
  events: GameEvent[];
  /** Null when the action was carried out. */
  refused: Refusal | null;
}

const WORKS_ASLEEP = new Set<Action['kind']>(['lamp', 'check', 'clock']);
const REFUSED_WHEN_SICK = new Set<Action['kind']>(['drink', 'food', 'educate', 'pet', 'bath']);

/** The meal group a food belongs to for the species rule (SPEC); Ice Cream belongs to none. */
const FOOD_GROUP: Record<FoodType, 'meat' | 'plant' | 'noodles' | null> = {
  hamburger: 'meat',
  chicken: 'meat',
  apple: 'plant',
  carrot: 'plant',
  noodles: 'noodles',
  iceCream: null,
};

/** Null when the action would be carried out, otherwise the reason it would be refused. */
export function canDo(
  pet: Readonly<PetState>,
  action: Action,
  nowMs: number,
  ctx: Context,
): Refusal | null {
  if (isHalted(pet)) return 'locked';
  if (pet.asleep && !WORKS_ASLEEP.has(action.kind)) return 'asleep';
  if (pet.sick && REFUSED_WHEN_SICK.has(action.kind)) return 'sick';
  if (action.kind === 'medical' && !pet.sick) return 'notSick';
  if (action.kind === 'bath' && !bathOpen(pet, ctx.localTime(nowMs), ctx)) return 'bathClosed';

  if (ctx.tuning.food.refuseWhenFull) {
    if (action.kind === 'drink' && pet.needs.thirst >= METER_MAX.thirst) return 'full';
    if (
      action.kind === 'food' &&
      action.food !== 'iceCream' &&
      pet.needs.hunger >= METER_MAX.hunger
    ) {
      return 'full';
    }
  }
  return null;
}

/**
 * Carries out an action at `nowMs`. Bring the pet up to date with `advance` first. Pure: the
 * input is not modified. Random outcomes come from the pet's own action counter (rng.ts), so a
 * given pet history always produces the same results.
 */
export function act(
  pet: Readonly<PetState>,
  action: Action,
  nowMs: number,
  ctx: Context,
): ActionResult {
  const state = structuredClone(pet) as PetState;
  const events: GameEvent[] = [];

  const refused = canDo(state, action, nowMs, ctx);
  if (refused) {
    events.push({ type: 'refused', atMs: nowMs, action, reason: refused });
    return { state, events, refused };
  }

  const { tuning } = ctx;
  switch (action.kind) {
    case 'drink':
      raise(state.needs, 'thirst', tuning.food.thirstGain);
      break;

    case 'food':
      eat(state, action.food, ctx);
      break;

    case 'lamp':
      state.lightOn = !state.lightOn;
      break;

    case 'pet':
      raise(
        state.needs,
        'happiness',
        tuning.care.petHappinessGain,
        tuning.care.happinessCapWithoutPlay,
      );
      raise(state.needs, 'education', tuning.care.petEducationGain, tuning.care.petEducationCap);
      break;

    case 'educate':
      raise(state.needs, 'education', tuning.care.educateGain);
      break;

    case 'bath':
      bathe(state, ctx, nowMs, events);
      break;

    case 'medical':
      cure(state, nowMs, events);
      break;

    case 'check':
    case 'clock':
      break;
  }

  events.push({ type: 'acted', atMs: nowMs, action });
  return { state, events, refused: null };
}

function eat(pet: PetState, food: FoodType, ctx: Context): void {
  const { tuning } = ctx;
  raise(pet.needs, 'hunger', tuning.food.hungerGain[food]);

  // Only meals eaten as a small or big blob count toward the species (SPEC-01).
  const group = FOOD_GROUP[food];
  if (group && (pet.stage === 'smallBlob' || pet.stage === 'bigBlob')) pet.diet[group] += 1;

  if (food === 'iceCream') {
    const { iceCream } = tuning.food;
    raise(pet.needs, 'happiness', iceCream.happinessGain, tuning.care.happinessCapWithoutPlay);
    if (chance(pet.seed, pet.actionCounter++, 'act:iceCreamWeight', iceCream.weightChance)) {
      pet.needs.weightKg += iceCream.weightGainKg;
    }
  }
}
