import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, validateSettings } from '../../src/core/settings';
import { clock } from '../../src/core/time';

describe('settings validation (TIME-05, decision A3)', () => {
  it('accepts the defaults', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('accepts the edges of the wake-up range in 15-minute steps', () => {
    for (const wake of [clock(6), clock(6, 15), clock(8, 45), clock(9)]) {
      expect(validateSettings({ ...DEFAULT_SETTINGS, wakeMinutes: wake })).toEqual([]);
    }
  });

  it('rejects a wake-up outside 06:00 to 09:00', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, wakeMinutes: clock(5, 45) })).toHaveLength(1);
    expect(validateSettings({ ...DEFAULT_SETTINGS, wakeMinutes: clock(9, 15) })).toHaveLength(1);
  });

  it('rejects times that are not multiples of 15 minutes', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, wakeMinutes: clock(7, 10) })).toHaveLength(1);
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, adultBedtimeMinutes: clock(22, 5) }),
    ).toHaveLength(1);
  });

  it('rejects an adult bedtime outside the proposed range', () => {
    expect(
      validateSettings({ ...DEFAULT_SETTINGS, adultBedtimeMinutes: clock(19, 45) }),
    ).toHaveLength(1);
    expect(validateSettings({ ...DEFAULT_SETTINGS, adultBedtimeMinutes: clock(24) })).toHaveLength(
      1,
    );
  });
});
