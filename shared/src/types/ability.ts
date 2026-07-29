/**
 * Abilities — the bridge between keywords and effects.
 *
 * A card's `abilities` array holds both kinds:
 *
 *   - a keyword is a static property the engine checks at the right moment
 *     ("does this unit have Retaliate?")
 *   - a triggered ability is an event subscription ("when this dies, do X")
 *
 * Keeping them in one union means a card has a single `abilities` field rather
 * than separate `keywords` and `triggers` arrays, and the engine can filter by
 * `type` when it needs one or the other.
 */

import type { Effect } from './effect';
import type { Keyword } from './keyword';

/**
 * Events a triggered ability can subscribe to.
 *
 * Timings map to the turn structure in GAME_DESIGN.md §3. Note there is no
 * start-of-turn event — the design deliberately has no start-of-turn phase,
 * and everything that would need one lives in Post-combat.
 */
export type TriggerEvent =
  /** This card entered play. */
  | { on: 'play' }

  /** This card was destroyed. Fires on a Lives respawn too — consuming a
   *  life counts as a death. (§12) */
  | { on: 'death' }

  /** Any friendly unit was destroyed (Death Knight). */
  | { on: 'friendlyDeath' }

  /** This unit destroyed an enemy unit. */
  | { on: 'kill' }

  /** This unit took damage. */
  | { on: 'damaged' }

  /** Controller cast a spell (Apprentice, Arcane Scholar). */
  | { on: 'spellCast' }

  /** Post-combat phase — fires after EVERY attack phase, i.e. twice per
   *  round. This is where Burn and Regenerate tick. (§3) */
  | { on: 'postCombat' }

  /** End of the controller's turn. */
  | { on: 'endTurn' };

export type TriggerName = TriggerEvent['on'];

export type Ability =
  | { type: 'keyword'; keyword: Keyword }
  | { type: 'triggered'; trigger: TriggerEvent; effect: Effect };

/** Narrowing helpers — used constantly in the engine, worth having once. */
export const isKeyword = (a: Ability): a is Extract<Ability, { type: 'keyword' }> =>
  a.type === 'keyword';

export const isTriggered = (a: Ability): a is Extract<Ability, { type: 'triggered' }> =>
  a.type === 'triggered';
