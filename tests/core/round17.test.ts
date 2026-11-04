import { describe, expect, it } from 'vitest';
import type { AttentionIcon, Context, PetState, Shape } from '../../src/core';
import {
  DEFAULT_SETTINGS,
  METER_MAX,
  SUPER_HAPPY,
  VERY_HAPPY,
  act,
  attentionIcon,
  canBeSuperHappy,
  createPet,
} from '../../src/core';
import { randInt } from '../../src/core/rng';
import { becomeSick } from '../../src/core/rules/health';
import { at, calmContext } from './helpers';

const NOW = at(0, 12);
const DIRTY = { sinceMs: at(0, 7), checks: 0, onsetChecks: 8, rolls: 0, sickRollsStopped: false };
const ctx = calmContext();

/** An awake pet in good shape, one win from the top: fed, watered, educated, nothing wrong. */
function fit(patch?: (pet: PetState) => void, c: Context = ctx): PetState {
  const pet = createPet({ id: 'p', seed: 1, nowMs: at(0, 7) }, c);
  pet.needs = { ...pet.needs, hunger: 8, thirst: 8, happiness: VERY_HAPPY, education: 3 };
  patch?.(pet);
  return pet;
}

/** Wins a whole game for the pet by always choosing what its hand loses to. */
function winGame(pet: PetState, c: Context = ctx): PetState {
  const beaten: Record<Shape, Shape> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
  let state = pet;
  const rounds = c.settings.jokenpoRounds;
  for (let i = 0; i < rounds; i++) {
    const index = state.game ? state.game.index : state.play.gamesStarted;
    const round = state.game ? state.game.rounds.length : 0;
    const pick = randInt(state.seed, index * 8 + round, 'jokenpoPet', 0, 2);
    const petShape: Shape = pick === 0 ? 'rock' : pick === 1 ? 'paper' : 'scissors';
    state = act(state, { kind: 'play', shape: beaten[petShape] }, NOW, c).state;
  }
  return state;
}

describe('the happiness levels (HAP-05, round 17)', () => {
  it('has six: VerySad to VeryHappy, and SuperHappy above them', () => {
    expect(METER_MAX.happiness).toBe(SUPER_HAPPY);
    expect(SUPER_HAPPY).toBe(VERY_HAPPY + 1);
  });

  it('is reached by winning a game when the pet is in good shape', () => {
    const pet = fit();
    expect(canBeSuperHappy(pet, ctx)).toBe(true);
    expect(winGame(pet).needs.happiness).toBe(SUPER_HAPPY);
  });

  it('is not reached from a lower level in one game: a win is one step', () => {
    expect(winGame(fit((p) => (p.needs.happiness = 3))).needs.happiness).toBe(VERY_HAPPY);
  });

  it.each([
    ['hunger at three bowls', (p: PetState) => (p.needs.hunger = 6)],
    ['thirst at three glasses', (p: PetState) => (p.needs.thirst = 6)],
    ['education below B+', (p: PetState) => (p.needs.education = 2)],
    ['sick', (p: PetState) => becomeSick(p, at(0, 7), 'wake', [])],
    ['dirty', (p: PetState) => (p.dirt.dirty = DIRTY)],
    ['too hot', (p: PetState) => (p.room.zone = 'tooHot')],
  ])('is not reached when the pet is %s', (_name, patch) => {
    const pet = fit(patch);
    expect(canBeSuperHappy(pet, ctx)).toBe(false);
    // A sick pet refuses to play at all; any other pet plays and stays at VeryHappy.
    const after = pet.sick ? pet : winGame(pet);
    expect(after.needs.happiness).toBe(VERY_HAPPY);
  });

  it('accepts hunger and thirst above three bowls, and education at B+ exactly', () => {
    const pet = fit((p) => {
      p.needs.hunger = 7;
      p.needs.thirst = 7;
      p.needs.education = 3;
    });
    expect(canBeSuperHappy(pet, ctx)).toBe(true);
  });

  it('is never reached by Pet or by Ice Cream, which stop at Happy', () => {
    let pet = fit((p) => (p.needs.happiness = 2));
    for (let i = 0; i < 4; i++) pet = act(pet, { kind: 'pet' }, NOW, ctx).state;
    expect(pet.needs.happiness).toBe(3);
    pet = act(pet, { kind: 'food', food: 'iceCream' }, NOW, ctx).state;
    expect(pet.needs.happiness).toBe(3);
  });

  it('counts games at SuperHappy as over-play, like VeryHappy', () => {
    const pet = winGame(fit());
    expect(pet.needs.happiness).toBe(SUPER_HAPPY);
    // The first game, played at VeryHappy, already counted; the second, at SuperHappy, counts too.
    expect(pet.play.overplayCount).toBe(1);
    expect(winGame(pet).play.overplayCount).toBe(2);
  });
});

