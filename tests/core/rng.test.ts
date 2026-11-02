import { describe, expect, it } from 'vitest';
import { chance, rand, randInt } from '../../src/core/rng';

describe('counter-based randomness (TIME-02)', () => {
  it('is a pure function of seed, counter and channel (pinned values)', () => {
    // If these change, every saved pet would roll differently: change them only on purpose.
    expect(rand(1, 0, 'a')).toBe(0.165331878233701);
    expect(rand(1, 1, 'a')).toBe(0.5976318498142064);
    expect(rand(1, 0, 'b')).toBe(0.7049333883915097);
    expect(rand(2, 0, 'a')).toBe(0.48160290787927806);
    expect(rand(123456789, 1_960_000, 'dirtyCheck')).toBe(0.44038430089131);
    expect(rand(0xffffffff, 4_294_967_297, 'x')).toBe(0.7548622793983668);
  });

  it('returns the same value however often and in whatever order it is asked', () => {
    const forward = [0, 1, 2, 3].map((c) => rand(9, c, 'z'));
    const backward = [3, 2, 1, 0].map((c) => rand(9, c, 'z')).reverse();
    expect(backward).toEqual(forward);
    expect(rand(9, 2, 'z')).toBe(rand(9, 2, 'z'));
  });

  it('stays in [0, 1)', () => {
    for (let c = 0; c < 20_000; c++) {
      const v = rand(5, c, 'range');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs by seed, counter and channel', () => {
    const base = rand(1, 10, 'a');
    expect(rand(2, 10, 'a')).not.toBe(base);
    expect(rand(1, 11, 'a')).not.toBe(base);
    expect(rand(1, 10, 'b')).not.toBe(base);
  });

  it('is uniform enough over many draws', () => {
    const n = 100_000;
    const buckets = new Array<number>(10).fill(0);
    let sum = 0;
    for (let c = 0; c < n; c++) {
      const v = rand(7, c, 'uniform');
      sum += v;
      buckets[Math.floor(v * 10)] = (buckets[Math.floor(v * 10)] ?? 0) + 1;
    }
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.005);
    for (const count of buckets) expect(Math.abs(count - n / 10)).toBeLessThan(500);
  });

  it('keeps channels independent of each other', () => {
    const n = 20_000;
    const a: number[] = [];
    const b: number[] = [];
    for (let c = 0; c < n; c++) {
      a.push(rand(3, c, 'sickAtWake'));
      b.push(rand(3, c, 'tempMove'));
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const ma = mean(a);
    const mb = mean(b);
    let cov = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < n; i++) {
      const da = (a[i] ?? 0) - ma;
      const db = (b[i] ?? 0) - mb;
      cov += da * db;
      va += da * da;
      vb += db * db;
    }
    expect(Math.abs(cov / Math.sqrt(va * vb))).toBeLessThan(0.03);
  });

  it('rejects counters that are not non-negative integers', () => {
    expect(() => rand(1, -1, 'a')).toThrow(RangeError);
    expect(() => rand(1, 1.5, 'a')).toThrow(RangeError);
    expect(() => rand(1, Number.NaN, 'a')).toThrow(RangeError);
  });
});

describe('randInt and chance', () => {
  it('covers an inclusive range (the final-form wake-up is 16 to 20, LIFE-04)', () => {
    const seen = new Set<number>();
    for (let c = 0; c < 2_000; c++) seen.add(randInt(4, c, 'finalFormWakeUp', 16, 20));
    expect([...seen].sort((x, y) => x - y)).toEqual([16, 17, 18, 19, 20]);
  });

  it('handles a single-value range and rejects a bad one', () => {
    expect(randInt(1, 0, 'x', 5, 5)).toBe(5);
    expect(() => randInt(1, 0, 'x', 6, 5)).toThrow(RangeError);
  });

  it('chance(0) never and chance(1) always fires, and tracks p in between', () => {
    let never = 0;
    let always = 0;
    let half = 0;
    const n = 20_000;
    for (let c = 0; c < n; c++) {
      if (chance(8, c, 'p', 0)) never++;
      if (chance(8, c, 'p', 1)) always++;
      if (chance(8, c, 'p', 0.2)) half++;
    }
    expect(never).toBe(0);
    expect(always).toBe(n);
    expect(Math.abs(half / n - 0.2)).toBeLessThan(0.01);
  });
});
