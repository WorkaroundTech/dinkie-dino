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
  /** The room light, switched with the Lamp (SLEEP-01). */
  lightOn: boolean;
  /** Sleeping checks with the light on, since the last wake-up (SLEEP-02/03). */
  nightLightChecks: number;
  room: Room;
  sick: { sinceMs: number } | null;
  dirt: Dirt;
  /** Running death clocks, by cause (DEATH-07/08). */
  dangers: Partial<Record<DeathCause, Danger>>;
  needs: Needs;
  decay: DecayProgress;

  /** Meals given while the pet is a small or big blob; they decide the species (SPEC-01/05). */
  diet: Diet;
  /** Random draws made by actions so far: the counter for `rand` in actions (rng.ts). */
  actionCounter: number;

  /** The last 15-minute check that has been processed (TIME-06). */
  lastCheckIndex: number;
}

export interface Diet {
  meat: number;
  plant: number;
  noodles: number;
}

/** The room the pet lives in (TEMP-01…18). */
export interface Room {
  tempC: number;
  acOn: boolean;
  /** The one-off bump toward comfort is available again once the room is back in the band (TEMP-14). */
  bumpArmed: boolean;
  /** TOO_COLD / TOO_HOT while the pet suffers from the temperature (TEMP-07/08). */
  zone: 'ok' | 'tooCold' | 'tooHot';
  /** Awake checks spent in the current zone. */
  zoneChecks: number;
}

/** Dirtiness (DIRT-01…10): there is no poop; the pet simply gets dirty over time. */
export interface Dirt {
  /** Checks since the last bath (or hatching) while clean; it keeps counting through the night (DIRT-08). */
  checks: number;
  /** The pet gets dirty after this many checks, drawn per bath cycle: 16 to 20 hours (DIRT-02). */
  threshold: number;
  /** Set while the pet is DIRTY. */
  dirty: null | {
    sinceMs: number;
    /** Checks spent dirty. */
    checks: number;
    /** The 2 to 3 hours of grace before the dirty checks begin (DIRT-09), in checks. */
    onsetChecks: number;
    /** Dirty checks made so far; the sickness chance escalates with it. */
    rolls: number;
    /** Set once the dirt made the pet sick; cleared by the cure (DIRT-10). */
    sickRollsStopped: boolean;
  };
}

/**
 * A condition that can eventually kill: it must last `onsetChecks` before death checks start,
 * then each awake check rolls with a rising chance (DEATH-07/08).
 *
 * `progress` is in the same integer units as need decay (rules/needs.ts DECAY_SCALE per awake
 * check): sleeping time counts, but slowed down like everything else at night, so that a night
 * does not push a pet into the lethal phase before the player can wake up and help (SLEEP-11/12).
 */
export interface Danger {
  progress: number;
  onsetChecks: number;
  rolls: number;
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
    lightOn: false, // Q-START-1 default
    nightLightChecks: 0,
    room: {
      tempC: tuning.temperature.start,
      acOn: false,
      bumpArmed: true,
      zone: 'ok',
      zoneChecks: 0,
    },
    sick: null,
    dirt: {
      checks: 0,
      threshold: randInt(
        params.seed,
        0,
        'dirtThreshold',
        tuning.health.dirt.thresholdChecks.min,
        tuning.health.dirt.thresholdChecks.max,
      ),
      dirty: null,
    },
    dangers: {},
    needs: { ...tuning.initial },
    decay: { hunger: 0, thirst: 0, happiness: 0 },
    diet: { meat: 0, plant: 0, noodles: 0 },
    actionCounter: 0,
    lastCheckIndex: tickIndexAt(params.nowMs),
  };
}

/** A dead pet or one in its locked final form no longer changes (LIFE-05). */
export function isHalted(pet: Readonly<PetState>): boolean {
  return pet.dead !== null || pet.stage === 'final';
}
