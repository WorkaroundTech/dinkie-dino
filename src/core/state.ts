import type { Context } from './context';
import { randInt } from './rng';
import { bedtimeMinutes } from './rules/sleep';
import { isNight, tickIndexAt } from './time';

/** Bumped when the saved shape changes; migrations live in migrations.ts (M5). */
export const SCHEMA_VERSION = 1;

/**
 * Life stages after hatching (LIFE table in doc 08). The egg is only an animation that
 * plays before the pet is created, so it is not a stage here.
 */
export type Stage = 'smallBlob' | 'bigBlob' | 'tail' | 'legs' | 'teen' | 'adult' | 'final';

/** Stages in which the pet needs care, in order (everything before the locked final form). */
export const CARE_STAGES = ['smallBlob', 'bigBlob', 'tail', 'legs', 'teen', 'adult'] as const;
export type CareStage = (typeof CARE_STAGES)[number];

export type Species = 'trex' | 'bronto' | 'triceratops';
export type FinalForm = 'angel' | 'demon';

/** Why a pet died before its final form (DEATH-01, DEATH-07). */
export type DeathCause =
  'sick' | 'tooHot' | 'tooCold' | 'lowHappiness' | 'hunger' | 'thirst' | 'tooHeavy' | 'shock';

/** Upper bounds of the meters; the lower bound is always 0 (NEED-01). */
export const METER_MAX = {
  hunger: 8, // 4 bowls x half steps; 0 = completely empty (HUNGRY)
  thirst: 8, // 4 glasses x half steps; 0 = completely empty (THIRSTY)
  happiness: 4, // 0 VerySad, 1 Sad, 2 Normal, 3 Happy, 4 VeryHappy
  education: 4, // 0 E+, 1 D+, 2 C+, 3 B+, 4 A+ (EDU-01)
} as const;

export interface Needs {
  hunger: number;
  thirst: number;
  happiness: number;
  education: number;
  /** Placeholder until the weight scale is decided (Q-WEIGHT-1). */
  weightKg: number;
}

/**
 * How far each meter has progressed toward its next drop, in integer units where one awake
 * check is `DECAY_SCALE` (rules/needs.ts). Sleeping adds fewer units (SLEEP-11).
 */
export interface DecayProgress {
  hunger: number;
  thirst: number;
  happiness: number;
}

/** Everything about one pet. Plain JSON, so it can be saved, exported and diffed as is. */
export interface PetState {
  schemaVersion: number;
  id: string;
  name: string;
  /** Seed for counter-based randomness (rng.ts). Never changes. */
  seed: number;
  /** UTC ms at which the pet hatched. */
  bornAtMs: number;

  stage: Stage;
  /** Decided when the pet becomes "blob with tail" (SPEC); null before that. */
  species: Species | null;
  /** Morning wake-ups since hatching (LIFE-02). */
  wakeUps: number;
  /** The wake-up at which the pet turns into its final form, drawn at hatching (LIFE-04). */
  finalFormAtWakeUp: number;
  finalForm: FinalForm | null;
  dead: { cause: DeathCause; atMs: number } | null;

  asleep: boolean;
  needs: Needs;
  decay: DecayProgress;

  /** The last 15-minute check that has been processed (TIME-06). */
  lastCheckIndex: number;
}

export interface NewPetParams {
  id: string;
  name: string;
  seed: number;
  /** The moment of hatching, UTC ms. */
  nowMs: number;
}

/**
 * Creates a freshly hatched small blob. A pet that hatches during the night starts
 * asleep and its first morning wake-up counts as wake-up 1 (LIFE-02).
 */
export function createPet(params: NewPetParams, ctx: Context): PetState {
  const { tuning, settings, localTime } = ctx;
  const local = localTime(params.nowMs);
  const asleep = isNight(
    local.minutes,
    bedtimeMinutes('smallBlob', settings, tuning),
    settings.wakeMinutes,
  );
  const { min, max } = tuning.growth.finalFormWakeUps;

  return {
    schemaVersion: SCHEMA_VERSION,
    id: params.id,
    name: params.name,
    seed: params.seed,
    bornAtMs: params.nowMs,
    stage: 'smallBlob',
    species: null,
    wakeUps: 0,
    // Counter 0 is reserved for draws made once, at hatching.
    finalFormAtWakeUp: randInt(params.seed, 0, 'finalFormWakeUp', min, max),
    finalForm: null,
    dead: null,
    asleep,
    needs: { ...tuning.initial },
    decay: { hunger: 0, thirst: 0, happiness: 0 },
    lastCheckIndex: tickIndexAt(params.nowMs),
  };
}

/** A dead pet or one in its locked final form no longer changes (LIFE-05). */
export function isHalted(pet: Readonly<PetState>): boolean {
  return pet.dead !== null || pet.stage === 'final';
}
