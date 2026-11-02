import type { FoodType } from '../actions';
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

  /** What eating and drinking do (NEED-02, ICE-01…04, FOOD refusal default). */
  food: {
    /** Hunger points a serving of each food gives; Ice Cream gives none (ICE-01). */
    hungerGain: Record<FoodType, number>;
    thirstGain: number;
    /** A full pet refuses food and drink (Q-FOOD-3 default). */
    refuseWhenFull: boolean;
    /** Ice Cream: 70% chance of weight gain (ICE-03) and +1 happiness level (ICE-04). */
    iceCream: { weightChance: number; weightGainKg: number; happinessGain: number };
  };

  /** Pet and Educate: amounts and caps in levels (HAP-01, HAP-04, EDU-02, EDU-03). */
  care: {
    petHappinessGain: number;
    /** Pet and Ice Cream never top happiness up: one below the maximum (HAP-01/04). */
    happinessCapWithoutPlay: number;
    petEducationGain: number;
    /** Pet never raises education past C+ (EDU-03). */
    petEducationCap: number;
    educateGain: number;
  };

  species: {
    /** A food group with more than this share of the meals wins outright (SPEC-02). */
    majorityShare: number;
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

  food: {
    // Half meals +1 (Apple, Hamburger), full meals +2 (Carrot, Chicken Thigh, Noodles); legacy values.
    hungerGain: { hamburger: 1, apple: 1, carrot: 2, chicken: 2, noodles: 2, iceCream: 0 },
    thirstGain: 1,
    refuseWhenFull: true,
    iceCream: { weightChance: 0.7, weightGainKg: 1, happinessGain: 1 }, // weight scale: Q-WEIGHT-1
  },

  care: {
    petHappinessGain: 1,
    happinessCapWithoutPlay: 3, // Happy
    petEducationGain: 1,
    petEducationCap: 2, // C+
    educateGain: 1,
  },

  species: { majorityShare: 0.5 },

  growth: {
    arrivalWakeUps: { bigBlob: 2, tail: 5, legs: 8, teen: 11, adult: 15 }, // LIFE table
    finalFormWakeUps: { min: 16, max: 20 }, // LIFE-04
  },
};
