import { describe, expect, it } from 'vitest';
import type { Action, GameEvent, PetState } from '../../src/core';
import { act, advance, canDo, createPet, DEFAULT_TUNING } from '../../src/core';
import { at, calmContext, testContext } from './helpers';

function hatch(ctx: ReturnType<typeof calmContext>, seed: number, nowMs: number): PetState {
  return createPet({ id: `p${seed}`, name: 'Test', seed, nowMs }, ctx);
}

const kinds = (events: GameEvent[]) => events.map((e) => e.type);

describe('dirtiness (DIRT-02, DIRT-08)', () => {
  it('draws the dirt threshold per pet between 16 and 20 hours', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) {
      const { threshold } = hatch(testContext(), seed, at(0, 12)).dirt;
      expect(threshold).toBeGreaterThanOrEqual(64);
      expect(threshold).toBeLessThanOrEqual(80);
      seen.add(threshold);
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it('gets dirty on the check that reaches the threshold, while awake', () => {
    const ctx = calmContext(undefined, (t) => {
      t.health.dirt.thresholdChecks = { min: 16, max: 16 };
    });
    const pet = hatch(ctx, 1, at(0, 7));
    expect(advance(pet, at(0, 10, 45), ctx).state.dirt.dirty).toBeNull();
    const { state, events } = advance(pet, at(0, 11), ctx);
    expect(state.dirt.dirty).toMatchObject({ sinceMs: at(0, 11), checks: 0, rolls: 0 });
    expect(events).toContainEqual({ type: 'becameDirty', atMs: at(0, 11) });
  });

  it('keeps building up at night but only becomes DIRTY at wake-up (DIRT-08)', () => {
    // 40 checks = 10 hours after a 12:00 hatching: 22:00, while the blob is asleep.
    const ctx = calmContext(undefined, (t) => {
      t.health.dirt.thresholdChecks = { min: 40, max: 40 };
    });
    const pet = hatch(ctx, 1, at(0, 12));
    expect(advance(pet, at(0, 18, 45), ctx).state.dirt.dirty).toBeNull();
    expect(advance(pet, at(1, 6, 45), ctx).state.dirt.dirty).toBeNull();

    const { state, events } = advance(pet, at(1, 7), ctx);
    expect(state.dirt.dirty?.sinceMs).toBe(at(1, 7));
    expect(kinds(events)).toEqual(['fellAsleep', 'woke', 'becameDirty']);
  });
});

describe('bath (DIRT-03, DIRT-06, DIRT-07)', () => {
  const ctx = calmContext();
  const bath: Action = { kind: 'bath' };

  it('is closed for a clean pet, except in the hour before bedtime', () => {
    const pet = hatch(ctx, 1, at(0, 12)); // a blob: bedtime 19:00
    expect(canDo(pet, bath, at(0, 17, 45), ctx)).toBe('bathClosed');
    expect(canDo(pet, bath, at(0, 17, 59), ctx)).toBe('bathClosed');
    expect(canDo(pet, bath, at(0, 18), ctx)).toBeNull();
    expect(canDo(pet, bath, at(0, 18, 59), ctx)).toBeNull();
    expect(canDo(pet, bath, at(0, 19), ctx)).toBe('bathClosed'); // asleep by then in practice
  });

  it('follows the stage bedtime: 19:30-20:29 would suit a 20:30 bedtime, 21:00-21:59 an adult at 22:00', () => {
    const adult: PetState = { ...hatch(ctx, 1, at(0, 12)), stage: 'adult' };
    expect(canDo(adult, bath, at(0, 20, 45), ctx)).toBe('bathClosed');
    expect(canDo(adult, bath, at(0, 21), ctx)).toBeNull();
    expect(canDo(adult, bath, at(0, 21, 59), ctx)).toBeNull();

    const legs: PetState = { ...hatch(ctx, 1, at(0, 12)), stage: 'legs' }; // bedtime 20:30
    expect(canDo(legs, bath, at(0, 19, 15), ctx)).toBe('bathClosed');
    expect(canDo(legs, bath, at(0, 19, 30), ctx)).toBeNull();
    expect(canDo(legs, bath, at(0, 20, 29), ctx)).toBeNull();
  });

  it('is open at any time of day when the pet is DIRTY', () => {
    const dirtyCtx = calmContext(undefined, (t) => {
      t.health.dirt.thresholdChecks = { min: 1, max: 1 };
    });
    const { state } = advance(hatch(dirtyCtx, 1, at(0, 8)), at(0, 8, 30), dirtyCtx);
    expect(state.dirt.dirty).not.toBeNull();
    expect(canDo(state, bath, at(0, 9), dirtyCtx)).toBeNull();
  });

  it('cleans fully and restarts the timer with a fresh threshold', () => {
    const dirtyCtx = calmContext(undefined, (t) => {
      t.health.dirt.thresholdChecks = { min: 1, max: 1 };
    });
    const dirty = advance(hatch(dirtyCtx, 1, at(0, 8)), at(0, 8, 30), dirtyCtx).state;
    expect(dirty.dirt.dirty).not.toBeNull();

    const real = testContext();
    const result = act(dirty, bath, at(0, 9), real);
    expect(result.refused).toBeNull();
    expect(result.state.dirt.dirty).toBeNull();
    expect(result.state.dirt.checks).toBe(0);
    expect(result.state.dirt.threshold).toBeGreaterThanOrEqual(64);
    expect(result.state.dirt.threshold).toBeLessThanOrEqual(80);
    expect(kinds(result.events)).toEqual(['cleaned', 'acted']);
  });

  it('counts for a clean pet too: the daily bath before bed restarts the timer', () => {
    const real = testContext();
    const pet = hatch(real, 1, at(0, 12));
    const aged = advance(pet, at(0, 18), real).state;
    expect(aged.dirt.checks).toBeGreaterThan(0);

    const result = act(aged, bath, at(0, 18), real);
    expect(result.refused).toBeNull();
    expect(result.state.dirt.checks).toBe(0);
    expect(kinds(result.events)).toEqual(['acted']); // nothing to clean
  });

  it('is refused while asleep or sick', () => {
    const asleep = hatch(ctx, 1, at(0, 23));
    expect(canDo(asleep, bath, at(0, 23), ctx)).toBe('asleep');
    const sick: PetState = { ...hatch(ctx, 1, at(0, 18)), sick: { sinceMs: at(0, 18) } };
    expect(canDo(sick, bath, at(0, 18), ctx)).toBe('sick');
  });
});

describe('dirty checks (DIRT-09, DIRT-10)', () => {
  /** Dirty after one check, 8 checks of grace, then the dirty checks. Hatched awake at 07:00. */
  const dirtyCtx = (start = 0.2) =>
    calmContext(undefined, (t) => {
      t.health.dirt.thresholdChecks = { min: 1, max: 1 };
      t.health.dirt.onsetChecks = { min: 8, max: 8 };
      t.health.escalation = { start, step: 0.1 };
      t.needs.checksPerPoint.happiness = 1_000_000; // keep natural decay out of these checks
    });

  it('does nothing during the grace period', () => {
    const ctx = dirtyCtx(1);
    const pet = hatch(ctx, 1, at(0, 7));
    pet.needs.happiness = 4;
    // Dirty at 07:15; dirty checks begin when 8 dirty checks have passed: 09:15.
    const before = advance(pet, at(0, 9), ctx).state;
    expect(before.sick).toBeNull();
    expect(before.needs.happiness).toBe(4);
    expect(before.dirt.dirty?.rolls).toBe(0);
  });

  it('starts at a 20% chance on the first check and escalates 10% per check', () => {
    const n = 3000;
    let sickAtFirst = 0;
    let sickByNinth = 0;
    let sickBeforeFirst = 0;
    for (let seed = 1; seed <= n; seed++) {
      const ctx = dirtyCtx();
      const pet = hatch(ctx, seed, at(0, 7));
      if (advance(pet, at(0, 9), ctx).state.sick) sickBeforeFirst++;
      if (advance(pet, at(0, 9, 15), ctx).state.sick) sickAtFirst++; // 1st dirty check at 09:15
      if (advance(pet, at(0, 11, 15), ctx).state.sick) sickByNinth++; // 9th check, p = 100%
    }
    expect(sickBeforeFirst).toBe(0);
    expect(Math.abs(sickAtFirst / n - 0.2)).toBeLessThan(0.03);
    expect(sickByNinth).toBe(n);
  });

  it('always lowers happiness on a dirty check, never below the lowest level', () => {
    const ctx = dirtyCtx(0); // never becomes sick: start 0 and ... step 0.1 would escalate, so freeze it
    ctx.tuning.health.escalation = { start: 0, step: 0 };
    const pet = hatch(ctx, 1, at(0, 7));
    pet.needs.happiness = 4;
    const levels = [
      at(0, 9, 15),
      at(0, 9, 30),
      at(0, 9, 45),
      at(0, 10),
      at(0, 10, 15),
      at(0, 11),
    ].map((t) => advance(pet, t, ctx).state.needs.happiness);
    expect(levels).toEqual([3, 2, 1, 0, 0, 0]);
  });

  it('becomes SICK from the dirt and then stops rolling (DIRT-10)', () => {
    const ctx = dirtyCtx(1);
    const pet = hatch(ctx, 1, at(0, 7));
    pet.needs.happiness = 4;
    const { state, events } = advance(pet, at(0, 9, 15), ctx);
    expect(state.sick).toEqual({ sinceMs: at(0, 9, 15) });
    expect(events).toContainEqual({ type: 'gotSick', atMs: at(0, 9, 15), cause: 'dirt' });
    expect(state.dirt.dirty?.sickRollsStopped).toBe(true);

    const later = advance(state, at(0, 11), ctx).state;
    expect(later.needs.happiness).toBe(state.needs.happiness); // no more dirty checks
    expect(later.dirt.dirty?.rolls).toBe(1);
  });

  it('resumes from the start once the pet is cured but still dirty (DIRT-10)', () => {
    const ctx = dirtyCtx(1);
    const sick = advance(hatch(ctx, 1, at(0, 7)), at(0, 9, 15), ctx).state;
    const cured = act(sick, { kind: 'medical' }, at(0, 9, 30), ctx).state;
    expect(cured.sick).toBeNull();
    expect(cured.dirt.dirty).toMatchObject({ rolls: 0, sickRollsStopped: false });
  });

  it('does not make a pet sick that is already sick', () => {
    const ctx = dirtyCtx(1);
    const pet: PetState = { ...hatch(ctx, 1, at(0, 7)), sick: { sinceMs: at(0, 7) } };
    const { events } = advance(pet, at(0, 11), ctx);
    expect(events.filter((e) => e.type === 'gotSick')).toEqual([]);
  });
});

describe('sickness and medicine (SICK-01, SICK-02, MED-01…05)', () => {
  const ctx = calmContext();
  const NOW = at(0, 12);
  const sickPet = (): PetState => ({ ...hatch(ctx, 1, NOW), sick: { sinceMs: NOW } });

  it('refuses care while sick: eat, drink, study, pet and bath', () => {
    const pet = sickPet();
    const refused: Action[] = [
      { kind: 'drink' },
      { kind: 'food', food: 'apple' },
      { kind: 'food', food: 'iceCream' },
      { kind: 'educate' },
      { kind: 'pet' },
      { kind: 'bath' },
    ];
    for (const action of refused)
      expect(canDo(pet, action, NOW, ctx), JSON.stringify(action)).toBe('sick');
  });

  it('still allows Lamp, Check, Clock and Medicine while sick', () => {
    const pet = sickPet();
    for (const kind of ['lamp', 'check', 'clock', 'medical'] as const) {
      expect(canDo(pet, { kind }, NOW, ctx), kind).toBeNull();
    }
  });

  it('a single dose cures, and leaves hunger and thirst empty and happiness at the lowest', () => {
    const pet = sickPet();
    pet.needs = { hunger: 7, thirst: 6, happiness: 4, education: 3, weightKg: 9 };
    const { state, events, refused } = act(pet, { kind: 'medical' }, NOW, ctx);
    expect(refused).toBeNull();
    expect(state.sick).toBeNull();
    expect(state.needs).toEqual({ hunger: 0, thirst: 0, happiness: 0, education: 3, weightKg: 9 });
    expect(events).toEqual([
      { type: 'cured', atMs: NOW },
      { type: 'acted', atMs: NOW, action: { kind: 'medical' } },
    ]);
  });

  it('lets the cured pet eat again', () => {
    const cured = act(sickPet(), { kind: 'medical' }, NOW, ctx).state;
    expect(canDo(cured, { kind: 'food', food: 'apple' }, NOW, ctx)).toBeNull();
  });

  it('is refused for a healthy pet, which changes nothing', () => {
    const healthy = hatch(ctx, 1, NOW);
    const result = act(healthy, { kind: 'medical' }, NOW, ctx);
    expect(result.refused).toBe('notSick');
    expect(result.state).toEqual(healthy);
  });

  it('is refused while asleep', () => {
    const asleep: PetState = { ...hatch(ctx, 1, at(0, 23)), sick: { sinceMs: at(0, 23) } };
    expect(canDo(asleep, { kind: 'medical' }, at(0, 23), ctx)).toBe('asleep');
  });
});

describe('waking up sick after a night with the light on (SLEEP-02, SLEEP-03)', () => {
  const ctx = calmContext(undefined, (t) => {
    t.health.wakeSickChance = { lightOff: 0.02, lightOn: 0.6 };
  });

  /** Hatch at 18:00, go to bed at 19:00, leave the light as given, wake at 07:00. */
  function morningAfter(seed: number, lightOn: boolean): PetState {
    const pet = hatch(ctx, seed, at(0, 18));
    let state = advance(pet, at(0, 19), ctx).state;
    if (lightOn) state = act(state, { kind: 'lamp' }, at(0, 19), ctx).state;
    return advance(state, at(1, 7), ctx).state;
  }

  const rate = (lightOn: boolean) => {
    const n = 2500;
    let sick = 0;
    for (let seed = 1; seed <= n; seed++) if (morningAfter(seed, lightOn).sick) sick++;
    return sick / n;
  };

  it('wakes up sick about 60% of the time with the light on', () => {
    expect(Math.abs(rate(true) - 0.6)).toBeLessThan(0.04);
  });

  it('wakes up sick only rarely with the light off', () => {
    expect(rate(false)).toBeLessThan(0.05);
  });

  it('reports the cause', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const pet = hatch(ctx, seed, at(0, 18));
      const asleep = act(
        advance(pet, at(0, 19), ctx).state,
        { kind: 'lamp' },
        at(0, 19),
        ctx,
      ).state;
      const { events } = advance(asleep, at(1, 7), ctx);
      const sick = events.find((e) => e.type === 'gotSick');
      if (sick) {
        expect(sick).toEqual({ type: 'gotSick', atMs: at(1, 7), cause: 'light' });
        return;
      }
    }
    throw new Error('no seed got sick with the light on');
  });

  it('gives a grace of one check: switching the light off right after bedtime is fine', () => {
    let state = advance(hatch(ctx, 3, at(0, 18)), at(0, 19), ctx).state;
    state = act(state, { kind: 'lamp' }, at(0, 19), ctx).state; // on at 19:00
    state = act(state, { kind: 'lamp' }, at(0, 19, 10), ctx).state; // off at 19:10
    expect(advance(state, at(0, 19, 15), ctx).state.nightLightChecks).toBe(0);
  });

  it('counts every check the light stays on during the night', () => {
    let state = advance(hatch(ctx, 3, at(0, 18)), at(0, 19), ctx).state;
    state = act(state, { kind: 'lamp' }, at(0, 19), ctx).state;
    expect(advance(state, at(0, 20), ctx).state.nightLightChecks).toBe(4);
  });

  it('forgets the night after the wake-up roll', () => {
    expect(morningAfter(1, true).nightLightChecks).toBe(0);
  });

  it('is a catch-up too: a light left on while the app was closed still counts (SLEEP-04)', () => {
    const lit = { ...advance(hatch(ctx, 1, at(0, 18)), at(0, 19), ctx).state, lightOn: true };
    const away = advance(lit, at(1, 7), ctx).state;
    const stepwise = (() => {
      let s = lit;
      for (let t = at(0, 19, 15); t <= at(1, 7); t += 15 * 60_000) s = advance(s, t, ctx).state;
      return s;
    })();
    expect(away).toEqual(stepwise);
  });
});

