import { describe, expect, it } from 'vitest';
import {
  DECK_SIZE,
  LANE_COUNT,
  MULLIGAN_REROLLS,
  OPENING_HAND_SIZE,
  STARTING_AVATAR_HP,
} from '@cardgame/shared';
import { createGame, type GameConfig } from './createGame';
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

describe('createGame', () => {
  it('starts in the mulligan phase on turn 0', () => {
    const state = createGame(config());
    expect(state.phase).toBe('mulligan');
    expect(state.turn).toBe(0);
    expect(state.winner).toBeNull();
  });

  it('respects the chosen first player', () => {
    expect(createGame(config({ firstPlayer: 'p2' })).activePlayer).toBe('p2');
  });

  it('deals an opening hand to both players', () => {
    const state = createGame(config());
    for (const p of ['p1', 'p2'] as const) {
      expect(state.players[p].hand).toHaveLength(OPENING_HAND_SIZE);
    }
  });

  it('leaves the rest of the deck behind the hand', () => {
    const state = createGame(config());
    expect(state.players.p1.deck).toHaveLength(DECK_SIZE - OPENING_HAND_SIZE);
  });

  it('keeps every dealt card — hand plus deck equals the original', () => {
    const deck = fireEarthDeck();
    const state = createGame(config({ p1: { avatarId: 'test.fire_earth', deck } }));
    const all = [...state.players.p1.hand, ...state.players.p1.deck];
    expect([...all].sort()).toEqual([...deck].sort());
  });

  it('gives both players full avatar HP', () => {
    const state = createGame(config());
    expect(state.players.p1.avatarHp).toBe(STARTING_AVATAR_HP);
    expect(state.players.p2.avatarHp).toBe(STARTING_AVATAR_HP);
  });

  it('creates the right number of empty lanes', () => {
    const state = createGame(config());
    const lanes = state.players.p1.lanes;
    expect(lanes).toHaveLength(LANE_COUNT);
    expect(
      lanes.every((l) => l.troop === null && l.protector === null),
    ).toBe(true);
  });

  it('gives each lane its own object rather than a shared reference', () => {
    // A subtle bug worth guarding: Array(n).fill(obj) would put the SAME
    // object in every slot, so deploying to lane 0 would deploy to all lanes.
    const lanes = createGame(config()).players.p1.lanes;
    expect(lanes[0]).not.toBe(lanes[1]);
  });

  it('starts mana at zero — the first turn grants it', () => {
    const state = createGame(config());
    expect(state.players.p1.mana).toEqual({ current: 0, max: 0 });
  });

  it('primes the super meter from the avatar', () => {
    const state = createGame(config());
    const meter = state.players.p1.superMeter;
    const avatar = fixtureAvatars['test.fire_earth']!;
    expect(meter.charge).toBe(0);
    expect(meter.fillsUsed).toBe(0);
    expect(meter.threshold).toBe(avatar.chargeThreshold);
    expect(meter.supersRemaining).toEqual([...avatar.supers]);
  });

  it('copies supersRemaining rather than sharing the avatar array', () => {
    const state = createGame(config());
    const avatar = fixtureAvatars['test.fire_earth']!;
    expect(state.players.p1.superMeter.supersRemaining).not.toBe(avatar.supers);
  });

  it('gives both players their mulligan rerolls', () => {
    const state = createGame(config());
    expect(state.players.p1.mulliganRerolls).toBe(MULLIGAN_REROLLS);
  });

  it('is deterministic for a given seed', () => {
    const a = createGame(config({ seed: 999 }));
    const b = createGame(config({ seed: 999 }));
    expect(a.players.p1.hand).toEqual(b.players.p1.hand);
    expect(a.players.p1.deck).toEqual(b.players.p1.deck);
  });

  it('produces different hands for different seeds', () => {
    const a = createGame(config({ seed: 1 }));
    const b = createGame(config({ seed: 2 }));
    expect(a.players.p1.hand).not.toEqual(b.players.p1.hand);
  });

  it('deals different hands to each player from the same decklist', () => {
    // Both shuffles draw from one RNG stream threaded forward, so identical
    // decklists still produce different orders.
    const state = createGame(config({ seed: 42 }));
    expect(state.players.p1.hand).not.toEqual(state.players.p2.hand);
  });

  it('actually shuffles', () => {
    const deck = fireEarthDeck();
    const state = createGame(config({ p1: { avatarId: 'test.fire_earth', deck } }));
    expect([...state.players.p1.hand, ...state.players.p1.deck]).not.toEqual(deck);
  });

  it('rejects an unknown avatar', () => {
    expect(() =>
      createGame(config({ p1: { avatarId: 'test.nope', deck: fireEarthDeck() } })),
    ).toThrow('Unknown avatar');
  });

  it('rejects an illegal deck', () => {
    const short = fireEarthDeck().slice(0, 20);
    expect(() =>
      createGame(config({ p1: { avatarId: 'test.fire_earth', deck: short } })),
    ).toThrow('Illegal deck for p1');
  });

  it('does not mutate the deck passed in', () => {
    const deck = Object.freeze(fireEarthDeck()) as string[];
    expect(() =>
      createGame(config({ p1: { avatarId: 'test.fire_earth', deck } })),
    ).not.toThrow();
  });
});