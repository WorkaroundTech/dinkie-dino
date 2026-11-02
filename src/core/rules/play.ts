import type { Context } from '../context';
import type { GameEvent, RoundOutcome } from '../events';
import { chance, randInt } from '../rng';
import type { PetState, Shape } from '../state';
import { METER_MAX } from '../state';
import { lower, raise } from './meters';

/** Room reserved per game in the pet-hand stream; a game has 3 to 5 rounds. */
const HANDS_PER_GAME = 8;

/** Rock beats scissors, scissors beats paper, paper beats rock (PLAY-02). */
const BEATS: Record<Shape, Shape> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

export function roundOutcome(player: Shape, pet: Shape): RoundOutcome {
  if (player === pet) return 'tie';
  return BEATS[pet] === player ? 'petWon' : 'petLost';
}

/** The majority of the rounds decides the game (PLAY-01); equal wins make a tied game. */
export function gameResult(rounds: readonly { player: Shape; pet: Shape }[]): {
  result: RoundOutcome;
  petWins: number;
  playerWins: number;
} {
  let petWins = 0;
  let playerWins = 0;
  for (const round of rounds) {
    const outcome = roundOutcome(round.player, round.pet);
    if (outcome === 'petWon') petWins++;
    else if (outcome === 'petLost') playerWins++;
  }
  const result = petWins > playerWins ? 'petWon' : petWins < playerWins ? 'petLost' : 'tie';
  return { result, petWins, playerWins };
}

/**
 * Plays one round. The pet's hand is drawn at random and is never known before the player has
 * chosen (PLAY-07). The first round starts a game with the configured number of rounds; the last
 * round ends it and applies its effects.
 */
export function playRound(
  pet: PetState,
  player: Shape,
  ctx: Context,
  atMs: number,
  events: GameEvent[],
): void {
  if (!pet.game) {
    pet.game = { index: pet.play.gamesStarted, total: ctx.settings.jokenpoRounds, rounds: [] };
    pet.play.gamesStarted += 1;
  }

  // The pet's hand has its own stream, keyed by game and round (a game has at most 8 rounds
  // here): it never depends on what the player chose or on other random outcomes.
  const counter = pet.game.index * HANDS_PER_GAME + pet.game.rounds.length;
  const pick = randInt(pet.seed, counter, 'jokenpoPet', 0, 2);
  const petShape: Shape = pick === 0 ? 'rock' : pick === 1 ? 'paper' : 'scissors';
  pet.game.rounds.push({ player, pet: petShape });
  events.push({
    type: 'jokenpoRound',
    atMs,
    player,
    pet: petShape,
    outcome: roundOutcome(player, petShape),
  });

  if (pet.game.rounds.length >= pet.game.total) finishGame(pet, ctx, atMs, events);
}

/**
 * The effects of a finished game (PLAY-04…06, HAP-02, EDU-04/05).
 * - Over-play: a game played while happiness is already at the top counts; after 3 to 5 of them,
 *   each further game may cost one grade of education. Ties count too.
 * - A win makes the pet happier (and is the only way to the very top), and lightens it.
 * - A loss changes nothing, but from the second loss in a row it may cost a happiness level.
 * - A tie changes nothing and neither adds to nor breaks a losing streak.
 */
function finishGame(pet: PetState, ctx: Context, atMs: number, events: GameEvent[]): void {
  const cfg = ctx.tuning.play;
  const game = pet.game;
  if (!game) return;
  const { result, petWins, playerWins } = gameResult(game.rounds);

  if (pet.needs.happiness === METER_MAX.happiness) {
    pet.play.overplayCount += 1;
    pet.play.overplayThreshold ??= randInt(
      pet.seed,
      pet.actionCounter++,
      'act:overplayThreshold',
      cfg.overplayThreshold.min,
      cfg.overplayThreshold.max,
    );
    if (
      pet.play.overplayCount > pet.play.overplayThreshold &&
      chance(pet.seed, pet.actionCounter++, 'act:overplayDrop', cfg.overplayEducationDropChance)
    ) {
      lower(pet.needs, 'education', 1);
    }
  }

  if (result === 'petWon') {
    raise(pet.needs, 'happiness', 1);
    pet.play.lossStreak = 0;
    burnWeightFromWin(pet, ctx);
  } else if (result === 'petLost') {
    pet.play.lossStreak += 1;
    if (
      pet.play.lossStreak >= cfg.lossStreakFrom &&
      chance(pet.seed, pet.actionCounter++, 'act:lossDrop', cfg.lossHappinessDropChance)
    ) {
      lower(pet.needs, 'happiness', 1);
    }
  }

  syncOverplay(pet);
  pet.game = null;
  events.push({ type: 'jokenpoGame', atMs, result, petWins, playerWins });
}

/** The over-play count only runs while happiness is at the top: it restarts once it leaves it (EDU-05). */
export function syncOverplay(pet: PetState): void {
  if (pet.needs.happiness < METER_MAX.happiness) {
    pet.play.overplayCount = 0;
    pet.play.overplayThreshold = null;
  }
}

/**
 * A won game burns weight half the time (round 16), but never takes the pet below its healthy range
 * (assumption: playing should not make a pet underweight).
 */
function burnWeightFromWin(pet: PetState, ctx: Context): void {
  const { weight } = ctx.tuning;
  if (pet.stage === 'final') return;
  const floor = Math.max(weight.minKg, weight.healthyKg[pet.stage].low);
  if (pet.needs.weightKg <= floor) return;
  if (chance(pet.seed, pet.actionCounter++, 'act:winBurn', weight.winBurnChance)) {
    pet.needs.weightKg = Math.max(floor, pet.needs.weightKg - weight.burnKg);
  }
}
