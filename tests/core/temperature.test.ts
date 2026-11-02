import { describe, expect, it } from 'vitest';
import type { PetState, Tuning } from '../../src/core';
import { act, advance, canDo, createPet } from '../../src/core';
import { at, calmContext } from './helpers';

/**
 * A context where the room moves on every awake check and nothing bad follows from it, unless a
 * test turns that on. Hatched awake at 07:00, a blob stays awake until 19:00.
 */
const room = (patch?: (t: Tuning) => void) =>
  calmContext(undefined, (t) => {
    t.temperature.moveChance = 1;
    t.temperature.entry = {
      baseChance: 0,
      perDegree: 0,
      sickChance: 0,
      deathChance: 0,
      happinessDrop: 1,
    };
    t.needs.checksPerPoint.happiness = 1_000_000; // keep natural decay out of the way
    patch?.(t);
  });

type Ctx = ReturnType<typeof room>;

function hatch(ctx: Ctx, seed = 1, nowMs = at(0, 7)): PetState {
  return createPet({ id: `p${seed}`, name: 'Test', seed, nowMs }, ctx);
}

/** A pet with the room set as given. */
function withRoom(
  ctx: Ctx,
  patch: Partial<PetState['room']>,
  seed = 1,
  nowMs = at(0, 7),
): PetState {
  const pet = hatch(ctx, seed, nowMs);
  pet.room = { ...pet.room, ...patch };
  return pet;
}

const zones = (events: { type: string }[]) => events.filter((e) => e.type === 'roomZone');

describe('the room (TEMP-01…06)', () => {
  it('starts comfortable, with the AC off', () => {
    expect(hatch(room()).room).toEqual({
      tempC: 25,
      acOn: false,
      bumpArmed: true,
      zone: 'ok',
      zoneChecks: 0,
    });
  });

  it('warms up one degree per move with the AC off, and cools down with it on', () => {
    const ctx = room();
    expect(advance(hatch(ctx), at(0, 8), ctx).state.room.tempC).toBe(29); // 4 checks
    const cooling = withRoom(ctx, { acOn: true });
    expect(advance(cooling, at(0, 8), ctx).state.room.tempC).toBe(21);
  });

  it('never moves against the direction of the AC (TEMP-03, TEMP-04)', () => {
    const ctx = room((t) => {
      t.temperature.moveChance = 0.25;
    });
    for (const acOn of [true, false]) {
      for (let seed = 1; seed <= 12; seed++) {
        let pet = withRoom(ctx, { acOn }, seed);
        let previous = pet.room.tempC;
        for (let t = at(0, 7, 15); t <= at(0, 18); t += 15 * 60_000) {
          pet = advance(pet, t, ctx).state;
          const delta = pet.room.tempC - previous;
          expect(acOn ? delta <= 0 : delta >= 0, `seed ${seed}`).toBe(true);
          expect(Math.abs(delta)).toBeLessThanOrEqual(1);
          previous = pet.room.tempC;
        }
      }
    }
  });

  it('is noisy: it moves about a quarter of the time by default (TEMP-05)', () => {
    const ctx = room((t) => {
      t.temperature.moveChance = DEFAULT_MOVE_CHANCE;
    });
    let total = 0;
    const n = 1500;
    for (let seed = 1; seed <= n; seed++)
      total += advance(hatch(ctx, seed), at(0, 9), ctx).state.room.tempC - 25;
    expect(Math.abs(total / n - 8 * DEFAULT_MOVE_CHANCE)).toBeLessThan(0.1); // 8 checks
  });

  it('stops at 16 degrees with the AC on and at 40 with it off (TEMP-06)', () => {
    const ctx = room();
    expect(advance(withRoom(ctx, { acOn: true }), at(0, 18), ctx).state.room.tempC).toBe(16);
    expect(advance(hatch(ctx), at(0, 18), ctx).state.room.tempC).toBe(40);
  });
});

const DEFAULT_MOVE_CHANCE = 0.25;

