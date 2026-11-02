# 7. Open questions & decisions

Each question has the **evidence** (what the legacy code suggests) and a **proposed default**. Reply "default" to accept it. Many can be settled by checking the real toy: see [09](09-toy-verification-checklist.md) (checklist refs like *A4* point there).

Decided rules live in [08](08-target-rules.md). Priority: **P0** blocks the simulation design; **P1** needed before building that feature; **P2** can wait.

---

## Decisions log

| Round | ID | Decision |
|-------|----|----------|
| 1 | Q-GOAL-1 | Follow the **look, feel and rules of the real toy** (you own one and remember much of it). UI details can be iterated. Unknowns are verified on the toy when cheap; otherwise use the proposed default. |
| 1 | Q-ASSET | **All assets rebuilt from scratch**: art, animation, sound, font. Nothing from the legacy project is reused. `gato_chrono` is excluded. (Replaces Q-LEGAL-1 and the theme part of Q-UI-5.) → ASSET-01…03 |
| 1 | Q-TIME-1 | **Catch-up simulation**: apply the rules for the elapsed time on open. → TIME-01…05 |
| 1 | Q-LIFE-1 | Pet **can die**: left sick, dirty, hungry (list open-ended), and of **old age at about 15–20 days**. → DEATH-01 |
| 1 | Q-LIFE-2 | Growth in **days, at the morning wake-up** (configurable between 06:00 and 09:00). Stages 2/3/3/3/4 days, then Angel/Demon after 1–5 days. → LIFE table |
| 1 | Q-LIFE-3 / Q-FOOD-1 | **Species by diet during stages 1–2**: Chicken Thigh + Hamburger → T-Rex; Carrot + Apple → Brontosaurus; mostly Noodles → Triceratops. → SPEC-01…05 |
| 1 | Q-SCOPE-1 | v1 = full care loop (decay, sickness/medicine, dirtiness/bath, sleep/lamp, death, growth). Round 2: stage logic is built in full, art arrives in waves; temperature joins v1 (Q-TEMP-1). |
| 2 | Q-LIFE-4 | The Angel/Demon change **is** the old-age death. Angel vs Demon is decided by a **hidden care score** built from time spent in bad conditions (dirty, hot, sick, lights left on at night, hungry, "and so on"). → LIFE-08, LIFE-09, CARE-01…07 |
| 2 | Q-LIFE-6 | Growth is counted in **wake-ups**, not elapsed time. → LIFE-02 |
| 2 | Q-SPEC-1 | **>50% of the diet** in a group wins (meat → T-Rex, plants → Brontosaurus, noodles → Triceratops). No group over 50% → **random draw weighted by the shares**. Species shows **immediately at "blob with tail"**. T-Rex = small mohawk, Brontosaurus = smooth blob, Triceratops = small horn at the side of the head. → SPEC-01…07 |
| 2 | Q-SCOPE-2 | **Build all the stage logic now; you draw the sprites in waves.** → ASSET-04, [10](10-art-spec.md) |
| 2 | Q-ART-1 | Approved: **text bitmaps in the repo + a small sprite viewer/editor page.** → [10](10-art-spec.md) |
| 2 | Q-ART-2 | LCD dot grid taken from the legacy small-blob frames: **19 columns × 16 rows**, 4 frames. → LCD-01…04 |
| 3 | Q-CARE-1 | **Deferred.** Care-score factors and weights are decided after the full list of actions and states is known: see [11](11-states-and-actions.md). CARE-02. |
| 3 | Q-LIFE-7 | The final-form wake-up (16–20) is **random** and doesn't depend on care. → LIFE-04 |
| 3 | Q-LIFE-5 | A pet **can die before the final form**, shown as a **dead blob with a cross and a halo**. → LIFE-10 |
| 3 | Q-SPEC-2 | Species counts **meals**, Ice Cream isn't counted (no fullness; only happiness and weight). A pet fed nothing **starves before the decision point**. → SPEC-05/06, DEATH-05, ICE-01…03 |
| 3 | Q-TEMP-1 | **Air conditioner** model: comfort 24–26 °C; AC on = slow noisy one-way drop (min ~16); AC off = slow noisy one-way rise (max ~40); ≤ 23 → TOO_COLD chance; tick timer with a random "stay or move". → TEMP-01…11 |
| 3 | Q-LAMP-1 | **Light on at night harms health and greatly raises the chance of waking up SICK.** → SLEEP-01…05 |
| 3 | Q-LCD-1 | Real LCD is **19 × 16**. The 10 action icons are **separate lit segments** outside the matrix. → LCD-04/05 |
| 4 | Q-AC-2 | **Correcting with the AC:** in TOO_COLD the AC toggle snaps the room to 24 °C (26 °C for TOO_HOT) and clears the state; outside a TOO state it gives a one-off bump (19 → 21–22 °C) that doesn't stack; TOO_COLD can still fire during recovery and vanishes at 24 °C with a small happiness penalty. **Entering** TOO_HOT/COLD raises SICK chance (small chance of instant death) and drops happiness. → TEMP-12…18 |
| 4 | Q-SLEEP-2 | SICK-at-wake-up odds **2% / 60%** accepted. **Bedtime depends on the stage** (blobs ≈ 19:00–19:30, adults up to ≈ 22:00), configurable with the variability kept. → SLEEP-03, 05…08 |
| 4 | Q-ICE-1 | Ice Cream: **70% chance of +1 weight**. Too heavy (especially pre-adult) → sickness and death. → ICE-03, WEIGHT-01 |
| 4 | Q-ATTN-2 / COND | **Every non-normal state has its own sprites** (HUNGRY, THIRSTY, TOO_HOT, TOO_COLD, SICK, SAD) and the pet **beeps from time to time** in them. → COND-01/02 |
| 4 | Q-DEATH-1 (restart) | A new egg starts **only by resetting the toy** (pinhole reset button in the back, thin pick). No auto-restart after death. → RESET-01/02, DEATH-03 |
| 5 | (blog) | A third-party guide was reviewed: [12](12-blog-guide-review.md). 10 behaviors confirmed, 14 points flagged for your ruling, 13 new proposals (📖). No existing decision was changed. |
| 6 | Q-BLOG-1 (C1) | **Mixed diets:** keep our weighted random draw. → SPEC-03 |
| 6 | Q-BLOG-1 (C5) | **Medicine resets hunger and thirst** (only those). → MED-01…03 |
| 6 | Q-BLOG-1 (C6) | **Temperature pace:** keep our default (~1–2 h out of the band). → TEMP-09 |
| 6 | Q-BLOG-1 (C7) | **No poop.** The pet gets **dirty** (looks dark) and needs a **shower**. → DIRT-01…05 |
| 6 | Q-BLOG-1 (C2/C3) | **Pet** raises happiness and education but **never tops them up**: education stops at **C+**, happiness stops below the maximum. **Only Jokenpo tops up happiness; only studying tops up education.** → HAP-01…04, EDU-01…03 |
| 6 | Q-BLOG-1 (C4) | **Jokenpo rounds configurable 3–5.** Playing raises happiness; **playing too much may lower education.** → PLAY-01, HAP-03, EDU-04 |
| 6 | Q-ATTN-2 | **Deferred**: revisit later. → LCD-06 |
| 7 | Q-HAP-1 / Q-EDU-1 (amounts) | **Pacing target:** every need meter must need **at least 2 interactions per day**; rates and amounts are derived and tunable. → PACE-01 |
| 7 | Q-EDU-1 (over-play) | Over-play = **about 3–5 games after VeryHappy is reached**; then education may drop. → EDU-04 |
| 7 | Q-PLAY-3 | **Winning makes the pet happier; a loss leaves it unchanged; consecutive losses may lower happiness.** → PLAY-04…06 |
| 7 | Q-DIRT-1 | **Dirty over time, ≥ 1 bath a day.** Bath only when DIRTY or in the **hour before bedtime** (e.g. bedtime 20:30 → 19:30–20:29). Bathing **clears fully and resets** the decay. → DIRT-02/03/06/07 |
| 7 | Q-MED-2 | Medicine **only when SICK**; **one dose** restores health. → MED-04/05 |
| 8 | Q-MED (blog C5, revised) | **Medicine** (blog): the pet ends **fully hungry and thirsty** and **happiness resets to the lowest level**. Supersedes "hunger and thirst only". → MED-02/03 |
| 8 | Q-PLAY-4 | **Win/loss counted per GAME**, not per round; rounds only decide the game's winner. **From 2 consecutive game losses** happiness may drop. → PLAY-01/04/05/06 |
| 8 | Q-EDU-2 | Over-play counts **games**, never rounds. → EDU-04 |
| 8 | Q-DIRT-2 | **DIRTY after 16–20 h**; **2–3 h dirty** starts chances of sickness and a happiness drop; dirt accrues while asleep but **DIRTY never begins during sleep**: it's computed at wake-up. → DIRT-02/08/09 |
| 8 | Q-SLEEP-4 | **Asleep: only Lamp, Check and Clock.** Temperature **resets to the comfort zone** while sleeping (not TOO_HOT/COLD); in TOO_HOT/COLD it **stays fixed all night**. → SLEEP-09/10 |
| 8 | Q-HAP-2 | **Ice Cream = +1 level of happiness** (capped at Happy). → ICE-04 |
| 9 | Q-MED-3 (partly) | **A sick pet cannot eat, drink, play, study, be bathed or be petted** (read as "while sick"). → SICK-01…03 |
| 9 | Q-PLAY-5 | Winning = the **pet's** win. The streak-loss chance of dropping happiness: **50%** (estimate). → PLAY-04, 06 |
| 9 | Q-EDU-3 | The over-play counter resets when happiness **leaves VeryHappy** and at the **morning wake-up**. → EDU-05 |
| 9 | Q-DIRT-3 | **Dirty checks:** from 2–3 h dirty, a check every **15 min** with **20% rising 10% per check**. → DIRT-09 |
| 9 | Q-SLEEP-5 (b)(c) | At night needs and adverse conditions **run attenuated** and **apply only at wake-up**. → SLEEP-11 |
| 10 | Q-SICK-2 | **Confirmed:** while SICK the pet refuses eat, drink, play, study, bath, pet; **Lamp, Check, Clock, AC still work**; the hunger/thirst/happiness reset happens **at the cure**; **education and weight untouched**. → SICK-01/02, MED-02 |
| 10 | Q-DIRT-4 | A fired dirty check: **happiness always drops; SICK by chance.** → DIRT-10 |
| 10 | Q-DEATH | Death timers: **to be tuned**; target: **~2 days unattended likely kills the pet.** → DEATH-02/06 |
| 10 | Q-EDU-4 | The education drop is **1 grade.** → EDU-05 |
| 10 | Q-PLAY-6 | A **tied game is neutral** for happiness but **still counts toward over-play.** → PLAY-05 |
| 10 | Q-UI-5 / sound | Sounds are simple piezo notes: **synthesized at runtime, no sound files.** → SND-01…04 |
| 11 | Q-GLOBAL-1 | **Adopted:** a fixed **15-minute check** for everything; the dirty-style escalating chance is the template for other adverse conditions. → TIME-06, COND-06 |
| 11 | Q-DIRT-5 | In DIRTY, a check every 15 min: **SICK chance 20%, +10% per check; once SICK the dirty checks stop and death checks begin.** Happiness also drops on each check. → DIRT-09/10 |
| 11 | Q-SLEEP-6 | Night decay is **attenuated 4–8×**; **death checks do not run while asleep**, giving a chance to save the pet at wake-up. → SLEEP-11/12 |
| 11 | Q-PLAY-7 | The player does **not** see the pet's hand. → PLAY-07 |
| 11 | Q-EDU-6 | Over-play education drop chance: **50%**, size **1 grade**. → EDU-05 |
| 11 | Blog C8 | **Death causes and onset times** (sick 4–6 h, hot/cold 6–8 h, low happiness 1–2 days, hunger 2+ days, thirst 1+ day). → DEATH-01/07/08 |
| 11 | Meters | **Hunger and thirst range 0–8** (confirmed against the legacy code). → NEED-01 |
| 13 | I18N | The app is **multilingual**: **pt-BR primary**, **English** alongside, **Latin American Spanish later**. → I18N-01, [14](14-localization.md) |
| 12 | A1–A7 | **Architecture approved** (stack, counter-based randomness, 15-minute snapping). App name **Dinkie Dino**; MIT; git initialised; hosting on **GitHub Pages**. A8 (single vs. multiple pets) and A9 (pacing) not answered yet: proceeding with the recommended defaults. → [13](13-architecture.md) |

