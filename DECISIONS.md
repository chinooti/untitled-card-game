# Architectural Decisions

Each entry records the decision, what else was considered, and why. Written as
decisions are made, not reconstructed afterwards.

---

## 1. Effects are data, not functions

**Decision.** A card's behaviour is described by serialisable objects —
`{ kind: 'damage', target: {...}, amount: 4 }` — interpreted by the engine at
runtime.

**Alternative considered.** Attaching behaviour directly to cards as closures:
`onDeath: (state, ctx) => GameState`.

**Why.** The closure approach is faster to write and more flexible for unusual
cards. But a function cannot be sent over a socket, stored as JSON, or written
to a replay file. Since online multiplayer is the primary deliverable and the
server is authoritative over state, everything describing the game has to
survive serialisation.

**Cost accepted.** The `Effect` union grows as cards are designed, and genuinely
unusual one-off cards are awkward to express. In exchange, the engine has a
single `applyEffect` function and adding a card is a data change rather than a
code change.

---

## 2. Discriminated unions for every variant type

**Decision.** `Keyword`, `Effect`, `Ability`, `Card` and `Action` are all unions
tagged with a literal discriminant field.

**Alternative considered.** Flat interfaces with optional fields —
`{ name: string; value?: number }` for keywords, or a single `Card` interface
with `attack?` and `hp?` marked optional.

**Why.** The flat version compiles for meaningless states: a Pierce keyword with
a numeric value, or a spell with 6 HP. It also forces a null check at every use
site. Tagged unions let TypeScript narrow — inside `case 'retaliate':` only
`amount` exists — and enable exhaustiveness checking via an `assertNever` call
in the default branch, so adding a variant produces a compile error at every
site that needs updating rather than a silent runtime no-op.

---

## 3. `LaneIndex` is `number`, not a literal union

**Decision.** `type LaneIndex = number`, with a `LANE_COUNT` constant and
runtime validation.

**Alternative considered.** `type LaneIndex = 0 | 1 | 2 | 3`, giving
compile-time bounds checking.

**Why.** Lane count is explicitly a tuning value to be set by simulation in
Phase 4, and the design reserves the option to expand. Encoding 4 into the type
system would mean touching every signature that mentions a lane in order to
change one number.

**Cost accepted.** Out-of-range lane indices are caught at runtime rather than
compile time.

---

## 4. Monorepo with a shared types package

**Decision.** One repository containing `shared/`, `server/` and `client/` as
npm workspaces, with both client and server importing types from `shared/`.

**Alternative considered.** Separate repositories, with types duplicated or
published as a package.

**Why.** Client and server must agree exactly on the shape of a game action and
a game state. With a shared package, a change to either breaks compilation on
the other immediately. Duplicated types drift silently, and the failure surfaces
as a runtime desync that is difficult to trace.

---

## 5. The engine returns events alongside state

**Decision.** Engine signature is `(state, action) => { state, events }` rather
than `(state, action) => state`.

**Why.** The UI needs to animate a sequence — this unit attacked, that one
retaliated, this one died, a token spawned. Reconstructing that sequence by
diffing two states is error-prone and loses ordering. The same event stream also
serves as the replay format, the combat log, the AI debugging trace, and the
multiplayer broadcast payload.

**Cost accepted.** Every engine function must construct and thread an event
array. Nearly free to add now; painful to retrofit once the UI exists.

---

## 6. Protector is a card type, not a keyword

**Decision.** Protector is a distinct card type alongside Troop and Spell,
visible as its own category in deckbuilding, and may have an attack value.

**Alternative considered.** A keyword on a troop card.

**Why.** Deckbuilding visibility — a player filtering for defensive cards should
see them as a category. It also gives card text a vocabulary distinction: an
effect can target "troops", "protectors", or "all units", which allows finer
balancing than a single unit category would.

---

## 7. Combat is one-directional

**Decision.** Only the attacking unit deals damage. The defender deals nothing
back unless it has Retaliate.

**Alternative considered.** Bidirectional (both units damage each other), as in
Hearthstone, Magic and PvZ Heroes.

**Why.** Under bidirectional combat with mandatory attacking, every unit's
attack value lands twice per round, so high HP is worth roughly half its printed
value. That undermines the Defence class identity, makes Retaliate nearly
redundant, and makes the Protector slot fold immediately. One-directional combat
is what makes HP meaningful, gives Retaliate a distinct role, and lets the
per-class win timelines actually differ.

**Cost accepted.** Trades become rarer, removal becomes more important, and the
game departs from genre convention — which requires the design to justify itself
rather than lean on player familiarity.
