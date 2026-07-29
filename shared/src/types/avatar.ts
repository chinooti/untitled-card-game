/**
 * Avatar definitions — the immutable "printed" avatars.
 *
 * Mirrors the split in card.ts / instance.ts: this file holds what an avatar
 * IS (its classes, its charge condition, which supers it can receive), while
 * the mutable per-game state (HP, meter charge, supers already used) lives in
 * state.ts.
 *
 * Four classes give six avatars. (GAME_DESIGN.md §8)
 */

import type { AvatarId, CardClass, CardId } from './primitives';

// ---------------------------------------------------------------------------
// Super meter charging
// ---------------------------------------------------------------------------

/**
 * What an avatar's meter responds to.
 *
 * Every avatar ALSO charges from damage taken to its own avatar — that is
 * universal and lives in the engine, not here. This is the avatar-specific
 * condition layered on top. (§9)
 */
export type ChargeEvent =
  /** Damage dealt to the enemy avatar. */
  | { on: 'avatarDamageDealt' }
  /** HP restored by this player, to anything. */
  | { on: 'healingDone' }
  /** Enemy units destroyed by this player. */
  | { on: 'enemyUnitKilled' }
  /** Damage absorbed by this player's units. */
  | { on: 'friendlyUnitDamaged' }
  /** Friendly units destroyed, from any cause. */
  | { on: 'friendlyUnitDied' }
  /** Spells cast by this player. */
  | { on: 'spellCast' };

/**
 * A numeric rate, not an event counter.
 *
 * Counting events would make "charges when you heal" fire once per heal
 * regardless of size, and "charges when you kill" fire zero times in a stalled
 * game — meaning some avatars effectively have a mechanic others don't. A rate
 * per unit gives every charger a real dial, so all six can be tuned to fill in
 * a comparable window. (§9)
 */
export interface ChargeCondition {
  event: ChargeEvent;
  /** Charge gained per unit of the event — per HP healed, per unit killed,
   *  per point of damage absorbed. */
  chargePerUnit: number;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export interface Avatar {
  id: AvatarId;
   /** Proper name, e.g. "Ashra". Empty until named — display falls back to
   *  the title alone. */
  name: string;

  /** Class-pairing title, e.g. "Pyromancer". Full display is
   *  `${name} the ${title}`. */
  title: string;

  /** The two classes whose cards this avatar may run. Deck ratio is free —
   *  0 to 30 from either, mono-class decks legal, no neutral cards. (§8) */
  classes: readonly [CardClass, CardClass];

  /** Avatar-specific charge condition, on top of the universal damage
   *  charge. */
  charge: ChargeCondition;

  /** How much charge fills the meter once. Tuned per avatar so all six fill
   *  in a comparable window — a Phase 4 measurement. (§16) */
  chargeThreshold: number;

  /**
   * The three supers this avatar can receive: one from each of its classes,
   * plus one unique to this avatar.
   *
   * A fixed-length tuple rather than CardId[] — exactly three is a rule, and
   * the compiler can enforce it here rather than a runtime length check.
   */
  supers: readonly [CardId, CardId, CardId];
}

/** Every avatar definition, keyed by id. */
export type AvatarRegistry = Readonly<Record<AvatarId, Avatar>>;