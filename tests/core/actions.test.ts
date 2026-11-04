import { describe, expect, it } from 'vitest';
import type { Action, FoodType, PetState } from '../../src/core';
import { act, advance, canDo, createPet } from '../../src/core';
import { at, calmContext, testContext } from './helpers';

const ctx = testContext();
const NOW = at(0, 12);

function pet(seed = 1, nowMs = NOW): PetState {
  return createPet({ id: 'p', seed, nowMs }, ctx);
}

/** Runs an action that must be carried out. */
function ok(p: PetState, action: Action) {
  const result = act(p, action, NOW, ctx);
  expect(result.refused, JSON.stringify(action)).toBeNull();
  return result;
}

describe('food (NEED-02, ICE-01)', () => {
  it.each([
    ['apple', 1],
    ['hamburger', 1],
    ['carrot', 2],
    ['chicken', 2],
    ['noodles', 2],
  ] as const)('%s fills %i hunger points', (food, gain) => {
    const p = pet();
    p.needs.hunger = 2;
    expect(ok(p, { kind: 'food', food }).state.needs.hunger).toBe(2 + gain);
  });

  it('never fills past full, and a nearly full pet takes a big meal as far as it fits', () => {
    const p = pet();
    p.needs.hunger = 7;
    expect(ok(p, { kind: 'food', food: 'chicken' }).state.needs.hunger).toBe(8);
  });

  it('refuses food and drink when full (Q-FOOD-3 default)', () => {
    const p = pet();
    p.needs.hunger = 8;
    p.needs.thirst = 8;
    expect(act(p, { kind: 'food', food: 'apple' }, NOW, ctx).refused).toBe('full');
    expect(act(p, { kind: 'drink' }, NOW, ctx).refused).toBe('full');
  });

  it('gives a refusal event and changes nothing', () => {
    const p = pet();
    p.needs.hunger = 8;
    const result = act(p, { kind: 'food', food: 'apple' }, NOW, ctx);
    expect(result.state).toEqual(p);
    expect(result.events).toEqual([
      { type: 'refused', atMs: NOW, action: { kind: 'food', food: 'apple' }, reason: 'full' },
    ]);
  });

  it('can be switched off for a pet that never refuses', () => {
    const lax = testContext({
      tuning: { ...ctx.tuning, food: { ...ctx.tuning.food, refuseWhenFull: false } },
    });
    const p = pet();
    p.needs.hunger = 8;
    expect(act(p, { kind: 'food', food: 'apple' }, NOW, lax).refused).toBeNull();
  });
});

describe('drink', () => {
  it('fills one thirst point', () => {
    const p = pet();
    p.needs.thirst = 3;
    expect(ok(p, { kind: 'drink' }).state.needs.thirst).toBe(4);
  });
});

describe('ice cream (ICE-01…04)', () => {
  const iceCream: Action = { kind: 'food', food: 'iceCream' };

  it('gives no fullness, raises happiness one level, and is never refused', () => {
    const p = pet();
    p.needs.hunger = 8;
    p.needs.happiness = 1;
    const { state } = ok(p, iceCream);
    expect(state.needs.hunger).toBe(8);
    expect(state.needs.happiness).toBe(2);
  });

  it('cannot top happiness up: it stops at Happy (HAP-04)', () => {
    const p = pet();
    p.needs.happiness = 3;
    expect(ok(p, iceCream).state.needs.happiness).toBe(3);
    p.needs.happiness = 4;
    expect(ok(p, iceCream).state.needs.happiness).toBe(4); // never lowers it either
  });

  it('always adds weight: it is hyper-caloric (round 15)', () => {
    const gain = ctx.tuning.weight.gainKg;
    let p = pet(11);
    for (let i = 0; i < 20; i++) {
      const before = p.needs.weightKg;
      p = ok(p, iceCream).state;
      expect(p.needs.weightKg).toBeCloseTo(before + gain);
    }
  });

  it('does not count toward the species diet', () => {
    expect(ok(pet(), iceCream).state.diet).toEqual({ meat: 0, plant: 0, noodles: 0 });
  });
});

