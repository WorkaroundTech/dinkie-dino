import type { Context } from './context';
import type { GameEvent } from './events';
import { applyMorningGrowth } from './rules/growth';
import { decayNeeds } from './rules/needs';
import { updateSleep } from './rules/sleep';
import type { PetState } from './state';
import { isHalted } from './state';
import { tickIndexAt, tickStartMs } from './time';

export interface AdvanceResult {
  state: PetState;
  events: GameEvent[];
}

/**
 * Brings a pet up to date with `toMs` (UTC ms) by running every 15-minute check since its
 * `lastCheckIndex`, strictly in order (TIME-01, TIME-06). Pure: the input is not modified.
 *
 * - Advancing in one big jump gives exactly the same result as many small steps (TIME-02).
 * - A clock that did not move forward changes nothing (TIME-04).
 * - Dead pets and the locked final form no longer change (LIFE-05).
 */
export function advance(pet: Readonly<PetState>, toMs: number, ctx: Context): AdvanceResult {
  const state = structuredClone(pet) as PetState;
  const events: GameEvent[] = [];

  const last = tickIndexAt(toMs);
  for (let tick = state.lastCheckIndex + 1; tick <= last && !isHalted(state); tick++) {
    processCheck(state, tick, ctx, events);
    state.lastCheckIndex = tick;
  }
  return { state, events };
}

/**
 * One check, at the instant `tick` starts. First the interval that just ended is accounted
 * for (needs decay at the rate of the state the pet was in), then the schedule is applied at
 * this instant (bedtime, wake-up and the morning routine).
 */
function processCheck(pet: PetState, tick: number, ctx: Context, events: GameEvent[]): void {
  const atMs = tickStartMs(tick);
  decayNeeds(pet, ctx.tuning);

  const change = updateSleep(pet, ctx.localTime(atMs), ctx.settings, ctx.tuning);
  if (change === 'fellAsleep') {
    events.push({ type: 'fellAsleep', atMs });
  } else if (change === 'woke') {
    pet.wakeUps += 1;
    events.push({ type: 'woke', atMs, wakeUps: pet.wakeUps });
    applyMorningGrowth(pet, atMs, ctx.tuning, events);
  }
}
