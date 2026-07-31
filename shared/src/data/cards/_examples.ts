/**
 * SYNTAX REFERENCE — not part of the game.
 *
 * These are not designed cards. They exist to show the shape of each card type
 * so real cards can be written against a working example, and they are
 * deliberately NOT exported into the registry (see index.ts).
 *
 * Delete this file once the real card set is written.
 *
 * ID convention for real cards: `{class}.{snake_case_name}`. Stable forever —
 * ids end up in saved decks and replays, so renaming a card's display name
 * should never change its id.
 */

import type {
  EvolutionCard,
  ProtectorCard,
  SpellCard,
  TokenCard,
  TroopCard,
} from '../../types/card';

// ---------------------------------------------------------------------------
// 1 — vanilla troop
// ---------------------------------------------------------------------------

export const exampleTroop = {
  id: 'example.troop',
  name: 'Example Troop',
  type: 'troop',
  class: 'fire',
  cost: 1,
  text: '',
  attack: 2,
  hp: 1,
  abilities: [],
} satisfies TroopCard;

// ---------------------------------------------------------------------------
// 2 — printed keyword
//
// `abilities` holds { type: 'keyword', keyword: {...} }. The engine checks for
// it at the relevant moment; nothing is triggered.
// ---------------------------------------------------------------------------

export const exampleKeywordTroop = {
  id: 'example.keyword_troop',
  name: 'Example Keyword Troop',
  type: 'troop',
  class: 'undead',
  cost: 3,
  text: 'Decay 2.',
  attack: 1,
  hp: 4,
  abilities: [{ type: 'keyword', keyword: { kind: 'decay', amount: 2 } }],
} satisfies TroopCard;

// ---------------------------------------------------------------------------
// 3 — protector with a triggered ability
//
// A triggered ability pairs an event with an effect. Attack 0 needs no special
// case: under one-directional combat a 0-attack unit simply does nothing.
// ---------------------------------------------------------------------------

export const exampleProtector = {
  id: 'example.protector',
  name: 'Example Protector',
  type: 'protector',
  class: 'earth',
  cost: 2,
  text: 'On death: deal 1 damage to all enemy troops in this lane.',
  attack: 0,
  hp: 6,
  abilities: [
    {
      type: 'triggered',
      trigger: { on: 'death' },
      effect: {
        kind: 'damage',
        amount: 1,
        target: {
          side: 'enemy',
          what: 'troop',
          selection: 'all',
          lane: { kind: 'this' },
        },
      },
    },
  ],
} satisfies ProtectorCard;

// ---------------------------------------------------------------------------
// 4 — spell with a player-chosen target
//
// `selection: 'chosen'` means the player picks on play. The engine validates
// that choice against this spec.
// ---------------------------------------------------------------------------

export const exampleSpell = {
  id: 'example.spell',
  name: 'Example Spell',
  type: 'spell',
  class: 'fire',
  cost: 3,
  text: 'Deal 4 damage to one target.',
  effect: {
    kind: 'damage',
    amount: 4,
    target: { side: 'enemy', what: 'unit', selection: 'chosen' },
  },
} satisfies SpellCard;

// ---------------------------------------------------------------------------
// 5 — evolution with a named requirement
//
// `slot` must match the slot its target occupies, which enforces "Protectors
// evolve strictly into Protectors". `evolvesFrom.cardId` is checked by the
// registry at startup, since types cannot verify a card exists.
// ---------------------------------------------------------------------------

export const exampleEvolution = {
  id: 'example.evolution',
  name: 'Example Evolution',
  type: 'evolution',
  class: 'fire',
  cost: 4,
  text: 'Pierce. Evolves from Example Troop.',
  slot: 'troop',
  evolvesFrom: { kind: 'named', cardId: 'example.troop' },
  attack: 4,
  hp: 6,
  abilities: [{ type: 'keyword', keyword: { kind: 'pierce' } }],
} satisfies EvolutionCard;

// ---------------------------------------------------------------------------
// 6 — death trigger summoning a token
//
// `placement: 'thisLane'` is legal here specifically because the unit dying is
// what frees the slot. For a summon of more than one, or any summon while the
// source is still alive, use 'distribute' — one troop slot per lane means a
// second token in the same lane silently resolves to nothing.
// ---------------------------------------------------------------------------

export const exampleToken = {
  id: 'example.token',
  name: 'Example Token',
  type: 'token',
  text: '',
  attack: 1,
  hp: 1,
  abilities: [],
} satisfies TokenCard;

export const exampleSummoner = {
  id: 'example.summoner',
  name: 'Example Summoner',
  type: 'troop',
  class: 'undead',
  cost: 1,
  text: 'On death: summon an Example Token in this lane.',
  attack: 1,
  hp: 2,
  abilities: [
    {
      type: 'triggered',
      trigger: { on: 'death' },
      effect: {
        kind: 'summon',
        token: 'example.token',
        count: 1,
        placement: { kind: 'thisLane' },
      },
    },
  ],
} satisfies TroopCard;