---

## Localization questions (round 13)

Details and the draft glossary are in [14](14-localization.md). Proposed defaults in brackets.

| ID | Question | Proposed default |
|----|----------|------------------|
| **Q-I18N-1** | Is the **pt-BR glossary** right? Do you remember the Portuguese wording printed on the Brazilian toy or its manual? | Use my draft, you correct it |
| **Q-I18N-2** | A visitor whose browser language is neither Portuguese, English nor Spanish: show **English** or **pt-BR**? | English (widely understood); Brazilians get pt-BR automatically |
| **Q-I18N-3** | **Clock format** in settings and the clock screen: 24-hour always (like the toy?) or the locale's habit (24 h in Brazil, 12 h for US English)? | 24-hour everywhere |
| **Q-I18N-4** | **Education grades** A+ to E+ stay as on the toy in every language? | Yes, toy fidelity |
| **Q-I18N-5** | **Pet names**: 15 characters (counted as visible characters), accents and emoji allowed? | 15 graphemes, any letters, digits and emoji, trimmed |
| **Q-I18N-6** | **Spanish**: when, and who reviews it? | After v1, with a native reviewer |
| **Q-I18N-7** | **README and docs** stay in English? A short pt-BR README for the public repo? | Docs in English, a pt-BR README later |
| **Q-I18N-8** | **One URL** with an in-app language switch, or one path per language (`/en/`)? | One URL and a switch (the save is per origin, so one address is simpler) |

