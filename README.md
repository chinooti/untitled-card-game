# Untitled Card Game

A lane-based, turn-based online card game. Two avatars, each built from two of four classes, fight across four lanes until one avatar's HP reaches zero or one player runs out of cards.

Original design — see [`GAME_DESIGN.md`](./GAME_DESIGN.md) for the full specification.

---

## Status

| Phase | Description | State |
|---|---|---|
| 0 | Game design lock-in | Complete |
| 1 | Core types and card data | In progress |
| 2 | Game engine (pure logic) | Not started |
| 3 | Engine tests | Not started |
| 4 | AI opponent and balance simulation | Not started |
| 5 | React UI | Not started |
| 6 | Server and networking | Not started |
| 7 | Deployment | Not started |

---

## Architecture

```
shared/     Types shared by client and server. The single source of truth
            for Card, GameState, Action, Effect. Compiled away at runtime.
server/     Authoritative game engine and Socket.io server. (Phase 6)
client/     React frontend. (Phase 5)
```

Three decisions shape everything else:

**Shared types.** `Card`, `GameState` and `Action` are defined once in `shared/` and imported by both sides. If the server changes the shape of a game action, the client stops compiling. The contract is enforced by the compiler rather than by documentation.

**The engine is pure functions with no UI dependency.** `(state, action) => { state, events }`. It can be run headless in a test file, which means a full game can be simulated without rendering anything — this is what makes automated balance testing possible in Phase 4.

**The server is authoritative.** Clients send actions ("play card X in lane 2"); the server validates, updates state, and broadcasts. Clients never compute state themselves. This prevents cheating and is the reason effects are represented as serialisable data rather than functions.

---

## Running locally

Requires Node.js 20+.

```bash
npm install
npm run typecheck
```

---

## Design notes

Architectural decisions and the reasoning behind them are recorded in
[`DECISIONS.md`](./DECISIONS.md), written as they are made rather than
reconstructed afterwards.
