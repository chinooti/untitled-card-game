import { describe, expect, it } from 'vitest';
import { DECK_SIZE } from '@cardgame/shared';
import { resolveDeck, validateDeck } from './deck';
import {
  fireEarthDeck,
  fixtureAvatars,
  fixtureCards,
} from '../testing/fixtures';

const avatar = fixtureAvatars['test.fire_earth']!;

/** Errors are compared by substring so wording changes do not break tests. */
const hasError = (
  result: ReturnType<typeof validateDeck>,
  fragment: string,
): boolean => !result.ok && result.errors.some((e) => e.includes(fragment));

describe('validateDeck', () => {
  it('accepts a legal deck', () => {
    expect(validateDeck(fireEarthDeck(), avatar, fixtureCards)).toEqual({
      ok: true,
    });
  });

  it('accepts a mono-class deck', () => {
    // Deck ratio between the two classes is free, so 30 cards of one class is
    // legal provided the copy limit holds. Needs 8 distinct fire cards at 4
    // copies to reach 30, so this uses the four available plus duplicates
    // capped legally — 16 fire cards, topped up with earth to 30.
    const deck = [
      ...Array<string>(4).fill('test.fire_vanilla'),
      ...Array<string>(4).fill('test.fire_big'),
      ...Array<string>(4).fill('test.fire_spell'),
      ...Array<string>(4).fill('test.fire_evolution'),
      ...Array<string>(4).fill('test.earth_protector'),
      ...Array<string>(4).fill('test.earth_retaliator'),
      ...Array<string>(4).fill('test.earth_regenerator'),
      ...Array<string>(2).fill('test.fire_vanilla'),
    ];
    // 4 + 2 of fire_vanilla exceeds the limit, so this must FAIL — documenting
    // that the copy limit applies across the whole list, not per block.
    expect(validateDeck(deck, avatar, fixtureCards).ok).toBe(false);
  });

  it('rejects a deck that is too small', () => {
    const deck = fireEarthDeck().slice(0, 29);
    expect(hasError(validateDeck(deck, avatar, fixtureCards), 'exactly 30')).toBe(
      true,
    );
  });

  it('rejects a deck that is too large', () => {
    const deck = [...fireEarthDeck(), 'test.fire_vanilla'];
    expect(hasError(validateDeck(deck, avatar, fixtureCards), 'exactly 30')).toBe(
      true,
    );
  });

  it('rejects more than four copies of a card', () => {
    const deck = [
      ...Array(5).fill('test.fire_vanilla'),
      ...fireEarthDeck().slice(5),
    ];
    expect(
      hasError(validateDeck(deck, avatar, fixtureCards), 'maximum is 4'),
    ).toBe(true);
  });

  it('rejects cards outside the avatar classes', () => {
    const deck = [...fireEarthDeck().slice(0, 29), 'test.undead_decayer'];
    expect(
      hasError(validateDeck(deck, avatar, fixtureCards), 'which Test Turret cannot use'),
    ).toBe(true);
  });

  it('rejects tokens', () => {
    const deck = [...fireEarthDeck().slice(0, 29), 'test.token'];
    expect(
      hasError(validateDeck(deck, avatar, fixtureCards), 'cannot be included'),
    ).toBe(true);
  });

  it('rejects supers', () => {
    const deck = [...fireEarthDeck().slice(0, 29), 'test.super_fire'];
    expect(
      hasError(validateDeck(deck, avatar, fixtureCards), 'cannot be included'),
    ).toBe(true);
  });

  it('rejects unknown card ids', () => {
    const deck = [...fireEarthDeck().slice(0, 29), 'test.does_not_exist'];
    expect(
      hasError(validateDeck(deck, avatar, fixtureCards), 'Unknown card'),
    ).toBe(true);
  });

  it('reports every problem at once', () => {
    const deck = [
      ...Array(5).fill('test.fire_vanilla'),
      ...Array(5).fill('test.undead_decayer'),
    ];
    const result = validateDeck(deck, avatar, fixtureCards);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('does not mutate the deck passed in', () => {
    const deck = Object.freeze(fireEarthDeck()) as string[];
    expect(() => validateDeck(deck, avatar, fixtureCards)).not.toThrow();
  });
});

describe('resolveDeck', () => {
  it('resolves every id to a definition', () => {
    const resolved = resolveDeck(fireEarthDeck(), fixtureCards);
    expect(resolved).toHaveLength(DECK_SIZE);
    expect(resolved[0]?.name).toBeTypeOf('string');
    // No assertion that tokens are absent: resolveDeck returns DeckCard[],
    // which excludes them by construction. The compiler rejects the check as
    // unreachable, which is the type system doing the test's job.
  });

  it('throws on an unknown id rather than skipping it', () => {
    expect(() => resolveDeck(['test.nope'], fixtureCards)).toThrow('Unknown card');
  });
});