describe('a game of Jokenpo (PLAY-01, round 17)', () => {
  it('plays five rounds by default, as the toy does', () => {
    expect(DEFAULT_SETTINGS.jokenpoRounds).toBe(5);
  });
});

describe('the icon that blinks (ATTN-01/02, round 17)', () => {
  const awake = (patch?: (pet: PetState) => void): PetState => fit(patch);

  it('is nothing when the pet is fine', () => {
    expect(attentionIcon(awake(), ctx)).toBeNull();
  });

  const fixes: [string, (p: PetState) => void, AttentionIcon][] = [
    ['sick', (p: PetState) => becomeSick(p, at(0, 7), 'wake', []), 'medical'],
    ['too cold', (p: PetState) => (p.room.zone = 'tooCold'), 'ac'],
    ['too hot', (p: PetState) => (p.room.zone = 'tooHot'), 'ac'],
    ['dirty', (p: PetState) => (p.dirt.dirty = DIRTY), 'bath'],
    ['thirsty', (p: PetState) => (p.needs.thirst = 0), 'drink'],
    ['hungry', (p: PetState) => (p.needs.hunger = 0), 'food'],
    ['sad', (p: PetState) => (p.needs.happiness = 0), 'pet'],
  ];
  it.each(fixes)('points at the fix when the pet is %s', (_name, patch, icon) => {
    expect(attentionIcon(awake(patch), ctx)).toBe(icon);
  });

  it('shows only the most urgent problem', () => {
    const everything: PetState = awake((p) => {
      becomeSick(p, at(0, 7), 'wake', []);
      p.room.zone = 'tooHot';
      p.dirt.dirty = DIRTY;
      p.needs.thirst = 0;
      p.needs.hunger = 0;
      p.needs.happiness = 0;
    });
    expect(attentionIcon(everything, ctx)).toBe('medical');

    const noSickness: PetState = { ...everything, sick: null };
    expect(attentionIcon(noSickness, ctx)).toBe('ac');
    noSickness.room.zone = 'ok';
    expect(attentionIcon(noSickness, ctx)).toBe('bath');
    noSickness.dirt.dirty = null;
    expect(attentionIcon(noSickness, ctx)).toBe('drink');
    noSickness.needs.thirst = 8;
    expect(attentionIcon(noSickness, ctx)).toBe('food');
    noSickness.needs.hunger = 8;
    expect(attentionIcon(noSickness, ctx)).toBe('pet');
  });

  it('asleep, points only at what works at night: a light left on, then the room', () => {
    const asleep = createPet({ id: 'p', seed: 1, nowMs: at(0, 23) }, ctx);
    expect(asleep.asleep).toBe(true);
    asleep.needs.thirst = 0; // cannot be fixed asleep, so it does not blink
    asleep.lightOn = false;
    expect(attentionIcon(asleep, ctx)).toBeNull();
    asleep.room.zone = 'tooCold';
    expect(attentionIcon(asleep, ctx)).toBe('ac');
    asleep.lightOn = true;
    expect(attentionIcon(asleep, ctx)).toBe('lamp');
  });

  it('is nothing for a pet that is dead', () => {
    const dead = awake((p) => {
      p.needs.thirst = 0;
      p.dead = { cause: 'thirst', atMs: NOW };
    });
    expect(attentionIcon(dead, ctx)).toBeNull();
  });
});