describe('feeling too cold or too hot (TEMP-07, TEMP-08, TEMP-17)', () => {
  const enter = (t: Tuning) => {
    t.temperature.entry = {
      baseChance: 1,
      perDegree: 0,
      sickChance: 0,
      deathChance: 0,
      happinessDrop: 1,
    };
  };

  it('feels too cold at 23 degrees with the AC on, and not before', () => {
    const ctx = room(enter);
    const pet = withRoom(ctx, { acOn: true });
    expect(zones(advance(pet, at(0, 7, 15), ctx).events)).toEqual([]); // 24
    const { state, events } = advance(pet, at(0, 7, 30), ctx); // 23
    expect(state.room).toMatchObject({ tempC: 23, zone: 'tooCold' });
    expect(zones(events)).toEqual([{ type: 'roomZone', atMs: at(0, 7, 30), zone: 'tooCold' }]);
  });

  it('feels too hot at 27 degrees with the AC off, and not before', () => {
    const ctx = room(enter);
    const pet = hatch(ctx);
    expect(zones(advance(pet, at(0, 7, 15), ctx).events)).toEqual([]); // 26
    const { state, events } = advance(pet, at(0, 7, 30), ctx); // 27
    expect(state.room).toMatchObject({ tempC: 27, zone: 'tooHot' });
    expect(zones(events)).toEqual([{ type: 'roomZone', atMs: at(0, 7, 30), zone: 'tooHot' }]);
  });

  it('is more likely the further from comfort (provisional chances)', () => {
    const rate = (tempC: number) => {
      const ctx = room((t) => {
        t.temperature.moveChance = 0;
        t.temperature.entry = { ...DEFAULTS.entry, sickChance: 0, deathChance: 0 };
      });
      let entered = 0;
      const n = 3000;
      for (let seed = 1; seed <= n; seed++) {
        const pet = withRoom(ctx, { tempC, acOn: true }, seed);
        if (advance(pet, at(0, 7, 15), ctx).state.room.zone === 'tooCold') entered++;
      }
      return entered / n;
    };
    expect(Math.abs(rate(23) - 0.1)).toBeLessThan(0.03);
    expect(Math.abs(rate(19) - 0.3)).toBeLessThan(0.04);
    expect(rate(24)).toBe(0);
  });

  it('costs happiness on entry, and keeps costing one level an hour while it lasts', () => {
    const ctx = room(enter);
    const pet = withRoom(ctx, { tempC: 23, acOn: true });
    pet.needs.happiness = 4;
    // Entering at 07:15 costs one level. The room then stays put (the AC is off the move).
    ctx.tuning.temperature.moveChance = 0;
    const entered = advance(pet, at(0, 7, 15), ctx).state;
    expect(entered.needs.happiness).toBe(3);

    // Four awake checks after entering, one more level goes, and so on every hour.
    expect(advance(pet, at(0, 8, 0), ctx).state.needs.happiness).toBe(3);
    expect(advance(pet, at(0, 8, 15), ctx).state.needs.happiness).toBe(2);
    expect(advance(pet, at(0, 9, 15), ctx).state.needs.happiness).toBe(1);
  });

  it('may make the pet sick when it starts to suffer', () => {
    const ctx = room((t) => {
      t.temperature.entry = {
        baseChance: 1,
        perDegree: 0,
        sickChance: 1,
        deathChance: 0,
        happinessDrop: 1,
      };
    });
    const { state, events } = advance(withRoom(ctx, { tempC: 24, acOn: true }), at(0, 7, 15), ctx);
    expect(state.sick).not.toBeNull();
    expect(events).toContainEqual({ type: 'gotSick', atMs: at(0, 7, 15), cause: 'temperature' });
  });

  it('may kill the pet outright, with a small chance (shock)', () => {
    const ctx = room((t) => {
      t.temperature.entry = {
        baseChance: 1,
        perDegree: 0,
        sickChance: 0,
        deathChance: 1,
        happinessDrop: 1,
      };
    });
    const { state, events } = advance(withRoom(ctx, { tempC: 24, acOn: true }), at(0, 7, 15), ctx);
    expect(state.dead).toEqual({ cause: 'shock', atMs: at(0, 7, 15) });
    expect(events).toContainEqual({ type: 'died', atMs: at(0, 7, 15), cause: 'shock' });
  });

  it('ends by itself when the room drifts back to the edge of the band (TEMP-16)', () => {
    const ctx = room(enter);
    // Too cold at 23 with the AC off: the next move warms to 24 and the state ends.
    const cold = withRoom(ctx, { tempC: 23, acOn: false, zone: 'tooCold' });
    const a = advance(cold, at(0, 7, 15), ctx);
    expect(a.state.room).toMatchObject({ tempC: 24, zone: 'ok', bumpArmed: true });
    expect(zones(a.events)).toEqual([{ type: 'roomZone', atMs: at(0, 7, 15), zone: 'ok' }]);

    const hot = withRoom(ctx, { tempC: 27, acOn: true, zone: 'tooHot' });
    const b = advance(hot, at(0, 7, 15), ctx);
    expect(b.state.room).toMatchObject({ tempC: 26, zone: 'ok' });
  });
});