## Architecture decisions (round 12)

The architecture proposal is [13](13-architecture.md). **Decisions A1–A9 (§13.12) need your approval**: stack, counter-based randomness, snapping scheduled times to 15-minute multiples, app name, license, git init, hosting, single vs. multiple pets, pacing.

## P0: follow-ups from round 11

Unruled blog points: C10 lights-on chance, C11 Angel/Demon death, C13 weight in kg and age, C14 pacing, and PROP-01…13 except sound ([12](12-blog-guide-review.md)).

| ID | Question | Why I'm asking | Proposed default |
|----|----------|----------------|------------------|
| **Q-DIRT-6** | On each dirty check, does happiness drop **by one level every 15 minutes** (reaching VerySad within an hour) or **once** when the checks start? If the pet is cured but still dirty, do the dirty checks resume from 20%? | DIRT-10 | −1 level per check; they resume. |
| **Q-DEATH-3** | Death-check numbers and meaning: (a) the chance per check once the onset passes (default 20% +10% per check); (b) does the onset timer count the sleeping hours (implementation changed the default to **an attenuated night**, so a night does not make the morning lethal, see DEATH-08); (c) what "low happiness" means (the lowest level?) and what "hunger for too long" means (empty, or below a threshold?). | DEATH-07/08 | (a) 20%, +10%; (b) attenuated, see DEATH-08; (c) lowest level; empty. |
| **Q-SLEEP-7** | Remaining night details: (a) comfort reset at **bedtime** to **25 °C**; (b) the AC stays as the player left it. | SLEEP-10 | Both yes. |

