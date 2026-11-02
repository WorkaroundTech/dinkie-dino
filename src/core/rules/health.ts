import type { Tuning } from '../config/tuning';
import type { Context } from '../context';
import type { GameEvent, SickCause } from '../events';
import { chance, randInt } from '../rng';
import type { DeathCause, PetState } from '../state';
import { bedtimeMinutes } from './sleep';
import { lower } from './meters';
import type { LocalTime } from '../time';

/** The chance of the n-th roll of an escalating check: 20%, 30%, 40%, ... up to 100% (COND-06). */
export function escalatingChance(start: number, step: number, rolls: number): number {
  return Math.min(1, start + step * rolls);
}

export function becomeSick(
  pet: PetState,
  atMs: number,
  cause: SickCause,
  events: GameEvent[],
): void {
  if (pet.sick || pet.dead) return;
  pet.sick = { sinceMs: atMs };
  events.push({ type: 'gotSick', atMs, cause });
}

export function die(pet: PetState, cause: DeathCause, atMs: number, events: GameEvent[]): void {
  if (pet.dead) return;
  pet.dead = { cause, atMs };
  events.push({ type: 'died', atMs, cause });
}

/**
 * Medicine: a single dose restores health, but leaves the pet fully hungry and thirsty and with
 * its happiness at the lowest level (MED-01, MED-02, MED-05). A pet that is still dirty resumes
 * its dirty checks from the start (DIRT-10).
 */
export function cure(pet: PetState, atMs: number, events: GameEvent[]): void {
  pet.sick = null;
  pet.needs.hunger = 0;
  pet.needs.thirst = 0;
  pet.needs.happiness = 0;
  if (pet.dirt.dirty) {
    pet.dirt.dirty.rolls = 0;
    pet.dirt.dirty.sickRollsStopped = false;
  }
  events.push({ type: 'cured', atMs });
}

/**
 * The sickness roll of the morning routine (SLEEP-02/03): much more likely when the light was
 * on while the pet slept. A light switched off within the first check after bedtime counts as
 * not left on. Called right after the wake-up has been counted.
 */
export function rollWakeSickness(
  pet: PetState,
  ctx: Context,
  atMs: number,
  events: GameEvent[],
): void {
  const lit = pet.nightLightChecks > 0;
  pet.nightLightChecks = 0;
  if (pet.sick) return;

  const { lightOn, lightOff } = ctx.tuning.health.wakeSickChance;
  if (chance(pet.seed, pet.wakeUps, 'wakeSick', lit ? lightOn : lightOff)) {
    becomeSick(pet, atMs, lit ? 'light' : 'wake', events);
  }
}

/**
 * One check of dirtiness (DIRT-02, 03, 08, 09, 10).
 *
 * `awakeNow` is the pet's state after this instant's schedule change, `awakeInterval` the state
 * during the interval that just ended. Dirt builds up through the night, but the DIRTY state only
 * begins while awake, so a pet whose threshold passes overnight is dirty at wake-up.
 */
export function updateDirt(
  pet: PetState,
  ctx: Context,
  tick: number,
  atMs: number,
  awakeNow: boolean,
  awakeInterval: boolean,
  events: GameEvent[],
): void {
  const { dirt } = pet;
  const cfg = ctx.tuning.health;

  if (!dirt.dirty) {
    dirt.checks += 1;
    if (awakeNow && dirt.checks >= dirt.threshold) {
      dirt.dirty = {
        sinceMs: atMs,
        checks: 0,
        onsetChecks: randInt(
          pet.seed,
          tick,
          'dirtyOnset',
          cfg.dirt.onsetChecks.min,
          cfg.dirt.onsetChecks.max,
        ),
        rolls: 0,
        sickRollsStopped: false,
      };
      events.push({ type: 'becameDirty', atMs });
    }
    return;
  }

  const dirty = dirt.dirty;
  dirty.checks += 1;
  if (!awakeInterval || pet.sick || dirty.sickRollsStopped || dirty.checks < dirty.onsetChecks)
    return;

  // A dirty check: happiness always drops, sickness is by chance (DIRT-09, DIRT-10).
  lower(pet.needs, 'happiness', cfg.dirt.happinessDropPerCheck);
  const p = escalatingChance(cfg.escalation.start, cfg.escalation.step, dirty.rolls);
  dirty.rolls += 1;
  if (chance(pet.seed, tick, 'dirtyCheck', p)) {
    dirty.sickRollsStopped = true;
    becomeSick(pet, atMs, 'dirt', events);
  }
}

/** Bath: a shower that clears the dirt fully and restarts the dirtiness timer (DIRT-03). */
export function bathe(pet: PetState, ctx: Context, atMs: number, events: GameEvent[]): void {
  const wasDirty = pet.dirt.dirty !== null;
  const { min, max } = ctx.tuning.health.dirt.thresholdChecks;
  pet.dirt = {
    checks: 0,
    threshold: randInt(pet.seed, pet.actionCounter++, 'act:dirtThreshold', min, max),
    dirty: null,
  };
  if (wasDirty) events.push({ type: 'cleaned', atMs });
}

/** Whether Bath is open: when DIRTY, or in the hour before bedtime (DIRT-06, DIRT-07). */
export function bathOpen(pet: Readonly<PetState>, local: LocalTime, ctx: Context): boolean {
  if (pet.dirt.dirty) return true;
  const bed = bedtimeMinutes(pet.stage, ctx.settings, ctx.tuning);
  return local.minutes >= bed - ctx.tuning.health.bathWindowMinutes && local.minutes < bed;
}

type ClockCause = keyof Tuning['health']['deathOnsetChecks'];
const CLOCK_CAUSES: readonly ClockCause[] = ['sick', 'hunger', 'thirst', 'lowHappiness'];

/** Whether the condition behind a death cause currently holds. */
function inDanger(pet: Readonly<PetState>, cause: ClockCause): boolean {
  switch (cause) {
    case 'sick':
      return pet.sick !== null;
    case 'hunger':
      return pet.needs.hunger === 0;
    case 'thirst':
      return pet.needs.thirst === 0;
    case 'lowHappiness':
      return pet.needs.happiness === 0;
  }
}

/**
 * One check of the death clocks (DEATH-07, DEATH-08, SLEEP-12).
 *
 * A clock starts when its condition starts and disappears when the condition ends. It counts every
 * check, asleep or not. Once it has run `onsetChecks`, each awake check rolls for death with a
 * rising chance. Nothing is rolled while asleep, so at wake-up the player gets a chance to save
 * the pet, and the first roll after waking is at the following check.
 */
export function updateDangers(
  pet: PetState,
  ctx: Context,
  tick: number,
  atMs: number,
  awakeInterval: boolean,
  events: GameEvent[],
): void {
  const { escalation, deathOnsetChecks } = ctx.tuning.health;

  for (const cause of CLOCK_CAUSES) {
    if (!inDanger(pet, cause)) {
      Reflect.deleteProperty(pet.dangers, cause);
      continue;
    }
    const danger = pet.dangers[cause];
    if (!danger) {
      const { min, max } = deathOnsetChecks[cause];
      pet.dangers[cause] = {
        checks: 0,
        onsetChecks: randInt(pet.seed, tick, `onset:${cause}`, min, max),
        rolls: 0,
      };
      continue;
    }

    danger.checks += 1;
    if (!awakeInterval || danger.checks < danger.onsetChecks) continue;

    const p = escalatingChance(escalation.start, escalation.step, danger.rolls);
    danger.rolls += 1;
    if (chance(pet.seed, tick, `death:${cause}`, p)) {
      die(pet, cause, atMs, events);
      return;
    }
  }
}
