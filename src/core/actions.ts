import type { Context } from './context';
import type { GameEvent } from './events';
import { chance } from './rng';
import { bathOpen, bathe, cure } from './rules/health';
import { raise } from './rules/meters';
import { playRound, syncOverplay } from './rules/play';
import { toggleAc } from './rules/temperature';
import type { PetState, Shape } from './state';
import { METER_MAX, isHalted } from './state';

export type FoodType = 'hamburger' | 'chicken' | 'apple' | 'carrot' | 'iceCream' | 'noodles';

/**
 * What the player can do. Check and Clock only look at things, so they never change the pet
 * and are always allowed. Play is one round of Jokenpo at a time: the player's shape in, the pet's
 * hidden hand drawn at random; the last round of the configured number ends the game. More actions arrive with the rules they depend on.
 */
export type Action =
  | { kind: 'drink' }
  | { kind: 'food'; food: FoodType }
  | { kind: 'lamp' }
  | { kind: 'pet' }
  | { kind: 'educate' }
  | { kind: 'bath' }
  | { kind: 'ac' }
  | { kind: 'play'; shape: Shape }
  | { kind: 'stopPlay' }
  | { kind: 'medical' }
  | { kind: 'check' }
  | { kind: 'clock' };

/** Why the pet turned an action down; the UI plays the head shake for all of them. */
export type Refusal =
  | 'locked' // dead, or in the locked final form (LIFE-05)
  | 'asleep' // only Lamp, AC, Check and Clock work at night (SLEEP-09)
  | 'sick' // a sick pet refuses everything except Medicine, Lamp, Check, Clock and AC (SICK-01/02)
  | 'full' // a full pet refuses food and drink (Q-FOOD-3 default)
  | 'notForSpecies' // a pet refuses food that does not suit its species, even when hungry (round 16)
  | 'bathClosed' // Bath is only open when DIRTY or in the hour before bedtime (DIRT-06)
  | 'notSick'; // Medicine only works on a sick pet (MED-04)

export interface ActionResult {
  state: PetState;
  events: GameEvent[];
  /** Null when the action was carried out. */
  refused: Refusal | null;
}

const WORKS_ASLEEP = new Set<Action['kind']>(['lamp', 'ac', 'check', 'clock']);
const REFUSED_WHEN_SICK = new Set<Action['kind']>([
  'drink',
  'food',
  'educate',
  'pet',
  'bath',
  'play',
]);

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
  if (action.kind === 'food' && pet.species !== null) {
    if (!ctx.tuning.food.speciesFoods[pet.species].includes(action.food)) return 'notForSpecies';
  }
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

    case 'ac':
      toggleAc(state, ctx, nowMs, events);
      break;

    case 'play':
      playRound(state, action.shape, ctx, nowMs, events);
      break;

    case 'stopPlay':
      state.game = null; // leaving a game has no penalty (PLAY-10)
      break;

    case 'check':
    case 'clock':
      break;
  }

  syncOverplay(state);
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
    raise(
      pet.needs,
      'happiness',
      tuning.food.iceCream.happinessGain,
      tuning.care.happinessCapWithoutPlay,
    );
  }
  gainWeight(pet, food, ctx);
}

/**
 * Weight from food (round 16, 18). Caloric foods (Apple, Hamburger) add weight 75% of the time, the
 * middle-term Noodles 40% of the time; the hyper-caloric Ice Cream always does; non-caloric foods (Carrot, Chicken Thigh) never do, except
 * to a pet below its healthy range, which they help back up.
 */
function gainWeight(pet: PetState, food: FoodType, ctx: Context): void {
  const { weight } = ctx.tuning;
  if (pet.stage === 'final') return;
  const kind = weight.foodKind[food];

  let gains: boolean;
  if (kind === 'hyperCaloric') gains = true;
  else if (kind === 'caloric')
    gains = chance(pet.seed, pet.actionCounter++, 'act:calories', weight.caloricGainChance);
  else if (kind === 'mediumCaloric')
    gains = chance(pet.seed, pet.actionCounter++, 'act:calories', weight.mediumGainChance);
  else gains = pet.needs.weightKg < weight.healthyKg[pet.stage].low;

  if (gains) pet.needs.weightKg += weight.gainKg;
}
