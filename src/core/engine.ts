import type { Context } from './context';
import type { GameEvent } from './events';
import { updateDangers, updateDirt, rollWakeSickness } from './rules/health';
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
 * One check, at the instant `tick` starts. The order matters:
 *
 * 1. The interval that just ended is accounted for, at the rates of the state the pet was in
 *    (need decay, light left on at night).
 * 2. The schedule is applied at this instant (bedtime, wake-up, the morning routine).
 * 3. Conditions are updated: dirt, then the death clocks. Rolls only happen for an interval that
 *    was spent awake, so nothing is rolled at the check that ends a night (SLEEP-12).
 */
function processCheck(pet: PetState, tick: number, ctx: Context, events: GameEvent[]): void {
  const atMs = tickStartMs(tick);
  const awakeInterval = !pet.asleep;

  decayNeeds(pet, ctx.tuning);
  if (pet.asleep && pet.lightOn) pet.nightLightChecks += 1;

  const change = updateSleep(pet, ctx.localTime(atMs), ctx.settings, ctx.tuning);
  if (change === 'fellAsleep') {
    events.push({ type: 'fellAsleep', atMs });
  } else if (change === 'woke') {
    pet.wakeUps += 1;
    events.push({ type: 'woke', atMs, wakeUps: pet.wakeUps });
    rollWakeSickness(pet, ctx, atMs, events);
    applyMorningGrowth(pet, atMs, ctx.tuning, events);
    if (isHalted(pet)) return;
  }

  updateDirt(pet, ctx, tick, atMs, !pet.asleep, awakeInterval, events);
  updateDangers(pet, ctx, tick, atMs, awakeInterval, events);
}
