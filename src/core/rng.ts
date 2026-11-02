// Counter-based randomness (architecture decision A2).
//
// Instead of a generator with hidden state, every random draw is a pure function of
//   (seed, counter, channel)
// where `counter` is a tick index (for simulation draws) or an action counter (for draws
// made by actions), and `channel` names the purpose ("dirtyCheck", "tempMove", ...).
//
// Consequences: opening the app late, early or in pieces gives the same outcomes (TIME-02),
// reloading cannot re-roll a draw, and tests can assert exact results.

const MAX_U32 = 4294967296;

/** Bijective 32-bit integer mixer ("lowbias32"). */
function mix32(value: number): number {
  let h = value >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** FNV-1a hash of a channel name. */
function hashChannel(channel: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < channel.length; i++) {
    h ^= channel.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A deterministic number in [0, 1) for this (seed, counter, channel).
 * `counter` must be a non-negative integer.
 */
export function rand(seed: number, counter: number, channel: string): number {
  if (!Number.isInteger(counter) || counter < 0) {
    throw new RangeError(`rand: counter must be a non-negative integer, got ${counter}`);
  }
  const low = counter >>> 0;
  const high = Math.floor(counter / MAX_U32) >>> 0;
  let h = mix32(seed ^ 0xa5a5a5a5);
  h = mix32(h ^ low);
  h = mix32(h ^ high ^ 0x9e3779b9);
  h = mix32(h ^ hashChannel(channel));
  return h / MAX_U32;
}

/** A deterministic integer in [min, max], both inclusive. */
export function randInt(
  seed: number,
  counter: number,
  channel: string,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`randInt: invalid range [${min}, ${max}]`);
  }
  return min + Math.floor(rand(seed, counter, channel) * (max - min + 1));
}

/** True with probability `p` (0 never, 1 always). */
export function chance(seed: number, counter: number, channel: string, p: number): boolean {
  return rand(seed, counter, channel) < p;
}
