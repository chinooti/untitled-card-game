import { describe, expect, it } from 'vitest';
import { MAX_HAND_SIZE, MAX_MANA, type GameState } from '@cardgame/shared';
import { createGame, type GameConfig } from '../setup/createGame';
import { beginFirstTurn } from '../setup/mulligan';
import { drawPhase, manaPhase, startTurn } from './startTurn';
import {
  fireEarthDeck,
  fixtureAvatars,
  fixtureCards,
} from '../testing/fixtures';

const config = (overrides: Partial<GameConfig> = {}): GameConfig => ({
  p1: { avatarId: 'test.fire_earth', deck: fireEarthDeck() },
  p2: { avatarId: 'test.fire_earth', deck: fireEarthDeck() },
  firstPlayer: 'p1',
  seed: 12345,
  cards: fixtureCards,
  avatars: fixtureAvatars,
  ...overrides,
});

/** A state at the start of turn 1, mulligan complete. */
const turnOne = (overrides: Partial<GameConfig> = {}): GameState =>
  beginFirstTurn(createGame(config(overrides))).state;

/** Replaces one player's fields for a specific scenario. */
const withPlayer = (
  state: GameState,
  id: 'p1' | 'p2',
  patch: Partial<GameState['players']['p1']>,
): GameState => ({
  ...state,
  players: { ...state.players, [id]: { ...state.players[id], ...patch } },
});

describe('drawPhase', () => {
  it('moves the top card of the deck to hand', () => {
    const state = turnOne();
    const top = state.players.p1.deck[0]!;
    const handBefore = state.players.p1.hand.length;

    const result = drawPhase(state);

    expect(result.state.players.p1.hand).toHaveLength(handBefore + 1);
    expect(result.state.players.p1.hand.at(-1)).toBe(top);
    expect(result.state.players.p1.deck[0]).not.toBe(undefined);
  });

  it('removes the drawn card from the deck', () => {
    const state = turnOne();
    const deckBefore = state.players.p1.deck.length;
    const result = drawPhase(state);
    expect(result.state.players.p1.deck).toHaveLength(deckBefore - 1);
  });

  it('emits a cardDrawn event', () => {
    const state = turnOne();
    const top = state.players.p1.deck[0]!;
    const result = drawPhase(state);
    expect(result.events).toContainEqual({
      type: 'cardDrawn',
      player: 'p1',
      cardId: top,
    });
  });

  it('draws for whoever is active', () => {
    const state = turnOne({ firstPlayer: 'p2' });
    const handBefore = state.players.p2.hand.length;
    const result = drawPhase(state);
    expect(result.state.players.p2.hand).toHaveLength(handBefore + 1);
    expect(result.state.players.p1.hand).toEqual(state.players.p1.hand);
  });

  describe('when the hand is full', () => {
    const fullHand = (): GameState => {
      const state = turnOne();
      const hand = state.players.p1.deck.slice(0, MAX_HAND_SIZE);
      return withPlayer(state, 'p1', {
        hand,
        deck: state.players.p1.deck.slice(MAX_HAND_SIZE),
      });
    };

    it('skips the draw', () => {
      const state = fullHand();
      const result = drawPhase(state);
      expect(result.state.players.p1.hand).toHaveLength(MAX_HAND_SIZE);
      expect(result.state.players.p1.deck).toEqual(state.players.p1.deck);
    });

    it('records the skip rather than failing', () => {
      const result = drawPhase(fullHand());
      expect(result.events).toContainEqual({
        type: 'drawSkipped',
        player: 'p1',
        reason: 'handFull',
      });
    });

    it('does not end the game', () => {
      expect(drawPhase(fullHand()).state.winner).toBeNull();
    });
  });

  describe('when the deck is empty', () => {
    const emptyDeck = (): GameState =>
      withPlayer(turnOne(), 'p1', { deck: [] });

    it('the active player loses', () => {
      const result = drawPhase(emptyDeck());
      expect(result.state.winner).toBe('p2');
      expect(result.state.phase).toBe('gameOver');
    });

    it('emits gameEnded with the deckout reason', () => {
      const result = drawPhase(emptyDeck());
      expect(result.events).toContainEqual({
        type: 'gameEnded',
        winner: 'p2',
        reason: 'deckedOut',
      });
    });

    it('loses even with a full hand', () => {
      // The deck check precedes the hand check on purpose: otherwise holding
      // eight cards would let a player skip the draw forever and never deck
      // out, turning the hand cap into a way to dodge losing.
      const state = turnOne();
      const loaded = withPlayer(state, 'p1', {
        hand: state.players.p1.deck.slice(0, MAX_HAND_SIZE),
        deck: [],
      });
      expect(drawPhase(loaded).state.winner).toBe('p2');
    });
  });

  it('does not mutate the state passed in', () => {
    const state = turnOne();
    const handBefore = [...state.players.p1.hand];
    drawPhase(state);
    expect(state.players.p1.hand).toEqual(handBefore);
  });
});

