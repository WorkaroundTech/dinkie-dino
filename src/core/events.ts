import type { FinalForm, Stage } from './state';

/** Things that happened while the engine advanced; the UI turns them into sounds and summaries. */
export type GameEvent =
  | { type: 'fellAsleep'; atMs: number }
  | { type: 'woke'; atMs: number; wakeUps: number }
  | { type: 'grew'; atMs: number; from: Stage; to: Stage }
  | { type: 'finalForm'; atMs: number; form: FinalForm };
