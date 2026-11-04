import type { FoodType } from '../actions';
import type { CareKind, CareStage, Species } from '../state';

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
  /** Meter values right after hatching (round 16): empty hunger, thirst and education, Normal mood. */
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
    /**
     * When each stage goes to bed, in minutes since midnight (SLEEP-05/06). The player's "latest
     * bedtime" setting caps every one of them, so a player who cannot stay up can have the pet go
     * to bed earlier.
     */
    bedtimeMinutes: Record<CareStage, number>;
  };

  /** What eating and drinking do (NEED-02, ICE-01…04, FOOD refusal default). */
  food: {
    /** Hunger points a serving of each food gives; Ice Cream gives none (ICE-01). */
    hungerGain: Record<FoodType, number>;
    thirstGain: number;
    /** A full pet refuses food and drink (Q-FOOD-3 default). */
    refuseWhenFull: boolean;
    /** Ice Cream raises happiness one level (ICE-04); its weight effect is in `weight`. */
    iceCream: { happinessGain: number };
    /**
     * What each species accepts once it is known (round 16: a pet refuses food that does not suit
     * its species, even when hungry). Before the species is decided anything is accepted.
     * Ice Cream is a treat for everyone. Triceratops, "pasta / everything", is assumed to accept all.
     */
    speciesFoods: Record<Species, readonly FoodType[]>;
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
    /**
     * What a pet needs to be taken to SuperHappy by a won game (HAP-05): hunger and thirst above
     * three of the four icons (7 of 8 half-steps), education at B+ or better, and no sickness,
     * dirt or temperature trouble.
     */
    superHappy: { minHunger: number; minThirst: number; minEducation: number };
  };

  health: {
    /** Chance of waking up SICK, by whether the light was left on while asleep (SLEEP-03). */
    wakeSickChance: { lightOff: number; lightOn: number };
    /** The dirty checks: sickness chance on the first check, then plus `step` per check (DIRT-09, COND-06). */
    escalation: { start: number; step: number };
    /** The death checks after a condition's onset: 10% on the first check, then plus 10% each (DEATH-08). */
    deathEscalation: { start: number; step: number };
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
    /** Bath is also allowed this many minutes before bedtime and after waking up (DIRT-06, round 16). */
    bathWindowMinutes: number;
  };

  play: {
    /** Chance of losing a happiness level on each lost game from the second one in a row (PLAY-06). */
    lossStreakFrom: number;
    lossHappinessDropChance: number;
    /** Over-play: games past this many (drawn in this range), played at top happiness, may cost education (EDU-04/05). */
    overplayThreshold: Range;
    overplayEducationDropChance: number;
  };

  /** All provisional, to be replaced with real numbers from the toy (Q-WEIGHT-1, round 16). */
  weight: {
    /** The healthy range for each stage, in kg. */
    healthyKg: Record<CareStage, { low: number; high: number }>;
    /** Heavier than this is too heavy, by stage (WEIGHT-01). */
    heavyAboveKg: Record<CareStage, number>;
    /** Chance per awake check that a too heavy pet falls sick: higher before adulthood. */
    sickChancePerCheck: { preAdult: number; adult: number };
    /**
     * Foods that add weight: caloric ones with a chance, the hyper-caloric Ice Cream always;
     * non-caloric ones only when the pet is below its healthy range (round 16).
     */
    foodKind: Record<FoodType, 'caloric' | 'mediumCaloric' | 'hyperCaloric' | 'nonCaloric'>;
    caloricGainChance: number;
    /** Noodles: "sometimes" adds weight (round 18). */
    mediumGainChance: number;
    gainKg: number;
    /** Weight is burned by winning a game (with a chance) and, steadily, by being above the healthy range. */
    winBurnChance: number;
    burnKg: number;
    /** Chance per awake check of burning one kg, for each kg above the healthy range. */
    burnChancePerExcessKg: number;
    minKg: number;
  };

  /**
   * Meter values at which the pet is in a condition (COND-03). Round 15: hungry, thirsty and sad
   * only when the meter is completely empty; what they cause starts at the next check.
   */
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

  /** The hidden care score and what it does (CARE-03…08, round 18). */
  careScore: {
    /** Each care mistake: its cost, and the checks it may last before it counts (awake checks; asleep for the light). */
    mistakes: Record<CareKind, { points: number; graceChecks: number }>;
    /**
     * The pet becomes an Angel with at most this many points, a Demon otherwise (CARE-04). The limit is
     * `angelAtOrBelow` until the pet has lived long enough for `angelPointsPerDay` to be more: a longer
     * life is allowed more points (round 18).
     */
    angelAtOrBelow: number;
    angelPointsPerDay: number;
    /** Time spent SuperHappy earns points back: one episode of `minChecks` awake checks gives `points`, up to `maxPoints` in a life. */
    superHappy: { minChecks: number; points: number; maxPoints: number };
    /**
     * What good care buys. `quality` is 1 with no points and falls to 0 at the Angel limit (which grows with wake-ups).
     * Sickness at wake-up and on entering the room's cold or heat, and the instant death on entering it,
     * are up to `maxRiskReduction` less likely. When the pet reaches its drawn final-form wake-up
     * it lives on by `quality` of the way up to `maxWakeUps` first.
     */
    longevity: { maxRiskReduction: number; maxWakeUps: number };
  };

  growth: {
    /** Wake-up count at which the pet arrives in each stage (LIFE table). */
    arrivalWakeUps: { bigBlob: number; tail: number; legs: number; teen: number; adult: number };
    /** The final form appears at a random wake-up in this range, inclusive (LIFE-04). */
    finalFormWakeUps: { min: number; max: number };
  };
}