describe('death clocks (DEATH-01, DEATH-07, DEATH-08, SLEEP-12)', () => {
  /** A context where a sick pet is certain to die 16 checks (4 h) after falling sick. */
  const doomed = (onset = 16) =>
    calmContext(undefined, (t) => {
      t.health.deathOnsetChecks.sick = { min: onset, max: onset };
      t.health.escalation = { start: 1, step: 0 };
    });

  it('starts when the condition starts and ends when it ends', () => {
    const ctx = calmContext(undefined, (t) => {
      t.health.deathOnsetChecks.thirst = { min: 96, max: 96 };
    });
    const pet = hatch(ctx, 1, at(0, 8));
    pet.needs.thirst = 0;
    const started = advance(pet, at(0, 8, 15), ctx).state;
    expect(started.dangers.thirst).toEqual({ progress: 0, onsetChecks: 96, rolls: 0 });

    const quenched = act(started, { kind: 'drink' }, at(0, 8, 15), ctx).state;
    expect(advance(quenched, at(0, 8, 30), ctx).state.dangers.thirst).toBeUndefined();
  });

  it('kills a sick pet no earlier than the onset', () => {
    const ctx = doomed();
    const sick: PetState = { ...hatch(ctx, 1, at(0, 7)), sick: { sinceMs: at(0, 7) } };
    // The clock starts at 07:15 and has run 16 checks at 11:15.
    expect(advance(sick, at(0, 11), ctx).state.dead).toBeNull();
    const { state, events } = advance(sick, at(0, 11, 15), ctx);
    expect(state.dead).toEqual({ cause: 'sick', atMs: at(0, 11, 15) });
    expect(events).toContainEqual({ type: 'died', atMs: at(0, 11, 15), cause: 'sick' });
  });

  it('is cured in time: medicine before the onset saves the pet', () => {
    const ctx = doomed();
    let pet: PetState = { ...hatch(ctx, 1, at(0, 7)), sick: { sinceMs: at(0, 7) } };
    pet = advance(pet, at(0, 10), ctx).state;
    pet = act(pet, { kind: 'medical' }, at(0, 10), ctx).state;
    expect(advance(pet, at(0, 18), ctx).state.dead).toBeNull();
  });

  it('halts for good once dead', () => {
    const ctx = doomed();
    const sick: PetState = { ...hatch(ctx, 1, at(0, 7)), sick: { sinceMs: at(0, 7) } };
    const dead = advance(sick, at(0, 12), ctx).state;
    expect(dead.dead).not.toBeNull();
    const later = advance(dead, at(20, 12), ctx);
    expect(later.state).toEqual(dead);
    expect(later.events).toEqual([]);
  });

  it('rolls nothing while asleep, and the first roll after waking is at the next check', () => {
    const ctx = doomed(4);
    // Hatch at 22:00 (asleep) already sick: the 4-check clock is over by 23:15 but nothing rolls.
    const sick: PetState = { ...hatch(ctx, 1, at(0, 22)), sick: { sinceMs: at(0, 22) } };
    expect(sick.asleep).toBe(true);

    expect(advance(sick, at(1, 6, 45), ctx).state.dead).toBeNull(); // all night
    expect(advance(sick, at(1, 7), ctx).state.dead).toBeNull(); // the check that ends the night
    const morning = advance(sick, at(1, 7, 15), ctx).state; // first check of an awake interval
    expect(morning.dead).toEqual({ cause: 'sick', atMs: at(1, 7, 15) });
  });

  it('escalates: 20% then 30%, and so on, until certain death', () => {
    // Onset 4; with the default escalation the 9th roll is certain.
    const rollsToDie: number[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      const ctx = calmContext(undefined, (t) => {
        t.health.deathOnsetChecks.sick = { min: 4, max: 4 };
      });
      const sick: PetState = { ...hatch(ctx, seed, at(0, 7)), sick: { sinceMs: at(0, 7) } };
      const { state } = advance(sick, at(0, 18), ctx);
      expect(state.dead, `seed ${seed}`).not.toBeNull();
      const dead = state.dead as { atMs: number };
      // The clock starts at 07:15; onset reached at 08:15 (4 checks); roll k happens k checks later.
      rollsToDie.push((dead.atMs - at(0, 8, 15)) / (15 * 60_000));
    }
    expect(Math.min(...rollsToDie)).toBe(0);
    expect(Math.max(...rollsToDie)).toBeLessThanOrEqual(8);
    const first = rollsToDie.filter((r) => r === 0).length / rollsToDie.length;
    expect(Math.abs(first - 0.2)).toBeLessThan(0.06);
  });

  it('applies to hunger, thirst and the lowest happiness', () => {
    for (const cause of ['hunger', 'thirst', 'lowHappiness'] as const) {
      const ctx = calmContext(undefined, (t) => {
        t.health.deathOnsetChecks[cause] = { min: 4, max: 4 };
        t.health.escalation = { start: 1, step: 0 };
      });
      const pet = hatch(ctx, 1, at(0, 7));
      pet.needs.hunger = cause === 'hunger' ? 0 : 8;
      pet.needs.thirst = cause === 'thirst' ? 0 : 8;
      pet.needs.happiness = cause === 'lowHappiness' ? 0 : 4;
      const { state } = advance(pet, at(0, 12), ctx);
      expect(state.dead?.cause, cause).toBe(cause);
    }
  });

  it('leaves a pet with only a mild shortfall alone: half-empty meters never kill', () => {
    const ctx = testContext();
    const pet = hatch(ctx, 1, at(0, 7));
    pet.needs = { ...pet.needs, hunger: 2, thirst: 2, happiness: 1 };
    expect(Object.keys(advance(pet, at(0, 8), ctx).state.dangers)).toEqual([]);
  });
});

