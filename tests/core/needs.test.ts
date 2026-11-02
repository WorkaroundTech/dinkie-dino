import { describe, expect, it } from 'vitest';
import type { Tuning } from '../../src/core';
import { DEFAULT_TUNING } from '../../src/core';
import { decayNeeds } from '../../src/core/rules/needs';
import { createPet } from '../../src/core/state';
import type { PetState } from '../../src/core/state';
import { at, testContext } from './helpers';

/** Distinct, known rates, so these tests describe the mechanism and not the tuned defaults. */
const tuning: Tuning = {
  ...DEFAULT_TUNING,
  needs: {
    ...DEFAULT_TUNING.needs,
    checksPerPoint: { hunger: 6, thirst: 4, happiness: 12 },
    sleepAttenuation: 6,
  },
};

/** An awake pet with full meters, hatched at noon. */
function fullPet(): PetState {
  const pet = createPet({ id: 'p', seed: 1, nowMs: at(0, 12) }, testContext());
  pet.needs.hunger = 8;
  pet.needs.thirst = 8;
  pet.needs.happiness = 4;
  return pet;
}

function checks(pet: PetState, n: number) {
  for (let i = 0; i < n; i++) decayNeeds(pet, tuning);
}

describe('need decay (PACE-01)', () => {
  it('drops each meter by one point after its configured number of awake checks', () => {
    const pet = fullPet();
    const { hunger, thirst, happiness } = tuning.needs.checksPerPoint;

    checks(pet, thirst - 1);
    expect(pet.needs.thirst).toBe(8);
    checks(pet, 1);
    expect(pet.needs.thirst).toBe(7);
    expect(pet.needs.hunger).toBe(8);

    checks(pet, hunger - thirst); // total = hunger
    expect(pet.needs.hunger).toBe(7);

    checks(pet, happiness - hunger); // total = happiness
    expect(pet.needs.happiness).toBe(3);
  });

  it('makes thirst the fastest and happiness the slowest meter by default', () => {
    const { hunger, thirst, happiness } = DEFAULT_TUNING.needs.checksPerPoint;
    expect(thirst).toBeLessThanOrEqual(hunger);
    expect(hunger).toBeLessThanOrEqual(happiness);
  });

  it('never goes below empty, and an empty meter keeps no hidden progress', () => {
    const pet = fullPet();
    checks(pet, 500);
    expect(pet.needs).toMatchObject({ hunger: 0, thirst: 0, happiness: 0 });
    expect(pet.decay).toEqual({ hunger: 0, thirst: 0, happiness: 0 });

    // Feeding an empty pet must not cause an instant drop on the next check.
    pet.needs.hunger = 2;
    checks(pet, 1);
    expect(pet.needs.hunger).toBe(2);
  });

  it('does not touch education or weight (EDU-04: education only drops from over-play)', () => {
    const pet = fullPet();
    pet.needs.education = 3;
    const weight = pet.needs.weightKg;
    checks(pet, 300);
    expect(pet.needs.education).toBe(3);
    expect(pet.needs.weightKg).toBe(weight);
  });
});

describe('night attenuation (SLEEP-11)', () => {
  it('decays sleepAttenuation times slower while asleep', () => {
    const pet = fullPet();
    pet.asleep = true;
    const { thirst } = tuning.needs.checksPerPoint;
    const slow = tuning.needs.sleepAttenuation;

    checks(pet, thirst * slow - 1);
    expect(pet.needs.thirst).toBe(8);
    checks(pet, 1);
    expect(pet.needs.thirst).toBe(7);
  });

  it('gives the same result whether asleep checks come in one run or in pieces', () => {
    const a = fullPet();
    const b = fullPet();
    a.asleep = true;
    b.asleep = true;
    checks(a, 12);
    checks(b, 7);
    checks(b, 5);
    expect(b).toEqual(a);
  });

  it('drops on exactly the right check for every whole attenuation from 4 to 8', () => {
    // Regression: floating point made 24 sleeping checks of 1/6 add up to 3.9999999999999996.
    for (const slow of [4, 5, 6, 7, 8]) {
      const custom = { ...tuning, needs: { ...tuning.needs, sleepAttenuation: slow } };
      const pet = fullPet();
      pet.asleep = true;
      const needed = tuning.needs.checksPerPoint.thirst * slow;
      for (let i = 1; i < needed; i++) decayNeeds(pet, custom);
      expect(pet.needs.thirst, `slow=${slow}, before check ${needed}`).toBe(8);
      decayNeeds(pet, custom);
      expect(pet.needs.thirst, `slow=${slow}, at check ${needed}`).toBe(7);
    }
  });

  it('respects a custom attenuation within the 4 to 8 range', () => {
    const fast = { ...tuning, needs: { ...tuning.needs, sleepAttenuation: 4 } };
    const pet = fullPet();
    pet.asleep = true;
    for (let i = 0; i < tuning.needs.checksPerPoint.thirst * 4; i++) decayNeeds(pet, fast);
    expect(pet.needs.thirst).toBe(7);
  });
});
