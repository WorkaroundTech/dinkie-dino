import { describe, expect, it } from 'vitest';
import type { GameEvent, PetState } from '../../src/core';
import {
  DEFAULT_TUNING,
  angelLimit,
  SUPER_HAPPY,
  advance,
  carePoints,
  careQuality,
  careVerdict,
  createPet,
  lifeExtension,
  riskFactor,
} from '../../src/core';
import { trackCare } from '../../src/core/rules/care';
import { applyMorningGrowth } from '../../src/core/rules/growth';
import { at, calmContext } from './helpers';

const ctx = calmContext();
const tuning = ctx.tuning;

/** An awake pet in perfect shape, hatched at noon. */
function fresh(seed = 1): PetState {
  const pet = createPet({ id: `p${seed}`, seed, nowMs: at(0, 12) }, ctx);
  pet.needs = { ...pet.needs, hunger: 8, thirst: 8, happiness: 3, education: 2 };
  pet.lightOn = false;
  return pet;
}

/** Runs the tracker for `n` checks on the pet as it is. */
function track(pet: PetState, n: number): void {
  for (let i = 0; i < n; i++) trackCare(pet, ctx);
}

describe('counting care mistakes (CARE-03)', () => {
  it('counts an episode once, only after it outlasts its grace', () => {
    const pet = fresh();
    pet.needs.hunger = 0; // hungry: grace of 4 checks (1 hour)
    track(pet, 4);
    expect(pet.care.counts.hungry).toBe(0);
    track(pet, 1);
    expect(pet.care.counts.hungry).toBe(1);
    track(pet, 40); // still the same episode
    expect(pet.care.counts.hungry).toBe(1);
  });

  it('counts a new episode after the pet recovers', () => {
    const pet = fresh();
    pet.needs.hunger = 0;
    track(pet, 5);
    pet.needs.hunger = 8;
    track(pet, 1);
    expect(pet.care.runs.hungry).toBe(0);
    pet.needs.hunger = 0;
    track(pet, 5);
    expect(pet.care.counts.hungry).toBe(2);
  });

  it('does not count an episode that ends within its grace', () => {
    const pet = fresh();
    for (let i = 0; i < 10; i++) {
      pet.needs.thirst = 0;
      track(pet, 4);
      pet.needs.thirst = 8;
      track(pet, 1);
    }
    expect(pet.care.counts.thirsty).toBe(0);
  });

  it('has a different grace and cost for each kind', () => {
    const { mistakes } = tuning.careScore;
    expect(mistakes.sick.points).toBeGreaterThan(mistakes.hungry.points);
    expect(mistakes.dirty.graceChecks).toBeGreaterThan(mistakes.hungry.graceChecks);

    const pet = fresh();
    pet.needs.happiness = 0; // sad: grace of 8 checks (2 hours)
    track(pet, 8);
    expect(pet.care.counts.sad).toBe(0);
    track(pet, 1);
    expect(pet.care.counts.sad).toBe(1);
  });

  it('pauses an episode through the night instead of resetting or growing it', () => {
    const pet = fresh();
    pet.needs.hunger = 0;
    track(pet, 3);
    pet.asleep = true;
    track(pet, 30);
    expect(pet.care.runs.hungry).toBe(3);
    expect(pet.care.counts.hungry).toBe(0);
    pet.asleep = false;
    track(pet, 2);
    expect(pet.care.counts.hungry).toBe(1);
  });

  it('counts a light left on past the first check of the night, once a night', () => {
    const pet = fresh();
    pet.asleep = true;
    pet.lightOn = true;
    track(pet, 1);
    expect(pet.care.counts.lightOn).toBe(0);
    track(pet, 30);
    expect(pet.care.counts.lightOn).toBe(1);

    pet.asleep = false; // morning: the episode is over
    track(pet, 1);
    pet.asleep = true;
    track(pet, 5);
    expect(pet.care.counts.lightOn).toBe(2);
  });

  it('does not count a light switched off in time', () => {
    const pet = fresh();
    pet.asleep = true;
    pet.lightOn = true;
    track(pet, 1);
    pet.lightOn = false;
    track(pet, 30);
    expect(pet.care.counts.lightOn).toBe(0);
  });
});