describe('default pacing against the targets (DEATH-05, DEATH-06)', () => {
  // These use the provisional default numbers; the simulator tunes them in M3.
  const ctx = testContext();

  it('a pet that is never fed dies before wake-up 5, when its species would be decided', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const { state } = advance(hatch(ctx, seed, at(0, 12)), at(5, 7), ctx);
      expect(state.dead, `seed ${seed}`).not.toBeNull();
    }
  });

  it('does not starve or dehydrate within the first day', () => {
    // (It can still fall sick or overheat on its first day and die of that.)
    for (let seed = 1; seed <= 150; seed++) {
      const { dead } = advance(hatch(ctx, seed, at(0, 12)), at(1, 12), ctx).state;
      const cause = dead?.cause;
      expect(
        cause === undefined || !['hunger', 'thirst', 'lowHappiness'].includes(cause),
        `seed ${seed}`,
      ).toBe(true);
    }
  });

  it('a pet left alone for two days most likely dies', () => {
    let dead = 0;
    const n = 150;
    for (let seed = 1; seed <= n; seed++) {
      if (advance(hatch(ctx, seed, at(0, 12)), at(2, 12), ctx).state.dead) dead++;
    }
    expect(dead / n).toBeGreaterThan(0.7);
  });

  it('has a sensible tuning table', () => {
    const { deathOnsetChecks } = DEFAULT_TUNING.health;
    expect(deathOnsetChecks.sick.max).toBeLessThan(deathOnsetChecks.thirst.min); // sick is the quickest killer
    expect(deathOnsetChecks.thirst.min).toBeLessThan(deathOnsetChecks.hunger.min); // thirst before hunger
  });
});
