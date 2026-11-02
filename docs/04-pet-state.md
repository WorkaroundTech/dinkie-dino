# 4. Pet state & rules

> **Superseded in part.** Sections 4.3 (life stage & species) and 4.7 (time) were written from the legacy code alone. The **decided** rules are now in [08-target-rules.md](08-target-rules.md): growth by days at the morning wake-up, species by diet in stages 1–2, death, and catch-up time simulation. Read this doc as *what the legacy code did and hinted*.

Source: `models/Statistics.java`, `models/Dino.java`, `models/Timings.java`, `constants/Constants.java`, `RepositorioScripts` (schema).

This is the area where the legacy app is **thinnest**. What exists is a bag of stats that only change when the player presses a button. There is no passage of time.

## 4.1 Stats (in-memory, `Statistics`)

| Stat | Type / range | Initial | Increased by | Decreased by | Status |
|------|--------------|---------|--------------|--------------|--------|
| **Mood** | 5 levels: VerySad < Sad < Normal < Happy < VeryHappy | **VerySad** | Pet (+1 step) | `mood_down()` exists, **never called** | 🟡 |
| **Education** | 3 levels: C+ < B+ < A+ | **C+** | Educate (+1 step) | `education_down()` exists, **never called** | 🟡 |
| **Hunger** (really *fullness*) | int 0–8 (4 bowls × 2 halves) | 0 | Food: +1 half meal, +2 full meal | nothing | 🟡 |
| **Thirst** (really *fullness*) | int 0–8 (4 glasses × 2 halves) | 0 | Drink: +1 | nothing | 🟡 |
| **Temperature** | int °C, steps of 5, range 15–35 | **20** | `temperature_up()` +5, **never called** | `temperature_down()` −5, **never called** | 💤 |
| **Weight** | int, no cap (art covers 1–3) | **1** | Ice Cream, 39% chance (+1) | nothing | 🟡 |
| **Age** | int (art covers 1 only) | **1** | nothing | | 💤 |

Notes:

- `STAT-01` 🐞 Hunger and thirst only ever go **up**. Since nothing decreases them, a new pet starts at "empty" and can only be filled; the "needs care over time" core loop of a virtual pet doesn't exist yet.
- `STAT-02` ✅ A brand-new pet starts **VerySad, C+ education, empty stomach, empty glass, weight 1, age 1, 20 °C**. In other words, it starts needy, which is the opposite of the classic "starts content".
- `STAT-03` 🐞 The DB row is created with `age = 0`, `weight = 0`, etc. These don't match the in-memory defaults and are never read (see [05](05-persistence.md)).

## 4.2 Pet condition (`DinoState`)

| State | Meaning (inferred from the name) | Visual in legacy | Can be entered by |
|-------|----------------------------------|------------------|-------------------|
| NORMAL | Healthy | Idle animation | default; Medical on a SICK pet |
| SICK | Ill | 2-frame sick sprite, 500 ms/frame (but not visible on Idle: BUG-04) | **Debug button only** |
| DIRTY | Needs bath | none (placeholder image) | nothing |
| COLD | Too cold | none | nothing |
| HOT | Too hot | none | nothing |
| DEAD | Died | none | nothing |

- `STATE-01` ✅ Only NORMAL and SICK have animation logic. Idle animation (frames advance) only runs in NORMAL; SICK animates its own sprite; the others freeze.
- `STATE-02` ❓ Whether the states are mutually exclusive (one at a time, as the enum implies) or can combine (sick **and** dirty), is not defined.
- `STATE-03` 💤 `DEAD` exists as a state but no condition leads to it and no screen handles it (no game-over, no restart, no gravestone art).

## 4.3 Life stage & species

