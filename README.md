# Dinkie Dino

A browser/PWA recreation of the "Rakuraku Dinokun" (a.k.a. _Dinkie Dino_) virtual pet: the low-cost
Tamagotchi clone that was popular in Brazil. The original was an Android app (Java/Eclipse, 2014–2015);
this project brings it to the web as an installable PWA.

**Current phase: specification complete enough to build; architecture approved (doc 13); milestones M0 (scaffold), M1 and M2 (the core engine: every rule decided so far) done, M3 (simulator and tuning) next.**

The app is called **Dinkie Dino** (the project folder is still named `rakuraku-dinokun-web`). The two historical names, _Dinkie Dino_ and _Rakuraku Dinokun_, belong to the 90s bootleg toys this recreates; all art, code and sound here are original.

## Development

Requires Node 22 (`.nvmrc`).

```bash
npm install
npm run dev          # local dev server
npm test             # unit tests (Vitest)
npm run typecheck && npm run lint && npm run format:check
npm run build        # production build into dist/
```

**Lockfile hygiene.** `package-lock.json` must resolve every package from the public npm registry, and CI fails otherwise (`npm run check:lockfile`). A machine configured with a private registry mirror writes that mirror into the lockfile whenever dependencies change (a `NPM_CONFIG_REGISTRY` environment variable even outranks the project `.npmrc`). After `npm install` or `npm update`, run `npm run fix:lockfile`, or pass `--registry https://registry.npmjs.org/` to npm.

Code lives in `src/core` (pure simulation, no DOM or timers), tested in `tests/`. See [doc 13](docs/13-architecture.md) for the architecture and milestones. Deployment to GitHub Pages is described in §13.15 of that doc.

License: MIT (see `LICENSE`).

## Source of truth

Two sources, in this order of precedence:

1. **Your decisions and your memory of the physical toy**, recorded in [`docs/08-target-rules.md`](docs/08-target-rules.md) and the decisions log in [`docs/07-open-questions.md`](docs/07-open-questions.md). Items still to verify on the toy are in [`docs/09-toy-verification-checklist.md`](docs/09-toy-verification-checklist.md).
2. **The legacy Android project** at `../rakurakudino-archive` (74 commits, 2014-08-06 → 2015-05-26, ~4,400 lines of Java), analysed in docs 00–06. It's a _behavioral reference only_; see the asset policy below.

> **Important:** the legacy app is an _unfinished prototype_. Its UI, input model and animations are fairly
> complete, but the **pet simulation is mostly absent** (no hunger/thirst decay over time, no sickness onset,
> no death, no aging, no poop, nothing is saved). The simulation rules are therefore specified from the physical toy,
> not from the old code. Docs 00–06 are explicit about what the old code did and didn't do.

**Asset policy:** all art, animation, sound and fonts are **created from scratch**. Nothing from the legacy project is reused, and the `gato_chrono` theme is excluded (see ASSET-01…03 in doc 08).

## Documents

| #   | Doc                                                                 | What it covers                                                                                                                      |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0   | [Overview & legacy maturity](docs/00-overview.md)                   | Product summary, what's built vs. stubbed in the legacy app, known legacy bugs                                                      |
| 1   | [Device & controls](docs/01-device-and-controls.md)                 | The virtual handheld: LCD, icon bar, buttons, cursor navigation rules _(legacy)_                                                    |
| 2   | [Screens & flows](docs/02-screens-and-flows.md)                     | Boot/loading, main menu (pet slots, create, delete), in-game screen, pause _(legacy)_                                               |
| 3   | [Actions](docs/03-actions.md)                                       | Each action's exact behavior _(legacy)_                                                                                             |
| 4   | [Pet state & rules](docs/04-pet-state.md)                           | Stats, ranges, states, and what the schema hints at _(legacy; partly superseded by 08)_                                             |
| 5   | [Persistence & data model](docs/05-persistence.md)                  | Legacy SQLite schema, what was/wasn't saved, name/slot constraints                                                                  |
| 6   | [Assets & audio](docs/06-assets-audio.md)                           | Inventory of the legacy art/sound, kept as a **reference for what to recreate**                                                     |
| 7   | [Open questions & decisions](docs/07-open-questions.md)             | **Decisions log and everything still open. Start here.**                                                                            |
| 8   | [Target rules](docs/08-target-rules.md)                             | **The decided design**: time model, life cycle, species, death                                                                      |
| 9   | [Toy verification checklist](docs/09-toy-verification-checklist.md) | What to test on the real toy, in priority order                                                                                     |
| 10  | [Art spec & delivery waves](docs/10-art-spec.md)                    | LCD grid (19×16), icon segments, sprite file format, what to draw in which order, sound approach                                    |
| 11  | [States & actions catalogue](docs/11-states-and-actions.md)         | Every action, pet condition, environment variable and scheduled event; used to decide the care score                                |
| 12  | [Blog guide review](docs/12-blog-guide-review.md)                   | A third-party guide to the real toy: what it confirms, where it conflicts with your decisions, and what's new (unverified)          |
| 13  | [Architecture & tech stack](docs/13-architecture.md)                | **Proposal:** layers, simulation engine, time and randomness, config, art/sound pipeline, testing, milestones, decisions to approve |

## Conventions used in these docs

**Status tags** on every rule describe how well the legacy code backs it:

| Tag                | Meaning                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| ✅ **Implemented** | The legacy code does exactly this. High confidence.                                          |
| 🟡 **Partial**     | Code path exists but is a stub, incomplete, or has a visible bug.                            |
| 💤 **Implied**     | Not implemented, but strongly hinted by a DB column, enum value, asset, icon, or comment.    |
| ❓ **Unknown**     | No evidence in the code. Needs your input.                                                   |
| 🐞 **Legacy bug**  | The old behavior is clearly unintended. The web version needs a decision: replicate or fix.  |
| 🆕 **Web**         | A rule that only exists because this is a PWA.                                               |
| 📖 **Blog**        | Comes only from the third-party guide in doc 12; unverified until you confirm it on the toy. |

**Rule IDs** (e.g. `FOOD-03`) are stable so later code, tests and tickets can refer to them.

**Source references** point at the legacy tree as `Class.java:method`, relative to
`rakurakudino-archive/src/com/leleusoft/rakurakudinokun/`.
