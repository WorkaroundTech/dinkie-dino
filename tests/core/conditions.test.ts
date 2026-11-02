import { describe, expect, it } from 'vitest';
import type { PetState } from '../../src/core';
import {
  act,
  advance,
  conditionsOf,
  createPet,
  displayCondition,
  needsAttention,
} from '../../src/core';
import { at, calmContext } from './helpers';

const ctx = calmContext();
const NOW = at(0, 12);

/** A content pet: every meter comfortably high, nothing wrong. */
function content(): PetState {
  const pet = createPet({ id: 'p', name: 'Test', seed: 1, nowMs: NOW }, ctx);
  pet.needs = { hunger: 6, thirst: 6, happiness: 3, education: 2, weightKg: 5 };
  return pet;
}

describe('what the pet shows (COND-01)', () => {
  it('shows nothing for a content pet', () => {
    expect(conditionsOf(content(), ctx)).toEqual([]);
    expect(displayCondition(content(), ctx)).toBeNull();
  });

  it('is hungry at 2 of 8 or below, and thirsty likewise', () => {
    const pet = content();
    pet.needs.hunger = 3;
    pet.needs.thirst = 3;
    expect(conditionsOf(pet, ctx)).toEqual([]);
    pet.needs.hunger = 2;
    expect(conditionsOf(pet, ctx)).toEqual(['hungry']);
    pet.needs.thirst = 0;
    expect(conditionsOf(pet, ctx)).toEqual(['hungry', 'thirsty']);
  });

  it('is sad only at the lowest happiness', () => {
    const pet = content();
    pet.needs.happiness = 1;
    expect(conditionsOf(pet, ctx)).toEqual([]);
    pet.needs.happiness = 0;
    expect(conditionsOf(pet, ctx)).toEqual(['sad']);
  });

  it('shows sick, too cold, too hot and dirty', () => {
    const sick: PetState = { ...content(), sick: { sinceMs: NOW } };
    expect(conditionsOf(sick, ctx)).toEqual(['sick']);

    const cold = content();
    cold.room.zone = 'tooCold';
    expect(conditionsOf(cold, ctx)).toEqual(['tooCold']);

    const hot = content();
    hot.room.zone = 'tooHot';
    expect(conditionsOf(hot, ctx)).toEqual(['tooHot']);

    const dirty = content();
    dirty.dirt.dirty = {
      sinceMs: NOW,
      checks: 0,
      onsetChecks: 8,
      rolls: 0,
      sickRollsStopped: false,
    };
    expect(conditionsOf(dirty, ctx)).toEqual(['dirty']);
  });

  it('lists the most urgent first, and displays that one (proposed order)', () => {
    const pet = content();
    pet.sick = { sinceMs: NOW };
    pet.room.zone = 'tooHot';
    pet.needs.hunger = 0;
    pet.needs.thirst = 0;
    pet.needs.happiness = 0;
    pet.dirt.dirty = { sinceMs: NOW, checks: 0, onsetChecks: 8, rolls: 0, sickRollsStopped: false };
    expect(conditionsOf(pet, ctx)).toEqual(['sick', 'tooHot', 'hungry', 'thirsty', 'dirty', 'sad']);
    expect(displayCondition(pet, ctx)).toBe('sick');
  });

  it('leaves a cured pet hungry, thirsty and sad, all calling for care (MED-03)', () => {
    const sick: PetState = { ...content(), sick: { sinceMs: NOW } };
    const cured = act(sick, { kind: 'medical' }, NOW, ctx).state;
    expect(conditionsOf(cured, ctx)).toEqual(['hungry', 'thirsty', 'sad']);
  });

  it('follows the pet as time goes by', () => {
    let pet = content();
    pet.needs.thirst = 3;
    expect(conditionsOf(pet, ctx)).toEqual([]);
    pet = advance(pet, at(0, 14), ctx).state; // 8 awake checks: two thirst points
    expect(conditionsOf(pet, ctx)).toEqual(['thirsty']);
  });
});

describe('calling for attention (COND-02)', () => {
  it('calls while awake with something wrong', () => {
    const pet = content();
    expect(needsAttention(pet, ctx)).toBe(false);
    pet.needs.hunger = 0;
    expect(needsAttention(pet, ctx)).toBe(true);
  });

  it('stays quiet while asleep', () => {
    const asleep = createPet({ id: 'p', name: 'T', seed: 1, nowMs: at(0, 23) }, ctx);
    asleep.needs.hunger = 0;
    expect(asleep.asleep).toBe(true);
    expect(needsAttention(asleep, ctx)).toBe(false);
  });

  it('stays quiet once dead or in the final form', () => {
    const dead: PetState = { ...content(), dead: { cause: 'sick', atMs: NOW } };
    dead.needs.hunger = 0;
    expect(needsAttention(dead, ctx)).toBe(false);
    const final: PetState = { ...content(), stage: 'final' };
    final.needs.hunger = 0;
    expect(needsAttention(final, ctx)).toBe(false);
  });
});