| Element | Evidence | Status |
|---------|----------|--------|
| `DinoType`: BABY, BRONTOSAURUS, T_REX, TRICERATOPS | enum in `Dino` (field `type`, never assigned) | 💤 |
| Age as "1yr", "2yr", "3yr" | sprite names `dino_1yr_*`, pixel data `idle_1yro`, `idle_2yro`, `idle_3yro_bronto` | 💤 |
| Art generations | 1yr: 4 frames of a small round blob; 2yr: 4 frames of a larger body; 3yr bronto: 2 frames, with a "neck/tail" bump on the right | 💤 |
| Species by growth | Commit `300af51` message: *"Added 3yro bronto (add horn and that thing on the head later for the other 2 species)"* → the 3-year-old adult has one design per species, sharing a base body | 💤 |

Best reading: **a pet is born a baby (age 1), grows (2, then 3), and at adulthood becomes one of three species** (Brontosaurus, T-Rex, Triceratops). What determines the species is unknown. The three food counters in the schema (`noodles_eaten`, `veggies_eaten`, `meat_eaten`) are the strongest hint that **diet** might decide it. This is the largest open design question; see [07](07-open-questions.md).

Currently the idle screen always shows the **3-year bronto** art, whatever the pet is, and every action animation uses the 1-year sprites (`// TODO carregar a animação certa pra idade` appears in every action model).

## 4.4 Timestamps (`Timings`)

Six per-pet `long` epoch-ms timestamps: `last_fed`, `last_drink`, `last_study`, `last_play`, `last_discipline`, `last_bath`. At creation all equal the creation time (= `birthday`). They are **read** when a pet is opened (and attached to the `Dino`), but then **nothing uses them**. They are clearly the foundation for "how long since X" rules.

`last_discipline` has no matching stat, action, or icon in the current build.

## 4.5 What the schema says the full game was meant to track

Complete legacy column list vs. today's in-memory stat:

| DB column | In-memory equivalent | Comment |
|-----------|---------------------|---------|
| `name`, `birthday`, `type`, `age` | name, birthday, `DinoType`, `age` | identity & growth |
| `hungry`, `last_fed` | hunger, timings | |
| `thirst`, `last_drink` | thirst, timings | |
| `study`, `last_study` | educationStatus, timings | |
| `happiness`, `last_play` | mood, timings | `last_play` is "play"; mood is also raised by Pet |
| `discipline`, `last_discipline` | **none** | classic Tamagotchi mechanic, no UI for it |
| `heat` | temperature | |
| `dirty`, `last_bath` | **none** (state `DIRTY`) | |
| `sick`, `sickness_chance` (REAL) | state `SICK` | probabilistic illness; the formula is not present |
| `weight` | weight | |
| `noodles_eaten`, `veggies_eaten`, `meat_eaten` | **none** | diet counters |

## 4.6 Rules that must be specified for a playable game

Nothing below exists in the legacy code. These are questions of design that I'm asking you about in [07](07-open-questions.md), not decisions yet:

1. How fast do hunger / thirst drop? Mood? Education? (rates, thresholds, and whether Pet/Play/Educate decay)
2. What triggers sickness, and how does `sickness_chance` combine with neglect, dirtiness, weight, and temperature?
3. What triggers death, and what happens next (restart, memorial, delete)?
4. How/when does the pet age, and what decides the species?
5. Dirtiness & Bath (decided: no poop, see 08 §8.15): how often, what happens if ignored?
6. Temperature: what changes it, and what does Cool do?
7. Sleep: when, for how long, and what happens if the Lamp is ignored?
8. Discipline: is it a real mechanic (Educate? a "naughty call")?
9. Are there attention calls (beeps/alerts) like a real Tamagotchi when the pet needs something?
10. What does the Clock button do?
11. Does Jokenpo affect anything?

## 4.7 🆕 Time and the PWA (key design constraint)

A web app **cannot run while closed or in the background** (iOS especially). The legacy timestamps hint at the natural answer: on every open, compute the elapsed time since the last save and apply it to the stats ("catch-up simulation"). Alternatives: a real-time clock that runs only while open; or Web Push notifications (limited on iOS, requires the PWA to be installed). The choice drives the whole data model. → Q-TIME-1 in [07](07-open-questions.md).
