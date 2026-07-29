# GAME_DESIGN.md

**Version 2.0 — full rewrite**

This document supersedes the Phase 0 spec entirely. Combat direction, turn structure, lane count, the wall system, the super meter, win conditions and the discard zone have all changed. Anything not in this document does not get built.

---

## 1. Core concept

A lane-based, turn-based online card game. Two avatars, each built from two of four classes, fight across four lanes until one avatar's HP reaches zero or one player runs out of cards.

The strategic layer is the avatar system: each avatar is a pairing of two classes plus a unique super-meter charge condition and a unique super. The interaction between class identities — not individual card power — is what makes the game interesting.

**Primary deliverable:** online multiplayer. A rule-based AI is built first as a test harness and practice mode, not as the shipping product.

**Influences:** PvZ Heroes, Pokémon TCG, Adventure Time Card Wars, Yu-Gi-Oh, Bloons Card Storm. Mechanics are taken selectively and adapted; nothing is copied wholesale.

---

## 2. Resources and stats

| Stat | Value | Notes |
|---|---|---|
| Mana | 1–10 | Turn 1 = 1, +1 per turn, capped at 10 |
| Mana refresh | Refresh-to-max | Unspent mana is lost. No banking |
| Avatar HP | 25 | Provisional — Phase 4 measurement |
| Deck size | 30 | Provisional |
| Copies per card | 4 | |
| Opening hand | 4 cards | |
| Mulligan | 4 reroll charges | Spendable on any card in the opening hand |
| Max hand size | 8 | |
| Lanes | 4 | Provisional — Phase 4 measurement |
| Slots per lane, per side | 1 troop + 1 Protector | Strict. No stacking |

**Mulligan mechanic:** a rerolled card is not immediately redrawable. It returns to the deck and can be drawn normally later in the game.

**Hand cap behaviour:** at 8 cards, no further cards can be drawn. Draw effects partially resolve (see §7).

---

## 3. Turn structure

Turns alternate. Each turn:

1. **Draw** — draw 1
2. **Mana** — refresh to max for the current turn number
3. **Deploy** — play troops, Protectors, spells, evolutions and supers, limited by available mana. No cap on cards played per turn
4. **Attack** — lanes resolve 1 → 4 in order (see §4)
5. **Post-combat** — Lives units respawn; Burn ticks; Regenerate ticks
6. **End** — end-of-turn triggers

**Burn and Regenerate tick after every attack phase**, i.e. twice per full round — once after each player's turn. This follows Pokémon TCG's between-turns checkup and is positionally symmetric for both players.

There is no start-of-turn phase. Everything that would need one lives in Post-combat.

---

## 4. Combat

Combat is **one-directional**. Only the attacking unit deals damage. The defender does not deal damage back unless it has Retaliate.

**Attacking is mandatory.** Every unit with attack greater than 0 must attack during the attack phase. Units with 0 attack do nothing and play no attack animation.

**There is no summoning sickness.** Units attack on the turn they are played.

**Target priority within an enemy lane:** Protector → troop → avatar. A unit cannot be targeted while a Protector occupies the same lane.

### Resolution order

Lanes resolve sequentially, **lane 1 through lane 4**. Board state is recalculated live as each lane resolves — it is not snapshotted at the start of the phase.

Consequences that follow from live resolution, stated explicitly:

- A unit whose stats scale off events in other lanes uses its current value at the moment its lane resolves.
- A token created into an **unresolved** lane during this attack phase is present when that lane comes up, and — since attacking is mandatory — will attack in the same phase.
- A token created into an **already-resolved** lane, or created during the opponent's attack phase, does nothing until its controller's next attack phase.

Lane position is therefore a skill expression: units that generate tokens produce more immediate value in lower-numbered lanes.

### Per-lane sequence

For each lane, in order:

1. Attacker deals damage to its target
2. Retaliate resolves
3. Deaths resolve, on-death effects fire

Retaliate is defined as "once combat has ended in this lane." A defender that dies in the exchange **still retaliates**. Since combat is otherwise one-directional, Retaliate is the only mechanism by which mutual destruction occurs.

**Double KO:** if both avatars reach 0 in the same resolution, the **attacking player wins**.

---

## 5. Win conditions

A player wins if either is true of their opponent:

1. Avatar HP reaches 0
2. The opponent attempts to draw from an empty deck at the start of their turn

Cards that draw are **unplayable** while the deck is empty. Deckout can only occur via the mandatory turn-start draw, never via a card effect.

---

## 6. Classes

Four classes at launch. Each has a distinct win timeline and mechanical identity. Preserving these identities as cards are designed is the most important constraint.

