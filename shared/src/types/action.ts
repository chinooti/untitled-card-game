/**
 * Actions — the complete set of things a player can do.
 *
 * The engine's signature is (state, action) => { state, events }. This file
 * defines the input half.
 *
 * Note what is NOT here: there is no attack action. Attacking is mandatory,
 * targeting is fixed (Protector -> troop -> avatar), and lanes resolve in a
 * fixed order — so combat is entirely determined by board state and needs no
 * player input. A player's whole decision space is deployment, targeting, and
 * when to end the turn.
 *
 * That is also why the Phase 4 AI is tractable: `getLegalActions` returns a
 * finite list, so a random AI is one line and a heuristic AI is scoring that
 * list.
 */

import type {
  CardId,
  InstanceId,
  LaneIndex,
  PlayerId,
} from './primitives';

// ---------------------------------------------------------------------------
// Target references
// ---------------------------------------------------------------------------

/**
 * How a player points at something when playing a card.
 *
 * Distinct from TargetSpec in effect.ts: a TargetSpec is the printed rule
 * ("one enemy troop"), while a TargetRef is the concrete choice the player
 * made ("that specific instance"). The engine validates the ref against the
 * spec.
 */
export type TargetRef =
  | { kind: 'instance'; instanceId: InstanceId }
  | { kind: 'avatar'; player: PlayerId }
  | { kind: 'lane'; player: PlayerId; lane: LaneIndex };

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Split by payload shape rather than by card type: playing a troop and playing
 * a protector need identical information (which card, which lane), so they
 * share an action. A spell needs targets instead, and an evolution needs a
 * unit already in play.
 *
 * `player` is on every action even in single-player. It is how the engine
 * rejects "p2 plays a card during p1's turn", and the check is identical
 * whether the action came from a human, the AI, or later a socket.
 */
export type Action =
  /** Discard one card from the opening hand and draw a replacement. The
   *  discarded card returns to the deck but cannot be immediately redrawn.
   *  (§2) */
  | { type: 'mulliganReroll'; player: PlayerId; handIndex: number }

  /** Accept the current opening hand, spending no further rerolls. */
  | { type: 'mulliganConfirm'; player: PlayerId }

  /** Deploy a troop or protector. The card's type determines which slot it
   *  occupies, so no slot field is needed. */
  | { type: 'playUnit'; player: PlayerId; cardId: CardId; lane: LaneIndex }

  /** Cast a spell or play a super. Both are cards in hand with an effect and
   *  optional targets; the only difference is how they arrived there. */
  | { type: 'playSpell'; player: PlayerId; cardId: CardId; targets: TargetRef[] }

  /** Replace a unit in play, restoring it to full HP. The engine validates
   *  that the target matches the evolution's slot and requirement. */
  | {
      type: 'playEvolution';
      player: PlayerId;
      cardId: CardId;
      target: InstanceId;
    }

  /** Leave Deploy. Everything after — combat, post-combat, end triggers —
   *  runs automatically. */
  | { type: 'endTurn'; player: PlayerId };

export type ActionType = Action['type'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Result of checking whether an action is legal.
 *
 * Returns a reason rather than a boolean so one function serves three
 * consumers: the UI greys out an illegal card and explains why, the AI filters
 * candidate actions, and the server rejects invalid input.
 */
export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export const valid = (): ValidationResult => ({ ok: true });
export const invalid = (reason: string): ValidationResult => ({
  ok: false,
  reason,
});