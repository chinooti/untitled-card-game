/**
 * TEST FIXTURES — not game content.
 *
 * Deliberately boring cards whose only job is to exercise engine rules. They
 * are named for what they test, not for flavour, and they are never exported
 * from the engine's public index.
 *
 * The real card set lives in @cardgame/shared and is designed separately. The
 * engine never imports it: registries are passed in, so these fixtures and the
 * real cards are interchangeable from the engine's point of view.
 */

import type {
  Avatar,
  AvatarRegistry,
  Card,
  CardId,
  CardRegistry,
} from '@cardgame/shared';

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export const FIXTURE_CARDS: Card[] = [
  // -- fire -----------------------------------------------------------------
  {
    id: 'test.fire_vanilla',
    name: 'Test Fire Vanilla',
    type: 'troop',
    class: 'fire',
    cost: 1,
    text: '',
    attack: 2,
    hp: 2,
    abilities: [],
  },
  {
    id: 'test.fire_big',
    name: 'Test Fire Big',
    type: 'troop',
    class: 'fire',
    cost: 5,
    text: '',
    attack: 5,
    hp: 5,
    abilities: [],
  },
  {
    id: 'test.fire_spell',
    name: 'Test Fire Spell',
    type: 'spell',
    class: 'fire',
    cost: 2,
    text: 'Deal 3 damage to one target.',
    effect: {
      kind: 'damage',
      amount: 3,
      target: { side: 'enemy', what: 'unit', selection: 'chosen' },
    },
  },
  {
    id: 'test.fire_evolution',
    name: 'Test Fire Evolution',
    type: 'evolution',
    class: 'fire',
    cost: 3,
    text: 'Evolves from Test Fire Vanilla.',
    slot: 'troop',
    evolvesFrom: { kind: 'named', cardId: 'test.fire_vanilla' },
    attack: 4,
    hp: 4,
    abilities: [],
  },

  // -- earth ----------------------------------------------------------------
  {
    id: 'test.earth_protector',
    name: 'Test Earth Protector',
    type: 'protector',
    class: 'earth',
    cost: 1,
    text: '',
    attack: 0,
    hp: 6,
    abilities: [],
  },
  {
    id: 'test.earth_retaliator',
    name: 'Test Earth Retaliator',
    type: 'protector',
    class: 'earth',
    cost: 3,
    text: 'Retaliate 2.',
    attack: 0,
    hp: 5,
    abilities: [{ type: 'keyword', keyword: { kind: 'retaliate', amount: 2 } }],
  },
  {
    id: 'test.earth_vanilla',
    name: 'Test Earth Vanilla',
    type: 'troop',
    class: 'earth',
    cost: 2,
    text: '',
    attack: 1,
    hp: 4,
    abilities: [],
  },
  {
    id: 'test.earth_regenerator',
    name: 'Test Earth Regenerator',
    type: 'troop',
    class: 'earth',
    cost: 3,
    text: 'Regenerate 2.',
    attack: 1,
    hp: 6,
    abilities: [{ type: 'keyword', keyword: { kind: 'regenerate', amount: 2 } }],
  },

  // -- undead ---------------------------------------------------------------
  {
    id: 'test.undead_decayer',
    name: 'Test Undead Decayer',
    type: 'troop',
    class: 'undead',
    cost: 2,
    text: 'Decay 2.',
    attack: 1,
    hp: 3,
    abilities: [{ type: 'keyword', keyword: { kind: 'decay', amount: 2 } }],
  },
  {
    id: 'test.undead_summoner',
    name: 'Test Undead Summoner',
    type: 'troop',
    class: 'undead',
    cost: 1,
    text: 'On death: summon a token.',
    attack: 1,
    hp: 1,
    abilities: [
      {
        type: 'triggered',
        trigger: { on: 'death' },
        effect: {
          kind: 'summon',
          token: 'test.token',
          count: 1,
          placement: { kind: 'thisLane' },
        },
      },
    ],
  },
  {
    id: 'test.undead_lives',
    name: 'Test Undead Lives',
    type: 'troop',
    class: 'undead',
    cost: 3,
    text: '2 Lives.',
    attack: 2,
    hp: 3,
    abilities: [{ type: 'keyword', keyword: { kind: 'lives', count: 2 } }],
  },

  // -- frost ----------------------------------------------------------------
  {
    id: 'test.frost_vanilla',
    name: 'Test Frost Vanilla',
    type: 'troop',
    class: 'frost',
    cost: 2,
    text: '',
    attack: 2,
    hp: 3,
    abilities: [],
  },
  {
    id: 'test.frost_freeze',
    name: 'Test Frost Freeze',
    type: 'spell',
    class: 'frost',
    cost: 2,
    text: 'Freeze one enemy troop.',
    effect: {
      kind: 'freeze',
      attacks: 1,
      target: { side: 'enemy', what: 'troop', selection: 'chosen' },
    },
  },
  {
    id: 'test.frost_draw',
    name: 'Test Frost Draw',
    type: 'spell',
    class: 'frost',
    cost: 3,
    text: 'Draw 2 cards.',
    effect: { kind: 'draw', count: 2 },
  },

  // -- tokens ---------------------------------------------------------------
  {
    id: 'test.token',
    name: 'Test Token',
    type: 'token',
    text: '',
    attack: 1,
    hp: 1,
    abilities: [],
  },

  // -- supers ---------------------------------------------------------------
  {
    id: 'test.super_fire',
    name: 'Test Fire Super',
    type: 'super',
    cost: 1,
    text: 'Deal 4 damage to the enemy avatar.',
    source: { kind: 'class', class: 'fire' },
    effect: {
      kind: 'damage',
      amount: 4,
      target: { side: 'enemy', what: 'avatar', selection: 'all' },
    },
  },
  {
    id: 'test.super_earth',
    name: 'Test Earth Super',
    type: 'super',
    cost: 1,
    text: 'Heal your avatar for 6.',
    source: { kind: 'class', class: 'earth' },
    effect: {
      kind: 'heal',
      amount: 6,
      target: { side: 'friendly', what: 'avatar', selection: 'all' },
    },
  },
  {
    id: 'test.super_unique',
    name: 'Test Unique Super',
    type: 'super',
    cost: 1,
    text: 'Draw 3 cards.',
    source: { kind: 'avatar', avatarId: 'test.fire_earth' },
    effect: { kind: 'draw', count: 3 },
  },
];

