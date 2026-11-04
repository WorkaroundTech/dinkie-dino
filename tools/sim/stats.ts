import type { DeathCause, Species } from '../../src/core';
import type { LifeReport } from './life';

export interface Summary {
  lives: number;
  /** Shares of lives, 0 to 1. */
  reachedFinal: number;
  died: number;
  timedOut: number;
  deathCauses: Partial<Record<DeathCause, number>>;
  /** Hours lived: the 10th percentile, median and 90th percentile. */
  hoursLived: { p10: number; median: number; p90: number };
  /** Of the lives that reached their final form, how many wake-ups it took. */
  finalAtWakeUp: Record<number, number>;
  /** Mean share of awake checks with a given sign of trouble (0 to 1). */
  troubleShare: { any: number; need: number; byCondition: Record<string, number> };
  sessionsPerDay: number;
  actionsPerDay: Record<string, number>;
  species: Partial<Record<Species, number>>;
  /** The lifespan, in whole days, as a histogram of lives. */
  lifespanDays: Record<number, number>;
  /** Mean number of sicknesses per life, by cause. */
  sicknessPerLife: Record<string, number>;
  /** The proposed care score (docs/16): care points per life, and care mistakes per life by kind. */
  carePoints: { p10: number; median: number; p90: number };
  mistakesPerLife: Record<string, number>;
  /** Of the pets that reached the final form: the share with at most this many care points. */
  angelShareAtMost: Record<number, number>;
  /** Of the pets that reached the final form: the share that actually became an Angel. */
  angelShare: number;
}

/** The p-th percentile (0 to 1) by linear interpolation; 0 for an empty list. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const lowValue = sorted[low] ?? 0;
  const highValue = sorted[high] ?? lowValue;
  return lowValue + (highValue - lowValue) * (position - low);
}

const mean = (xs: readonly number[]) =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;

export function summarize(reports: readonly LifeReport[]): Summary {
  const lives = reports.length;
  const share = (n: number) => (lives === 0 ? 0 : n / lives);

  const deathCauses: Summary['deathCauses'] = {};
  const species: Summary['species'] = {};
  const finalAtWakeUp: Summary['finalAtWakeUp'] = {};
  const lifespanDays: Summary['lifespanDays'] = {};
  const actionTotals: Record<string, number> = {};
  const sickTotals: Record<string, number> = {};
  let totalDays = 0;
  let totalSessions = 0;

  for (const r of reports) {
    if (r.cause) deathCauses[r.cause] = (deathCauses[r.cause] ?? 0) + 1;
    if (r.species) species[r.species] = (species[r.species] ?? 0) + 1;
    if (r.outcome === 'final') finalAtWakeUp[r.wakeUps] = (finalAtWakeUp[r.wakeUps] ?? 0) + 1;
    const day = Math.floor(r.hoursLived / 24);
    lifespanDays[day] = (lifespanDays[day] ?? 0) + 1;
    totalDays += r.hoursLived / 24;
    totalSessions += r.sessions;
    for (const [kind, n] of Object.entries(r.actions))
      actionTotals[kind] = (actionTotals[kind] ?? 0) + n;
    for (const [cause, n] of Object.entries(r.sickBy))
      sickTotals[cause] = (sickTotals[cause] ?? 0) + n;
  }

  const hours = reports.map((r) => r.hoursLived);
  const awake = (r: LifeReport) => Math.max(1, r.awakeChecks);
  const byCondition: Record<string, number> = {};
  for (const name of ['sick', 'tooCold', 'tooHot', 'hungry', 'thirsty', 'dirty', 'sad'] as const) {
    byCondition[name] = mean(reports.map((r) => r.conditionChecks[name] / awake(r)));
  }

  const actionsPerDay: Record<string, number> = {};
  for (const [kind, n] of Object.entries(actionTotals))
    actionsPerDay[kind] = totalDays === 0 ? 0 : n / totalDays;

  return {
    lives,
    reachedFinal: share(reports.filter((r) => r.outcome === 'final').length),
    died: share(reports.filter((r) => r.outcome === 'dead').length),
    timedOut: share(reports.filter((r) => r.outcome === 'timeout').length),
    deathCauses,
    hoursLived: {
      p10: percentile(hours, 0.1),
      median: percentile(hours, 0.5),
      p90: percentile(hours, 0.9),
    },
    finalAtWakeUp,
    troubleShare: {
      any: mean(reports.map((r) => r.conditionChecks.any / awake(r))),
      need: mean(reports.map((r) => r.conditionChecks.need / awake(r))),
      byCondition,
    },
    sessionsPerDay: totalDays === 0 ? 0 : totalSessions / totalDays,
    actionsPerDay,
    species,
    lifespanDays,
    carePoints: {
      p10: percentile(
        reports.map((r) => r.carePoints),
        0.1,
      ),
      median: percentile(
        reports.map((r) => r.carePoints),
        0.5,
      ),
      p90: percentile(
        reports.map((r) => r.carePoints),
        0.9,
      ),
    },
    angelShare: (() => {
      const finals = reports.filter((r) => r.outcome === 'final');
      return finals.length === 0
        ? 0
        : finals.filter((r) => r.finalForm === 'angel').length / finals.length;
    })(),
    angelShareAtMost: Object.fromEntries(
      [8, 16, 24, 32, 48].map((limit) => {
        const finals = reports.filter((r) => r.outcome === 'final');
        return [
          limit,
          finals.length === 0
            ? 0
            : finals.filter((r) => r.carePoints <= limit).length / finals.length,
        ];
      }),
    ),
    mistakesPerLife: Object.fromEntries(
      ['sick', 'tooCold', 'tooHot', 'dirty', 'lightOn', 'hungry', 'thirsty', 'sad'].map((kind) => [
        kind,
        mean(reports.map((r) => r.careMistakes[kind as keyof LifeReport['careMistakes']] ?? 0)),
      ]),
    ),
    sicknessPerLife: Object.fromEntries(
      Object.entries(sickTotals).map(([cause, n]) => [cause, lives === 0 ? 0 : n / lives]),
    ),
  };
}
