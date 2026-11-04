import { describe, expect, it } from 'vitest';
import type { GameEvent, PetState } from '../../src/core';
import { advance, createPet, fixedOffsetLocalTime, isHalted } from '../../src/core';
import { rand } from '../../src/core/rng';
import { TICK_MS } from '../../src/core/time';
import { at, atOffset, calmContext, testContext } from './helpers';

const ctx = calmContext();

function newPet(nowMs: number, seed = 1): PetState {
  return createPet({ id: `pet-${seed}`, seed, nowMs }, ctx);
}

describe('hatching (LIFE-01, LIFE-02)', () => {
  it('starts as a small blob with empty hunger, thirst and education, Normal mood, the light on', () => {
    const pet = newPet(at(0, 12));
    expect(pet.stage).toBe('smallBlob');
    expect(pet.wakeUps).toBe(0);
    expect(pet.finalForm).toBeNull();
    expect(pet.species).toBeNull();
    expect(pet.dead).toBeNull();
    expect(pet.needs).toMatchObject({ hunger: 0, thirst: 0, happiness: 2, education: 0 });
    expect(pet.lightOn).toBe(true);
    expect(pet.room.acOn).toBe(false);
  });

  it('starts awake during the day and asleep during the night', () => {
    expect(newPet(at(0, 12)).asleep).toBe(false);
    expect(newPet(at(0, 18, 45)).asleep).toBe(false);
    expect(newPet(at(0, 19)).asleep).toBe(true); // blob bedtime
    expect(newPet(at(0, 23)).asleep).toBe(true);
    expect(newPet(at(0, 5)).asleep).toBe(true);
    expect(newPet(at(0, 7)).asleep).toBe(false);
  });

  it('draws the final-form wake-up once, within 16 to 20, from its seed (LIFE-04)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { finalFormAtWakeUp } = newPet(at(0, 12), seed);
      expect(finalFormAtWakeUp).toBeGreaterThanOrEqual(16);
      expect(finalFormAtWakeUp).toBeLessThanOrEqual(20);
    }
    expect(newPet(at(0, 12), 7).finalFormAtWakeUp).toBe(newPet(at(3, 9), 7).finalFormAtWakeUp);
  });

  it('processes only checks after the hatching moment', () => {
    const pet = newPet(at(0, 12));
    const { state, events } = advance(pet, at(0, 12, 14), ctx);
    expect(state.lastCheckIndex).toBe(pet.lastCheckIndex);
    expect(events).toEqual([]);
  });
});

describe('sleep and wake-up in the engine (SLEEP-01, LIFE-02)', () => {
  it('falls asleep at the blob bedtime and not a check before', () => {
    const pet = newPet(at(0, 15));
    const before = advance(pet, at(0, 18, 45), ctx);
    expect(before.state.asleep).toBe(false);
    const after = advance(pet, at(0, 19), ctx);
    expect(after.state.asleep).toBe(true);
    expect(after.events).toEqual([{ type: 'fellAsleep', atMs: at(0, 19) }]);
  });

  it('counts the first morning after hatching: Monday 15:00 hatch, Wednesday morning is wake-up 2', () => {
    const pet = newPet(at(0, 15));

    const tuesday = advance(pet, at(1, 7), ctx).state;
    expect(tuesday.wakeUps).toBe(1);
    expect(tuesday.stage).toBe('smallBlob');

    const wednesday = advance(pet, at(2, 7), ctx);
    expect(wednesday.state.wakeUps).toBe(2);
    expect(wednesday.state.stage).toBe('bigBlob');
    expect(wednesday.events).toContainEqual({
      type: 'grew',
      atMs: at(2, 7),
      from: 'smallBlob',
      to: 'bigBlob',
    });
  });

  it('counts the same morning as wake-up 1 when hatching a few hours before it (LIFE-02 edge)', () => {
    const pet = newPet(at(0, 5));
    expect(pet.asleep).toBe(true);
    const { state, events } = advance(pet, at(0, 7), ctx);
    expect(state.wakeUps).toBe(1);
    expect(state.asleep).toBe(false);
    expect(events).toEqual([{ type: 'woke', atMs: at(0, 7), wakeUps: 1 }]);
  });

  it('respects a different configured wake-up time (TIME-05)', () => {
    const late = testContext({
      settings: { ...ctx.settings, wakeMinutes: 8 * 60 + 30 },
    });
    const pet = createPet({ id: 'p', seed: 1, nowMs: at(0, 15) }, late);
    expect(advance(pet, at(1, 8, 15), late).state.wakeUps).toBe(0);
    expect(advance(pet, at(1, 8, 30), late).state.wakeUps).toBe(1);
  });

  it('puts an older pet to bed later than a blob', () => {
    const adult: PetState = { ...newPet(at(0, 15)), stage: 'adult' };
    expect(adult.asleep).toBe(false);
    expect(advance(adult, at(0, 21, 45), ctx).state.asleep).toBe(false);
    expect(advance(adult, at(0, 22), ctx).state.asleep).toBe(true);
  });
});