describe('pet and educate (HAP-01, EDU-02, EDU-03)', () => {
  it('Pet raises happiness and education, but happiness stops at Happy and education at C+', () => {
    let p = pet();
    p.needs.happiness = 0;
    p.needs.education = 0;
    const seen: number[][] = [];
    for (let i = 0; i < 6; i++) {
      p = ok(p, { kind: 'pet' }).state;
      seen.push([p.needs.happiness, p.needs.education]);
    }
    expect(seen).toEqual([
      [1, 1],
      [2, 2],
      [3, 2],
      [3, 2],
      [3, 2],
      [3, 2],
    ]);
  });

  it('Pet never lowers a meter that is already above its cap', () => {
    const p = pet();
    p.needs.happiness = 4;
    p.needs.education = 4;
    const { state } = ok(p, { kind: 'pet' });
    expect(state.needs.happiness).toBe(4);
    expect(state.needs.education).toBe(4);
  });

  it('only studying reaches B+ and A+', () => {
    let p = pet();
    p.needs.education = 2;
    p = ok(p, { kind: 'educate' }).state;
    expect(p.needs.education).toBe(3);
    p = ok(p, { kind: 'educate' }).state;
    expect(p.needs.education).toBe(4);
    p = ok(p, { kind: 'educate' }).state;
    expect(p.needs.education).toBe(4);
  });
});

describe('lamp', () => {
  it('toggles the light; a new pet starts with it on (round 15)', () => {
    let p = pet();
    expect(p.lightOn).toBe(true);
    p = ok(p, { kind: 'lamp' }).state;
    expect(p.lightOn).toBe(false);
    p = ok(p, { kind: 'lamp' }).state;
    expect(p.lightOn).toBe(true);
  });
});

describe('while asleep (SLEEP-09)', () => {
  const asleep = (): PetState => pet(1, at(0, 23));

  it('only Lamp, Check and Clock work', () => {
    const p = asleep();
    expect(p.asleep).toBe(true);
    for (const kind of ['lamp', 'check', 'clock'] as const) {
      expect(canDo(p, { kind }, NOW, ctx), kind).toBeNull();
    }
    const refused: Action[] = [
      { kind: 'drink' },
      { kind: 'food', food: 'apple' },
      { kind: 'pet' },
      { kind: 'educate' },
    ];
    for (const action of refused) expect(canDo(p, action, NOW, ctx), action.kind).toBe('asleep');
  });

  it('can still switch the light off', () => {
    const p = { ...asleep(), lightOn: true };
    expect(ok(p, { kind: 'lamp' }).state.lightOn).toBe(false);
  });
});

describe('check and clock', () => {
  it('look at the pet without changing it', () => {
    const p = pet();
    expect(ok(p, { kind: 'check' }).state).toEqual(p);
    expect(ok(p, { kind: 'clock' }).state).toEqual(p);
  });
});

describe('a locked pet (LIFE-05)', () => {
  it('refuses everything once dead or in its final form', () => {
    const final = advance(pet(5), at(30, 12), calmContext()).state;
    expect(final.stage).toBe('final');
    expect(canDo(final, { kind: 'check' }, NOW, ctx)).toBe('locked');
    expect(
      canDo({ ...pet(), dead: { cause: 'sick', atMs: NOW } }, { kind: 'drink' }, NOW, ctx),
    ).toBe('locked');
  });
});

describe('purity', () => {
  it('does not modify the pet it is given', () => {
    const p = pet(3);
    const snapshot = structuredClone(p);
    act(p, { kind: 'food', food: 'iceCream' }, NOW, ctx);
    expect(p).toEqual(snapshot);
  });

  it('produces an event for a carried-out action', () => {
    const { events } = ok(pet(), { kind: 'drink' });
    expect(events).toEqual([{ type: 'acted', atMs: NOW, action: { kind: 'drink' } }]);
  });
});

