/**
 * Keywords — static, parameterised properties a unit has.
 *
 * A keyword is something a unit *is*, checked by the engine at the relevant
 * moment. It is distinct from a triggered ability, which is something a unit
 * *does* in response to an event (see ability.ts).
 *
 * Protector is NOT here. It is a card type, not a keyword.
 */

/**
 * Discriminated union on `kind`.
 *
 * The alternative — `{ name: string; value?: number }` — would compile happily
 * for `{ name: 'pierce', value: 7 }`, which is meaningless. With this shape,
 * TypeScript narrows on `kind`, so inside a `case 'retaliate':` you have
 * `amount` and nothing else, and a keyword that takes no parameter cannot be
 * given one.
 *
 * It also enables exhaustiveness checking: a `default: assertNever(k)` in an
 * engine switch turns "added a keyword and forgot to handle it somewhere" into
 * a compile error rather than a silent no-op at runtime.
 */
export type Keyword =
  /** Once combat resolves in this lane, deal `amount` to the attacker.
   *  Fires even if this unit died in the exchange. (§4) */
  | { kind: 'retaliate'; amount: number }

  /** When this unit damages an enemy TROOP, that troop takes `amount` damage
   *  at every post-combat phase, indefinitely.
   *
   *  Applies to troops only — never Protectors or avatars — so a defended
   *  lane cannot be ground down. Does not stack: a second application
   *  refreshes rather than adds. Countered by Regenerate. (§12) */
  | { kind: 'decay'; amount: number }

  /** Heals `amount` after every attack phase. (§12) */
  | { kind: 'regenerate'; amount: number }

  /** Respawns at full stats in Post-combat, consuming one life.
   *  Consuming a life counts as a death and fires on-death effects. (§12) */
  | { kind: 'lives'; count: number }

  /** Full damage to the Protector, the troop behind it, and the avatar,
   *  simultaneously. (§12) */
  | { kind: 'pierce' }

  /** Reduces attack of enemy troops in this lane by `reduction`,
   *  floored at MINIMUM_DAMAGE. (§12) */
  | { kind: 'chill'; reduction: number }

  /** Attacks 'count' addtitional times each attack phase. Printed on the card and 
   *  permanent as opposed to a temproarily granted extra attack which is a status.
   *  
   */
  | { kind: 'extraAttacks'; count: number }

  /** Cannot be targeted by spells. */
  | { kind: 'spellImmune' };

export type KeywordKind = Keyword['kind'];

/**
 * Compile-time exhaustiveness guard.
 *
 * Call in the `default` branch of a switch over a union. If a new variant is
 * added and a switch somewhere doesn't handle it, that call stops compiling —
 * the compiler points at every site that needs updating.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