export const DEFAULT_TUNING: Tuning = {
  initial: { hunger: 0, thirst: 0, happiness: 2, education: 0, weightKg: 5 }, // round 16; weight Q-WEIGHT-1

  needs: {
    // Tuned with the simulator so that two visits a day are enough (PACE-01): see tools/sim.
    checksPerPoint: { hunger: 6, thirst: 6, happiness: 16 }, // a full meter empties in about 12 awake hours (PACE-01, doc 15)
    sleepAttenuation: 6, // SLEEP-11: 4 to 8, default 6
  },

  sleep: {
    // The toy has three tiers: blobs 19:00, legs 20:00, adult 22:00. Tail and teenager sit between
    // them (an experiment, round 16). The player's latest-bedtime setting caps all of them.
    bedtimeMinutes: {
      smallBlob: 19 * 60,
      bigBlob: 19 * 60,
      tail: 19 * 60 + 30,
      legs: 20 * 60,
      teen: 21 * 60,
      adult: 22 * 60,
    },
  },

  food: {
    // Half meals +1 (Apple, Hamburger), full meals +2 (Carrot, Chicken Thigh, Noodles); legacy values.
    hungerGain: { hamburger: 1, apple: 1, carrot: 2, chicken: 2, noodles: 2, iceCream: 0 },
    thirstGain: 1,
    refuseWhenFull: true,
    iceCream: { happinessGain: 1 },
    speciesFoods: {
      trex: ['hamburger', 'chicken', 'iceCream'],
      bronto: ['apple', 'carrot', 'iceCream'],
      triceratops: ['hamburger', 'chicken', 'apple', 'carrot', 'iceCream', 'noodles'],
    },
  },

  care: {
    petHappinessGain: 1,
    happinessCapWithoutPlay: 3, // Happy
    petEducationGain: 1,
    petEducationCap: 2, // C+
    educateGain: 1,
    superHappy: { minHunger: 7, minThirst: 7, minEducation: 3 }, // > 3 bowls, > 3 glasses, B+
  },

  play: {
    lossStreakFrom: 2, // PLAY-06
    lossHappinessDropChance: 0.5, // PLAY-06
    overplayThreshold: { min: 3, max: 5 }, // EDU-04
    overplayEducationDropChance: 0.5, // EDU-05
  },

  weight: {
    // Placeholders until the real toy is checked: the pet starts at 5 kg and every stage has a healthy range.
    healthyKg: {
      smallBlob: { low: 4, high: 6 },
      bigBlob: { low: 7, high: 10 },
      tail: { low: 10, high: 13 },
      legs: { low: 14, high: 17 },
      teen: { low: 19, high: 24 },
      adult: { low: 26, high: 32 },
    },
    heavyAboveKg: { smallBlob: 8, bigBlob: 12, tail: 16, legs: 20, teen: 28, adult: 36 },
    sickChancePerCheck: { preAdult: 0.03, adult: 0.01 },
    foodKind: {
      apple: 'caloric',
      hamburger: 'caloric',
      noodles: 'mediumCaloric',
      iceCream: 'hyperCaloric',
      carrot: 'nonCaloric',
      chicken: 'nonCaloric',
    },
    caloricGainChance: 0.75, // "something like ~75%"
    mediumGainChance: 0.4, // noodles: the middle term, sometimes (round 18)
    gainKg: 0.25, // a quarter of a kg per gaining meal: a thorough visit gives several meals
    winBurnChance: 0.5, // a won game burns weight half the time
    burnKg: 0.25,
    burnChancePerExcessKg: 0.04, // steady and low maintenance: more when more overweight
    minKg: 1,
  },

  conditions: { hungryAtOrBelow: 0, thirstyAtOrBelow: 0, sadAtOrBelow: 0 },

  temperature: {
    start: 25,
    min: 16,
    max: 40,
    band: { low: 24, high: 26 }, // TEMP-01
    coldAtOrBelow: 23, // TEMP-07
    hotAtOrAbove: 27, // TEMP-08
    moveChance: 0.06, // about one degree per 4 hours awake: the AC wants a look every ~4 hours (TEMP-09, tuned in doc 15)
    bump: { min: 2, max: 3 }, // 19 -> 21 or 22 (TEMP-13)
    comfortOnSleep: 25,
    // Entering suffering: a gentle start (3% a check at the threshold, +3% per further degree), 10% sickness
    // on entry and a 0.2% chance of instant death. Tuned with the simulator so that an unattended pet
    // usually survives its first day while a visitor every 4 hours is safe (doc 15).
    entry: {
      baseChance: 0.03,
      perDegree: 0.03,
      sickChance: 0.1,
      deathChance: 0.002,
      happinessDrop: 1,
    },
    happinessDropEveryChecks: 4,
  },

  health: {
    wakeSickChance: { lightOff: 0.02, lightOn: 0.6 }, // SLEEP-03 (accepted defaults)
    escalation: { start: 0.2, step: 0.1 }, // DIRT-09: the dirty checks
    deathEscalation: { start: 0.1, step: 0.1 }, // DEATH-08, round 16: the death checks start at 10%
    dirt: {
      thresholdChecks: { min: 80, max: 96 }, // 20 to 24 h (DIRT-02, decided in round 15)
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

  careScore: {
    mistakes: {
      sick: { points: 3, graceChecks: 4 }, // 1 hour
      tooCold: { points: 2, graceChecks: 4 },
      tooHot: { points: 2, graceChecks: 4 },
      dirty: { points: 2, graceChecks: 8 }, // 2 hours
      lightOn: { points: 2, graceChecks: 1 }, // 15 minutes of the night
      hungry: { points: 1, graceChecks: 4 },
      thirsty: { points: 1, graceChecks: 4 },
      sad: { points: 1, graceChecks: 8 },
    },
    angelAtOrBelow: 32, // about 1.7 points a day for a 19-day life (docs/16)
    angelPointsPerDay: 1.7, // 51 points at day 30
    superHappy: { minChecks: 4, points: 1, maxPoints: 8 }, // one hour per point (round 18)
    longevity: { maxRiskReduction: 0.1, maxWakeUps: 30 }, // 10% and up to 30 days (round 18)
  },

  growth: {
    arrivalWakeUps: { bigBlob: 2, tail: 5, legs: 8, teen: 11, adult: 15 }, // LIFE table
    finalFormWakeUps: { min: 16, max: 20 }, // LIFE-04
  },
};