describe('manaPhase', () => {
  it('sets mana to the turn number', () => {
    const result = manaPhase(turnOne());
    expect(result.state.players.p1.mana).toEqual({ current: 1, max: 1 });
  });

  it('scales with the turn number', () => {
    const state = { ...turnOne(), turn: 6 };
    expect(manaPhase(state).state.players.p1.mana).toEqual({
      current: 6,
      max: 6,
    });
  });

  it('caps at MAX_MANA', () => {
    const state = { ...turnOne(), turn: 15 };
    expect(manaPhase(state).state.players.p1.mana).toEqual({
      current: MAX_MANA,
      max: MAX_MANA,
    });
  });

  it('refreshes to max rather than banking', () => {
    // Unspent mana is lost. A player who ended turn 2 with 2 unspent does not
    // start turn 3 with 5.
    const state = withPlayer({ ...turnOne(), turn: 3 }, 'p1', {
      mana: { current: 2, max: 2 },
    });
    expect(manaPhase(state).state.players.p1.mana).toEqual({
      current: 3,
      max: 3,
    });
  });

  it('emits a manaGained event', () => {
    const result = manaPhase(turnOne());
    expect(result.events).toContainEqual({
      type: 'manaGained',
      player: 'p1',
      current: 1,
      max: 1,
    });
  });

  it('only affects the active player', () => {
    const state = turnOne();
    const result = manaPhase(state);
    expect(result.state.players.p2.mana).toEqual(state.players.p2.mana);
  });
});

describe('startTurn', () => {
  it('runs draw then mana and lands in deploy', () => {
    const state = turnOne();
    const handBefore = state.players.p1.hand.length;

    const result = startTurn(state);

    expect(result.state.players.p1.hand).toHaveLength(handBefore + 1);
    expect(result.state.players.p1.mana.current).toBe(1);
    expect(result.state.phase).toBe('deploy');
  });

  it('emits phases in order', () => {
    const phases = startTurn(turnOne())
      .events.filter((e) => e.type === 'phaseChanged')
      .map((e) => (e.type === 'phaseChanged' ? e.phase : null));
    expect(phases).toEqual(['draw', 'mana', 'deploy']);
  });

  it('stops at gameOver if the draw decks the player out', () => {
    const state = withPlayer(turnOne(), 'p1', { deck: [] });
    const result = startTurn(state);

    expect(result.state.phase).toBe('gameOver');
    expect(result.state.winner).toBe('p2');
    // No mana granted — a decked-out player never reaches their mana phase.
    expect(result.state.players.p1.mana).toEqual({ current: 0, max: 0 });
    expect(
      result.events.some((e) => e.type === 'manaGained'),
    ).toBe(false);
  });

  it('does not mutate the state passed in', () => {
    const state = turnOne();
    startTurn(state);
    expect(state.phase).toBe('draw');
    expect(state.players.p1.mana).toEqual({ current: 0, max: 0 });
  });
});