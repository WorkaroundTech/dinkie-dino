import type { Action, Refusal } from './actions';
import type { FinalForm, Species, Stage } from './state';

/** Things that happened while the engine advanced; the UI turns them into sounds and summaries. */
export type GameEvent =
  | { type: 'fellAsleep'; atMs: number }
  | { type: 'woke'; atMs: number; wakeUps: number }
  | { type: 'grew'; atMs: number; from: Stage; to: Stage }
  | { type: 'species'; atMs: number; species: Species }
  | { type: 'finalForm'; atMs: number; form: FinalForm }
  | { type: 'acted'; atMs: number; action: Action }
  | { type: 'refused'; atMs: number; action: Action; reason: Refusal };
