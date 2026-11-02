import type { Action, Context, FoodType, PetState, Shape } from '../../src/core';
import { canDo } from '../../src/core';
import { bedtimeMinutes } from '../../src/core/rules/sleep';

/** When, in a day, a player looks after the pet. All times fall on the 15-minute grid. */
export type SessionTime =
  | { from: 'wake'; afterMinutes: number }
  | { from: 'bed'; beforeMinutes: number }
  | { from: 'midnight'; atMinutes: number };

export type DietPlan = 'meat' | 'plant' | 'noodles' | 'mixed';

/**
 * A scripted player: it visits the pet at fixed times and on each visit does the same thorough
 * care routine (below). Nobody in the real game is this regular, which is the point: it measures
 * how much attention the rules demand.
 */
export interface Player {
  name: string;
  sessions: SessionTime[];
  diet: DietPlan;
  /** Whether the player keeps the room in the comfort band by switching the AC. */
  tracksAc: boolean;
  /** Whether the player gives food, water, affection and games. False looks after everything else. */
  feeds: boolean;
}

/** The local minutes of the day at which this player visits a pet in its present stage. */
export function sessionMinutes(player: Player, pet: Readonly<PetState>, ctx: Context): number[] {
  return player.sessions.map((s) => {
    switch (s.from) {
      case 'wake':
        return ctx.settings.wakeMinutes + s.afterMinutes;
      case 'bed':
        return bedtimeMinutes(pet.stage, ctx.settings, ctx.tuning) - s.beforeMinutes;
      case 'midnight':
        return s.atMinutes;
    }
  });
}

const FOODS: Record<DietPlan, readonly FoodType[]> = {
  meat: ['chicken', 'hamburger'],
  plant: ['carrot', 'apple'],
  noodles: ['noodles'],
  mixed: ['chicken', 'carrot', 'noodles', 'hamburger', 'apple'],
};

/** What a visit did, for the statistics. */
export interface SessionLog {
  actions: Record<string, number>;
}

const SHAPES: readonly Shape[] = ['rock', 'paper', 'scissors'];

/**
 * One visit: give medicine if sick, fill the water and food, pet it, play a game if it is not at
 * its happiest, give a bath if it is dirty, fix the air conditioning, and switch the light off.
 * Only actions the pet would accept are tried, so the log counts real care, not refusals.
 */
export function runSession(
  start: PetState,
  player: Player,
  nowMs: number,
  ctx: Context,
  log: SessionLog,
  actAndReplace: (pet: PetState, action: Action) => PetState,
): PetState {
  let pet = start;
  const tryAction = (action: Action): boolean => {
    if (canDo(pet, action, nowMs, ctx) !== null) return false;
    pet = actAndReplace(pet, action);
    log.actions[action.kind] = (log.actions[action.kind] ?? 0) + 1;
    return true;
  };

  if (pet.sick) tryAction({ kind: 'medical' });

  if (player.feeds) {
    for (let i = 0; i < 10 && pet.needs.thirst < 8; i++) if (!tryAction({ kind: 'drink' })) break;

    const foods = FOODS[player.diet];
    for (let meal = 0; meal < 10 && pet.needs.hunger < 8; meal++) {
      const food = foods[(pet.actionCounter + meal) % foods.length];
      if (!food || !tryAction({ kind: 'food', food })) break;
    }

    for (let i = 0; i < 4 && pet.needs.happiness < ctx.tuning.care.happinessCapWithoutPlay; i++) {
      if (!tryAction({ kind: 'pet' })) break;
    }

    if (pet.needs.happiness < 4) {
      for (let round = 0; round < ctx.settings.jokenpoRounds; round++) {
        const shape = SHAPES[(pet.actionCounter + round) % SHAPES.length] ?? 'rock';
        if (!tryAction({ kind: 'play', shape })) break;
      }
    }
  }

  // Bathe when the pet is dirty, not just because the pre-bed window is open: a bath in the evening
  // window restarts a 16 to 20 hour timer that then runs out around midday.
  if (pet.dirt.dirty) tryAction({ kind: 'bath' });

  if (player.tracksAc) {
    const { band } = ctx.tuning.temperature;
    // While suffering, any switch snaps the room to the edge of the band (TEMP-12); then make
    // sure the AC is set so that the room drifts back toward the middle, not away from it.
    if (pet.room.zone !== 'ok') tryAction({ kind: 'ac' });
    const { tempC, acOn } = pet.room;
    if ((tempC >= band.high && !acOn) || (tempC <= band.low && acOn)) tryAction({ kind: 'ac' });
  }

  if (pet.lightOn) tryAction({ kind: 'lamp' });
  return pet;
}

function everyHour(fromWakeMinutes: number, count: number): SessionTime[] {
  return Array.from({ length: count }, (_, i) => ({
    from: 'wake' as const,
    afterMinutes: fromWakeMinutes + i * 60,
  }));
}

/** The built-in players, from not caring at all to checking in every hour. */
export function builtInPlayers(diet: DietPlan = 'mixed'): Player[] {
  const make = (name: string, sessions: SessionTime[], tracksAc = true, feeds = true): Player => ({
    name,
    sessions,
    diet,
    tracksAc,
    feeds,
  });
  return [
    make('absent', [], false),
    // Does everything except feed and water: shows what hunger and thirst alone do.
    make(
      'unfed',
      [
        { from: 'wake', afterMinutes: 60 },
        { from: 'wake', afterMinutes: 360 },
        { from: 'bed', beforeMinutes: 45 },
      ],
      true,
      false,
    ),
    make('morning', [{ from: 'wake', afterMinutes: 60 }]),
    make('evening', [{ from: 'bed', beforeMinutes: 45 }]),
    make('twice', [
      { from: 'wake', afterMinutes: 60 },
      { from: 'bed', beforeMinutes: 45 },
    ]),
    make('thrice', [
      { from: 'wake', afterMinutes: 60 },
      { from: 'wake', afterMinutes: 360 },
      { from: 'bed', beforeMinutes: 45 },
    ]),
    make('hourly', everyHour(0, 16)),
    make(
      'quarterly',
      Array.from({ length: 64 }, (_, i) => ({ from: 'wake' as const, afterMinutes: i * 15 })),
    ),
  ];
}