## Tuning backlog (not questions)

Numbers to adjust by play-testing, all kept in config and reachable from the debug panel. Defaults are in the rule docs. **Needs / pace:** decay rates per meter (PACE-01: ≥ 2 interactions a day); the night attenuation; the temperature tick rate and drift; dirt threshold 16–20 h and onset 2–3 h; bedtimes per stage. **Chances:** SICK at wake-up (2% / 60%), TOO_HOT/COLD entry, dirty-check escalation, loss-streak happiness drop (50%), over-play drop. **Deaths:** the onset range and the check chance per cause (DEATH-07/08), targeting DEATH-06 (≈ 2 days unattended) and DEATH-05 (≈ under 4 wake-ups when never fed). **Weight:** scale, "too heavy" threshold, Ice Cream gain 70%.

## P0: follow-ups from round 4

| ID | Question | Why I'm asking | Proposed default |
|----|----------|----------------|------------------|
| **Q-AC-1** | **AC numbers.** (a) Tick period and the probability of a move: how long to go from 25 °C to ≤ 23 (AC on) or ≥ 27 (AC off)? (b) Chance per tick of entering TOO_COLD/HOT as it gets further from the band. (c) Initial temperature after hatching. (d) Is the temperature shown as a number in Check? (📖 the blog says yes: "25°C") | TEMP-05/09 | 1 °C steps; **~15 min** out of the band (📖 blog: "check every ~15 minutes"); chance rising linearly with distance; start 25 °C; numeric display. Test B6. |
| **Q-AC-3** | **Confirm my reading of the AC rules.** (a) The bump is +2 to +3 °C, only when you toggle in the *correcting* direction (AC off when cold, AC on when hot). (b) "No stacking" = **one bump per excursion**; re-armed when the room is back in the band. (c) Hot side is the exact mirror (snap to 26, bump down). (d) **Any** toggle in a TOO state snaps and clears it. (e) TOO-state entry = one roll + raised sickness hazard while it lasts. | TEMP-13/14/17/18 | As described in each rule. |
| **Q-AC-4** | **Numbers for TOO_COLD/HOT.** SICK chance on entry, chance of instant death (small), happiness drop on entry and per hour in the state, and the smaller penalty when it clears by itself. | TEMP-16/17 | Entry: SICK +25%, death 1%, happiness −1 step; −1 step per hour after. Tunable. |
| **Q-COND-1** | **Conditions.** (a) Thresholds for HUNGRY / THIRSTY / SAD (which meter values). (b) **Priority** when several apply: sick > cold/hot > hungry > thirsty > sad? Or alternate between sprites? (c) Beep interval, and does each condition have a different beep? (d) Do **sleeping** and **overweight** also have their own sprite and calls? (DIRTY already has one.) | COND-02…05 | (a) ≤ 2 of 8 for hungry/thirsty, lowest happiness level for sad; (b) that order, showing the top one; (c) every ~60 s, same beep; (d) sleeping has its sprite, no call. |
| **Q-SLEEP-3** | **Bedtime details.** (a) For blobs: is it a fixed time or a window (19:00–19:30) drawn each night? (b) Values for the in-between stages and the teenager. (c) Configuration: the player sets the adult bedtime and earlier stages follow by offsets? (d) What does the sleeping pet and the "light on" pet look like, and do needs decay slower while asleep? | SLEEP-05…08 | (a) fixed at the start of the window; (b) table in SLEEP-06; (c) yes; (d) half-rate decay asleep. Test B5. |
| **Q-WEIGHT-1** | **Weight.** What is the weight scale and the "too heavy" threshold; how is weight lost (Play, time, Medicine, hunger?); the sickness and death chances when too heavy, and why pre-adults are more at risk. | WEIGHT-01/02 | Weight 1–5; heavy from 4 (3 for pre-adults); −1 per mini-game win or per ~12 h. Tunable. |
| **Q-ATTN-2** (deferred) | **Segments.** What indicates the AC/light is on? (📖 The blog says there is **no attention icon**: only the beep and the sprite, so no blinking segments.) | LCD-06 | No attention blink; AC and light each get a small indicator if the toy has one. |
| **Q-DEATH-1** | **Death timers.** Rough times to death when: never fed (must be < ~4 wake-ups), sick untreated, left dirty, too cold / too hot, too heavy. | DEATH-02/05 | Hunger ~2 days, sick ~1 day, dirty ~2 days. Tunable. |
| **Q-RESET-1** | **Web reset.** A hidden pinhole needing long-press + confirm: OK? With several pet slots, reset applies to the slot? Does the toy ask to set the clock after a reset (A1)? | RESET-03…05 | Long-press + confirm; per slot; ask for the wake-up time. |

