import { describe, expect, it } from 'vitest';
import type { Action, Context, GameEvent, PetState } from '../../src/core';
import { act, advance, createPet } from '../../src/core';
import { TICK_MS } from '../../src/core/time';
import { at, testContext } from './helpers';

const HOUR = 4 * TICK_MS;

/** A very diligent player: looks after the pet every hour on the hour. */
function diligent(pet: PetState): Action[] {
  if (pet.sick) return [{ kind: 'medical' }];

  const actions: Action[] = [];
  if (pet.needs.hunger <= 5) actions.push({ kind: 'food', food: 'chicken' });
  if (pet.needs.thirst <= 5) actions.push({ kind: 'drink' });
  if (pet.needs.happiness <= 2) actions.push({ kind: 'pet' });
  actions.push({ kind: 'bath' }); // only opens when DIRTY or before bedtime; refused otherwise
  if (pet.lightOn) actions.push({ kind: 'lamp' }); // the light stays off, also during the night
  // Keep the room in the comfort band: AC on when it gets warm, off when it gets cool.
  const { tempC, acOn } = pet.room;
  if ((tempC >= 26 && !acOn) || (tempC <= 24 && acOn)) actions.push({ kind: 'ac' });
  return actions;
}

interface Run {
  state: PetState;
  events: GameEvent[];
}

/**
 * Plays from `from` to `to`. The player acts at every full hour. Between those moments the
 * simulation either jumps in one go, or is advanced one 15-minute check at a time: the result
 * must be the same.
 */
function play(pet: PetState, to: number, ctx: Context, stepwise: boolean): Run {
  let state = pet;
  const events: GameEvent[] = [];
  const take = (r: { state: PetState; events: GameEvent[] }) => {
    state = r.state;
    events.push(...r.events);
  };

  const firstHour = Math.ceil(pet.lastCheckIndex * TICK_MS + 1);
  for (let t = Math.ceil(firstHour / HOUR) * HOUR; t <= to; t += HOUR) {
    if (stepwise) {
      for (let s = (state.lastCheckIndex + 1) * TICK_MS; s <= t; s += TICK_MS)
        take(advance(state, s, ctx));
    } else {
      take(advance(state, t, ctx));
    }
    if (state.dead || state.stage === 'final') break;
    for (const action of diligent(state)) take(act(state, action, t, ctx));
  }
  return { state, events };
}

describe('a very diligent player', () => {
  const ctx = testContext();
  const hatch = (seed: number) =>
    createPet({ id: `p${seed}`, name: 'Test', seed, nowMs: at(0, 12) }, ctx);

  it('keeps the pet alive all the way to its final form (LIFE-07)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { state, events } = play(hatch(seed), at(40, 12), ctx, false);
      expect(state.dead, `seed ${seed}`).toBeNull();
      expect(state.stage, `seed ${seed}`).toBe('final');
      expect(state.wakeUps).toBe(state.finalFormAtWakeUp);
      expect(state.finalForm).toBe('angel'); // care score is still a stub (CARE-02)
      expect(events.filter((e) => e.type === 'died')).toEqual([]);
    }
  });

  it('raises a Tyrannosaurus on a diet of chicken (SPEC-02)', () => {
    const { state } = play(hatch(2), at(40, 12), ctx, false);
    expect(state.species).toBe('trex');
  });

  it('gets the same result whether the simulation jumps between actions or steps through every check', () => {
    for (const seed of [1, 2, 3]) {
      const jump = play(hatch(seed), at(25, 12), ctx, false);
      const steps = play(hatch(seed), at(25, 12), ctx, true);
      expect(steps.state, `seed ${seed}`).toEqual(jump.state);
      expect(steps.events, `seed ${seed}`).toEqual(jump.events);
    }
  });

  it('is still hit by bad luck now and then, and medicine handles it', () => {
    // Over many seeds somebody wakes up sick (2% a morning) and is cured in time. The only thing
    // a diligent player cannot prevent is the rare shock when the room turns too hot or cold.
    let cures = 0;
    let survivors = 0;
    const n = 40;
    for (let seed = 1; seed <= n; seed++) {
      const { state, events } = play(hatch(seed), at(40, 12), ctx, false);
      if (state.dead) expect(state.dead.cause, `seed ${seed}`).toBe('shock');
      else survivors++;
      cures += events.filter((e) => e.type === 'cured').length;
    }
    expect(cures).toBeGreaterThan(0);
    expect(survivors).toBeGreaterThanOrEqual(n - 6);
  });
});
