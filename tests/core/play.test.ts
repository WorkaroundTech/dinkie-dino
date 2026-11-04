import { describe, expect, it } from 'vitest';
import type { Context, GameEvent, PetState, RoundOutcome, Shape } from '../../src/core';
import { act, advance, canDo, createPet, validateSettings } from '../../src/core';
import { randInt } from '../../src/core/rng';
import { becomeSick } from '../../src/core/rules/health';
import { gameResult, roundOutcome } from '../../src/core/rules/play';
import { at, calmContext } from './helpers';

const NOW = at(0, 12);

/** A calm context playing three rounds a game, which the cases below are written around. */
function threeRounds(...args: Parameters<typeof calmContext>): Context {
  const ctx = calmContext(...args);
  return { ...ctx, settings: { ...ctx.settings, jokenpoRounds: 3 } };
}

function hatch(ctx: Context, seed = 1, nowMs = NOW): PetState {
  return createPet({ id: `p${seed}`, seed, nowMs }, ctx);
}

/** The pet's next hand, worked out the way the engine draws it (white-box, for forcing results). */
function nextPetShape(pet: PetState): Shape {
  const index = pet.game ? pet.game.index : pet.play.gamesStarted;
  const round = pet.game ? pet.game.rounds.length : 0;
  const pick = randInt(pet.seed, index * 8 + round, 'jokenpoPet', 0, 2);
  return pick === 0 ? 'rock' : pick === 1 ? 'paper' : 'scissors';
}

/** The player's shape that gives the wanted outcome against the pet's. */
function shapeFor(pet: Shape, outcome: RoundOutcome): Shape {
  if (outcome === 'tie') return pet;
  const beaten: Record<Shape, Shape> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
  const beats: Record<Shape, Shape> = { rock: 'paper', paper: 'scissors', scissors: 'rock' };
  return outcome === 'petWon' ? beaten[pet] : beats[pet];
}

