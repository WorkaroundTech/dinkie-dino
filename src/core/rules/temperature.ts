import type { Context } from '../context';
import type { GameEvent } from '../events';
import { chance, randInt } from '../rng';
import type { PetState, Room } from '../state';
import { becomeSick, die } from './health';
import { lower } from './meters';

type Zone = Room['zone'];

function setZone(pet: PetState, zone: Zone, atMs: number, events: GameEvent[]): void {
  if (pet.room.zone === zone) return;
  pet.room.zone = zone;
  pet.room.zoneChecks = 0;
  events.push({ type: 'roomZone', atMs, zone });
}

/**
 * One awake check of the room (TEMP-03…10, TEMP-15…17). `awakeInterval` is whether the interval
 * that just ended was spent awake: nothing happens to the room overnight (SLEEP-10).
 *
 * - With a chance, the room moves one degree: down with the AC on, up with it off, never the other way.
 * - Back in the comfort band the correction bump is available again (TEMP-14), and a TOO state
 *   that has drifted back to the edge of the band ends by itself (TEMP-16).
 * - Beyond 23 (cold) or 27 (hot) there is a chance per check, growing with the distance, that the
 *   pet starts suffering. Entering costs happiness, may make the pet sick, and has a small chance
 *   of killing it at once (TEMP-17). While suffering it keeps losing happiness.
 */
export function updateRoom(
  pet: PetState,
  ctx: Context,
  tick: number,
  atMs: number,
  awakeInterval: boolean,
  events: GameEvent[],
): void {
  if (!awakeInterval) return;
  const cfg = ctx.tuning.temperature;
  const { room } = pet;

  if (chance(pet.seed, tick, 'tempMove', cfg.moveChance)) {
    room.tempC = Math.min(cfg.max, Math.max(cfg.min, room.tempC + (room.acOn ? -1 : 1)));
  }

  if (room.tempC >= cfg.band.low && room.tempC <= cfg.band.high) {
    room.bumpArmed = true;
    setZone(pet, 'ok', atMs, events);
  } else if (room.zone === 'tooCold' && room.tempC >= cfg.band.low) {
    setZone(pet, 'ok', atMs, events);
  } else if (room.zone === 'tooHot' && room.tempC <= cfg.band.high) {
    setZone(pet, 'ok', atMs, events);
  }

  if (room.zone === 'ok') {
    if (room.tempC <= cfg.coldAtOrBelow) {
      tryEnter(pet, ctx, tick, atMs, 'tooCold', cfg.coldAtOrBelow - room.tempC, events);
    } else if (room.tempC >= cfg.hotAtOrAbove) {
      tryEnter(pet, ctx, tick, atMs, 'tooHot', room.tempC - cfg.hotAtOrAbove, events);
    }
    return;
  }

  room.zoneChecks += 1;
  if (room.zoneChecks % cfg.happinessDropEveryChecks === 0) lower(pet.needs, 'happiness', 1);
}

function tryEnter(
  pet: PetState,
  ctx: Context,
  tick: number,
  atMs: number,
  zone: 'tooCold' | 'tooHot',
  degreesBeyond: number,
  events: GameEvent[],
): void {
  const { entry } = ctx.tuning.temperature;
  const p = Math.min(1, entry.baseChance + entry.perDegree * degreesBeyond);
  if (!chance(pet.seed, tick, 'zoneEntry', p)) return;

  setZone(pet, zone, atMs, events);
  lower(pet.needs, 'happiness', entry.happinessDrop);
  if (chance(pet.seed, tick, 'zoneSick', entry.sickChance))
    becomeSick(pet, atMs, 'temperature', events);
  if (chance(pet.seed, tick, 'zoneShock', entry.deathChance)) die(pet, 'shock', atMs, events);
}

/**
 * Called when the pet falls asleep (SLEEP-10): a room that is not causing suffering is reset to
 * the comfort zone for the night; a suffering pet keeps its temperature unchanged.
 */
export function settleRoomForSleep(pet: PetState, ctx: Context): void {
  if (pet.room.zone !== 'ok') return;
  pet.room.tempC = ctx.tuning.temperature.comfortOnSleep;
  pet.room.bumpArmed = true;
}

/**
 * Switching the AC (TEMP-12, TEMP-13, TEMP-14, TEMP-18).
 *
 * - While TOO_COLD or TOO_HOT, any switch snaps the room to the nearer edge of the comfort band
 *   (24 or 26 degrees) and ends the state.
 * - Otherwise, if the room is outside the band and the AC is switched the right way (off when
 *   cold, on when hot), the room jumps 2 to 3 degrees toward comfort, once per excursion.
 */
export function toggleAc(pet: PetState, ctx: Context, atMs: number, events: GameEvent[]): void {
  const cfg = ctx.tuning.temperature;
  const { room } = pet;
  room.acOn = !room.acOn;

  if (room.zone === 'tooCold') {
    room.tempC = cfg.band.low;
    room.bumpArmed = true;
    setZone(pet, 'ok', atMs, events);
    return;
  }
  if (room.zone === 'tooHot') {
    room.tempC = cfg.band.high;
    room.bumpArmed = true;
    setZone(pet, 'ok', atMs, events);
    return;
  }

  if (!room.bumpArmed) return;
  const bump = randInt(pet.seed, pet.actionCounter++, 'act:acBump', cfg.bump.min, cfg.bump.max);
  if (room.tempC < cfg.band.low && !room.acOn) {
    room.tempC = Math.min(room.tempC + bump, cfg.band.high);
    room.bumpArmed = false;
  } else if (room.tempC > cfg.band.high && room.acOn) {
    room.tempC = Math.max(room.tempC - bump, cfg.band.low);
    room.bumpArmed = false;
  }
}
