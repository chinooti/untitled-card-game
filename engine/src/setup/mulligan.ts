/**
 * The mulligan phase.
 *
 * Each player opens with OPENING_HAND_SIZE cards and MULLIGAN_REROLLS charges,
 * spendable on any card in hand. A rerolled card returns to the deck but
 * cannot be immediately redrawn — the replacement comes off the top first,
 * then the discard is shuffled back into what remains. (GAME_DESIGN.md §2)
 *
 * The mulligan is a phase rather than part of setup, so rerolls arrive as
 * normal Actions: the UI can animate them, and the AI uses its ordinary
 * decision loop rather than a special case.
 */

import {
  type Action,
  type EngineResult,
  type GameEvent,
  type GameState,
  type PlayerId,
  type PlayerState,
  type ValidationResult,
  invalid,
  valid,
} from '@cardgame/shared';
import { shuffle } from '../rng';

/**
 * Both players mulligan before either takes a turn, so this tracks completion
 * independently of activePlayer.
 */
export interface MulliganProgress {
  p1Confirmed: boolean;
  p2Confirmed: boolean;
}

export function validateMulliganAction(
  state: GameState,
  action: Extract<Action, { type: 'mulliganReroll' | 'mulliganConfirm' }>,
): ValidationResult {
  if (state.phase !== 'mulligan') {
    return invalid('Not in the mulligan phase');
  }

  const player = state.players[action.player];

  if (action.type === 'mulliganConfirm') {
    return valid();
  }

  if (player.mulliganRerolls <= 0) {
    return invalid('No reroll charges remaining');
  }

  if (action.handIndex < 0 || action.handIndex >= player.hand.length) {
    return invalid(`No card at hand index ${action.handIndex}`);
  }

  if (player.deck.length === 0) {
    return invalid('Deck is empty');
  }

  return valid();
}

/**
 * Swaps one card in hand for the top of the deck, then shuffles the discarded
 * card back in.
 *
 * Order matters: drawing before shuffling is what stops the same card being
 * handed straight back.
 */
export function applyMulliganReroll(
  state: GameState,
  playerId: PlayerId,
  handIndex: number,
): EngineResult<GameState> {
  const player = state.players[playerId];
  const outgoing = player.hand[handIndex];
  const incoming = player.deck[0];

  if (outgoing === undefined || incoming === undefined) {
    throw new Error('applyMulliganReroll called on an invalid state');
  }

  const hand = [...player.hand];
  hand[handIndex] = incoming;

  const remaining = player.deck.slice(1);
  const reshuffled = shuffle(state.rng, [...remaining, outgoing]);

  const updated: PlayerState = {
    ...player,
    hand,
    deck: reshuffled.value,
    mulliganRerolls: player.mulliganRerolls - 1,
  };

  const events: GameEvent[] = [
    { type: 'mulliganRerolled', player: playerId, out: outgoing, in: incoming },
  ];

  return {
    state: {
      ...state,
      players: { ...state.players, [playerId]: updated },
      rng: reshuffled.rng,
    },
    events,
  };
}

/**
 * Ends the mulligan and starts turn 1.
 *
 * Called once BOTH players have confirmed. Tracking who has confirmed is the
 * dispatcher's job — this only performs the transition, so the rule "both
 * players mulligan before either plays" lives in one place.
 */
export function beginFirstTurn(state: GameState): EngineResult<GameState> {
  const events: GameEvent[] = [
    { type: 'turnStarted', player: state.activePlayer, turn: 1 },
    { type: 'phaseChanged', phase: 'draw' },
  ];

  return {
    state: { ...state, turn: 1, phase: 'draw' },
    events,
  };
}