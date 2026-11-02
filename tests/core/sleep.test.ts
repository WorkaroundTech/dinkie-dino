import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_TUNING } from '../../src/core';
import { bedtimeMinutes, updateSleep } from '../../src/core/rules/sleep';
import { createPet } from '../../src/core/state';
import type { PetState } from '../../src/core/state';
import { clock } from '../../src/core/time';
import { at, testContext } from './helpers';

const settings = DEFAULT_SETTINGS;
const tuning = DEFAULT_TUNING;

describe('bedtime by stage (SLEEP-05, SLEEP-06)', () => {
  it('puts young blobs to bed early and adults late', () => {
    expect(bedtimeMinutes('smallBlob', settings, tuning)).toBe(clock(19));
    expect(bedtimeMinutes('bigBlob', settings, tuning)).toBe(clock(19));
    expect(bedtimeMinutes('tail', settings, tuning)).toBe(clock(20));
    expect(bedtimeMinutes('legs', settings, tuning)).toBe(clock(20, 30));
    expect(bedtimeMinutes('teen', settings, tuning)).toBe(clock(21, 30));
    expect(bedtimeMinutes('adult', settings, tuning)).toBe(clock(22));
  });

  it('goes to bed later or at the same time as the pet grows', () => {
    const stages = ['smallBlob', 'bigBlob', 'tail', 'legs', 'teen', 'adult'] as const;
    const times = stages.map((s) => bedtimeMinutes(s, settings, tuning));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('shifts every stage with the configured adult bedtime (SLEEP-07)', () => {
    const early = { ...settings, adultBedtimeMinutes: clock(21) };
    expect(bedtimeMinutes('adult', early, tuning)).toBe(clock(21));
    expect(bedtimeMinutes('smallBlob', early, tuning)).toBe(clock(18));
  });

  it('reports the adult time for the locked final form, which never sleeps', () => {
    expect(bedtimeMinutes('final', settings, tuning)).toBe(clock(22));
  });
});

describe('falling asleep and waking up', () => {
  function awakePet(): PetState {
    return createPet({ id: 'p', name: 'Test', seed: 1, nowMs: at(0, 12) }, testContext());
  }

  it('falls asleep exactly at bedtime and wakes exactly at the wake-up time', () => {
    const pet = awakePet();
    const local = (minutes: number) => ({ day: 0, minutes });

    expect(updateSleep(pet, local(clock(18, 45)), settings, tuning)).toBeNull();
    expect(pet.asleep).toBe(false);

    expect(updateSleep(pet, local(clock(19)), settings, tuning)).toBe('fellAsleep');
    expect(pet.asleep).toBe(true);

    expect(updateSleep(pet, local(clock(6, 45)), settings, tuning)).toBeNull();
    expect(pet.asleep).toBe(true);

    expect(updateSleep(pet, local(clock(7)), settings, tuning)).toBe('woke');
    expect(pet.asleep).toBe(false);
  });

  it('reports a change only once (guard against double wake-ups, TIME-04)', () => {
    const pet = awakePet();
    updateSleep(pet, { day: 0, minutes: clock(20) }, settings, tuning);
    expect(updateSleep(pet, { day: 0, minutes: clock(20, 15) }, settings, tuning)).toBeNull();
    expect(updateSleep(pet, { day: 0, minutes: clock(3) }, settings, tuning)).toBeNull();
  });

  it('uses the wake-up time from the settings', () => {
    const late = { ...settings, wakeMinutes: clock(8, 30) };
    const pet = awakePet();
    updateSleep(pet, { day: 0, minutes: clock(22) }, late, tuning);
    expect(updateSleep(pet, { day: 1, minutes: clock(8, 15) }, late, tuning)).toBeNull();
    expect(updateSleep(pet, { day: 1, minutes: clock(8, 30) }, late, tuning)).toBe('woke');
  });
});
