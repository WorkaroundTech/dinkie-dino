import type { Action, Refusal } from './actions';
import type { DeathCause, FinalForm, Shape, Species, Stage } from './state';

/** What made a pet sick. */
export type SickCause = 'dirt' | 'light' | 'wake' | 'temperature' | 'weight';

export type RoundOutcome = 'petWon' | 'petLost' | 'tie';

/** Things that happened while the engine advanced; the UI turns them into sounds and summaries. */
export type GameEvent =
  | { type: 'fellAsleep'; atMs: number }
  | { type: 'woke'; atMs: number; wakeUps: number }
  | { type: 'grew'; atMs: number; from: Stage; to: Stage }
  | { type: 'species'; atMs: number; species: Species }
  | { type: 'lifeExtended'; atMs: number; extraWakeUps: number }
  | { type: 'finalForm'; atMs: number; form: FinalForm }
  | { type: 'becameDirty'; atMs: number }
  | { type: 'cleaned'; atMs: number }
  | { type: 'gotSick'; atMs: number; cause: SickCause }
  | { type: 'cured'; atMs: number }
  | { type: 'roomZone'; atMs: number; zone: 'ok' | 'tooCold' | 'tooHot' }
  | { type: 'died'; atMs: number; cause: DeathCause }
  | { type: 'jokenpoRound'; atMs: number; player: Shape; pet: Shape; outcome: RoundOutcome }
  | { type: 'jokenpoGame'; atMs: number; result: RoundOutcome; petWins: number; playerWins: number }
  | { type: 'acted'; atMs: number; action: Action }
  | { type: 'refused'; atMs: number; action: Action; reason: Refusal };
