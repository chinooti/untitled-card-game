/**
 * Tokens — units created by effects, never in a deck.
 *
 * Defined here because other cards reference them by id. No cost and no class,
 * enforced by TokenCard not extending DeckCardBase.
 */

import type { TokenCard } from '../../types/card';

export const tokens: TokenCard[] = [];