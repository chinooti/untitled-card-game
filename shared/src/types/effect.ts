/**
 * Effects — what a card actually does.
 *
 * DESIGN DECISION: effects are *data*, not functions.
 *
 * The alternative is putting behaviour directly on cards:
 *
 *     onDeath: (state, ctx) => GameState
 *
 * That is faster to write and infinitely flexible. It also makes cards
 * non-serialisable, which quietly breaks the authoritative-server architecture:
 * a function cannot be sent over a socket, stored as JSON, or snapshotted for
 * a replay. Since online is the primary deliverable and replays fall out of the
 * event stream almost free, effects are data.
 *
 * The cost is real and worth stating: unusual one-off cards are awkward to
 * express, and the union below will grow as cards are designed. That is
 * expected. Add variants when a card needs them — do not speculatively design
 * for cards that don't exist yet.
 *
 * The payoff: one `applyEffect` function in the engine, and every new card is
 * a data entry rather than new code.
 */

import type { CardId, LaneIndex } from './primitives';
import type { Keyword } from './keyword';

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------

export type TargetSide = 'friendly' | 'enemy' | 'any';

/** What kind of thing is being targeted. */
export type TargetWhat =
  | 'troop'      // troop slot only
  | 'protector'  // protector slot only
  | 'unit'       // either slot — the umbrella term
  | 'avatar';

/** How the target is picked. */
export type TargetSelection =
  | 'chosen'   // the player picks, at play time
  | 'all'      // every legal target
  | 'random'
  | 'self'     // the unit carrying this effect
  | 'source'   // the unit that caused the triggering event
  | 'killer';  // the unit that dealt the killing blow (Chomper)

/** Which lanes are in scope. Omitted means the whole board. */
export type LaneScope =
  | { kind: 'this' }              // the lane the source occupies
  | { kind: 'specific'; lane: LaneIndex }
  | { kind: 'all' };

export interface TargetSpec {
  side: TargetSide;
  what: TargetWhat;
  selection: TargetSelection;
  lane?: LaneScope;
}

// ---------------------------------------------------------------------------
// Placement (for summon effects)
// ---------------------------------------------------------------------------

/**
 * Where summoned tokens go.
 *
 * Note the constraint from GAME_DESIGN.md §7: a lane holds exactly one troop,
 * so multi-summon effects MUST distribute across lanes. "Summon 2 in this lane"
 * is unimplementable and would always partially resolve to 1.
 */
export type PlacementSpec =
  | { kind: 'distribute' }                    // fill free troop slots, lowest lane first
  | { kind: 'thisLane' }                      // only valid for count === 1
  | { kind: 'specific'; lane: LaneIndex };

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/**
 * All effects resolve as far as they can and discard the remainder silently.
 * Draw 3 with 6 cards in hand draws 2. Summon 2 with 1 free slot summons 1.
 * Nothing fails outright for being unable to fully resolve. (§7)
 */
export type Effect =
  | { kind: 'damage'; target: TargetSpec; amount: number }
  | { kind: 'heal'; target: TargetSpec; amount: number }
  | { kind: 'destroy'; target: TargetSpec }

  | { kind: 'summon'; token: CardId; count: number; placement: PlacementSpec }

  | { kind: 'draw'; count: number }

  /** Stat change. `duration: 'turn'` expires at End; 'permanent' persists
   *  for the life of the instance — note a Lives respawn is a *new* unit
   *  and does not inherit it. (§14) */
  | {
      kind: 'buff';
      target: TargetSpec;
      attack?: number;
      hp?: number;
      duration: 'permanent' | 'turn';
    }

  | { kind: 'grantKeyword'; target: TargetSpec; keyword: Keyword }

   /** Target misses its next `attacks` attacks. Applied as a status on the
   *  instance, not a keyword. Does not prevent Retaliate — freezing stops a
   *  unit attacking, not defending itself. */
  | { kind: 'freeze'; target: TargetSpec; attacks: number }

  /** Target attacks `count` extra times, expiring at end of turn. The
   *  permanent printed version is the `extraAttacks` keyword. */
  | { kind: 'grantExtraAttack'; target: TargetSpec; count: number }

  /** Requires a free slot on the taking player's side; partially resolves
   *  to nothing if there isn't one. */
  | { kind: 'takeControl'; target: TargetSpec }

  | { kind: 'swapStats'; target: TargetSpec }

  /** Copy the ability set of another unit (Illusionist). */
  | { kind: 'copyAbilities'; target: TargetSpec }

  /** Composition. Resolves in array order; each element partially resolves
   *  independently. */
  | { kind: 'sequence'; effects: Effect[] };

export type EffectKind = Effect['kind'];
