import { describe, expect, it } from 'vitest';
import { MULLIGAN_REROLLS, OPENING_HAND_SIZE } from '@cardgame/shared';
import { createGame, type GameConfig } from './createGame';
import {
  applyMulliganReroll,
  beginFirstTurn,
  validateMulliganAction,
} from './mulligan';
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

describe('validateMulliganAction', () => {
  it('allows a reroll with charges remaining', () => {
    const state = createGame(config());
    expect(
      validateMulliganAction(state, {
        type: 'mulliganReroll',
        player: 'p1',
        handIndex: 0,
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a reroll outside the mulligan phase', () => {
    const state = { ...createGame(config()), phase: 'deploy' as const };
    const result = validateMulliganAction(state, {
      type: 'mulliganReroll',
      player: 'p1',
      handIndex: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a reroll with no charges left', () => {
    const base = createGame(config());
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, mulliganRerolls: 0 },
      },
    };
    const result = validateMulliganAction(state, {
      type: 'mulliganReroll',
      player: 'p1',
      handIndex: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('No reroll charges');
  });

  it('rejects an out-of-range hand index', () => {
    const state = createGame(config());
    for (const handIndex of [-1, OPENING_HAND_SIZE]) {
      const result = validateMulliganAction(state, {
        type: 'mulliganReroll',
        player: 'p1',
        handIndex,
      });
      expect(result.ok).toBe(false);
    }
  });

  it('always allows confirming', () => {
    const state = createGame(config());
    expect(
      validateMulliganAction(state, {
        type: 'mulliganConfirm',
        player: 'p1',
      }),
    ).toEqual({ ok: true });
  });
});

describe('applyMulliganReroll', () => {
  it('replaces the chosen card with the top of the deck', () => {
    const state = createGame(config());
    const before = state.players.p1.hand[1]!;
    const topOfDeck = state.players.p1.deck[0]!;

    const result = applyMulliganReroll(state, 'p1', 1);

    expect(result.state.players.p1.hand[1]).toBe(topOfDeck);
    expect(result.state.players.p1.hand[1]).not.toBe(before);
  });

  it('leaves the rest of the hand untouched', () => {
    const state = createGame(config());
    const before = state.players.p1.hand;
    const after = applyMulliganReroll(state, 'p1', 1).state.players.p1.hand;

    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(after[3]).toBe(before[3]);
  });

  it('spends one reroll charge', () => {
    const state = createGame(config());
    const result = applyMulliganReroll(state, 'p1', 0);
    expect(result.state.players.p1.mulliganRerolls).toBe(MULLIGAN_REROLLS - 1);
  });

  it('keeps the deck the same size', () => {
    const state = createGame(config());
    const before = state.players.p1.deck.length;
    const result = applyMulliganReroll(state, 'p1', 0);
    expect(result.state.players.p1.deck).toHaveLength(before);
  });

  it('returns the discarded card to the deck', () => {
    const state = createGame(config());
    const discarded = state.players.p1.hand[0]!;
    const before = state.players.p1.deck.filter((c) => c === discarded).length;

    const result = applyMulliganReroll(state, 'p1', 0);
    const after = result.state.players.p1.deck.filter(
      (c) => c === discarded,
    ).length;

    expect(after).toBe(before + 1);
  });

  it('cannot immediately redraw the discarded card', () => {
    // The rule that motivates draw-then-shuffle: the replacement is taken off
    // the top BEFORE the discard goes back, so a second reroll cannot hand the
    // same card straight back.
    const state = createGame(config());
    const discarded = state.players.p1.hand[0]!;
    const result = applyMulliganReroll(state, 'p1', 0);
    expect(result.state.players.p1.hand[0]).not.toBe(discarded);
  });

  it('emits a reroll event naming both cards', () => {
    const state = createGame(config());
    const out = state.players.p1.hand[0]!;
    const incoming = state.players.p1.deck[0]!;

    const result = applyMulliganReroll(state, 'p1', 0);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: 'mulliganRerolled',
      player: 'p1',
      out,
      in: incoming,
    });
  });

  it('does not touch the other player', () => {
    const state = createGame(config());
    const result = applyMulliganReroll(state, 'p1', 0);
    expect(result.state.players.p2).toEqual(state.players.p2);
  });

  it('does not mutate the state passed in', () => {
    const state = createGame(config());
    const handBefore = [...state.players.p1.hand];
    const deckBefore = [...state.players.p1.deck];

    applyMulliganReroll(state, 'p1', 0);

    expect(state.players.p1.hand).toEqual(handBefore);
    expect(state.players.p1.deck).toEqual(deckBefore);
  });

  it('advances the rng so consecutive rerolls differ', () => {
    const state = createGame(config());
    const first = applyMulliganReroll(state, 'p1', 0);
    expect(first.state.rng.seed).not.toBe(state.rng.seed);
  });

  it('supports spending every charge', () => {
    let state = createGame(config());
    for (let i = 0; i < MULLIGAN_REROLLS; i++) {
      state = applyMulliganReroll(state, 'p1', 0).state;
    }
    expect(state.players.p1.mulliganRerolls).toBe(0);
    expect(state.players.p1.hand).toHaveLength(OPENING_HAND_SIZE);
  });
});

describe('beginFirstTurn', () => {
  it('moves to turn 1 and the draw phase', () => {
    const result = beginFirstTurn(createGame(config()));
    expect(result.state.turn).toBe(1);
    expect(result.state.phase).toBe('draw');
  });

  it('keeps the first player active', () => {
    const result = beginFirstTurn(createGame(config({ firstPlayer: 'p2' })));
    expect(result.state.activePlayer).toBe('p2');
  });

  it('emits turn and phase events in order', () => {
    const result = beginFirstTurn(createGame(config()));
    expect(result.events).toEqual([
      { type: 'turnStarted', player: 'p1', turn: 1 },
      { type: 'phaseChanged', phase: 'draw' },
    ]);
  });

  it('does not mutate the state passed in', () => {
    const state = createGame(config());
    beginFirstTurn(state);
    expect(state.phase).toBe('mulligan');
    expect(state.turn).toBe(0);
  });
});