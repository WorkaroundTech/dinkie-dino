import { describe, expect, it } from 'vitest';
import type { PetState, Stage } from '../../src/core';
import { act, advance, createPet, DEFAULT_TUNING } from '../../src/core';
import { isTooHeavy } from '../../src/core/rules/weight';
import { at, calmContext, testContext } from './helpers';

const NOW = at(0, 8);

function hatch(
  ctx: ReturnType<typeof testContext>,
  seed = 1,
  stage: Stage = 'smallBlob',
): PetState {
  return { ...createPet({ id: `p${seed}`, name: 'Test', seed, nowMs: NOW }, ctx), stage };
}

describe('too heavy (WEIGHT-01)', () => {
  const ctx = testContext();

  it('depends on the stage: a small pet is heavy sooner', () => {
    const limits = DEFAULT_TUNING.weight.heavyAboveKg;
    const order = [
      limits.smallBlob,
      limits.bigBlob,
      limits.tail,
      limits.legs,
      limits.teen,
      limits.adult,
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));

    const pet = hatch(ctx);
    pet.needs.weightKg = limits.smallBlob;
    expect(isTooHeavy(pet, ctx)).toBe(false);
    pet.needs.weightKg = limits.smallBlob + 1;
    expect(isTooHeavy(pet, ctx)).toBe(true);
    expect(isTooHeavy({ ...pet, stage: 'adult' }, ctx)).toBe(false); // fine for an adult
  });

  it('never applies to the locked final form', () => {
    const pet = hatch(ctx, 1, 'final');
    pet.needs.weightKg = 500;
    expect(isTooHeavy(pet, ctx)).toBe(false);
  });

  it('is brought on by too much ice cream', () => {
    let pet = hatch(ctx);
    for (let i = 0; i < 14; i++) pet = act(pet, { kind: 'food', food: 'iceCream' }, NOW, ctx).state;
    expect(isTooHeavy(pet, ctx)).toBe(true);
  });
});

describe('getting sick from the weight', () => {
  const heavy = (seed: number, stage: Stage) => {
    const ctx = calmContext(undefined, (t) => {
      t.weight.heavyAboveKg = { smallBlob: 8, bigBlob: 8, tail: 8, legs: 8, teen: 8, adult: 8 };
    });
    const pet = hatch(ctx, seed, stage);
    pet.needs.weightKg = 20;
    return { ctx, pet };
  };

  const sickRate = (stage: Stage) => {
    const n = 4000;
    let sick = 0;
    for (let seed = 1; seed <= n; seed++) {
      const { ctx, pet } = heavy(seed, stage);
      if (advance(pet, at(0, 8, 15), ctx).state.sick) sick++;
    }
    return sick / n;
  };

  it('is more likely before adulthood: 3% against 1% a check', () => {
    expect(Math.abs(sickRate('teen') - 0.03)).toBeLessThan(0.012);
    expect(Math.abs(sickRate('adult') - 0.01)).toBeLessThan(0.008);
  });

  it('does not happen to a pet of normal weight', () => {
    const ctx = calmContext();
    for (let seed = 1; seed <= 300; seed++) {
      expect(advance(hatch(ctx, seed), at(0, 18), ctx).state.sick).toBeNull();
    }
  });

  it('reports the cause', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { ctx, pet } = heavy(seed, 'teen');
      const { events } = advance(pet, at(0, 12), ctx);
      const sick = events.find((e) => e.type === 'gotSick');
      if (sick) {
        expect(sick).toMatchObject({ cause: 'weight' });
        return;
      }
    }
    throw new Error('no heavy pet fell sick');
  });
});

describe('dying of the weight (DEATH-01)', () => {
  it('starts a death clock for a pet that stays too heavy, and ends it when the weight is lost', () => {
    const ctx = calmContext(undefined, (t) => {
      t.weight.heavyAboveKg = { smallBlob: 8, bigBlob: 8, tail: 8, legs: 8, teen: 8, adult: 8 };
      t.health.deathOnsetChecks.tooHeavy = { min: 8, max: 8 };
      t.health.escalation = { start: 1, step: 0 };
    });
    const pet = hatch(ctx);
    pet.needs.weightKg = 20;

    const started = advance(pet, at(0, 8, 15), ctx).state;
    expect(started.dangers.tooHeavy).toBeDefined();
    expect(advance(pet, at(0, 10), ctx).state.dead).toBeNull(); // the clock has run 7 checks
    expect(advance(pet, at(0, 10, 15), ctx).state.dead).toEqual({
      cause: 'tooHeavy',
      atMs: at(0, 10, 15),
    });

    const slimmer = { ...started, needs: { ...started.needs, weightKg: 5 } };
    expect(advance(slimmer, at(0, 8, 30), ctx).state.dangers.tooHeavy).toBeUndefined();
  });
});
