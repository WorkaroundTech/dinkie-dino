import type { Context } from '../context';
import type { Tuning } from '../config/tuning';
import type { FinalForm, PetState } from '../state';
import { CARE_KINDS, SUPER_HAPPY } from '../state';
import type { CareKind } from '../state';
import { conditionsOf } from './conditions';

/**
 * The hidden care score (CARE-03…08, docs/16 and 17). A care mistake is one episode of a bad
 * condition that outlasts its grace; it costs points. Time spent SuperHappy earns a few back.
 * The same score decides Angel or Demon, and what good care buys: a little less risk, and a longer life.
 */

/** Looks at the pet at the end of a check and records any mistake that has just become one. */
export function trackCare(pet: PetState, ctx: Context): void {
  const { mistakes, superHappy } = ctx.tuning.careScore;
  const { care } = pet;
  const shown = new Set<CareKind>(pet.asleep ? [] : conditionsOf(pet, ctx));

  for (const kind of CARE_KINDS) {
    // Asleep only the light matters; the other episodes are paused, not reset.
    if (pet.asleep && kind !== 'lightOn') continue;
    const present = kind === 'lightOn' ? pet.asleep && pet.lightOn : shown.has(kind);
    if (!present) {
      care.runs[kind] = 0;
      continue;
    }
    care.runs[kind] += 1;
    if (care.runs[kind] === mistakes[kind].graceChecks + 1) care.counts[kind] += 1;
  }

  if (pet.asleep) return;
  if (pet.needs.happiness === SUPER_HAPPY) {
    care.superRun += 1;
    if (care.superRun === superHappy.minChecks) {
      care.bonus = Math.min(superHappy.maxPoints, care.bonus + superHappy.points);
    }
  } else {
    care.superRun = 0;
  }
}

/** The points the mistakes have cost so far, before the SuperHappy bonus. */
export function mistakePoints(pet: Readonly<PetState>, tuning: Tuning): number {
  return CARE_KINDS.reduce(
    (sum, kind) => sum + pet.care.counts[kind] * tuning.careScore.mistakes[kind].points,
    0,
  );
}

/** The score: mistake points less the SuperHappy bonus, never below 0. Lower is better. */
export function carePoints(pet: Readonly<PetState>, tuning: Tuning): number {
  return Math.max(0, mistakePoints(pet, tuning) - pet.care.bonus);
}

/**
 * The most points an Angel can have right now: 32 for a young pet, and 1.7 for every wake-up once
 * that comes to more (51 at wake-up 30), so a long life is not judged harder than a short one (CARE-04).
 */
export function angelLimit(pet: Readonly<PetState>, tuning: Tuning): number {
  const { angelAtOrBelow, angelPointsPerDay } = tuning.careScore;
  return Math.max(angelAtOrBelow, Math.round(angelPointsPerDay * pet.wakeUps));
}

/** Angel or Demon, by the score (CARE-04). */
export function careVerdict(pet: Readonly<PetState>, tuning: Tuning): FinalForm {
  return carePoints(pet, tuning) <= angelLimit(pet, tuning) ? 'angel' : 'demon';
}

/** 1 for a pet with no points, falling in a straight line to 0 at its Angel limit (CARE-06). */
export function careQuality(pet: Readonly<PetState>, tuning: Tuning): number {
  const limit = angelLimit(pet, tuning);
  return Math.min(1, Math.max(0, (limit - carePoints(pet, tuning)) / limit));
}

/** Multiplies the chances of sickness and of dying at once: 1, or down to 0.9 for the best care (CARE-06). */
export function riskFactor(pet: Readonly<PetState>, tuning: Tuning): number {
  return 1 - tuning.careScore.longevity.maxRiskReduction * careQuality(pet, tuning);
}

/**
 * Extra wake-ups a pet lives on when it reaches its drawn final-form wake-up: its quality of the
 * way up to the longest life (CARE-07). Zero for a pet whose care has been poor.
 */
export function lifeExtension(pet: Readonly<PetState>, tuning: Tuning): number {
  const room = Math.max(0, tuning.careScore.longevity.maxWakeUps - pet.finalFormAtWakeUp);
  return Math.round(careQuality(pet, tuning) * room);
}
