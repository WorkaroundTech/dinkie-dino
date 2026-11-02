// The simulation advances in fixed 15-minute checks on an absolute UTC grid (TIME-06).
// Because the grid is absolute, the same ticks happen whether the app is opened now or
// tomorrow, which keeps catch-up deterministic (TIME-02).

export const TICK_MINUTES = 15;
export const TICK_MS = TICK_MINUTES * 60 * 1000;

/** Index of the check that contains the given instant (UTC ms). */
export function tickIndexAt(utcMs: number): number {
  return Math.floor(utcMs / TICK_MS);
}

/** UTC ms at which a check starts. */
export function tickStartMs(tickIndex: number): number {
  return tickIndex * TICK_MS;
}

/**
 * The checks that still have to be processed to bring a pet from `lastCheckIndex` up to
 * `nowMs`, in order. Empty when the clock did not advance or went backwards (TIME-04).
 */
export function ticksBetween(lastCheckIndex: number, nowMs: number): number[] {
  const last = tickIndexAt(nowMs);
  const ticks: number[] = [];
  for (let t = lastCheckIndex + 1; t <= last; t++) ticks.push(t);
  return ticks;
}
