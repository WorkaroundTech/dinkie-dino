import { describe, expect, it } from 'vitest';
import type { Context } from '../../src/core';
import { simulateLife } from '../../tools/sim/life';
import type { DietPlan } from '../../tools/sim/players';
import { builtInPlayers } from '../../tools/sim/players';
import type { Summary } from '../../tools/sim/stats';
import { summarize } from '../../tools/sim/stats';
import { at, calmContext, testContext } from '../core/helpers';

/**
 * The pacing the owner asked for, kept true by tests. They run whole simulated lives with the
 * tuned default numbers, so changing the tuning can break them on purpose: that is the point.
 * Seeds are fixed, so the results are exact and repeatable, not flaky.
 *
 * Run `npm run sim` to look at the same numbers in full.
 */
const HATCH = at(0, 12);
const LIVES = 120;

function run(playerName: string, ctx: Context, diet: DietPlan = 'mixed', lives = LIVES): Summary {
  const player = builtInPlayers(diet).find((p) => p.name === playerName);
  if (!player) throw new Error(`no player ${playerName}`);
  return summarize(
    Array.from({ length: lives }, (_, i) =>
      simulateLife({ seed: i + 1, player, ctx, hatchMs: HATCH, maxDays: 30 }),
    ),
  );
}

/** A room that never changes temperature, to look at the needs alone. */
const needsOnly = calmContext(undefined, (t) => {
  t.health.wakeSickChance = { lightOff: 0.02, lightOn: 0.6 };
  t.health.dirt.thresholdChecks = { min: 64, max: 80 };
  t.health.deathOnsetChecks = structuredClone(testContext().tuning.health.deathOnsetChecks);
});

describe('PACE-01: the needs ask for about two visits a day', () => {
  it('two visits a day keep the pet healthy: it grows up and rarely shows a need', () => {
    const twice = run('twice', needsOnly);
    expect(twice.reachedFinal).toBeGreaterThanOrEqual(0.95);
    expect(twice.troubleShare.need).toBeLessThanOrEqual(0.15);
  });

  it('one visit a day starts causing conditions: clearly more than with two', () => {
    const once = run('morning', needsOnly);
    const twice = run('twice', needsOnly);
    expect(once.troubleShare.need).toBeGreaterThan(twice.troubleShare.need * 1.3);
    expect(once.troubleShare.need).toBeGreaterThanOrEqual(0.12);
  });

  it('three visits a day leave hardly any trouble', () => {
    expect(run('thrice', needsOnly).troubleShare.need).toBeLessThanOrEqual(0.03);
  });

  it('visiting more and more often is never worse', () => {
    const trouble = ['morning', 'twice', 'thrice', 'hourly'].map(
      (name) => run(name, needsOnly, 'mixed', 60).troubleShare.need,
    );
    expect(trouble).toEqual([...trouble].sort((a, b) => b - a));
  });
});

describe('DEATH-05 and DEATH-06: neglect', () => {
  it('a pet that nobody looks at dies within about two days, whatever the room', () => {
    for (const ctx of [testContext(), needsOnly]) {
      const absent = run('absent', ctx);
      expect(absent.died).toBe(1);
      expect(absent.hoursLived.p90).toBeLessThanOrEqual(48 + 12);
    }
  });

  it('a pet that is kept clean, cool and medicated but never fed or watered dies of it in about two days', () => {
    // Without food the clocks of thirst and hunger are the ones that matter (DEATH-07).
    const unfed = run('unfed', needsOnly);
    expect(unfed.died).toBe(1);
    expect(
      (unfed.deathCauses.thirst ?? 0) +
        (unfed.deathCauses.lowHappiness ?? 0) +
        (unfed.deathCauses.hunger ?? 0),
    ).toBe(unfed.lives);
    expect(unfed.hoursLived.median).toBeGreaterThanOrEqual(36);
    expect(unfed.hoursLived.median).toBeLessThanOrEqual(60);
  });

  it('either way it dies before the 5th wake-up, when its species would be decided (DEATH-05)', () => {
    for (const name of ['absent', 'unfed']) {
      const summary = run(name, testContext());
      expect(summary.hoursLived.p90, name).toBeLessThan(4 * 24);
      expect(summary.species, name).toEqual({});
    }
  });
});

describe('the whole game: temperature (TEMP-09)', () => {
  it('an hourly player who keeps the room comfortable grows the pet up', () => {
    const hourly = run('hourly', testContext(), 'mixed', 80);
    expect(hourly.reachedFinal).toBeGreaterThanOrEqual(0.9);
  });

  it('a pet reaches its final form on a wake-up between 16 and 20 (LIFE-07)', () => {
    const hourly = run('hourly', testContext(), 'mixed', 80);
    const wakeUps = Object.keys(hourly.finalAtWakeUp).map(Number);
    expect(Math.min(...wakeUps)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...wakeUps)).toBeLessThanOrEqual(20);
  });
});

describe('species by diet (SPEC-02)', () => {
  const share = (s: Summary, key: 'trex' | 'bronto' | 'triceratops') => {
    const decided = (s.species.trex ?? 0) + (s.species.bronto ?? 0) + (s.species.triceratops ?? 0);
    return decided === 0 ? 0 : (s.species[key] ?? 0) / decided;
  };

  it.each([
    ['meat', 'trex'],
    ['plant', 'bronto'],
    ['noodles', 'triceratops'],
  ] as const)('a pet fed only %s becomes a %s', (diet, species) => {
    const summary = run('hourly', needsOnly, diet, 40);
    expect(share(summary, species)).toBeGreaterThanOrEqual(0.95);
  });

  it('a mixed diet gives all three, none dominating completely', () => {
    const summary = run('hourly', needsOnly, 'mixed', 120);
    for (const key of ['trex', 'bronto', 'triceratops'] as const)
      expect(share(summary, key)).toBeGreaterThan(0.05);
  });
});