**Reserved for future classes — do not design into these spaces:** resource generation (Class 5), stat boosting (Class 6).

### Fire — The Aggressor
High raw damage. The theme is dealing damage faster than the opponent can respond. Aims to close by approximately turn 5. Punishes slow starts, high burst, can bypass Protectors with direct-damage spells. Low staying power; runs out of steam in long games.

### Defence — The Fortress
Stalling, efficient damage avoidance, healing. Wins by outlasting rather than by dealing damage. Wants the game to go as long as possible. Extremely difficult to push damage through. Little to no standalone win condition — typically needs its paired class to close.

### Undead — The Swarm
Cheap, disposable units. The identity is **keeping every lane occupied at all times**, not dealing more damage — bodies are replacements, not a flood, since each lane holds one troop. Benefits from allied units dying: on-death effects, token generation, Lives. Strong early, weak late, universally low HP.

### Magic — The Wildcard
Card advantage and board manipulation. Midrange — more proactive than Defence, less aggressive than Fire. Wins by outplaying rather than out-statting. No reliable standalone finisher.

---

## 7. Partial resolution

**Principle: effects resolve as much as they can, and the remainder is discarded silently.**

- Draw 3 with 6 cards in hand → draw 2
- Summon 2 tokens with 1 free slot → summon 1
- No effect fails outright because it cannot fully resolve

**Constraint on card design:** because each lane holds exactly one troop, an effect that summons multiple units must distribute them across the board. "Summon 2 tokens in this lane" is unimplementable and will always partially resolve to 1.

---

## 8. Avatars

Each avatar is a pairing of two classes. Four classes give six avatars.

**Deck construction:** any legal mix of cards from the avatar's two classes, in any ratio from 0 to 30. Mono-class decks are legal. There are no neutral cards.

| Pairing | Identity | Gameplan |
|---|---|---|
| Fire + Defence | The Turret | Sit behind Protectors, win through Retaliate and chip damage |
| Fire + Undead | The Sacrifice Engine | Disposable bodies enable Fire payoffs |
| Fire + Magic | The Burn Wizard | Spells amplify direct damage; glass cannon |
| Defence + Undead | The Undying Wall | Everything comes back; near-impossible to push through |
| Defence + Magic | The Control Fortress | Stall, remove threats, win on card advantage |
| Undead + Magic | The Value Engine | Death triggers and spell effects chain; snowballs |

---

## 9. Super meter

Each avatar has **3 supers**: one from each of its two classes, plus one unique to that avatar.

**Total super pool:** 2 supers per class (8) + 1 unique per avatar (6) = **14 cards** covering all six avatars.

### Charging

The meter is numeric. It charges from two sources:

1. **Universal** — damage taken by your avatar, scaling with the amount of damage
2. **Avatar-specific** — a unique condition per avatar (e.g. healing, killing enemy units, units taking damage), expressed as a charge value per unit of the triggering event

Charge thresholds are tuned per avatar so that all six fill in a comparable window. This is a Phase 4 measurement.

The universal damage charge is a deliberate **comeback mechanic**: a player who is behind charges faster. It is not RNG-based.

### Delivery

- The meter can fill a **maximum of 3 times per game**. After the third fill it no longer charges.
- Each fill delivers **one random super from those not yet received**. All three are used across a full game.
- The super goes **to hand** and costs **1 mana** to play.
- If the hand is at 8 when the meter fills, the meter **holds full** and delivers at the end of that turn once space exists. It cannot charge further while holding.

There is no block meter. Filling the meter does not mitigate damage.

---

## 10. Turn order

Coin flip. The winner chooses whether to go first or second.

The choice is intended to be genuine: going first buys tempo and free avatar damage into empty lanes; going second buys information and, under one-directional combat, wins contested lanes by swinging second.

**No compensation is assigned initially.** If Phase 4 bot testing shows a meaningful winrate skew, the dial is an extra opening card or starting super charge for the disadvantaged player.

---

## 11. Card types

| Type | Description |
|---|---|
| **Troop** | Attack and HP. Occupies the troop slot in a lane |
| **Protector** | A keyword on a troop. Occupies the Protector slot. Must be destroyed before the troop behind it can be targeted. Typically 0 attack, but attack is a stat, not a rule — a Protector with attack is legal |
| **Spell** | One-time effect. Removed from the game after use |
| **Evolution** | A normal deck card with a mana cost. Requires a valid target already on the board. Replaces the target and restores it to full HP |
| **Token** | Created by card effects. Never in a deck. No abilities unless stated |

**There is no discard pile.** Cards that leave play are removed from the game. No card may reference or interact with a discard zone.

### Evolution rules