describe('growth timeline (LIFE table)', () => {
  // Written out by hand, independent of the tuning table: the stage after each wake-up.
  const EXPECTED: Record<number, string> = {
    1: 'smallBlob',
    2: 'bigBlob',
    3: 'bigBlob',
    4: 'bigBlob',
    5: 'tail',
    6: 'tail',
    7: 'tail',
    8: 'legs',
    9: 'legs',
    10: 'legs',
    11: 'teen',
    12: 'teen',
    13: 'teen',
    14: 'teen',
    15: 'adult',
  };

  it('grows on wake-ups 2, 5, 8, 11 and 15, counting wake-ups and not hours', () => {
    // Pick a seed whose final form comes late so every stage is visible.
    let seed = 1;
    while (newPet(at(0, 12), seed).finalFormAtWakeUp < 20) seed++;

    let pet = newPet(at(0, 12), seed);
    for (let n = 1; n <= 15; n++) {
      pet = advance(pet, at(n, 7), ctx).state;
      expect(pet.wakeUps).toBe(n);
      expect(pet.stage, `after wake-up ${n}`).toBe(EXPECTED[n]);
    }
  });

  it('is not sped up by checking in often, or slowed down by never checking', () => {
    const lazy = advance(newPet(at(0, 12), 3), at(20, 12), ctx).state;
    let eager = newPet(at(0, 12), 3);
    for (let m = at(0, 12); m < at(20, 12); m += TICK_MS)
      eager = advance(eager, m + TICK_MS, ctx).state;
    expect(eager).toEqual(lazy);
  });

  it('applies several growths in order after a long absence (LIFE-03)', () => {
    const pet = newPet(at(0, 12), 1);
    const { events } = advance(pet, at(12, 12), ctx);
    const grew = events.filter((e): e is Extract<GameEvent, { type: 'grew' }> => e.type === 'grew');
    expect(grew.map((e) => [e.from, e.to])).toEqual([
      ['smallBlob', 'bigBlob'],
      ['bigBlob', 'tail'],
      ['tail', 'legs'],
      ['legs', 'teen'],
    ]);
    expect(grew.map((e) => e.atMs)).toEqual([at(2, 7), at(5, 7), at(8, 7), at(11, 7)]);
  });
});

describe('final form (LIFE-04, LIFE-05, LIFE-07)', () => {
  it('arrives on exactly the drawn wake-up, between 16 and 20, for a pet that was not cared for', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const pet = newPet(at(0, 12), seed);
      const { state, events } = advance(pet, at(30, 12), ctx);

      expect(state.stage).toBe('final');
      expect(state.wakeUps).toBe(pet.finalFormAtWakeUp);
      expect(state.finalForm).toBe('demon'); // it left the light on every night (CARE-03)
      expect(events.filter((e) => e.type === 'finalForm')).toHaveLength(1);
      seen.add(state.wakeUps);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([16, 17, 18, 19, 20]);
  });

  it('never appears before wake-up 16', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const pet = newPet(at(0, 12), seed);
      expect(advance(pet, at(15, 12), ctx).state.stage).toBe('adult');
    }
  });

  it('locks the pet: nothing changes afterwards', () => {
    const pet = newPet(at(0, 12), 5);
    const final = advance(pet, at(30, 12), ctx).state;
    expect(isHalted(final)).toBe(true);

    const later = advance(final, at(300, 12), ctx);
    expect(later.state).toEqual(final);
    expect(later.events).toEqual([]);
  });

  it('does not decay needs after the final form (LIFE-05)', () => {
    const final = advance(newPet(at(0, 12), 5), at(30, 12), ctx).state;
    const needs = { ...final.needs };
    expect(advance(final, at(90, 12), ctx).state.needs).toEqual(needs);
  });
});