describe('the score and the verdict (CARE-04)', () => {
  it('adds the cost of each mistake', () => {
    const pet = fresh();
    pet.care.counts.sick = 2; // 3 each
    pet.care.counts.dirty = 1; // 2
    pet.care.counts.sad = 3; // 1 each
    expect(carePoints(pet, tuning)).toBe(11);
  });

  it('is an Angel at the limit and a Demon one point above it', () => {
    const pet = fresh();
    pet.care.counts.sick = 10; // 30
    pet.care.counts.hungry = 2; // 32
    expect(careVerdict(pet, tuning)).toBe('angel');
    pet.care.counts.hungry = 3;
    expect(careVerdict(pet, tuning)).toBe('demon');
  });

  it('allows more points to a longer life: 1.72 a day once that is more than 32 (CARE-04)', () => {
    const pet = fresh();
    expect(angelLimit(pet, tuning)).toBe(32); // a young pet
    pet.wakeUps = 18;
    expect(angelLimit(pet, tuning)).toBe(32);
    pet.wakeUps = 25;
    expect(angelLimit(pet, tuning)).toBe(43);
    pet.wakeUps = 30;
    expect(angelLimit(pet, tuning)).toBe(52);

    pet.care.counts.sick = 17; // 51 points
    expect(careVerdict(pet, tuning)).toBe('angel');
    pet.wakeUps = 29; // the same points, a day earlier: the limit is 50
    expect(careVerdict(pet, tuning)).toBe('demon');
  });

  it('judges quality against that limit too', () => {
    const pet = fresh();
    pet.wakeUps = 30;
    pet.care.counts.sick = 18; // 54 points, above the limit of 52
    expect(careQuality(pet, tuning)).toBe(0);
    pet.care.counts.sick = 0;
    pet.care.counts.hungry = 26; // 26 of 52
    expect(careQuality(pet, tuning)).toBeCloseTo(0.5);
  });

  it('takes the SuperHappy bonus off, and never goes below zero', () => {
    const pet = fresh();
    pet.care.counts.sick = 1;
    pet.care.bonus = 2;
    expect(carePoints(pet, tuning)).toBe(1);
    pet.care.bonus = 8;
    expect(carePoints(pet, tuning)).toBe(0);
  });
});

describe('time spent SuperHappy (CARE-05)', () => {
  const superHappy = () => {
    const pet = fresh();
    pet.needs.happiness = SUPER_HAPPY;
    return pet;
  };

  it('earns a point for each hour, once per episode', () => {
    const pet = superHappy();
    track(pet, 3);
    expect(pet.care.bonus).toBe(0);
    track(pet, 1);
    expect(pet.care.bonus).toBe(1);
    track(pet, 20);
    expect(pet.care.bonus).toBe(1);

    pet.needs.happiness = 3;
    track(pet, 1);
    pet.needs.happiness = SUPER_HAPPY;
    track(pet, 4);
    expect(pet.care.bonus).toBe(2);
  });

  it('stops at the cap', () => {
    const pet = superHappy();
    for (let i = 0; i < 20; i++) {
      pet.needs.happiness = 3;
      track(pet, 1);
      pet.needs.happiness = SUPER_HAPPY;
      track(pet, 4);
    }
    expect(pet.care.bonus).toBe(tuning.careScore.superHappy.maxPoints);
  });

  it('does not count the night', () => {
    const pet = superHappy();
    pet.asleep = true;
    track(pet, 40);
    expect(pet.care.bonus).toBe(0);
  });
});

