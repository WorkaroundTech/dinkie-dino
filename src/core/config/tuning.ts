import type { FoodType } from '../actions';
import type { CareStage } from '../state';

/**
 * Every tunable number of the simulation, with the rule it implements. Values marked
 * "provisional" are placeholders that the simulator and play-testing will tune (M3).
 */
/** An inclusive range of whole numbers. */
export interface Range {
  min: number;
  max: number;
}

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

  health: {
    /** Chance of waking up SICK, by whether the light was left on while asleep (SLEEP-03). */
    wakeSickChance: { lightOff: number; lightOn: number };
    /** The escalating-chance template (COND-06): the first check, then plus `step` per check. */
    escalation: { start: number; step: number };
    dirt: {
      /** Checks after a bath until the pet is dirty: 16 to 20 hours (DIRT-02). */
      thresholdChecks: Range;
      /** Checks spent dirty before the dirty checks begin: 2 to 3 hours (DIRT-09). */
      onsetChecks: Range;
      /** Happiness levels lost on every dirty check (DIRT-10, provisional). */
      happinessDropPerCheck: number;
    };
    /**
     * Awake-equivalent checks a condition must last before death checks start (DEATH-07). A night
     * counts at the attenuated rate (see `Danger`), so a real day is about 56 of them: 12 awake
     * hours (48 checks) plus 12 sleeping hours at 1/6 (8 checks).
     */
    deathOnsetChecks: Record<
      'sick' | 'hunger' | 'thirst' | 'lowHappiness' | 'tooHot' | 'tooCold' | 'tooHeavy',
      Range
    >;
    /** Bath is allowed this many minutes before bedtime (DIRT-06). */
    bathWindowMinutes: number;
  };

  play: {
    /** Chance of losing a happiness level on each lost game from the second one in a row (PLAY-06). */
    lossStreakFrom: number;
    lossHappinessDropChance: number;
    /** Over-play: games past this many (drawn in this range), played at top happiness, may cost education (EDU-04/05). */
    overplayThreshold: Range;
    overplayEducationDropChance: number;
    /** Weight lost by winning a game, and the lowest weight (Q-WEIGHT-1 default, provisional). */
    weightLossPerWinKg: number;
    minWeightKg: number;
  };

  weight: {
    /** Heavier than this is too heavy, by stage (WEIGHT-01, provisional until Q-WEIGHT-1). */
    heavyAboveKg: Record<CareStage, number>;
    /** Chance per awake check that a too heavy pet falls sick: higher before adulthood. */
    sickChancePerCheck: { preAdult: number; adult: number };
  };

  /** Meter values at which the pet shows a condition (COND-03, Q-COND-1 defaults). */
  conditions: { hungryAtOrBelow: number; thirstyAtOrBelow: number; sadAtOrBelow: number };

  temperature: {
    /** Room temperature after hatching, in the comfort band (Q-AC-1). */
    start: number;
    /** The room never gets colder than this (AC on) or hotter than that (AC off) (TEMP-06). */
    min: number;
    max: number;
    /** The comfort band: 24 to 26 degrees (TEMP-01). */
    band: { low: number; high: number };
    /** TOO_COLD can happen at or below this, TOO_HOT at or above that (TEMP-07/08). */
    coldAtOrBelow: number;
    hotAtOrAbove: number;
    /** Chance per awake check that the room moves one degree (TEMP-05, TEMP-09, provisional). */
    moveChance: number;
    /** The one-off bump toward comfort when the AC is switched the right way (TEMP-13). */
    bump: Range;
    /** Temperature the room is reset to while the pet sleeps and is not suffering (SLEEP-10). */
    comfortOnSleep: number;
    /** Entering TOO_COLD / TOO_HOT (TEMP-07, TEMP-17), all provisional (Q-AC-1, Q-AC-4). */
    entry: {
      /** Chance per awake check at the threshold temperature... */
      baseChance: number;
      /** ...plus this for every further degree away from comfort. */
      perDegree: number;
      /** On entry: chance of becoming SICK, of dying right away, and happiness levels lost. */
      sickChance: number;
      deathChance: number;
      happinessDrop: number;
    };
    /** While in a TOO state, happiness drops one level every this many awake checks. */
    happinessDropEveryChecks: number;
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

  play: {
    lossStreakFrom: 2, // PLAY-06
    lossHappinessDropChance: 0.5, // PLAY-06
    overplayThreshold: { min: 3, max: 5 }, // EDU-04
    overplayEducationDropChance: 0.5, // EDU-05
    weightLossPerWinKg: 1,
    minWeightKg: 1,
  },

  weight: {
    // Provisional: the start weight is 5 kg and Ice Cream adds 1 kg (Q-WEIGHT-1).
    heavyAboveKg: { smallBlob: 8, bigBlob: 12, tail: 16, legs: 20, teen: 28, adult: 36 },
    sickChancePerCheck: { preAdult: 0.03, adult: 0.01 },
  },

  conditions: { hungryAtOrBelow: 2, thirstyAtOrBelow: 2, sadAtOrBelow: 0 },

  temperature: {
    start: 25,
    min: 16,
    max: 40,
    band: { low: 24, high: 26 }, // TEMP-01
    coldAtOrBelow: 23, // TEMP-07
    hotAtOrAbove: 27, // TEMP-08
    moveChance: 0.25, // about one degree an hour awake: out of the band in 1 to 2 hours (TEMP-09)
    bump: { min: 2, max: 3 }, // 19 -> 21 or 22 (TEMP-13)
    comfortOnSleep: 25,
    entry: {
      baseChance: 0.1,
      perDegree: 0.05,
      sickChance: 0.25,
      deathChance: 0.01,
      happinessDrop: 1,
    },
    happinessDropEveryChecks: 4,
  },

  health: {
    wakeSickChance: { lightOff: 0.02, lightOn: 0.6 }, // SLEEP-03 (accepted defaults)
    escalation: { start: 0.2, step: 0.1 }, // DIRT-09, COND-06
    dirt: {
      thresholdChecks: { min: 64, max: 80 }, // 16 to 20 h, DIRT-02
      onsetChecks: { min: 8, max: 12 }, // 2 to 3 h, DIRT-09
      happinessDropPerCheck: 1, // DIRT-10 (per check is a reading, to confirm)
    },
    deathOnsetChecks: {
      sick: { min: 16, max: 24 }, // 4 to 6 h
      hunger: { min: 112, max: 144 }, // empty for 2 days+ (upper end provisional)
      thirst: { min: 56, max: 72 }, // empty for 1 day+ (upper end provisional)
      lowHappiness: { min: 56, max: 112 }, // lowest level for 1 to 2 days
      tooHot: { min: 24, max: 32 }, // 6 to 8 h
      tooCold: { min: 24, max: 32 }, // 6 to 8 h
      tooHeavy: { min: 56, max: 112 }, // 1 to 2 days (provisional)
    },
    bathWindowMinutes: 60, // DIRT-06
  },

  species: { majorityShare: 0.5 },

  growth: {
    arrivalWakeUps: { bigBlob: 2, tail: 5, legs: 8, teen: 11, adult: 15 }, // LIFE table
    finalFormWakeUps: { min: 16, max: 20 }, // LIFE-04
  },
};
