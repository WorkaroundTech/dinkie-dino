import type { CareStage } from '../state';

/**
 * Every tunable number of the simulation, with the rule it implements. Values marked
 * "provisional" are placeholders that the simulator and play-testing will tune (M3).
 */
export interface Tuning {
  /** Meter values right after hatching (Q-START-1 default: half full, Normal mood). */
  initial: {
    hunger: number;
    thirst: number;
    happiness: number;
    education: number;
    weightKg: number;
  };

  needs: {
    /** Awake checks it takes a meter to lose one point (PACE-01). Provisional. */
    checksPerPoint: { hunger: number; thirst: number; happiness: number };
    /** While asleep needs decay this many times slower; use a whole number from 4 to 8 (SLEEP-11). */
    sleepAttenuation: number;
  };

  sleep: {
    /** Minutes added to the adult bedtime for each stage; younger pets sleep earlier (SLEEP-05/06). */
    bedtimeOffsetMinutes: Record<CareStage, number>;
  };

  growth: {
    /** Wake-up count at which the pet arrives in each stage (LIFE table). */
    arrivalWakeUps: { bigBlob: number; tail: number; legs: number; teen: number; adult: number };
    /** The final form appears at a random wake-up in this range, inclusive (LIFE-04). */
    finalFormWakeUps: { min: number; max: number };
  };
}

export const DEFAULT_TUNING: Tuning = {
  initial: { hunger: 4, thirst: 4, happiness: 2, education: 0, weightKg: 5 }, // Q-START-1, Q-WEIGHT-1

  needs: {
    checksPerPoint: { hunger: 6, thirst: 4, happiness: 12 }, // provisional (PACE-01)
    sleepAttenuation: 6, // SLEEP-11: 4 to 8, default 6
  },

  sleep: {
    // SLEEP-06 against the default adult bedtime of 22:00: blobs 19:00, tail 20:00, legs 20:30,
    // teen 21:30, adult 22:00. Only the blobs and the adult come from the real toy.
    bedtimeOffsetMinutes: {
      smallBlob: -180,
      bigBlob: -180,
      tail: -120,
      legs: -90,
      teen: -30,
      adult: 0,
    },
  },

  growth: {
    arrivalWakeUps: { bigBlob: 2, tail: 5, legs: 8, teen: 11, adult: 15 }, // LIFE table
    finalFormWakeUps: { min: 16, max: 20 }, // LIFE-04
  },
};
