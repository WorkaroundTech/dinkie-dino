import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../src/core';
import { simulateLife } from '../../tools/sim/life';
import { tuningWithOverrides } from '../../tools/sim/overrides';
import { builtInPlayers, sessionMinutes } from '../../tools/sim/players';
import { formatReport } from '../../tools/sim/report';
import { percentile, summarize } from '../../tools/sim/stats';
import { at, calmContext, testContext } from '../core/helpers';
import { createPet } from '../../src/core';

const HATCH = at(0, 12);
const players = Object.fromEntries(builtInPlayers().map((p) => [p.name, p]));
const player = (name: string) => {
  const found = players[name];
  if (!found) throw new Error(`no player ${name}`);
  return found;
};

describe('overrides', () => {
  it('changes a nested number and leaves the defaults alone', () => {
    const tuning = tuningWithOverrides([
      'temperature.moveChance=0.06',
      'needs.checksPerPoint.hunger=9',
    ]);
    expect(tuning.temperature.moveChance).toBe(0.06);
    expect(tuning.needs.checksPerPoint.hunger).toBe(9);
    expect(DEFAULT_TUNING.temperature.moveChance).not.toBe(0.06);
  });

  it.each([
    ['temperature.nope=1', /no such setting|not a number setting/],
    ['nothing.here=1', /no such setting/],
    ['temperature.moveChance=abc', /not a number/],
    ['temperature.moveChance', /path=number/],
    ['temperature.band=3', /not a number setting/],
  ])('rejects %s', (override, message) => {
    expect(() => tuningWithOverrides([override])).toThrow(message);
  });
});

describe('statistics', () => {
  it('interpolates percentiles', () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([10, 20, 30, 40, 50], 0.1)).toBe(14);
  });

  it('summarizes lives', () => {
    const base = {
      cause: null,
      species: null,
      finalForm: null,
      wakeUps: 0,
      sessions: 4,
      awakeChecks: 100,
      conditionChecks: {
        any: 10,
        need: 5,
        sick: 0,
        tooCold: 0,
        tooHot: 0,
        hungry: 5,
        thirsty: 0,
        dirty: 0,
        sad: 0,
      },
      actions: { drink: 2 },
    };
    const s = summarize([
      { ...base, seed: 1, outcome: 'final', hoursLived: 400, wakeUps: 17, species: 'trex' },
      { ...base, seed: 2, outcome: 'dead', cause: 'sick', hoursLived: 48 },
      { ...base, seed: 3, outcome: 'timeout', hoursLived: 720 },
      { ...base, seed: 4, outcome: 'dead', cause: 'sick', hoursLived: 30 },
    ]);
    expect(s.lives).toBe(4);
    expect(s.reachedFinal).toBe(0.25);
    expect(s.died).toBe(0.5);
    expect(s.timedOut).toBe(0.25);
    expect(s.deathCauses).toEqual({ sick: 2 });
    expect(s.finalAtWakeUp).toEqual({ 17: 1 });
    expect(s.species).toEqual({ trex: 1 });
    expect(s.lifespanDays).toEqual({ 16: 1, 2: 1, 30: 1, 1: 1 });
    expect(s.troubleShare.any).toBeCloseTo(0.1);
    expect(s.troubleShare.byCondition['hungry']).toBeCloseTo(0.05);
    expect(s.sessionsPerDay).toBeCloseTo(16 / ((400 + 48 + 720 + 30) / 24));
  });

  it('handles no lives at all', () => {
    expect(summarize([]).lives).toBe(0);
    expect(summarize([]).reachedFinal).toBe(0);
  });
});

describe('players', () => {
  const ctx = testContext();
  const pet = createPet({ id: 'p', name: 'T', seed: 1, nowMs: HATCH }, ctx);

  it('visit twice a day: an hour after waking and 45 minutes before bed', () => {
    expect(sessionMinutes(player('twice'), pet, ctx)).toEqual([8 * 60, 18 * 60 + 15]); // a blob sleeps at 19:00
    expect(sessionMinutes(player('twice'), { ...pet, stage: 'adult' }, ctx)).toEqual([
      8 * 60,
      21 * 60 + 15,
    ]);
  });

  it('absent never visits, and hourly visits every hour of the day', () => {
    expect(sessionMinutes(player('absent'), pet, ctx)).toEqual([]);
    const hourly = sessionMinutes(player('hourly'), pet, ctx);
    expect(hourly).toHaveLength(16);
    expect((hourly[1] ?? 0) - (hourly[0] ?? 0)).toBe(60);
  });

  it('only ever visit on the 15-minute grid (decision A3)', () => {
    for (const p of builtInPlayers()) {
      for (const m of sessionMinutes(p, pet, ctx)) expect(m % 15, p.name).toBe(0);
    }
  });
});

describe('one simulated life', () => {
  const ctx = testContext();
  const life = (name: string, seed = 1, maxDays = 30) =>
    simulateLife({ seed, player: player(name), ctx, hatchMs: HATCH, maxDays });

  it('is deterministic for a seed', () => {
    expect(life('twice', 7)).toEqual(life('twice', 7));
    expect(life('twice', 7)).not.toEqual(life('twice', 8));
  });

  it('counts the visits, and none for an absent player', () => {
    expect(life('absent').sessions).toBe(0);
    const calm = calmContext();
    const report = simulateLife({
      seed: 3,
      player: player('twice'),
      ctx: calm,
      hatchMs: HATCH,
      maxDays: 10,
    });
    expect(report.outcome).toBe('timeout');
    expect(report.sessions).toBeGreaterThanOrEqual(18);
    expect(report.sessions).toBeLessThanOrEqual(21);
  });

  it('stops at the end of the run when the pet is still alive', () => {
    const calm = calmContext();
    const report = simulateLife({
      seed: 1,
      player: player('hourly'),
      ctx: calm,
      hatchMs: HATCH,
      maxDays: 3,
    });
    expect(report.outcome).toBe('timeout');
    expect(report.hoursLived).toBeCloseTo(72, 0);
  });

  it('reports a death with its cause and never counts more trouble than awake time', () => {
    const report = life('absent');
    expect(report.outcome).toBe('dead');
    expect(report.cause).not.toBeNull();
    expect(report.conditionChecks.any).toBeLessThanOrEqual(report.awakeChecks);
    expect(report.conditionChecks.need).toBeLessThanOrEqual(report.conditionChecks.any);
  });

  it('records the final form and when it came', () => {
    const calm = calmContext();
    const report = simulateLife({
      seed: 2,
      player: player('hourly'),
      ctx: calm,
      hatchMs: HATCH,
      maxDays: 40,
    });
    expect(report.outcome).toBe('final');
    expect(report.wakeUps).toBeGreaterThanOrEqual(16);
    expect(report.wakeUps).toBeLessThanOrEqual(20);
    expect(report.finalForm).toBe('angel');
  });
});

describe('the report', () => {
  it('lists every player in each table', () => {
    const ctx = calmContext();
    const results = ['absent', 'twice'].map((name) => ({
      player: name,
      summary: summarize([
        simulateLife({ seed: 1, player: player(name), ctx, hatchMs: HATCH, maxDays: 5 }),
      ]),
    }));
    const text = formatReport(results, 'A title');
    expect(text.startsWith('A title')).toBe(true);
    for (const heading of ['Causes of death', 'Species', 'Lifespan histogram', 'visits/day']) {
      expect(text).toContain(heading);
    }
    expect((text.match(/^absent/gm) ?? []).length).toBe(4);
    expect((text.match(/^twice/gm) ?? []).length).toBe(4);
  });
});