## Deferred

| ID | Topic | Revisit when |
|----|-------|--------------|
| **Q-CARE-1** | Care-score factors, weights, grace periods, Angel/Demon threshold | After [11](11-states-and-actions.md) is filled in: mark each action/state good, bad or neutral for care |

## P0: still open from round 0

| ID | Question | Evidence | Proposed default |
|----|----------|----------|------------------|
| **Q-LOOP-1** | **Decay rates** for fullness, thirst, mood, education, and the effect of life stage on them. | Nothing in the legacy code. | Check B1, then tune. |
| **Q-START-1** | Initial stat values after hatching (legacy: VerySad / C+ / empty). Is the egg stage an actual wait or just an animation? Is there a naming step? | A1 | Hatch with half-full stats and Normal mood, after a short crack animation. |
| **Q-SICK-1** | What makes the pet sick, and how many doses cure it? (You listed "left sick" as a death cause, but not the triggers.) | B3; `sickness_chance` column | Rising chance from being left dirty, extreme temperature, obesity, plus a small base chance; 1 dose cures. |

## P1: per-feature behavior

| ID | Question | Evidence | Proposed default |
|----|----------|----------|------------------|
| **Q-FOOD-3** | Should the pet **refuse** when full? | A5 | Yes. |
| **Q-DISC-1** | Is there a **discipline** mechanic in the toy? | A8 | Drop it. |
| **Q-CLOCK-1** | What the Clock button does. | A2 | Show time and age in days. |
| **Q-ATTN-1** | What exactly triggers an attention call and how long before it counts as a "care mistake"? (Calls themselves: COND-02.) | B4 | Beep from the moment the condition starts. |
| **Q-PLAY-2** | Other games? | | No (v1). |