describe('correcting with the AC (TEMP-12…15, TEMP-18)', () => {
  const ac = { kind: 'ac' } as const;
  const NOW = at(0, 9);

  it('snaps a too cold room to 24 and ends the state, whichever way the AC is switched', () => {
    const ctx = room();
    for (const acOn of [true, false]) {
      const pet = withRoom(ctx, { tempC: 18, acOn, zone: 'tooCold' });
      const { state, events } = act(pet, ac, NOW, ctx);
      expect(state.room).toMatchObject({ tempC: 24, zone: 'ok', acOn: !acOn, bumpArmed: true });
      expect(zones(events)).toEqual([{ type: 'roomZone', atMs: NOW, zone: 'ok' }]);
    }
  });

  it('snaps a too hot room to 26 and ends the state', () => {
    const ctx = room();
    const { state } = act(withRoom(ctx, { tempC: 35, acOn: false, zone: 'tooHot' }), ac, NOW, ctx);
    expect(state.room).toMatchObject({ tempC: 26, zone: 'ok', acOn: true });
  });

  it('gives a one-off bump toward comfort when switching the right way (19 -> 21 or 22)', () => {
    const ctx = room();
    const seen = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const pet = withRoom(ctx, { tempC: 19, acOn: true }, seed);
      const { state } = act(pet, ac, NOW, ctx);
      expect(state.room.acOn).toBe(false);
      expect(state.room.bumpArmed).toBe(false);
      seen.add(state.room.tempC);
    }
    expect([...seen].sort()).toEqual([21, 22]);
  });

  it('mirrors on the hot side: 33 -> 30 or 31 when switching the AC on', () => {
    const ctx = room();
    const seen = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      seen.add(act(withRoom(ctx, { tempC: 33, acOn: false }, seed), ac, NOW, ctx).state.room.tempC);
    }
    expect([...seen].sort()).toEqual([30, 31]);
  });

  it('does not stack: switching on and off again gives no further bump (TEMP-14)', () => {
    const ctx = room();
    let pet = withRoom(ctx, { tempC: 19, acOn: true });
    pet = act(pet, ac, NOW, ctx).state; // right way: bump
    const bumped = pet.room.tempC;
    pet = act(pet, ac, NOW, ctx).state; // back on: wrong way
    expect(pet.room.tempC).toBe(bumped);
    pet = act(pet, ac, NOW, ctx).state; // off again: right way, but already used
    expect(pet.room.tempC).toBe(bumped);
    expect(pet.room.acOn).toBe(false);
  });

  it('is available again once the room has been back in the comfort band', () => {
    const ctx = room((t) => {
      t.temperature.moveChance = 0;
    });
    let pet = withRoom(ctx, { tempC: 19, acOn: true });
    pet = act(pet, ac, NOW, ctx).state;
    expect(pet.room.bumpArmed).toBe(false);

    pet.room.tempC = 25; // the room drifted into the band
    pet = advance(pet, at(0, 9, 15), ctx).state;
    expect(pet.room.bumpArmed).toBe(true);
  });

  it('never throws the room past the other side of the band', () => {
    const ctx = room();
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = act(withRoom(ctx, { tempC: 23, acOn: true }, seed), ac, NOW, ctx);
      expect(state.room.tempC).toBeGreaterThanOrEqual(25);
      expect(state.room.tempC).toBeLessThanOrEqual(26);
    }
  });

  it('only switches inside the band, with no bump used', () => {
    const ctx = room();
    const { state } = act(hatch(ctx), ac, NOW, ctx);
    expect(state.room).toMatchObject({ tempC: 25, acOn: true, bumpArmed: true });
  });

  it('replays: the same history gives the same bump', () => {
    const ctx = room();
    const a = act(withRoom(ctx, { tempC: 19, acOn: true }, 9), ac, NOW, ctx).state;
    const b = act(withRoom(ctx, { tempC: 19, acOn: true }, 9), ac, NOW, ctx).state;
    expect(a).toEqual(b);
  });
});

