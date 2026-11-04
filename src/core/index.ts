export { act, canDo } from './actions';
export type { Action, ActionResult, FoodType, Refusal } from './actions';
export {
  angelLimit,
  carePoints,
  careQuality,
  careVerdict,
  lifeExtension,
  riskFactor,
} from './rules/care';
export { attentionIcon } from './rules/attention';
export type { AttentionIcon } from './rules/attention';
export { canBeSuperHappy } from './rules/mood';
export { conditionsOf, displayCondition, needsAttention } from './rules/conditions';
export type { Condition } from './rules/conditions';
export { advance, advanceInPlace } from './engine';
export type { AdvanceResult } from './engine';
export { contextFor, defaultContext } from './context';
export type { Context } from './context';
export type { GameEvent, RoundOutcome, SickCause } from './events';
export { DEFAULT_SETTINGS, validateSettings } from './settings';
export type { Settings } from './settings';
export { DEFAULT_TUNING } from './config/tuning';
export type { Range, Tuning } from './config/tuning';
export { PACINGS, tuningForPacing } from './config/profiles';
export type { Pacing } from './config/profiles';
export {
  CARE_KINDS,
  createPet,
  isHalted,
  METER_MAX,
  SCHEMA_VERSION,
  SUPER_HAPPY,
  VERY_HAPPY,
} from './state';
export type {
  PetState,
  CareKind,
  CareLedger,
  Stage,
  Species,
  FinalForm,
  DeathCause,
  Needs,
  Diet,
  Shape,
  Game,
} from './state';
export { fixedOffsetLocalTime, systemLocalTime, TICK_MS, TICK_MINUTES } from './time';
export type { LocalTime, LocalTimeFn } from './time';
