/**
 * Card definitions — the immutable "printed" cards.
 *
 * A Card is what is written on the card: Flame Imp is always 2/1 for 1 mana.
 * There is exactly one Card object per card in the game, held in a registry.
 *
 * What sits in a lane is a CardInstance (see instance.ts), which references a
 * Card by id and carries the mutable state — current HP, buffs, statuses.
 * Two Flame Imps in two lanes are two instances pointing at one definition.
 *
 * Keeping these separate is what stops "damage one copy, damage them all" bugs
 * and gives base stats a single source of truth.
 */

import type { AvatarId, CardClass, CardId, SlotKind } from './primitives';
import type { Ability } from './ability';
import type { Effect } from './effect';

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

interface CardBase {
  id: CardId;
  name: string;
  /** Rules text as printed. Display only — the engine reads `abilities`
   *  and `effect`, never this. */
  text: string;
}

/**
 * A card that can appear in a deck, and therefore has a mana cost and belongs
 * to a class.
 *
 * Tokens and supers deliberately do NOT extend this: tokens have no cost and
 * are never in a deck, and supers are granted by the meter rather than drawn.
 * Keeping them out of this base is what lets `DeckCard` below be enforced by
 * the compiler rather than by a runtime check in the deck validator.
 */
interface DeckCardBase extends CardBase {
  cost: number;
  class: CardClass;
}

/** Fields common to anything that occupies a lane slot. */
interface UnitCardBase {
  attack: number;
  hp: number;
  abilities: Ability[];
}

// ---------------------------------------------------------------------------
// Card types
// ---------------------------------------------------------------------------

/** Occupies the troop slot. */
export interface TroopCard extends DeckCardBase, UnitCardBase {
  type: 'troop';
}

/**
 * Occupies the protector slot. Must be destroyed before the troop behind it
 * can be targeted. (GAME_DESIGN.md §11)
 *
 * A separate card type rather than a keyword on a troop, so it appears as its
 * own deckbuilding category and so card text can distinguish "troops" from
 * "protectors" from "all units".
 *
 * `attack` is usually 0, but a Protector with attack is legal — a 0-attack
 * unit simply does nothing during the attack phase, which needs no special
 * case under one-directional combat.
 */
export interface ProtectorCard extends DeckCardBase, UnitCardBase {
  type: 'protector';
}

/** One-time effect. Removed from the game after use — there is no discard. */
export interface SpellCard extends DeckCardBase {
  type: 'spell';
  effect: Effect;
}

/**
 * Replaces a unit already in play and restores it to full HP.
 *
 * A normal deck card with a mana cost. There is no trigger condition — the
 * gate is drawing this and having a legal target on the board. (§11)
 */
export interface EvolutionCard extends DeckCardBase, UnitCardBase {
  type: 'evolution';
  /** Which slot this occupies. The engine validates that the target occupies
   *  the same slot, which enforces "Protectors evolve strictly into
   *  Protectors". */
  slot: SlotKind;
  evolvesFrom: EvolutionRequirement;
}

/**
 * `any` accepts any unit in the matching slot — consistent but weaker.
 * `named` requires a specific card — stronger, less consistent, and does the
 * work of teaching class identity.
 */
export type EvolutionRequirement =
  | { kind: 'any' }
  | { kind: 'named'; cardId: CardId };

/** Created by effects, never in a deck, therefore no cost and no class. */
export interface TokenCard extends CardBase, UnitCardBase {
  type: 'token';
}

/**
 * Delivered by the super meter, not drawn. Goes to hand and costs 1 mana.
 *
 * `source` records where it comes from: each avatar has two class supers and
 * one unique to that avatar. Eight class supers plus six unique ones cover all
 * six avatars. (§9)
 */
export interface SuperCard extends CardBase {
  type: 'super';
  cost: number;
  effect: Effect;
  source:
    | { kind: 'class'; class: CardClass }
    | { kind: 'avatar'; avatarId: AvatarId };
}

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

/**
 * Every card in the game.
 *
 * A discriminated union on `type` rather than one interface with optional
 * fields. The flat alternative would permit a spell with 6 HP and force a null
 * check at every use site; this way `card.type === 'spell'` narrows to exactly
 * the fields a spell has.
 */
export type Card =
  | TroopCard
  | ProtectorCard
  | SpellCard
  | EvolutionCard
  | TokenCard
  | SuperCard;

/**
 * Cards legal in a deck. Tokens and supers are excluded by construction, so
 * the deck validator gets compile-time help rather than relying on a runtime
 * `if (card.type === 'token') reject`.
 */
export type DeckCard = TroopCard | ProtectorCard | SpellCard | EvolutionCard;

/** Cards that occupy a lane slot and have attack, HP and abilities. */
export type UnitCard = TroopCard | ProtectorCard | EvolutionCard | TokenCard;

export type CardType = Card['type'];

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

const UNIT_TYPES = ['troop', 'protector', 'evolution', 'token'] as const;
const DECK_TYPES = ['troop', 'protector', 'spell', 'evolution'] as const;

export const isUnitCard = (c: Card): c is UnitCard =>
  (UNIT_TYPES as readonly string[]).includes(c.type);

export const isDeckCard = (c: Card): c is DeckCard =>
  (DECK_TYPES as readonly string[]).includes(c.type);

/** The registry: every card definition in the game, keyed by id. */
export type CardRegistry = Readonly<Record<CardId, Card>>;