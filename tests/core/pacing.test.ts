import { describe, expect, it } from 'vitest';
import {
  contextFor,
  DEFAULT_SETTINGS,
  DEFAULT_TUNING,
  PACINGS,
  tuningForPacing,
  validateSettings,
} from '../../src/core';
import { fixedOffsetLocalTime } from '../../src/core';

describe('pacing (round 15: normal about every 4 hours, relaxed about every 8)', () => {
  it('normal is the default tuning', () => {
    expect(tuningForPacing('normal')).toEqual(DEFAULT_TUNING);
    expect(DEFAULT_SETTINGS.pacing).toBe('normal');
  });

  it('relaxed halves the drift of the room, which doubles the time between looks, and charges more for its lapses, and changes nothing else', () => {
    const normal = tuningForPacing('normal');
    const relaxed = tuningForPacing('relaxed');
    expect(relaxed.temperature.moveChance).toBeCloseTo(normal.temperature.moveChance / 2);

    expect(relaxed.careScore.mistakes.tooHot.points).toBeGreaterThan(
      normal.careScore.mistakes.tooHot.points,
    );
    expect(relaxed.careScore.mistakes.tooCold.points).toBeGreaterThan(
      normal.careScore.mistakes.tooCold.points,
    );

    relaxed.temperature.moveChance = normal.temperature.moveChance;
    relaxed.careScore.mistakes.tooHot.points = normal.careScore.mistakes.tooHot.points;
    relaxed.careScore.mistakes.tooCold.points = normal.careScore.mistakes.tooCold.points;
    expect(relaxed).toEqual(normal);
  });

  it('hands out copies, so adjusting one does not change the defaults', () => {
    const a = tuningForPacing('normal');
    a.temperature.moveChance = 0.9;
    expect(tuningForPacing('normal').temperature.moveChance).not.toBe(0.9);
    expect(DEFAULT_TUNING.temperature.moveChance).not.toBe(0.9);
  });

  it('a context follows the pacing chosen in the settings', () => {
    const local = fixedOffsetLocalTime(0);
    const normal = contextFor({ ...DEFAULT_SETTINGS, pacing: 'normal' }, local);
    const relaxed = contextFor({ ...DEFAULT_SETTINGS, pacing: 'relaxed' }, local);
    expect(relaxed.tuning.temperature.moveChance).toBeLessThan(
      normal.tuning.temperature.moveChance,
    );
    expect(relaxed.settings.pacing).toBe('relaxed');
  });

  it('only the two pacings are valid settings', () => {
    for (const pacing of PACINGS)
      expect(validateSettings({ ...DEFAULT_SETTINGS, pacing })).toEqual([]);
    expect(validateSettings({ ...DEFAULT_SETTINGS, pacing: 'frantic' as never })).toHaveLength(1);
  });
});