describe('determinism with the real rules (TIME-02)', () => {
  const real = testContext();
  const newRealPet = (nowMs: number, seed = 1): PetState =>
    createPet({ id: `pet-${seed}`, seed, nowMs }, real);

  /** Splits [from, to] into pieces of 1 check up to 3 days, deterministically. */
  function pieces(from: number, to: number, salt: number): number[] {
    const cuts: number[] = [];
    let t = from;
    for (let i = 0; t < to; i++) {
      t = Math.min(to, t + TICK_MS * (1 + Math.floor(rand(salt, i, 'cut') * 288)));
      cuts.push(t);
    }
    return cuts;
  }

  it('gives the same result in one jump as in many steps, with the same events', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const start = at(0, 9 + (seed % 12));
      const end = at(25, 12);
      const whole = advance(newRealPet(start, seed), end, real);

      let pet = newRealPet(start, seed);
      const events: GameEvent[] = [];
      for (const cut of pieces(start, end, seed)) {
        const step = advance(pet, cut, real);
        pet = step.state;
        events.push(...step.events);
      }
      expect(pet, `seed ${seed}`).toEqual(whole.state);
      expect(events, `seed ${seed}`).toEqual(whole.events);
    }
  });

  it('survives saving and reloading in the middle', () => {
    const start = at(0, 12);
    const whole = advance(newRealPet(start, 9), at(18, 12), real).state;

    let pet = newRealPet(start, 9);
    for (const cut of [at(3, 14), at(9, 3), at(9, 7), at(14, 22)]) {
      pet = JSON.parse(JSON.stringify(advance(pet, cut, real).state)) as PetState;
    }
    pet = advance(pet, at(18, 12), real).state;
    expect(pet).toEqual(whole);
  });

  it('behaves the same for the same local times in any time zone', () => {
    const lifecycle = (offset: number) => {
      const zone = calmContext(fixedOffsetLocalTime(offset));
      const hatch = atOffset(offset, 0, 12);
      const pet = createPet({ id: 'p', seed: 2, nowMs: hatch }, zone);
      const { state, events } = advance(pet, atOffset(offset, 12, 7), zone);
      return {
        stage: state.stage,
        wakeUps: state.wakeUps,
        asleep: state.asleep,
        needs: state.needs,
        finalFormAtWakeUp: state.finalFormAtWakeUp,
        kinds: events.map((e) => e.type),
      };
    };
    const reference = lifecycle(-180);
    expect(lifecycle(-300)).toEqual(reference);
    expect(lifecycle(540)).toEqual(reference); // Tokyo
    expect(lifecycle(345)).toEqual(reference); // Nepal, a 45-minute offset on the 15-minute grid
  });

  it('does not modify the state it is given', () => {
    const pet = newRealPet(at(0, 12), 4);
    const snapshot = structuredClone(pet);
    advance(pet, at(20, 12), real);
    expect(pet).toEqual(snapshot);
  });
});