- Evolutions are drawn like any other card and cost mana.
- There is **no trigger condition**. The gate is drawing the evolution and having a valid target in play.
- Some evolutions accept **any** troop as a target; some require a **specific named** card. Named-target evolutions are more powerful, less consistent, and do the work of teaching class identity.
- Evolving **fully heals** the resulting unit.
- Protectors may evolve, and evolve **strictly into other Protectors**.

---

## 12. Keyword glossary

| Keyword | Meaning |
|---|---|
| **Protector** | Shares a lane with a troop. Must be destroyed before the troop behind it can be targeted |
| **Retaliate X** | Once combat has ended in this lane, deal X damage to the attacker. Fires even if this unit died in the exchange |
| **Burn X** | Damage over time applied to a **unit**. Ticks after every attack phase. Does not affect avatars |
| **X Lives** | On destruction, respawns at full stats during the Post-combat phase, consuming one life. Consuming a life **counts as a death** and fires on-death effects and friendly-death triggers |
| **On death** | Triggers immediately when the card is destroyed |
| **Summon** | Creates a token. Distributes across the board; partially resolves if slots are short |
| **Pierce** | Deals full damage to the Protector, the troop behind it, and the avatar simultaneously |
| **Chill** | Reduces attack of enemy troops in the lane. Minimum 1 damage always applies |
| **Regenerate X** | Heals X HP after every attack phase |

Lives are tracked as a **counter on the unit**, displayed as a badge. A card does not need a separate definition per life stage.

---

## 13. What is deliberately absent

Recorded so these do not get reintroduced by accident:

- **No landscapes / terrain.** The two-class avatar already constrains the card pool.
- **No flooping / activated abilities.** Depth comes from deckbuilding and synergy, not per-turn unit choices.
- **No block meter.** The super meter is a payoff, not damage mitigation.
- **No summoning sickness.**
- **No instant-speed interaction.** Deploy strictly precedes Attack. There are no combat tricks, no responses to an attack, and a super in hand cannot be played on the opponent's turn. Every decision happens on your own turn in full information.
- **No discard pile.**
- **No evolution trigger conditions.**
- **No bidirectional combat.**

---

## 14. Open items

1. **Ordering within Post-combat.** Lives respawn, Burn and Regenerate all occur here. The order matters — specifically, whether a unit that respawns takes Burn damage in the same phase. Needs a decision before the engine is written.
2. **Revive.** Referenced the discard pile and no longer functions. Candidate replacement: a high-cost spell granting a target unit *2 Lives*. Not finalised.

---

## 15. Card set status

The v0.1 draft set of 40 cards predates this document and requires a full rewrite. Known breakages by category:

- **All six Wall cards** — convert to troops with the Protector keyword and an explicit attack value
- **Burn cards** (Pyromancer, Lava Golem) — Burn no longer damages avatars; rewrite as unit damage-over-time
- **All three evolution cards** — need mana costs and named or generic target requirements; existing trigger text is void
- **Base cards referencing evolution triggers** (Hydra, Baby Ice Dragon, Ninja) — remove trigger text
- **Lives cards** (Tiger, Wall of the Undead) — respawn is now at full stats in Post-combat, not reduced stats next turn
- **Bone Warrior** — "summon 2 tokens in this lane" is unimplementable; must distribute across the board
- **Cards referencing "walls"** (Fortified Wall, Scorched Earth) — reword to Protectors or units
- **Warden** — "at the start of each turn" has no phase to occupy; move to Post-combat
- **Revive** — see Open Items
- **Betrayal** — taking control of a troop requires a free slot; define partial-resolution behaviour

---

## 16. Deferred to Phase 4 measurement

These are set by bot-vs-bot simulation, not by argument:

- Avatar HP (currently 25)
- Deck size (currently 30)
- Lane count (currently 4)
- Super meter charge thresholds per avatar
- Turn-order compensation, if any

---

## 17. What makes this game its own thing

For the README and for explaining the project:

- **The Protector slot.** A second unit per lane that soaks but does not attack is not in PvZ Heroes, Card Wars or Bloons. It is what allows Defence to be a standalone class identity rather than just "slow cards," and it is what gives Retaliate and Pierce something to interact with.
- **The behaviour-responsive super meter.** PvZ Heroes charges only on hero damage and delivers randomly. Bloons gives fixed, always-available hero abilities. This meter charges from what the player *does*, differently per avatar, with deterministic damage scaling — so the avatar rewards playing it correctly, and comeback potential exists without RNG.
- **One-directional combat in a lane game.** Uncommon outside Pokémon TCG's single-active-slot structure. It is what makes high HP meaningful, makes Retaliate a real keyword, and lets the class win-timelines actually differ.