describe('the AC as an action (SICK-02, SLEEP-09)', () => {
  const ctx = room();

  it('works while the pet is sick', () => {
    const pet: PetState = { ...hatch(ctx), sick: { sinceMs: at(0, 7) } };
    expect(canDo(pet, { kind: 'ac' }, at(0, 8), ctx)).toBeNull();
  });

  it('is refused while the pet sleeps', () => {
    const pet = hatch(ctx, 1, at(0, 23));
    expect(canDo(pet, { kind: 'ac' }, at(0, 23), ctx)).toBe('asleep');
  });
});

describe('the night (SLEEP-10)', () => {
  it('resets the room to the comfort zone at bedtime and holds it all night', () => {
    const ctx = room();
    const pet = withRoom(ctx, { tempC: 22, acOn: true }, 1, at(0, 18, 45));
    // One awake check (19:00 closes the 18:45-19:00 interval), then bedtime: reset.
    const asleep = advance(pet, at(0, 19), ctx).state;
    expect(asleep.asleep).toBe(true);
    expect(asleep.room.tempC).toBe(25);

    // No drift all night, though the AC is on and the room would otherwise keep cooling.
    expect(advance(pet, at(1, 6, 45), ctx).state.room.tempC).toBe(25);
    expect(advance(pet, at(1, 7), ctx).state.room.tempC).toBe(25);
    // The first awake check after waking moves the room again.
    expect(advance(pet, at(1, 7, 15), ctx).state.room.tempC).toBe(24);
  });

  it('keeps a suffering pet at the same temperature through the night', () => {
    const ctx = room();
    const pet = withRoom(ctx, { tempC: 33, acOn: false, zone: 'tooHot' }, 1, at(0, 18, 45));
    const asleep = advance(pet, at(0, 19), ctx).state; // one more degree before bed: 34
    expect(asleep.asleep).toBe(true);
    expect(asleep.room).toMatchObject({ tempC: 34, zone: 'tooHot' });
    expect(advance(pet, at(1, 6, 45), ctx).state.room.tempC).toBe(34);
  });
});

describe('dying of the temperature (DEATH-07/08)', () => {
  const doomed = room((t) => {
    t.temperature.entry = {
      baseChance: 1,
      perDegree: 0,
      sickChance: 0,
      deathChance: 0,
      happinessDrop: 1,
    };
    t.health.deathOnsetChecks.tooCold = { min: 24, max: 24 };
    t.health.escalation = { start: 1, step: 0 };
  });

  it('kills a pet left too cold, 6 hours after it started to suffer', () => {
    // Too cold from 07:30 (23 degrees, AC on and still cooling); the clock has run 24 checks at 13:30.
    const pet = withRoom(doomed, { acOn: true });
    expect(advance(pet, at(0, 13, 15), doomed).state.dead).toBeNull();
    const { state } = advance(pet, at(0, 13, 30), doomed);
    expect(state.dead).toEqual({ cause: 'tooCold', atMs: at(0, 13, 30) });
  });

  it('is saved by switching the AC in time: the clock disappears', () => {
    let pet = advance(withRoom(doomed, { acOn: true }), at(0, 10), doomed).state;
    expect(pet.room.zone).toBe('tooCold');
    expect(pet.dangers.tooCold).toBeDefined();

    pet = act(pet, { kind: 'ac' }, at(0, 10), doomed).state;
    expect(pet.room.zone).toBe('ok');
    pet = advance(pet, at(0, 10, 15), doomed).state;
    expect(pet.dangers.tooCold).toBeUndefined();
  });
});

const DEFAULTS = (() => {
  const ctx = calmContext();
  return {
    entry: {
      baseChance: 0.1,
      perDegree: 0.05,
      sickChance: 0.25,
      deathChance: 0.01,
      happinessDrop: 1,
    },
    ctx,
  };
})();
