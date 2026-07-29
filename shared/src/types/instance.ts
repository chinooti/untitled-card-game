/**
 * CardInstance — one copy of a card actually in play.
 *
 * A Card (card.ts) is the printed definition and never changes. A CardInstance
 * is a specific copy on the board with its own current HP, buffs and statuses.
 * Two Flame Imps in two lanes share a `cardId` and have different
 * `instanceId`s.
 *
 * The instance stores a reference to its definition, never a copy of it. Base
 * stats are looked up from the CardRegistry, so there is exactly one source of
 * truth for what Flame Imp is.
 */

import type { CardId, InstanceId, PlayerId } from './primitives';
import type { Ability } from './ability';

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------

/**
 * Temporary conditions applied to a unit in play.
 *
 * Distinct from keywords, which are printed on the card and never change. A
 * unit can have the `extraAttacks` keyword (permanent, printed) and separately
 * be granted a bonus attack by a spell (temporary, tracked here).
 */
export interface StatusState {
  /**
   * Misses its next attack. Consumed by any attack the unit would make,
   * including a bonus attack — so a frozen unit granted a bonus attack loses
   * the first swing and connects with the second.
   *
   * A boolean rather than a counter because Freeze does not stack. Applying
   * Freeze to an already-frozen unit is a no-op, and "frozen 3 times" cannot
   * be represented.
   */
  frozen: boolean;

  /** Extra attacks granted this turn. Expires at End. The permanent version
   *  is the `extraAttacks` keyword on the card. */
  grantedAttacks: number;

  /** Burn damage ticking on this unit after every attack phase. 0 = not
   *  burning. Stored here rather than read from keywords because a unit can
   *  be set alight by an effect regardless of what is printed on it. */
  burning: number;
}

export const emptyStatus = (): StatusState => ({
  frozen: false,
  grantedAttacks: 0,
  burning: 0,
});

// ---------------------------------------------------------------------------
// Stat modifiers
// ---------------------------------------------------------------------------

/**
 * Accumulated stat changes, split by lifetime so turn-duration buffs can be
 * cleared at End without disturbing permanent ones.
 *
 * Two accumulators rather than a list of individual buff objects: the design
 * only distinguishes 'permanent' and 'turn', so a list would carry bookkeeping
 * for a distinction that does not exist. Revisit if a card ever needs to
 * remove one specific buff.
 */
export interface StatModifiers {
  permanentAttack: number;
  permanentHp: number;
  turnAttack: number;
  turnHp: number;
}

export const emptyModifiers = (): StatModifiers => ({
  permanentAttack: 0,
  permanentHp: 0,
  turnAttack: 0,
  turnHp: 0,
});

// ---------------------------------------------------------------------------
// The instance
// ---------------------------------------------------------------------------

export interface CardInstance {
  /** Unique to this copy. Generated on entering play. */
  instanceId: InstanceId;

  /** Points at the definition in the CardRegistry. */
  cardId: CardId;

  /**
   * Who currently commands this unit.
   *
   * There is no separate `owner` field. Ownership would matter if a stolen
   * unit returned to its original deck on death, but there is no discard pile
   * and cards leaving play are removed from the game — so nothing ever needs
   * to know where it came from.
   */
  controller: PlayerId;

  /** Damage is applied here. Base HP lives on the definition. */
  currentHp: number;

  /** Lives remaining. Initialised from the `lives` keyword, decremented on
   *  each death. A respawn is a completely new instance — the old one keeps
   *  no statuses, buffs or abilities. */
  livesRemaining: number;

  status: StatusState;
  modifiers: StatModifiers;

  /**
   * Abilities gained after entering play — granted keywords, or an ability set
   * copied from another unit. Printed abilities stay on the definition; these
   * are additive.
   */
  addedAbilities: Ability[];
}

/**
 * Note what is NOT here: lane and slot.
 *
 * Position is a property of the board, not of the card — the Lane holds the
 * instance, rather than the instance recording where it thinks it is. Storing
 * it in both places would mean two sources of truth that can drift apart, and
 * "unit believes it is in lane 2 but lane 3 is holding it" is a miserable bug
 * to track down. The engine looks up position by scanning lanes when an effect
 * needs "this lane" scope.
 */