/**
 * Events — an ordered record of everything the engine did.
 *
 * The engine returns { state, events } rather than just state. The state says
 * what is true now; the events say what happened to get there, in order.
 *
 * Four consumers, one stream:
 *
 *   - the UI animates it in sequence (Berserker hit Iron Knight, Iron Knight
 *     retaliated, Berserker died, a Skeleton spawned)
 *   - the replay format IS this stream plus a starting seed
 *   - the combat log renders it as text
 *   - the AI reads it back when debugging why it made a bad play
 *
 * Without it, the UI would have to reverse-engineer the sequence by diffing
 * two game states, which loses ordering and is miserable to get right. Cheap
 * to add now, painful to retrofit once the UI exists.
 */

import type {
  CardId,
  InstanceId,
  LaneIndex,
  PlayerId,
  SlotKind,
} from './primitives';
import type { Phase } from './state';
import type { TargetRef } from './action';

/**
 * Events are past-tense facts, never instructions. "unitDestroyed", not
 * "destroyUnit". A consumer replaying the stream should never need to
 * recompute game rules — the engine already decided, the event records it.
 */
export type GameEvent =
  // -- turn flow ------------------------------------------------------------
  | { type: 'turnStarted'; player: PlayerId; turn: number }
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'manaGained'; player: PlayerId; current: number; max: number }

  // -- cards ----------------------------------------------------------------
  | { type: 'cardDrawn'; player: PlayerId; cardId: CardId }
  /** Draw failed because the hand was already at MAX_HAND_SIZE. Partial
   *  resolution means this is not an error — it is recorded and ignored. */
  | { type: 'drawSkipped'; player: PlayerId; reason: 'handFull' }
  | { type: 'cardPlayed'; player: PlayerId; cardId: CardId }
  | { type: 'mulliganRerolled'; player: PlayerId; out: CardId; in: CardId }

  // -- board ----------------------------------------------------------------
  | {
      type: 'unitDeployed';
      player: PlayerId;
      instanceId: InstanceId;
      cardId: CardId;
      lane: LaneIndex;
      slot: SlotKind;
    }
  | {
      type: 'unitEvolved';
      player: PlayerId;
      fromInstanceId: InstanceId;
      toInstanceId: InstanceId;
      cardId: CardId;
    }
  /** A Lives unit came back. The new instance is genuinely new — it inherits
   *  no statuses, buffs or added abilities from the old one. (§14) */
  | {
      type: 'unitRespawned';
      player: PlayerId;
      oldInstanceId: InstanceId;
      newInstanceId: InstanceId;
      livesRemaining: number;
    }
  | { type: 'controlChanged'; instanceId: InstanceId; newController: PlayerId }

  // -- combat ---------------------------------------------------------------
  | { type: 'laneResolving'; player: PlayerId; lane: LaneIndex }
  | { type: 'attackDeclared'; attacker: InstanceId; target: TargetRef }
  /** Attacker was frozen and lost this swing. The status clears. */
  | { type: 'attackSkipped'; attacker: InstanceId; reason: 'frozen' }
  | {
      type: 'damageDealt';
      source: InstanceId | null;
      target: TargetRef;
      amount: number;
    }
  | { type: 'retaliated'; retaliator: InstanceId; attacker: InstanceId; amount: number }
  | { type: 'healed'; target: TargetRef; amount: number }
  | { type: 'unitDestroyed'; instanceId: InstanceId; cardId: CardId }

  // -- statuses -------------------------------------------------------------
  | { type: 'frozen'; instanceId: InstanceId }
  | { type: 'unfrozen'; instanceId: InstanceId }
  | { type: 'burnApplied'; instanceId: InstanceId; amount: number }
  | { type: 'statsChanged'; instanceId: InstanceId; attack: number; hp: number }

  // -- super meter ----------------------------------------------------------
  | { type: 'superCharged'; player: PlayerId; gained: number; total: number }
  | { type: 'superDelivered'; player: PlayerId; cardId: CardId }
  /** Meter filled but the hand was at capacity, so it holds and stops
   *  charging until there is room. (§9) */
  | { type: 'superHeld'; player: PlayerId }

  // -- game over ------------------------------------------------------------
  | {
      type: 'gameEnded';
      winner: PlayerId;
      reason: 'avatarDefeated' | 'deckedOut';
    };

export type GameEventType = GameEvent['type'];

/**
 * What every engine function returns.
 *
 * Threading events through means each function appends rather than replacing,
 * so a single action can produce a long ordered stream — deploy, trigger,
 * summon, death, death trigger.
 */
export interface EngineResult<S> {
  state: S;
  events: GameEvent[];
}