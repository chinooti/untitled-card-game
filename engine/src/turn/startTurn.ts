/**
 * Turn start — the Draw and Mana phases. (GAME_DESIGN.md §3)
 *
 * Runs automatically: neither phase accepts player input, so a turn goes
 * straight from Draw through Mana to Deploy, which is where the player acts.
 * They exist as separate phases because the event stream reports them and the
 * UI animates them separately.
 */

import {
  MAX_HAND_SIZE,
  MAX_MANA,
  type EngineResult,
  type GameEvent,
  type GameState,
  type PlayerState,
  opponentOf,
} from '@cardgame/shared';

/**
 * Runs Draw then Mana, leaving the state in Deploy.
 *
 * Short-circuits if the draw ends the game — a player who decks out never
 * reaches their Mana phase.
 */
export function startTurn(state: GameState): EngineResult<GameState> {
  const drawResult = drawPhase(state);
  if (drawResult.state.winner !== null) return drawResult;

  const manaResult = manaPhase(drawResult.state);

  return {
    state: { ...manaResult.state, phase: 'deploy' },
    events: [
      ...drawResult.events,
      ...manaResult.events,
      { type: 'phaseChanged', phase: 'deploy' },
    ],
  };
}

/**
 * Draws one card for the active player.
 *
 * Three outcomes, checked in this order:
 *
 *   1. Empty deck — the player loses immediately. (§5)
 *   2. Full hand — the draw is skipped and recorded. Partial resolution means
 *      this is not an error. (§7)
 *   3. Otherwise the top card moves to hand.
 *
 * The deck check comes FIRST, before the hand-size check. Otherwise a player
 * sitting on a full hand with an empty deck would skip the draw, never
 * "attempt" it, and survive indefinitely — turning the hand cap into a way to
 * dodge decking out rather than a pressure to spend cards.
 */
export function drawPhase(state: GameState): EngineResult<GameState> {
  const playerId = state.activePlayer;
  const player = state.players[playerId];
  const events: GameEvent[] = [{ type: 'phaseChanged', phase: 'draw' }];

  if (player.deck.length === 0) {
    const winner = opponentOf(playerId);
    events.push({ type: 'gameEnded', winner, reason: 'deckedOut' });
    return {
      state: { ...state, winner, phase: 'gameOver' },
      events,
    };
  }

  if (player.hand.length >= MAX_HAND_SIZE) {
    events.push({ type: 'drawSkipped', player: playerId, reason: 'handFull' });
    return { state, events };
  }

  const drawn = player.deck[0];
  if (drawn === undefined) throw new Error('drawPhase: deck reported non-empty but had no card');

  const updated: PlayerState = {
    ...player,
    hand: [...player.hand, drawn],
    deck: player.deck.slice(1),
  };

  events.push({ type: 'cardDrawn', player: playerId, cardId: drawn });

  return {
    state: { ...state, players: { ...state.players, [playerId]: updated } },
    events,
  };
}

/**
 * Refreshes the active player's mana to this turn's maximum.
 *
 * Refresh-to-max, not banking: unspent mana is lost. (§2) Max is derived from
 * the turn number rather than stored per player, so there is one source of
 * truth and the two can never disagree.
 */
export function manaPhase(state: GameState): EngineResult<GameState> {
  const playerId = state.activePlayer;
  const player = state.players[playerId];

  const max = Math.min(state.turn, MAX_MANA);

  const updated: PlayerState = {
    ...player,
    mana: { current: max, max },
  };

  return {
    state: { ...state, players: { ...state.players, [playerId]: updated } },
    events: [
      { type: 'phaseChanged', phase: 'mana' },
      { type: 'manaGained', player: playerId, current: max, max },
    ],
  };
}