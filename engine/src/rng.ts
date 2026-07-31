/**
 * Seeded randomness.
 *
 * Every random decision in the game goes through here rather than
 * Math.random(). The RngState lives inside GameState, so randomness is just
 * another piece of data threaded through pure functions.
 *
 * That is what makes the engine deterministic: the same state plus the same
 * action always produces the same result. Three things depend on it —
 *
 *   - replays reproduce the original game exactly
 *   - a failing test fails the same way every run
 *   - a balance simulation can be repeated with one variable changed
 *
 * Every function here takes an RngState and returns a NEW one alongside its
 * value. Nothing mutates. Callers must thread the returned state forward:
 * reusing the same RngState twice yields the same number twice.
 *
 * Algorithm is mulberry32 — a small, well-distributed 32-bit PRNG. Not
 * cryptographically secure, which does not matter here: the server is
 * authoritative, so a client predicting the sequence gains nothing.
 */

import type { RngState } from '@cardgame/shared';

export const seedRng = (seed: number): RngState => ({ seed: seed | 0 });

/** A float in [0, 1). */
export function next(rng: RngState): { rng: RngState; value: number } {
  const a = (rng.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { rng: { seed: a }, value };
}

/** An integer in [0, maxExclusive). */
export function nextInt(
  rng: RngState,
  maxExclusive: number,
): { rng: RngState; value: number } {
  if (maxExclusive <= 0) {
    throw new Error(`nextInt requires a positive bound, got ${maxExclusive}`);
  }
  const result = next(rng);
  return { rng: result.rng, value: Math.floor(result.value * maxExclusive) };
}

/**
 * One element at random. Used for super delivery — the meter picks from the
 * supers not yet received.
 */
export function pick<T>(
  rng: RngState,
  items: readonly T[],
): { rng: RngState; value: T } {
  if (items.length === 0) throw new Error('pick called on an empty array');
  const result = nextInt(rng, items.length);
  const value = items[result.value];
  if (value === undefined) throw new Error('pick produced an out-of-range index');
  return { rng: result.rng, value };
}

/**
 * Fisher-Yates shuffle. Returns a new array; the input is untouched.
 *
 * Each position from the end down swaps with a random earlier position, which
 * gives a uniform permutation. The naive "sort with a random comparator"
 * approach does not, and produces visibly biased decks.
 */
export function shuffle<T>(
  rng: RngState,
  items: readonly T[],
): { rng: RngState; value: T[] } {
  const out = [...items];
  let state = rng;

  for (let i = out.length - 1; i > 0; i--) {
    const result = nextInt(state, i + 1);
    state = result.rng;
    const j = result.value;
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }

  return { rng: state, value: out };
}