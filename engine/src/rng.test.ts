import { describe, expect, it } from 'vitest';
import { next, nextInt, pick, seedRng, shuffle } from './rng';

/**
 * Deep-freezes an object so any attempted mutation throws in strict mode.
 *
 * This is how immutability is enforced in this project. Rather than marking
 * every state type `readonly` — which is noisy and easy to defeat with a cast
 * — production types stay plain and the tests freeze their inputs. A function
 * that mutates instead of copying fails loudly here.
 */
function deepFreeze<T>(obj: T): T {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = (obj as Record<string, unknown>)[key];
    if (value && typeof value === 'object') deepFreeze(value);
  });
  return Object.freeze(obj);
}

describe('next', () => {
  it('produces values in [0, 1)', () => {
    let rng = seedRng(1);
    for (let i = 0; i < 1000; i++) {
      const result = next(rng);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
      rng = result.rng;
    }
  });

  it('is deterministic for a given seed', () => {
    const run = (seed: number): number[] => {
      let rng = seedRng(seed);
      return Array.from({ length: 20 }, () => {
        const result = next(rng);
        rng = result.rng;
        return result.value;
      });
    };
    expect(run(12345)).toEqual(run(12345));
  });

  it('produces different sequences for different seeds', () => {
    expect(next(seedRng(1)).value).not.toBe(next(seedRng(2)).value);
  });

  it('does not mutate the state passed in', () => {
    const rng = deepFreeze(seedRng(42));
    expect(() => next(rng)).not.toThrow();
    expect(rng.seed).toBe(42);
  });

  it('returns the same value if state is not threaded forward', () => {
    // Documents the contract: callers MUST use the returned rng.
    const rng = seedRng(7);
    expect(next(rng).value).toBe(next(rng).value);
  });
});

describe('nextInt', () => {
  it('stays within bounds', () => {
    let rng = seedRng(99);
    for (let i = 0; i < 500; i++) {
      const result = nextInt(rng, 4);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(4);
      rng = result.rng;
    }
  });

  it('eventually produces every value in range', () => {
    let rng = seedRng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const result = nextInt(rng, 4);
      seen.add(result.value);
      rng = result.rng;
    }
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });

  it('rejects a non-positive bound', () => {
    expect(() => nextInt(seedRng(1), 0)).toThrow();
  });
});

describe('pick', () => {
  it('returns an element of the array', () => {
    const items = ['a', 'b', 'c'] as const;
    let rng = seedRng(3);
    for (let i = 0; i < 50; i++) {
      const result = pick(rng, items);
      expect(items).toContain(result.value);
      rng = result.rng;
    }
  });

  it('throws on an empty array', () => {
    expect(() => pick(seedRng(1), [])).toThrow();
  });
});

describe('shuffle', () => {
  const deck = Array.from({ length: 30 }, (_, i) => i);

  it('preserves every element exactly once', () => {
    const result = shuffle(seedRng(11), deck);
    expect([...result.value].sort((a, b) => a - b)).toEqual(deck);
  });

  it('does not mutate the input array', () => {
    const frozen = deepFreeze([...deck]);
    const result = shuffle(seedRng(11), frozen);
    expect(frozen).toEqual(deck);
    expect(result.value).not.toBe(frozen);
  });

  it('is deterministic for a given seed', () => {
    expect(shuffle(seedRng(77), deck).value).toEqual(
      shuffle(seedRng(77), deck).value,
    );
  });

  it('actually reorders', () => {
    expect(shuffle(seedRng(11), deck).value).not.toEqual(deck);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle(seedRng(1), []).value).toEqual([]);
    expect(shuffle(seedRng(1), ['x']).value).toEqual(['x']);
  });
});