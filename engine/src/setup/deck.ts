/**
 * Deck validation.
 *
 * Enforces the construction rules from GAME_DESIGN.md §2 and §8:
 *
 *   - exactly DECK_SIZE cards
 *   - at most MAX_COPIES_PER_CARD of any single card
 *   - every card belongs to one of the avatar's two classes
 *   - no neutral cards, and no tokens or supers
 *   - deck ratio between the two classes is free, mono-class is legal
 *
 * Returns ALL failures rather than the first. A deckbuilder should be able to
 * list every problem at once; reporting them one at a time means the player
 * fixes, resubmits, and discovers the next one.
 */

import {
  DECK_SIZE,
  MAX_COPIES_PER_CARD,
  type Avatar,
  type CardId,
  type CardRegistry,
  type DeckCard,
} from '@cardgame/shared';

export type DeckValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * A deck is a flat list of card ids, duplicates included — the same shape as
 * PlayerState.deck, so a validated deck can be shuffled and used directly.
 */
export function validateDeck(
  deck: CardId[],
  avatar: Avatar,
  cards: CardRegistry,
): DeckValidation {
  const errors: string[] = [];

  if (deck.length !== DECK_SIZE) {
    errors.push(`Deck must contain exactly ${DECK_SIZE} cards, found ${deck.length}`);
  }

  const counts = new Map<CardId, number>();
  for (const id of deck) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  for (const [id, count] of counts) {
    const card = cards[id];

    if (!card) {
      errors.push(`Unknown card: ${id}`);
      continue;
    }

    if (count > MAX_COPIES_PER_CARD) {
      errors.push(
        `${card.name}: ${count} copies, maximum is ${MAX_COPIES_PER_CARD}`,
      );
    }

    // Tokens and supers are excluded from DeckCard by construction, but decks
    // arrive from saved JSON at runtime, so the type guarantee does not hold
    // at the boundary.
    if (card.type === 'token' || card.type === 'super') {
      errors.push(`${card.name} cannot be included in a deck`);
      continue;
    }

    if (!avatar.classes.includes(card.class)) {
      errors.push(
        `${card.name} is ${card.class}, which ${avatar.title} cannot use`,
      );
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Resolves a validated deck to card definitions.
 *
 * Throws on an unknown id rather than filtering it out: an invalid deck
 * reaching this point is a bug upstream, and silently playing with 29 cards
 * would be far harder to diagnose than a crash.
 */
export function resolveDeck(deck: CardId[], cards: CardRegistry): DeckCard[] {
  return deck.map((id) => {
    const card = cards[id];
    if (!card) throw new Error(`Unknown card in deck: ${id}`);
    if (card.type === 'token' || card.type === 'super') {
      throw new Error(`${card.name} cannot be in a deck`);
    }
    return card;
  });
}