describe('weight from food (round 15)', () => {
  const food = (f: FoodType): Action => ({ kind: 'food', food: f });
  /** Hungry enough to eat, so a refusal for being full never gets in the way. */
  const hungry = (seed = 1): PetState => {
    const p = pet(seed);
    p.needs.hunger = 0;
    p.needs.weightKg = 5; // inside the healthy range of a small blob (4 to 6)
    return p;
  };
  const gainRate = (f: FoodType): number => {
    let heavier = 0;
    const n = 4000;
    for (let seed = 1; seed <= n; seed++) {
      if (ok(hungry(seed), food(f)).state.needs.weightKg > 5) heavier++; // started at 5 kg
    }
    return heavier / n;
  };

  it('caloric foods (Apple, Hamburger) add weight about 75% of the time', () => {
    for (const f of ['apple', 'hamburger'] as const) {
      expect(Math.abs(gainRate(f) - 0.75), f).toBeLessThan(0.03);
    }
  });

  it('Noodles, the middle term, sometimes add weight (about 40%)', () => {
    expect(Math.abs(gainRate('noodles') - 0.4)).toBeLessThan(0.03);
  });

  it('non-caloric foods (Carrot, Chicken Thigh) do not add weight to a healthy pet', () => {
    for (const f of ['carrot', 'chicken'] as const) expect(gainRate(f), f).toBe(0);
  });

  it('but they help a pet that is below its healthy range', () => {
    const gain = ctx.tuning.weight.gainKg;
    const thin = hungry();
    thin.needs.weightKg = 3; // below 4
    expect(ok(thin, food('carrot')).state.needs.weightKg).toBeCloseTo(3 + gain);
    expect(ok(thin, food('chicken')).state.needs.weightKg).toBeCloseTo(3 + gain);
  });

  it('and not to one that is close to overweight', () => {
    const heavy = hungry();
    heavy.needs.weightKg = 7;
    expect(ok(heavy, food('carrot')).state.needs.weightKg).toBe(7);
  });

  it('gives the same outcome for the same history', () => {
    expect(ok(hungry(9), food('apple')).state).toEqual(ok(hungry(9), food('apple')).state);
  });
});

describe('what each species accepts (round 15)', () => {
  const as = (species: 'trex' | 'bronto' | 'triceratops'): PetState => {
    const p = pet();
    p.stage = 'tail';
    p.species = species;
    p.needs.hunger = 0;
    return p;
  };

  it('a T-Rex refuses plants and noodles even when hungry; a Brontosaurus refuses meat and noodles', () => {
    for (const f of ['apple', 'carrot', 'noodles'] as const) {
      expect(canDo(as('trex'), { kind: 'food', food: f }, NOW, ctx), f).toBe('notForSpecies');
    }
    for (const f of ['hamburger', 'chicken', 'noodles'] as const) {
      expect(canDo(as('bronto'), { kind: 'food', food: f }, NOW, ctx), f).toBe('notForSpecies');
    }
  });

  it('each eats its own foods and everyone eats Ice Cream', () => {
    for (const f of ['hamburger', 'chicken', 'iceCream'] as const) {
      expect(canDo(as('trex'), { kind: 'food', food: f }, NOW, ctx), f).toBeNull();
    }
    for (const f of ['apple', 'carrot', 'iceCream'] as const) {
      expect(canDo(as('bronto'), { kind: 'food', food: f }, NOW, ctx), f).toBeNull();
    }
  });

  it('a Triceratops, "pasta / everything", accepts all of them (an assumption)', () => {
    for (const f of ['hamburger', 'chicken', 'apple', 'carrot', 'noodles', 'iceCream'] as const) {
      expect(canDo(as('triceratops'), { kind: 'food', food: f }, NOW, ctx), f).toBeNull();
    }
  });

  it('before the species is known, anything goes: the diet decides it', () => {
    const young = pet();
    young.needs.hunger = 0;
    expect(young.species).toBeNull();
    for (const f of ['hamburger', 'chicken', 'apple', 'carrot', 'noodles', 'iceCream'] as const) {
      expect(canDo(young, { kind: 'food', food: f }, NOW, ctx), f).toBeNull();
    }
  });
});
