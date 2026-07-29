/**
 * Primitive types and tuning constants.
 *
 * Everything else in the project builds on these. Values marked "Phase 4"
 * are provisional and will be set by bot-vs-bot simulation, not by guessing.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/**
 * Identifies a card *definition* — the immutable printed card.
 * e.g. 'fire.flame_imp'. Two Flame Imps on the board share this.
 */
export type CardId = string;

/**
 * Identifies a card *instance* — one physical copy in play.
 * Two Flame Imps in two lanes have the same CardId and different InstanceIds.
 */
export type InstanceId = string;

export type PlayerId = 'p1' | 'p2';

/* Identifies the avatar you are using */
export type AvatarId = string;

/**
 * Lane index, 0-based. Lanes resolve in ascending order during combat.
 *
 * Deliberately `number` rather than `0 | 1 | 2 | 3`. A literal union would give
 * compile-time bounds checking, but lane count is explicitly a Phase 4 tuning
 * value — hardcoding 4 into the type would mean touching every signature to
 * change it. Runtime validation against LANE_COUNT instead.
 */
export type LaneIndex = number;

export type CardClass = 'fire' | 'defence' | 'undead' | 'magic';

/** The two slots each side of a lane provides. */
export type SlotKind = 'troop' | 'protector';

// ---------------------------------------------------------------------------
// Tuning constants (GAME_DESIGN.md §2, §16)
// ---------------------------------------------------------------------------

export const LANE_COUNT = 4;
export const STARTING_AVATAR_HP = 25;
export const DECK_SIZE = 30;
export const MAX_COPIES_PER_CARD = 4;
export const OPENING_HAND_SIZE = 4;
export const MULLIGAN_REROLLS = 4;
export const MAX_HAND_SIZE = 8;
export const MAX_MANA = 10;
export const SUPER_FILLS_PER_GAME = 3;
export const SUPERS_PER_AVATAR = 3;
export const SUPER_MANA_COST = 1;

/** Chill can never reduce an attack below this. (§12) */
export const MINIMUM_DAMAGE = 1;