describe('the clock (TIME-04)', () => {
  it('changes nothing when the clock goes backwards', () => {
    const pet = advance(newPet(at(0, 12), 1), at(5, 12), ctx).state;
    const back = advance(pet, at(2, 12), ctx);
    expect(back.state).toEqual(pet);
    expect(back.events).toEqual([]);
  });

  it('changes nothing when called again for the same moment', () => {
    const pet = advance(newPet(at(0, 12), 1), at(5, 12), ctx).state;
    const again = advance(pet, at(5, 12), ctx);
    expect(again.state).toEqual(pet);
    expect(again.events).toEqual([]);
  });

  for (const [label, shiftMinutes] of [
    ['clocks go forward', 60],
    ['clocks go back', -60],
  ] as const) {
    it(`fires exactly one wake-up per morning when ${label} (daylight saving)`, () => {
      // The local offset changes at this instant, in the middle of the night before day 5.
      const shiftAt = at(4, 23, 30);
      const offset = (utcMs: number) => -180 + (utcMs >= shiftAt ? shiftMinutes : 0);
      const dst = calmContext((utcMs) => fixedOffsetLocalTime(offset(utcMs))(utcMs));

      let pet = createPet({ id: 'p', seed: 3, nowMs: at(0, 12) }, dst);
      const wakeEvents: GameEvent[] = [];
      for (let n = 1; n <= 9; n++) {
        // Local 07:00 of day n, converted to UTC with the offset in force at that time.
        let morning = at(n, 7, 0);
        if (morning - shiftMinutes * 60_000 >= shiftAt) morning -= shiftMinutes * 60_000;
        const step = advance(pet, morning, dst);
        pet = step.state;
        wakeEvents.push(...step.events.filter((e) => e.type === 'woke'));
        expect(pet.wakeUps, `morning ${n}`).toBe(n);
      }
      expect(wakeEvents).toHaveLength(9);
    });
  }
});

describe('needs over a night (SLEEP-11)', () => {
  // Known rates (thirst: a point per 4 awake checks), whatever the tuned defaults are.
  const rates = calmContext(undefined, (t) => {
    t.needs.checksPerPoint = { hunger: 6, thirst: 4, happiness: 12 };
  });
  const ctx = rates;
  it('decays slowly while the pet sleeps', () => {
    const pet = newPet(at(0, 22)); // asleep
    expect(pet.asleep).toBe(true);
    pet.needs.hunger = 8;
    pet.needs.thirst = 8;
    pet.needs.happiness = 4;

    // 22:15 to 06:45 is 34 checks, all asleep: 34/6 = 5.7 awake-equivalent checks.
    const { state } = advance(pet, at(1, 6, 45), ctx);
    expect(state.asleep).toBe(true);
    expect(state.needs.hunger).toBe(8); // awake it would have lost 5 points
    expect(state.needs.thirst).toBe(7); // one point at 4 awake-equivalent checks
    expect(state.needs.happiness).toBe(4);
  });

  it('counts the interval that ends at bedtime as awake time', () => {
    const pet = newPet(at(0, 18)); // awake, bedtime is 19:00
    pet.needs.thirst = 8;
    // Checks at 18:15, 18:30, 18:45 and 19:00 each close a 15-minute awake interval:
    // four awake checks, so thirst drops one point exactly at the 19:00 check.
    const { state } = advance(pet, at(0, 19), ctx);
    expect(state.asleep).toBe(true);
    expect(state.needs.thirst).toBe(7);
  });

  it('counts the interval that ends at wake-up as sleeping time', () => {
    // Make thirst drop on every awake check, so any awake accounting would show.
    const eager = testContext({
      tuning: {
        ...ctx.tuning,
        needs: {
          ...ctx.tuning.needs,
          checksPerPoint: { ...ctx.tuning.needs.checksPerPoint, thirst: 1 },
        },
      },
    });
    const pet = createPet({ id: 'p', seed: 1, nowMs: at(0, 6, 45) }, eager);
    expect(pet.asleep).toBe(true);
    pet.needs.thirst = 8;

    const { state } = advance(pet, at(0, 7), eager); // the 07:00 check closes a sleeping interval
    expect(state.asleep).toBe(false);
    expect(state.needs.thirst).toBe(8);
  });

  it('decays at the full rate while awake', () => {
    const pet = newPet(at(0, 8));
    pet.needs.thirst = 8;
    const { state } = advance(pet, at(0, 9), ctx); // 4 checks awake
    expect(state.needs.thirst).toBe(7);
  });
});
