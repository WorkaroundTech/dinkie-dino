import type { Condition, Context, PetState } from '../../src/core';
import { conditionsOf } from '../../src/core';

/**
 * A shadow of the proposed care score (docs/16). The engine does not have one yet (CARE-02): this
 * measures how the proposal would score different kinds of players, to calibrate it.
 *
 * A "care mistake" is one episode of a condition that outlasts its grace period, counted once per
 * episode. Episodes are measured in awake checks: a condition that carries over the night keeps
 * its count (a hungry pet at bedtime is still hungry at wake-up).
 */
export type MistakeKind = Condition | 'lightOn';

/** Awake checks a condition may last before it is a mistake (23: the grace of an ignored call). */
export const GRACE_CHECKS: Record<MistakeKind, number> = {
  sick: 4, // 1 hour
  tooCold: 4,
  tooHot: 4,
  hungry: 4,
  thirsty: 4,
  sad: 8, // 2 hours
  dirty: 8, // 2 hours, like the grace before the dirty checks
  lightOn: 1, // the light left on past the first check after bedtime
};

/** Care points per mistake: the worse the neglect, the more it costs. */
export const MISTAKE_WEIGHT: Record<MistakeKind, number> = {
  sick: 3,
  tooCold: 2,
  tooHot: 2,
  dirty: 2,
  lightOn: 2,
  hungry: 1,
  thirsty: 1,
  sad: 1,
};

const KINDS = Object.keys(GRACE_CHECKS) as MistakeKind[];

export class CareTracker {
  private readonly run: Record<MistakeKind, number>;
  readonly mistakes: Record<MistakeKind, number>;

  constructor() {
    this.run = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<MistakeKind, number>;
    this.mistakes = { ...this.run };
  }

  /** Looks at the pet after a check and records any mistake that has just become one. */
  observe(pet: Readonly<PetState>, ctx: Context): void {
    const shown = new Set<MistakeKind>(pet.asleep ? [] : conditionsOf(pet, ctx));
    const lightLeftOn = pet.asleep && pet.lightOn;

    for (const kind of KINDS) {
      // While asleep only the light matters; other episodes are paused, not reset.
      if (pet.asleep && kind !== 'lightOn') continue;
      const present = kind === 'lightOn' ? lightLeftOn : shown.has(kind);
      if (!present) {
        this.run[kind] = 0;
        continue;
      }
      this.run[kind] += 1;
      if (this.run[kind] === GRACE_CHECKS[kind] + 1) this.mistakes[kind] += 1;
    }
  }

  get points(): number {
    return KINDS.reduce((sum, k) => sum + this.mistakes[k] * MISTAKE_WEIGHT[k], 0);
  }
}