describe('what good care buys (CARE-06)', () => {
  it('quality falls in a straight line from 1 with no points to 0 at the limit', () => {
    const pet = fresh();
    expect(careQuality(pet, tuning)).toBe(1);
    pet.care.counts.hungry = 16;
    expect(careQuality(pet, tuning)).toBeCloseTo(0.5);
    pet.care.counts.hungry = 32;
    expect(careQuality(pet, tuning)).toBe(0);
    pet.care.counts.hungry = 100;
    expect(careQuality(pet, tuning)).toBe(0);
  });

  it('takes up to 10% off the risks, and nothing at the limit', () => {
    const pet = fresh();
    expect(riskFactor(pet, tuning)).toBeCloseTo(0.9);
    pet.care.counts.hungry = 16;
    expect(riskFactor(pet, tuning)).toBeCloseTo(0.95);
    pet.care.counts.hungry = 32;
    expect(riskFactor(pet, tuning)).toBe(1);
  });

  describe('sickness after a night with the light on', () => {
    const lit = DEFAULT_TUNING.health.wakeSickChance.lightOn;
    const calm = calmContext(undefined, (t) => {
      t.health.wakeSickChance = { lightOff: 0, lightOn: lit };
    });

    const rate = (counts: Partial<PetState['care']['counts']>) => {
      const n = 2500;
      let sick = 0;
      for (let seed = 1; seed <= n; seed++) {
        const pet = createPet({ id: `p${seed}`, seed, nowMs: at(0, 18) }, calm);
        let state = advance(pet, at(0, 19), calm).state;
        state = {
          ...state,
          lightOn: true,
          care: { ...state.care, counts: { ...state.care.counts, ...counts } },
        };
        if (advance(state, at(1, 7), calm).state.sick) sick++;
      }
      return sick / n;
    };

    it('is less likely for a spotless pet than for one at the limit', () => {
      const good = rate({});
      const poor = rate({ sick: 11 }); // 33 points: no quality left
      expect(good).toBeLessThan(poor - 0.03);
      expect(Math.abs(poor - lit)).toBeLessThan(0.04);
    });
  });
});

describe('living on (CARE-07)', () => {
  /** A pet that has just woken on its drawn final-form day. */
  function onTheDay(finalAt = 18): PetState {
    const pet = fresh();
    pet.finalFormAtWakeUp = finalAt;
    pet.wakeUps = finalAt;
    pet.stage = 'adult';
    return pet;
  }
  const morning = (pet: PetState): GameEvent[] => {
    const events: GameEvent[] = [];
    applyMorningGrowth(pet, at(1, 7), tuning, events);
    return events;
  };

  it('extends a perfect pet up to the longest life, and it transforms on that day', () => {
    const pet = onTheDay(18);
    const events = morning(pet);
    expect(events).toEqual([{ type: 'lifeExtended', atMs: at(1, 7), extraWakeUps: 12 }]);
    expect(pet.finalFormAtWakeUp).toBe(30);
    expect(pet.stage).toBe('adult');

    pet.wakeUps = 30;
    expect(morning(pet).map((e) => e.type)).toEqual(['finalForm']);
    expect(pet.stage).toBe('final');
    expect(pet.finalForm).toBe('angel');
  });

  it('extends a pet in proportion to its care', () => {
    const half = onTheDay(18);
    half.care.counts.hungry = 16; // quality 0.5
    expect(lifeExtension(half, tuning)).toBe(6);
    morning(half);
    expect(half.finalFormAtWakeUp).toBe(24);
  });

  it('does not extend a pet that was not cared for, and it becomes a Demon on its day', () => {
    const pet = onTheDay(18);
    pet.care.counts.sick = 12; // 36 points
    const events = morning(pet);
    expect(events.map((e) => e.type)).toEqual(['finalForm']);
    expect(pet.finalForm).toBe('demon');
    expect(pet.wakeUps).toBe(18);
  });

  it('extends only once', () => {
    const pet = onTheDay(18);
    morning(pet);
    pet.wakeUps = 30;
    pet.care.counts.hungry = 0;
    const events = morning(pet);
    expect(events.map((e) => e.type)).toEqual(['finalForm']);
    expect(pet.finalFormAtWakeUp).toBe(30);
  });

  it('never goes past the longest life', () => {
    const pet = onTheDay(20);
    morning(pet);
    expect(pet.finalFormAtWakeUp).toBe(30);
    expect(tuning.careScore.longevity.maxWakeUps).toBe(30);
  });
});
