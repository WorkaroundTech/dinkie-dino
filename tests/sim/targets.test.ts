import { describe, expect, it } from 'vitest';
import type { Context, Pacing } from '../../src/core';
import { contextFor, DEFAULT_SETTINGS, fixedOffsetLocalTime } from '../../src/core';
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

function run(
  playerName: string,
  ctx: Context,
  diet: DietPlan = 'mixed',
  lives = LIVES,
  maxDays = 30,
): Summary {
  const player = builtInPlayers(diet).find((p) => p.name === playerName);
  if (!player) throw new Error(`no player ${playerName}`);
  return summarize(
    Array.from({ length: lives }, (_, i) =>
      simulateLife({ seed: i + 1, player, ctx, hatchMs: HATCH, maxDays }),
    ),
  );
}

/** The real context for a pacing, hatched at noon in a fixed time zone like the other tests. */
const pacingContext = (pacing: Pacing): Context =>
  contextFor({ ...DEFAULT_SETTINGS, pacing }, fixedOffsetLocalTime(-180));

const suffering = (s: Summary) =>
  (s.troubleShare.byCondition['tooHot'] ?? 0) + (s.troubleShare.byCondition['tooCold'] ?? 0);

/** A room that never changes temperature, to look at the needs alone. */
const needsOnly = calmContext(undefined, (t) => {
  t.health.wakeSickChance = { lightOff: 0.02, lightOn: 0.6 };
  t.health.dirt.thresholdChecks = structuredClone(testContext().tuning.health.dirt.thresholdChecks);
  t.health.deathOnsetChecks = structuredClone(testContext().tuning.health.deathOnsetChecks);
});

describe('PACE-01: the needs ask for about two visits a day', () => {
  it('two visits a day keep the pet healthy: it grows up and a need shows only now and then', () => {
    const twice = run('twice', needsOnly);
    expect(twice.reachedFinal).toBeGreaterThanOrEqual(0.95);
    expect(twice.troubleShare.need).toBeLessThanOrEqual(0.22);
  });

  it('one (evening) visit a day starts causing conditions: clearly more than with two', () => {
    const once = run('evening', needsOnly);
    const twice = run('twice', needsOnly);
    expect(once.troubleShare.need).toBeGreaterThan(twice.troubleShare.need * 1.3);
    expect(once.troubleShare.need).toBeGreaterThanOrEqual(0.25);
  });

  it('three visits a day leave hardly any trouble', () => {
    expect(run('thrice', needsOnly).troubleShare.need).toBeLessThanOrEqual(0.03);
  });

  it('visiting more and more often is never worse', () => {
    const trouble = ['evening', 'twice', 'thrice', 'hourly'].map(
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

  it('a pet that is kept clean, cool and medicated but never fed or watered dies of it within about a day', () => {
    // It hatches empty (round 15), so the clocks of thirst and hunger start at once (DEATH-07).
    const unfed = run('unfed', needsOnly);
    expect(unfed.died).toBe(1);
    expect(
      (unfed.deathCauses.thirst ?? 0) +
        (unfed.deathCauses.lowHappiness ?? 0) +
        (unfed.deathCauses.hunger ?? 0),
    ).toBe(unfed.lives);
    expect(unfed.hoursLived.median).toBeGreaterThanOrEqual(20);
    expect(unfed.hoursLived.median).toBeLessThanOrEqual(48);
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

  it('a pet reaches its final form between wake-up 16 and 30, and a perfect one lives longest (LIFE-07, CARE-07)', () => {
    const hourly = run('hourly', testContext(), 'mixed', 80);
    const wakeUps = Object.keys(hourly.finalAtWakeUp).map(Number);
    expect(Math.min(...wakeUps)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...wakeUps)).toBeLessThanOrEqual(30);
    expect(wakeUps).toEqual([30]); // an hourly player's pet makes almost no mistakes
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
      expect(share(summary, key)).toBeGreaterThan(0.02);
  });
});

describe('TEMP-09 (round 15): the AC wants a look about every 4 hours, or every 8 when relaxed', () => {
  it('a visitor every 4 hours keeps the pet alive and out of trouble', () => {
    const normal = run('every4h', pacingContext('normal'), 'mixed', 150);
    expect(normal.reachedFinal).toBeGreaterThanOrEqual(0.95);
    expect(suffering(normal)).toBeLessThanOrEqual(0.03);
  });

  it('a visitor every 8 hours, on the normal pacing, leaves the pet suffering clearly more often', () => {
    const four = run('every4h', pacingContext('normal'), 'mixed', 150);
    const eight = run('every8h', pacingContext('normal'), 'mixed', 150);
    expect(suffering(eight)).toBeGreaterThan(suffering(four) * 3);
  });

  it('twice a day is not enough for the AC: most pets are lost', () => {
    expect(run('twice', pacingContext('normal'), 'mixed', 100).reachedFinal).toBeLessThanOrEqual(
      0.4,
    );
  });

  it('relaxed doubles the gap: a visitor every 8 hours keeps the pet alive and mostly out of trouble', () => {
    const relaxed = run('every8h', pacingContext('relaxed'), 'mixed', 150);
    expect(relaxed.reachedFinal).toBeGreaterThanOrEqual(0.85);
    const normal = run('every8h', pacingContext('normal'), 'mixed', 150);
    expect(suffering(relaxed)).toBeLessThan(suffering(normal));
  });
});

describe('a trip (round 15): a cared-for pet left alone', () => {
  // Looked after every hour for three days, then nobody comes. (A newborn that is never looked
  // after is a different thing: it hatches empty and is gone in about a day.)
  it('usually survives a day alone, on both pacings', () => {
    for (const pacing of ['normal', 'relaxed'] as const) {
      const trip = run('away24', pacingContext(pacing), 'mixed', 300, 4);
      expect(trip.died, pacing).toBeLessThanOrEqual(0.2);
    }
  });

  it('but not two: after two days alone it is dead (DEATH-06)', () => {
    for (const pacing of ['normal', 'relaxed'] as const) {
      const trip = run('away48', pacingContext(pacing), 'mixed', 300, 5);
      expect(trip.died, pacing).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('relaxed pacing survives a day alone more often than normal', () => {
    const normal = run('away24', pacingContext('normal'), 'mixed', 300, 4);
    const relaxed = run('away24', pacingContext('relaxed'), 'mixed', 300, 4);
    expect(relaxed.died).toBeLessThan(normal.died);
  });
});

describe('DIRT-02 and the morning bath window (round 15)', () => {
  it('a visit in the first hour after waking keeps the pet clean: no sickness from dirt, and it grows up', () => {
    const morning = run('morning', needsOnly, 'mixed', 100);
    expect(morning.troubleShare.byCondition['dirty'] ?? 0).toBeLessThanOrEqual(0.05);
    expect(morning.sicknessPerLife['dirt'] ?? 0).toBeLessThanOrEqual(0.1);
    expect(morning.reachedFinal).toBeGreaterThanOrEqual(0.95);
  });

  it('a bath in the hour before bed, every day, keeps most pets alive (the evening visitor)', () => {
    expect(run('evening', needsOnly, 'mixed', 100).reachedFinal).toBeGreaterThanOrEqual(0.6);
  });
});
