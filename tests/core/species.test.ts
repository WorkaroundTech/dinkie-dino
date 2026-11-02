import { describe, expect, it } from 'vitest';
import type { Action, FoodType, GameEvent, PetState, Species } from '../../src/core';
import { act, advance, createPet } from '../../src/core';
import { decideSpecies } from '../../src/core/rules/species';
import { at, calmContext } from './helpers';

const ctx = calmContext();

function pet(seed: number, nowMs = at(0, 12)): PetState {
  return createPet({ id: 'p', seed, nowMs }, ctx);
}

function withDiet(seed: number, diet: PetState['diet']): PetState {
  return { ...pet(seed), diet };
}

describe('diet counting (SPEC-01, SPEC-05)', () => {
  const feed = (p: PetState, food: FoodType): PetState => {
    p.needs.hunger = 0; // so the pet is never full
    return act(p, { kind: 'food', food }, at(0, 12), ctx).state;
  };

  it('counts meals by group while a small blob', () => {
    let p = pet(1);
    for (const food of ['chicken', 'hamburger', 'apple', 'carrot', 'carrot', 'noodles'] as const) {
      p = feed(p, food);
    }
    expect(p.diet).toEqual({ meat: 2, plant: 3, noodles: 1 });
  });

  it('counts meals, not meal sizes: an apple (1 point) and a carrot (2 points) are one meal each', () => {
    let p = pet(1);
    p = feed(p, 'apple');
    p = feed(p, 'carrot');
    expect(p.diet.plant).toBe(2);
  });

  it('stops counting once the pet is no longer a blob (SPEC-01)', () => {
    const p: PetState = { ...pet(1), stage: 'tail' };
    expect(feed(p, 'chicken').diet).toEqual({ meat: 0, plant: 0, noodles: 0 });
  });

  it('does not count a refused meal', () => {
    const p = pet(1);
    p.needs.hunger = 8;
    const result = act(p, { kind: 'food', food: 'apple' }, at(0, 12), ctx);
    expect(result.refused).toBe('full');
    expect(result.state.diet.plant).toBe(0);
  });
});

describe('species decision (SPEC-02…06)', () => {
  it('a group with more than half of the meals wins, whatever the draw', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(decideSpecies(withDiet(seed, { meat: 6, plant: 3, noodles: 2 }), ctx.tuning)).toBe(
        'trex',
      );
      expect(decideSpecies(withDiet(seed, { meat: 1, plant: 7, noodles: 1 }), ctx.tuning)).toBe(
        'bronto',
      );
      expect(decideSpecies(withDiet(seed, { meat: 0, plant: 2, noodles: 5 }), ctx.tuning)).toBe(
        'triceratops',
      );
    }
  });

  it('exactly half is not more than half, so it goes to the weighted draw', () => {
    const seen = new Set<Species>();
    for (let seed = 1; seed <= 400; seed++) {
      seen.add(decideSpecies(withDiet(seed, { meat: 5, plant: 5, noodles: 0 }), ctx.tuning));
    }
    expect([...seen].sort()).toEqual(['bronto', 'trex']);
  });

  it('a mixed diet is a random draw weighted by the shares', () => {
    const counts: Record<Species, number> = { trex: 0, bronto: 0, triceratops: 0 };
    const n = 6000;
    for (let seed = 1; seed <= n; seed++) {
      // 40% meat, 35% plant, 25% noodles: nobody has a majority.
      counts[decideSpecies(withDiet(seed, { meat: 8, plant: 7, noodles: 5 }), ctx.tuning)]++;
    }
    expect(Math.abs(counts.trex / n - 0.4)).toBeLessThan(0.03);
    expect(Math.abs(counts.bronto / n - 0.35)).toBeLessThan(0.03);
    expect(Math.abs(counts.triceratops / n - 0.25)).toBeLessThan(0.03);
  });

  it('never picks a species that had no meals when no group has a majority', () => {
    for (let seed = 1; seed <= 500; seed++) {
      expect(decideSpecies(withDiet(seed, { meat: 3, plant: 3, noodles: 0 }), ctx.tuning)).not.toBe(
        'triceratops',
      );
    }
  });

  it('falls back to an even draw when nothing was eaten', () => {
    const seen = new Set<Species>();
    for (let seed = 1; seed <= 300; seed++) {
      seen.add(decideSpecies(withDiet(seed, { meat: 0, plant: 0, noodles: 0 }), ctx.tuning));
    }
    expect(seen.size).toBe(3);
  });

  it('is replayable: the same pet always gets the same species', () => {
    const a = withDiet(77, { meat: 8, plant: 7, noodles: 5 });
    expect(decideSpecies(a, ctx.tuning)).toBe(decideSpecies(structuredClone(a), ctx.tuning));
  });
});

describe('species at the blob with a tail (SPEC-04, LIFE table)', () => {
  /** Feeds a pet `meal` every morning and noon for the first days. */
  function raise(seed: number, meal: FoodType): { pet: PetState; events: GameEvent[] } {
    let p = pet(seed);
    const events: GameEvent[] = [];
    for (let day = 0; day < 5; day++) {
      for (const hour of [8, 12, 16]) {
        const step = advance(p, at(day, hour), ctx);
        p = step.state;
        events.push(...step.events);
        p.needs.hunger = 0;
        const fed: Action = { kind: 'food', food: meal };
        const result = act(p, fed, at(day, hour), ctx);
        if (!result.refused) p = result.state;
      }
    }
    const step = advance(p, at(5, 7), ctx); // wake-up 5: arrives at the blob with a tail
    events.push(...step.events);
    return { pet: step.state, events };
  }

  it.each([
    ['chicken', 'trex'],
    ['hamburger', 'trex'],
    ['carrot', 'bronto'],
    ['apple', 'bronto'],
    ['noodles', 'triceratops'],
  ] as const)('feeding only %s makes a %s', (meal, species) => {
    const { pet: p, events } = raise(9, meal);
    expect(p.stage).toBe('tail');
    expect(p.species).toBe(species);
    expect(events.filter((e) => e.type === 'species')).toEqual([
      { type: 'species', atMs: at(5, 7), species },
    ]);
  });

  it('keeps the species for life: later meals do not change it', () => {
    const { pet: tail } = raise(9, 'noodles');
    expect(tail.species).toBe('triceratops');
    const later = advance({ ...tail, diet: { meat: 99, plant: 0, noodles: 0 } }, at(12, 12), ctx);
    expect(later.state.species).toBe('triceratops');
    expect(later.events.filter((e) => e.type === 'species')).toHaveLength(0);
  });

  it('leaves the species undecided before the tail stage', () => {
    const { state } = advance(pet(9), at(4, 12), ctx);
    expect(state.stage).toBe('bigBlob');
    expect(state.species).toBeNull();
  });
});
