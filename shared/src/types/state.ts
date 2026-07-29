/**
 * Game state — everything true about a game at one moment.
 *
 * The engine's signature is (state, action) => { state, events }. This file
 * defines the state half.
 */

import type {
  AvatarId,
  CardId,
  InstanceId,
  LaneIndex,
  PlayerId,
} from './primitives';
import type { CardInstance } from './instance';

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

/**
 * Turn phases, matching GAME_DESIGN.md §3.
 *
 * Only `deploy` accepts player actions. The rest run automatically, but they
 * exist as distinct phases because the event stream reports them and the UI
 * animates them separately.
 *
 * There is deliberately no start-of-turn phase — everything that would need
 * one (Lives respawn, Burn, Regenerate) happens in `postCombat`, which runs
 * after EVERY attack phase and therefore twice per round.
 */
export type Phase =
  | 'mulligan'
  | 'draw'
  | 'mana'
  | 'deploy'
  | 'attack'
  | 'postCombat'
  | 'end'
  | 'gameOver';

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

/**
 * One player's half of one lane: a troop slot and a protector slot.
 *
 * Strictly one of each — units never stack. This is the constraint that makes
 * multi-summon effects distribute across lanes rather than pile up. (§7)
 */
export interface LaneSide {
  troop: CardInstance | null;
  protector: CardInstance | null;

  /**
   * Reserved. Terrain is a future addition modelled on PvZ Heroes
   * environments — a lane-scoped permanent. Always null in v1.
   *
   * Declared now rather than retrofitted: adding a field to a type used
   * everywhere is far more disruptive later than carrying an unused null.
   */
  terrain: CardInstance | null;
}

export const emptyLaneSide = (): LaneSide => ({
  troop: null,
  protector: null,
  terrain: null,
});

// ---------------------------------------------------------------------------
// Super meter
// ---------------------------------------------------------------------------

/**
 * Runtime state of one player's super meter. (§9)
 *
 * `charge >= threshold` means the meter is full. Normally it delivers a super
 * immediately and resets; if the hand is at 8 it holds full and delivers at
 * End once there is room, and cannot charge further while holding. That
 * "holding" state is derived from charge vs threshold rather than stored, so
 * the two can never disagree.
 */
export interface SuperMeterState {
  charge: number;
  /** Copied from the Avatar definition at game start so the engine does not
   *  need a registry lookup on every damage event. */
  threshold: number;
  /** 0-3. At 3 the meter stops charging permanently. */
  fillsUsed: number;
  /** Supers not yet delivered. Each fill removes one at random, so all three
   *  are used across a full game and none repeats. */
  supersRemaining: CardId[];
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface PlayerState {
  id: PlayerId;
  avatarId: AvatarId;
  avatarHp: number;

  /** Indexed 0..LANE_COUNT-1. Combat resolves in ascending order. */
  lanes: LaneSide[];

  /**
   * Hand and deck hold CardIds, not CardInstances.
   *
   * A card in hand has no HP, statuses or buffs — it is not in play, so an
   * instance would be almost entirely empty fields. Instances are created at
   * the moment a card enters a lane.
   *
   * Tradeoff: four copies of Flame Imp in hand are indistinguishable. That
   * only matters if a card ever needs to target one specific copy in hand,
   * which nothing currently does.
   */
  hand: CardId[];
  /** Index 0 is the top. Drawing shifts from the front. */
  deck: CardId[];

  /** There is no discard pile — cards leaving play are removed from the
   *  game entirely. (§11) */

  mana: {
    current: number;
    /** This turn's ceiling: turn number, capped at MAX_MANA. Refresh-to-max,
     *  so unspent mana is lost rather than banked. */
    max: number;
  };

  superMeter: SuperMeterState;

  /** Reroll charges left during the mulligan. Unused once play begins. */
  mulliganRerolls: number;
}

// ---------------------------------------------------------------------------
// Randomness
// ---------------------------------------------------------------------------

/**
 * Seeded RNG state, stored IN the game state rather than calling Math.random().
 *
 * This is what makes the engine deterministic: the same state plus the same
 * action always produces the same result. Without it, replays would diverge,
 * failing tests would not reproduce, and bot-vs-bot balance runs could not be
 * repeated with one variable changed.
 *
 * Randomness currently affects the mulligan, deck shuffling, and which super
 * the meter delivers.
 */
export interface RngState {
  seed: number;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

export interface GameState {
  players: Record<PlayerId, PlayerState>;

  activePlayer: PlayerId;

  /** Increments when play passes back to the player who went first. Mana max
   *  is derived from this. */
  turn: number;

  phase: Phase;

  /**
   * Null while the game is in progress.
   *
   * No draw case: a double KO awards the win to the attacking player, and
   * turns alternate, so simultaneous deckout is impossible. (§4, §5)
   */
  winner: PlayerId | null;

  rng: RngState;

  /** Monotonic counter used to mint InstanceIds. Part of state so instance
   *  creation stays deterministic alongside the RNG. */
  nextInstanceId: number;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const opponentOf = (p: PlayerId): PlayerId => (p === 'p1' ? 'p2' : 'p1');

/**
 * Finds a unit anywhere on the board by instance id.
 *
 * Needed because CardInstance deliberately does not store its own position —
 * the board owns that. Effects scoped to "this lane" resolve through here.
 */
export function locateInstance(
  state: GameState,
  instanceId: InstanceId,
): { player: PlayerId; lane: LaneIndex; slot: 'troop' | 'protector' } | null {
  for (const player of ['p1', 'p2'] as const) {
    const lanes = state.players[player].lanes;
    for (let lane = 0; lane < lanes.length; lane++) {
      const side = lanes[lane];
      if (!side) continue;
      if (side.troop?.instanceId === instanceId) {
        return { player, lane, slot: 'troop' };
      }
      if (side.protector?.instanceId === instanceId) {
        return { player, lane, slot: 'protector' };
      }
    }
  }
  return null;
}