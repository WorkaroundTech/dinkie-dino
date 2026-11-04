import type {
  Action,
  CareKind,
  Condition,
  Context,
  DeathCause,
  FinalForm,
  PetState,
  SickCause,
  Species,
} from '../../src/core';
import {
  act,
  advanceInPlace,
  carePoints,
  conditionsOf,
  createPet,
  isHalted,
  TICK_MS,
} from '../../src/core';
import type { Player } from './players';
import { runSession, sessionMinutes } from './players';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type Outcome = 'final' | 'dead' | 'timeout';

/** What happened to one simulated pet. */
export interface LifeReport {
  seed: number;
  outcome: Outcome;
  cause: DeathCause | null;
  species: Species | null;
  finalForm: FinalForm | null;
  /** Hours from hatching to the end (death, final form, or the end of the run). */
  hoursLived: number;
  wakeUps: number;
  /** Visits by the player. */
  sessions: number;
  /** Awake checks, and how many of them showed each condition (COND-01). */
  awakeChecks: number;
  conditionChecks: Record<Condition | 'any' | 'need', number>;
  actions: Record<string, number>;
  /** How many times the pet fell sick, and of what. */
  sickBy: Partial<Record<SickCause, number>>;
  /** The proposed care score (docs/16): mistakes by kind, and the points they cost. */
  careMistakes: Record<CareKind, number>;
  carePoints: number;
}

export interface LifeOptions {
  seed: number;
  player: Player;
  ctx: Context;
  /** UTC ms of hatching. */
  hatchMs: number;
  maxDays: number;
}

const CONDITIONS: readonly Condition[] = [
  'sick',
  'tooCold',
  'tooHot',
  'hungry',
  'thirsty',
  'dirty',
  'sad',
];
const NEEDS: readonly Condition[] = ['hungry', 'thirsty', 'sad'];

/**
 * Plays one whole life, one 15-minute check at a time: the engine advances, the player visits
 * when it is time, and what the pet shows is counted. Deterministic for a seed.
 */
export function simulateLife(options: LifeOptions): LifeReport {
  const { seed, player, ctx, hatchMs, maxDays } = options;
  let pet: PetState = createPet({ id: `sim-${seed}`, seed, nowMs: hatchMs }, ctx);

  const conditionChecks = { any: 0, need: 0 } as LifeReport['conditionChecks'];
  for (const c of CONDITIONS) conditionChecks[c] = 0;
  const log = { actions: {} as Record<string, number> };
  let awakeChecks = 0;
  let sessions = 0;
  const sickBy: LifeReport['sickBy'] = {};

  const replace = (current: PetState, action: Action): PetState =>
    act(current, action, current.lastCheckIndex * TICK_MS, ctx).state;
  const endMs = hatchMs + maxDays * DAY_MS;

  for (let t = (pet.lastCheckIndex + 1) * TICK_MS; t <= endMs && !isHalted(pet); t += TICK_MS) {
    for (const event of advanceInPlace(pet, t, ctx)) {
      if (event.type === 'gotSick') sickBy[event.cause] = (sickBy[event.cause] ?? 0) + 1;
    }
    if (isHalted(pet)) break;

    const present =
      player.leavesAfterHours === undefined || t < hatchMs + player.leavesAfterHours * HOUR_MS;
    if (
      present &&
      !pet.asleep &&
      sessionMinutes(player, pet, ctx).includes(ctx.localTime(t).minutes)
    ) {
      pet = runSession(pet, player, t, ctx, log, replace);
      sessions += 1;
    }

    if (!pet.asleep) {
      awakeChecks += 1;
      const shown = conditionsOf(pet, ctx);
      if (shown.length > 0) conditionChecks.any += 1;
      if (shown.some((c) => NEEDS.includes(c))) conditionChecks.need += 1;
      for (const c of shown) conditionChecks[c] += 1;
    }
  }

  const endedAt = pet.dead ? pet.dead.atMs : pet.lastCheckIndex * TICK_MS;
  return {
    seed,
    outcome: pet.dead ? 'dead' : pet.stage === 'final' ? 'final' : 'timeout',
    cause: pet.dead?.cause ?? null,
    species: pet.species,
    finalForm: pet.finalForm,
    hoursLived: (endedAt - hatchMs) / HOUR_MS,
    wakeUps: pet.wakeUps,
    sessions,
    awakeChecks,
    conditionChecks,
    actions: log.actions,
    sickBy,
    careMistakes: pet.care.counts,
    carePoints: carePoints(pet, ctx.tuning),
  };
}
