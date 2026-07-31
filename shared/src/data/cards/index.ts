/**
 * The card registry — every card definition in the game, keyed by id.
 *
 * This is the single source of truth the whole program looks up base stats
 * from. A CardInstance stores a `cardId` and nothing else about its
 * definition, so if a card is wrong here it is wrong everywhere, consistently.
 */

import type { Card, CardRegistry } from '../../types/card';
import type { CardId } from '../../types/primitives';
import { fireCards } from './fire';
import { earthCards } from './earth';
import { undeadCards } from './undead';
import { frostCards } from './frost';
import { tokens } from './tokens';

const ALL_CARDS: Card[] = [
  ...fireCards,
  ...earthCards,
  ...undeadCards,
  ...frostCards,
  ...tokens,
];

/**
 * Two classes of error the type system cannot catch, both caught here instead.
 *
 * 1. Duplicate ids. `Record` assignment silently overwrites, so a copy-pasted
 *    id would make one card quietly behave as another — a genuinely horrible
 *    bug to track down. Throwing at startup makes it a five-second fix.
 *
 * 2. Dangling references. A summon names a token by string id. A typo compiles
 *    fine and fails at the moment the card resolves, mid-game. Walking the
 *    effect tree at startup surfaces it immediately instead.
 *
 * Both throw rather than warn: an invalid registry means the game cannot run
 * correctly, so failing loudly on launch beats failing subtly on turn six.
 */
function buildRegistry(cards: Card[]): CardRegistry {
  const registry: Record<CardId, Card> = {};

  for (const card of cards) {
    if (registry[card.id]) {
      throw new Error(`Duplicate card id: ${card.id}`);
    }
    registry[card.id] = card;
  }

  for (const card of cards) {
    for (const ref of collectCardRefs(card)) {
      if (!registry[ref]) {
        throw new Error(`Card ${card.id} references unknown card: ${ref}`);
      }
    }
  }

  return registry;
}

/** Every card id a card mentions — summoned tokens, evolution requirements. */
function collectCardRefs(card: Card): CardId[] {
  const refs: CardId[] = [];

  if (card.type === 'evolution' && card.evolvesFrom.kind === 'named') {
    refs.push(card.evolvesFrom.cardId);
  }

  const effects =
    card.type === 'spell' || card.type === 'super'
      ? [card.effect]
      : 'abilities' in card
        ? card.abilities.flatMap((a) =>
            a.type === 'triggered' ? [a.effect] : [],
          )
        : [];

  const walk = (effect: (typeof effects)[number]): void => {
    if (effect.kind === 'summon') refs.push(effect.token);
    if (effect.kind === 'sequence') effect.effects.forEach(walk);
  };
  effects.forEach(walk);

  return refs;
}

export const CARDS: CardRegistry = buildRegistry(ALL_CARDS);

/** Throws on an unknown id rather than returning undefined — a missing card is
 *  always a bug, never a case to handle. */
export function getCard(id: CardId): Card {
  const card = CARDS[id];
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}