/** Plays a whole game, forcing the given outcome for every round. */
function playGame(
  pet: PetState,
  rounds: RoundOutcome[],
  ctx: Context,
): { state: PetState; events: GameEvent[] } {
  let state = pet;
  const events: GameEvent[] = [];
  for (const wanted of rounds) {
    const result = act(
      state,
      { kind: 'play', shape: shapeFor(nextPetShape(state), wanted) },
      NOW,
      ctx,
    );
    expect(result.refused).toBeNull();
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

const WON: RoundOutcome[] = ['petWon', 'petWon', 'petWon'];
const LOST: RoundOutcome[] = ['petLost', 'petLost', 'petLost'];
const TIED: RoundOutcome[] = ['petWon', 'petLost', 'tie']; // one each: a tied game

describe('rock, paper, scissors (PLAY-02)', () => {
  it('follows the usual rules', () => {
    const table: [Shape, Shape, RoundOutcome][] = [
      ['rock', 'rock', 'tie'],
      ['rock', 'paper', 'petWon'],
      ['rock', 'scissors', 'petLost'],
      ['paper', 'rock', 'petLost'],
      ['paper', 'paper', 'tie'],
      ['paper', 'scissors', 'petWon'],
      ['scissors', 'rock', 'petWon'],
      ['scissors', 'paper', 'petLost'],
      ['scissors', 'scissors', 'tie'],
    ];
    // roundOutcome(player, pet)
    for (const [player, pet, outcome] of table)
      expect(roundOutcome(player, pet), `${player} v ${pet}`).toBe(outcome);
  });

  it('decides the game by the majority of the rounds (PLAY-01)', () => {
    // r(player, pet)
    const r = (player: Shape, pet: Shape) => ({ player, pet });
    expect(gameResult([r('rock', 'paper'), r('rock', 'paper'), r('rock', 'rock')]).result).toBe(
      'petWon',
    );
    expect(
      gameResult([r('rock', 'scissors'), r('rock', 'scissors'), r('rock', 'paper')]).result,
    ).toBe('petLost');
    // Ties use up a round: one win each leaves a tied game.
    expect(gameResult([r('rock', 'paper'), r('rock', 'scissors'), r('rock', 'rock')])).toEqual({
      result: 'tie',
      petWins: 1,
      playerWins: 1,
    });
    expect(gameResult([r('rock', 'rock'), r('paper', 'paper'), r('rock', 'rock')]).result).toBe(
      'tie',
    );
  });
});

describe('a game (PLAY-01, PLAY-07)', () => {
  const ctx = threeRounds();

  it('lasts the configured number of rounds, then ends with one result', () => {
    for (const rounds of [3, 4, 5]) {
      const c = { ...ctx, settings: { ...ctx.settings, jokenpoRounds: rounds } };
      let pet = hatch(c);
      const events: GameEvent[] = [];
      for (let i = 1; i <= rounds; i++) {
        expect(pet.game?.rounds.length ?? 0, `before round ${i}`).toBe(i - 1);
        const step = act(pet, { kind: 'play', shape: 'rock' }, NOW, c);
        pet = step.state;
        events.push(...step.events);
      }
      expect(pet.game).toBeNull();
      expect(events.filter((e) => e.type === 'jokenpoRound')).toHaveLength(rounds);
      expect(events.filter((e) => e.type === 'jokenpoGame')).toHaveLength(1);
    }
  });

  it('keeps the number of rounds it started with, even if the setting changes', () => {
    let pet = act(hatch(ctx), { kind: 'play', shape: 'rock' }, NOW, ctx).state;
    expect(pet.game?.total).toBe(3);
    const five = { ...ctx, settings: { ...ctx.settings, jokenpoRounds: 5 } };
    pet = act(pet, { kind: 'play', shape: 'rock' }, NOW, five).state;
    pet = act(pet, { kind: 'play', shape: 'rock' }, NOW, five).state;
    expect(pet.game).toBeNull();
  });

  it('draws the pet hand at random, whatever the player chooses or how the games go', () => {
    const handsFor = (shape: Shape) => {
      let pet = hatch(ctx, 5);
      pet.needs.happiness = 2;
      const hands: Shape[] = [];
      for (let i = 0; i < 60; i++) {
        const step = act(pet, { kind: 'play', shape }, NOW, ctx);
        pet = step.state;
        for (const e of step.events) if (e.type === 'jokenpoRound') hands.push(e.pet);
      }
      return hands;
    };
    // Losing streaks, over-play and so on use other random draws, but the pet's hands stay the same.
    expect(handsFor('rock')).toEqual(handsFor('paper'));
    expect(handsFor('rock')).toEqual(handsFor('scissors'));
  });

  it('is fair: each hand about a third of the time', () => {
    const counts: Record<Shape, number> = { rock: 0, paper: 0, scissors: 0 };
    const n = 6000;
    for (let seed = 1; seed <= n; seed++) {
      const step = act(hatch(ctx, seed), { kind: 'play', shape: 'rock' }, NOW, ctx);
      const round = step.events.find((e) => e.type === 'jokenpoRound');
      if (round?.type === 'jokenpoRound') counts[round.pet]++;
    }
    for (const shape of ['rock', 'paper', 'scissors'] as const) {
      expect(Math.abs(counts[shape] / n - 1 / 3), shape).toBeLessThan(0.03);
    }
  });

  it('reports the result and the wins on each side', () => {
    const { events } = playGame(hatch(ctx), ['petWon', 'petWon', 'petLost'], ctx);
    expect(events.find((e) => e.type === 'jokenpoGame')).toMatchObject({
      type: 'jokenpoGame',
      result: 'petWon',
      petWins: 2,
      playerWins: 1,
    });
  });
});

describe('what a game does (PLAY-04…06, HAP-02)', () => {
  const ctx = threeRounds();
  const withHappiness = (level: number, seed = 1): PetState => {
    const pet = hatch(ctx, seed);
    pet.needs.happiness = level;
    return pet;
  };

  it('a win makes the pet happier, all the way to the top, which only play can reach', () => {
    expect(playGame(withHappiness(1), WON, ctx).state.needs.happiness).toBe(2);
    expect(playGame(withHappiness(3), WON, ctx).state.needs.happiness).toBe(4);
    expect(playGame(withHappiness(4), WON, ctx).state.needs.happiness).toBe(4);
  });

  it('a win burns weight half the time, but never below the healthy range (round 15)', () => {
    const gain = ctx.tuning.weight.gainKg;
    let lighter = 0;
    const n = 2000;
    for (let seed = 1; seed <= n; seed++) {
      const pet = withHappiness(2, seed);
      pet.needs.weightKg = 7; // above the healthy range of a small blob (4 to 6)
      const after = playGame(pet, WON, ctx).state;
      if (after.needs.weightKg < 7) {
        lighter++;
        expect(after.needs.weightKg).toBeCloseTo(7 - gain);
      }
    }
    expect(Math.abs(lighter / n - 0.5)).toBeLessThan(0.04);

    const atFloor = withHappiness(2);
    atFloor.needs.weightKg = 4; // the bottom of the healthy range
    expect(playGame(atFloor, WON, ctx).state.needs.weightKg).toBe(4);
  });

  it('a loss leaves happiness alone, the first time (PLAY-05)', () => {
    const after = playGame(withHappiness(2), LOST, ctx).state;
    expect(after.needs.happiness).toBe(2);
    expect(after.play.lossStreak).toBe(1);
  });

  it('from the second loss in a row happiness may drop (PLAY-06)', () => {
    const sure = threeRounds(undefined, (t) => {
      t.play.lossHappinessDropChance = 1;
    });
    const first = playGame(withHappiness(2), LOST, sure).state;
    expect(first.needs.happiness).toBe(2);
    const second = playGame(first, LOST, sure).state;
    expect(second.needs.happiness).toBe(1);
    expect(playGame(second, LOST, sure).state.needs.happiness).toBe(0);
  });

  it('drops happiness half the time by default', () => {
    let dropped = 0;
    const n = 1500;
    for (let seed = 1; seed <= n; seed++) {
      const first = playGame(withHappiness(2, seed), LOST, ctx).state;
      if (playGame(first, LOST, ctx).state.needs.happiness < 2) dropped++;
    }
    expect(Math.abs(dropped / n - 0.5)).toBeLessThan(0.04);
  });

  it('a win breaks the streak', () => {
    const sure = threeRounds(undefined, (t) => {
      t.play.lossHappinessDropChance = 1;
    });
    let pet = playGame(withHappiness(2), LOST, sure).state;
    pet = playGame(pet, WON, sure).state; // happiness 3
    pet = playGame(pet, LOST, sure).state; // a first loss again
    expect(pet.needs.happiness).toBe(3);
    expect(pet.play.lossStreak).toBe(1);
  });

  it('a tied game changes nothing, and neither adds to nor breaks a streak', () => {
    const sure = threeRounds(undefined, (t) => {
      t.play.lossHappinessDropChance = 1;
    });
    let pet = playGame(withHappiness(2), LOST, sure).state;
    pet = playGame(pet, TIED, sure).state;
    expect(pet.needs.happiness).toBe(2);
    expect(pet.play.lossStreak).toBe(1);
    pet = playGame(pet, LOST, sure).state; // the second loss in a row, the tie in between ignored
    expect(pet.needs.happiness).toBe(1);
  });
});

describe('playing too much (EDU-04, EDU-05)', () => {
  const sure = threeRounds(undefined, (t) => {
    t.play.overplayThreshold = { min: 3, max: 3 };
    t.play.overplayEducationDropChance = 1;
  });
  const topHappy = (): PetState => {
    const pet = hatch(sure);
    pet.needs.happiness = 4;
    pet.needs.education = 4;
    return pet;
  };

  it('costs education only after a few games at top happiness, and ties count', () => {
    let pet = topHappy();
    const education: number[] = [];
    for (let i = 0; i < 6; i++) {
      pet = playGame(pet, TIED, sure).state; // neutral: happiness stays at the top
      education.push(pet.needs.education);
    }
    expect(pet.needs.happiness).toBe(4);
    expect(education).toEqual([4, 4, 4, 3, 2, 1]); // the 4th game onward, with the threshold at 3
  });

  it('does not count games played below the top', () => {
    let pet = topHappy();
    pet.needs.happiness = 3;
    for (let i = 0; i < 6; i++) pet = playGame(pet, TIED, sure).state;
    expect(pet.needs.education).toBe(4);
    expect(pet.play.overplayCount).toBe(0);
  });

  it('restarts when happiness leaves the top', () => {
    let pet = topHappy();
    for (let i = 0; i < 3; i++) pet = playGame(pet, TIED, sure).state;
    expect(pet.play.overplayCount).toBe(3);

    pet.needs.happiness = 3; // for any reason
    pet = act(pet, { kind: 'check' }, NOW, sure).state;
    expect(pet.play).toMatchObject({ overplayCount: 0, overplayThreshold: null });
  });

  it('restarts at the morning wake-up', () => {
    let pet = topHappy();
    for (let i = 0; i < 2; i++) pet = playGame(pet, TIED, sure).state;
    expect(pet.play.overplayCount).toBe(2);

    pet.needs.happiness = 4;
    const morning = advance(pet, at(1, 7), sure).state;
    expect(morning.play.overplayCount).toBe(0);
  });

  it('draws the threshold between 3 and 5 when counting starts', () => {
    const wide = threeRounds();
    const seen = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const pet = hatch(wide, seed);
      pet.needs.happiness = 4;
      const t = playGame(pet, TIED, wide).state.play.overplayThreshold;
      if (t !== null) seen.add(t);
    }
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });
});

describe('who can play', () => {
  const ctx = threeRounds();
  const play: { kind: 'play'; shape: Shape } = { kind: 'play', shape: 'rock' };

  it('is refused while asleep or sick', () => {
    expect(canDo(hatch(ctx, 1, at(0, 23)), play, at(0, 23), ctx)).toBe('asleep');
    const sick: PetState = { ...hatch(ctx), sick: { sinceMs: NOW } };
    expect(canDo(sick, play, NOW, ctx)).toBe('sick');
  });

  it('can be left at any time without penalty (PLAY-10)', () => {
    const pet = hatch(ctx);
    pet.needs.happiness = 2;
    const midGame = act(pet, play, NOW, ctx).state;
    expect(midGame.game).not.toBeNull();

    const left = act(midGame, { kind: 'stopPlay' }, NOW, ctx).state;
    expect(left.game).toBeNull();
    expect(left.needs.happiness).toBe(2);
    expect(left.play.lossStreak).toBe(0);
  });

  it('ends when the pet goes to bed or falls sick', () => {
    const mid = act(hatch(ctx, 1, at(0, 18)), play, at(0, 18), ctx).state;
    expect(mid.game).not.toBeNull();
    expect(advance(mid, at(0, 19), ctx).state.game).toBeNull();

    const ill = structuredClone(mid);
    becomeSick(ill, at(0, 18), 'wake', []);
    expect(ill.game).toBeNull();
  });
});

describe('game settings (PLAY-01)', () => {
  it('allows 3 to 5 rounds', () => {
    const base = threeRounds().settings;
    for (const jokenpoRounds of [3, 4, 5])
      expect(validateSettings({ ...base, jokenpoRounds })).toEqual([]);
    for (const jokenpoRounds of [2, 6, 3.5])
      expect(validateSettings({ ...base, jokenpoRounds })).toHaveLength(1);
  });
});
