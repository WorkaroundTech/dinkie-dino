// The simulation advances in fixed 15-minute checks on an absolute UTC grid (TIME-06).
// Because the grid is absolute, the same ticks happen whether the app is opened now or
// tomorrow, which keeps catch-up deterministic (TIME-02).

export const TICK_MINUTES = 15;
export const TICK_MS = TICK_MINUTES * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

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

/**
 * A wall-clock reading: the local calendar day (a day count, so it is comparable) and the
 * minutes since local midnight (0 to 1439).
 */
export interface LocalTime {
  day: number;
  minutes: number;
}

/** Converts a UTC instant to local time. Injected so the core never reads the system zone. */
export type LocalTimeFn = (utcMs: number) => LocalTime;

/** A fixed UTC offset in minutes, with no daylight saving. Used by tests and tools. */
export function fixedOffsetLocalTime(offsetMinutes: number): LocalTimeFn {
  return (utcMs) => {
    const local = utcMs + offsetMinutes * MINUTE_MS;
    const day = Math.floor(local / DAY_MS);
    const minutes = Math.floor((local - day * DAY_MS) / MINUTE_MS);
    return { day, minutes };
  };
}

/** The device's own time zone, including daylight saving. Used by the app. */
export const systemLocalTime: LocalTimeFn = (utcMs) => {
  const d = new Date(utcMs);
  return {
    day: Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS),
    minutes: d.getHours() * 60 + d.getMinutes(),
  };
};

/**
 * True while the pet should be asleep: from bedtime until the morning wake-up, across
 * midnight. All three values are minutes since midnight (SLEEP-01, TIME-05).
 */
export function isNight(minutes: number, bedtimeMinutes: number, wakeMinutes: number): boolean {
  return minutes >= bedtimeMinutes || minutes < wakeMinutes;
}

/** Minutes since midnight for a clock time, e.g. `clock(19, 30)`. */
export function clock(hours: number, minutes = 0): number {
  return hours * 60 + minutes;
}
