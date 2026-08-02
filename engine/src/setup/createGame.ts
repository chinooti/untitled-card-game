/**
 * Game creation.
 *
 * Builds the initial GameState: shuffled decks, opening hands dealt, empty
 * lanes, mana and super meters primed. Stops at the mulligan rather than
 * resolving it, so rerolls arrive as normal Actions and the UI can show them.
 *
 * Nothing here reads a global registry. Cards and avatars are passed in, which
 * is what lets tests run against fixtures, the real game pass real cards, and
 * a balance simulation pass a modified set with one stat changed.
 */

import {
  LANE_COUNT,
  MULLIGAN_REROLLS,
  OPENING_HAND_SIZE,
  STARTING_AVATAR_HP,
  emptyLaneSide,
  type Avatar,
  type AvatarRegistry,
  type CardId,
  type CardRegistry,
  type GameState,
  type PlayerId,
  type PlayerState,
} from '@cardgame/shared';
import { seedRng, shuffle } from '../rng';
import { validateDeck } from './deck';

export interface PlayerConfig {
  avatarId: string;
  deck: CardId[];
}

export interface GameConfig {
  p1: PlayerConfig;
  p2: PlayerConfig;
  /** Who takes the first turn. Decided by a coin flip the winner of which
   *  chooses; the engine is told the outcome rather than deciding it. (§10) */
  firstPlayer: PlayerId;
  /** Same seed plus same actions always reproduces the same game. */
  seed: number;
  cards: CardRegistry;
  avatars: AvatarRegistry;
}

export function createGame(config: GameConfig): GameState {
  const { cards, avatars, seed, firstPlayer } = config;

  // Validate before building anything. An illegal deck reaching the engine is
  // a bug upstream, and failing here is far easier to diagnose than a game
  // that starts and then behaves oddly.
  const p1Avatar = requireAvatar(avatars, config.p1.avatarId);
  const p2Avatar = requireAvatar(avatars, config.p2.avatarId);
  requireLegalDeck(config.p1.deck, p1Avatar, cards, 'p1');
  requireLegalDeck(config.p2.deck, p2Avatar, cards, 'p2');

  // RNG is threaded through both shuffles in a fixed order, so the same seed
  // always produces the same two decks.
  let rng = seedRng(seed);

  const p1Shuffle = shuffle(rng, config.p1.deck);
  rng = p1Shuffle.rng;
  const p2Shuffle = shuffle(rng, config.p2.deck);
  rng = p2Shuffle.rng;

  const p1 = createPlayer('p1', p1Avatar, p1Shuffle.value);
  const p2 = createPlayer('p2', p2Avatar, p2Shuffle.value);

  return {
    players: { p1, p2 },
    activePlayer: firstPlayer,
    // Turn 0 until the mulligan completes. The first real turn increments to
    // 1, which is also the first turn's mana maximum.
    turn: 0,
    phase: 'mulligan',
    winner: null,
    rng,
    nextInstanceId: 1,
  };
}

function createPlayer(
  id: PlayerId,
  avatar: Avatar,
  shuffledDeck: CardId[],
): PlayerState {
  // Deal from the top by splitting rather than mutating, keeping this pure.
  const hand = shuffledDeck.slice(0, OPENING_HAND_SIZE);
  const deck = shuffledDeck.slice(OPENING_HAND_SIZE);

  return {
    id,
    avatarId: avatar.id,
    avatarHp: STARTING_AVATAR_HP,
    lanes: Array.from({ length: LANE_COUNT }, emptyLaneSide),
    hand,
    deck,
    mana: { current: 0, max: 0 },
    superMeter: {
      charge: 0,
      // Copied from the avatar so the engine never needs a registry lookup on
      // a damage event, which happens constantly.
      threshold: avatar.chargeThreshold,
      fillsUsed: 0,
      // A mutable copy: each fill removes one at random, so all three are used
      // across a game and none repeats.
      supersRemaining: [...avatar.supers],
    },
    mulliganRerolls: MULLIGAN_REROLLS,
  };
}

function requireAvatar(avatars: AvatarRegistry, id: string): Avatar {
  const avatar = avatars[id];
  if (!avatar) throw new Error(`Unknown avatar: ${id}`);
  return avatar;
}

function requireLegalDeck(
  deck: CardId[],
  avatar: Avatar,
  cards: CardRegistry,
  who: PlayerId,
): void {
  const result = validateDeck(deck, avatar, cards);
  if (!result.ok) {
    throw new Error(`Illegal deck for ${who}: ${result.errors.join('; ')}`);
  }
}