## P2: product & UX

| ID | Question | Evidence | Proposed default |
|----|----------|----------|------------------|
| **Q-BUG-1** | Fix all legacy bugs BUG-01…BUG-11? Several are moot once art and rules are rewritten. | [00](00-overview.md) | Fix/design them out. |
| **Q-UI-1** | **Device skin & brand name**: a single yellow shell? Legacy had planned colour variants and two "types" (Dinkie Dino vs Rakuraku Dinokun). The new shell is an original design (ASSET-03). | `Device.Color/Type` | One yellow egg shell; app name "Rakuraku Dinokun". |
| **Q-UI-2** | **Layout**: full skeuomorphic device on phones, or LCD that fills more of the screen; landscape; desktop keyboard controls. Let's iterate with mock-ups before building. | | Scaled device, portrait-first, keyboard support on desktop. |
| **Q-UI-3** | **Multiple pets**: the real toy has one pet; the 4-slot menu (create/rename/delete via long-press-drag) came from the Android app. Keep it? | MENU-02 | Keep up to 4. |
| **Q-UI-4** | Languages (EN + pt-BR?). | `strings.xml` | EN + pt-BR. |
| **Q-UI-5** | Sound: our own effects; add a mute switch. | | Yes. |
| **Q-UI-6** | Keep a hidden debug panel (force sick, skip time, force growth)? **Strongly recommended now**: a 15–20-day lifecycle can't be tested without a time-travel tool. | | Yes (`?debug=1`). |
| **Q-DATA-1** | Backup/export of pets. | | JSON export/import later. |
| **Q-DIST-1** | Hosting, domain, analytics. | | Static host, no analytics. |