export const fixtureCards: CardRegistry = Object.fromEntries(
  FIXTURE_CARDS.map((c) => [c.id, c]),
);

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

export const FIXTURE_AVATARS: Avatar[] = [
  {
    id: 'test.fire_earth',
    name: '',
    title: 'Test Turret',
    classes: ['fire', 'earth'],
    charge: { event: { on: 'avatarDamageDealt' }, chargePerUnit: 5 },
    chargeThreshold: 100,
    supers: ['test.super_fire', 'test.super_earth', 'test.super_unique'],
  },
  {
    id: 'test.undead_frost',
    name: '',
    title: 'Test Necromancer',
    classes: ['undead', 'frost'],
    charge: { event: { on: 'friendlyUnitDied' }, chargePerUnit: 20 },
    chargeThreshold: 100,
    supers: ['test.super_fire', 'test.super_earth', 'test.super_unique'],
  },
];

export const fixtureAvatars: AvatarRegistry = Object.fromEntries(
  FIXTURE_AVATARS.map((a) => [a.id, a]),
);

// ---------------------------------------------------------------------------
// Deck helpers
// ---------------------------------------------------------------------------

/**
 * A legal 30-card deck for the test.fire_earth avatar.
 *
 * Eight distinct cards is the minimum that reaches 30 within the four-copy
 * limit (7 x 4 = 28), which is why the fixture pool has eight deckable cards
 * across the two classes.
 */
export const fireEarthDeck = (): CardId[] => [
  ...Array<CardId>(4).fill('test.fire_vanilla'),
  ...Array<CardId>(4).fill('test.fire_big'),
  ...Array<CardId>(4).fill('test.fire_spell'),
  ...Array<CardId>(4).fill('test.fire_evolution'),
  ...Array<CardId>(4).fill('test.earth_protector'),
  ...Array<CardId>(4).fill('test.earth_retaliator'),
  ...Array<CardId>(4).fill('test.earth_regenerator'),
  ...Array<CardId>(2).fill('test.earth_vanilla'),
];