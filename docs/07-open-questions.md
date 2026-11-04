# 7. Open questions & decisions

The decisions made so far are in the log below; decided rules live in [08](08-target-rules.md). The **open questions are numbered** at the end so they can be answered by number; the bracketed text is the proposed default. Many can be settled by checking the real toy: see [09](09-toy-verification-checklist.md).

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
| 6 | Q-ATTN-2 | **Deferred**: revisit later. → LCD-06 (**closed in round 17**: one icon blinks, ATTN-01/02) |
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
| 15 | Q-UI-3 / A8 | **One pet in v1**, the data model ready for several. **Pets have no names.** If there are several later, each is identified by an image or idle animation of its current age and species. |
| 15 | Q-UI-2 | Layout is **undecided**: iterate on options when the UI is prepared. **Keyboard controls are dropped.** |
| 15 | Q-UI-1 | **Four shell colourways** (original art): white with red buttons, red with yellow buttons, teal with yellow buttons, yellow with red buttons. |
| 15 | Q4–Q10 | First run uses the device time and asks only for the **wake-up time**. The **Clock button shows only the time**; the age is on a Check screen. **Mute switch** plus **hold Left+Right**; the Esc+Enter chord is skipped. **Reset**: pinhole, long-press and confirm, then ask for the wake-up time. **Debug panel**: yes. **Export/import**: later. |
| 15 | Q-I18N | There was **no Brazilian manual**, so the pt-BR glossary is drafted from scratch. Unmatched browser language shows **English**; **24-hour** clock; grades **A+ to E+ unchanged**; **Spanish** after v1 with a native reviewer; docs stay in English (a pt-BR README later); **one URL** with an in-app language switch. Pet names no longer exist. |
| 15 | Q-PACE-1 | **AC pacing:** the default asks for a look about **every 4 hours**; a **relaxed** mode about **every 8** (the room drifts half as fast). Implemented as `Settings.pacing`. Suffering now starts gently (3% a check, +3% per degree) with 10% sickness and 0.2% instant death on entry. → TEMP-09, [15](15-pacing-report.md) |
| 15 | Q-PACE-2 | **Dirt timer 20 to 24 hours** after a bath. → DIRT-02 |
| 15 | Q-PACE-3 | A pet left alone **should survive at least a day**: 82% do on normal pacing, 93% on relaxed; all are dead by two days. → [15](15-pacing-report.md) |
| 16 | 22, 23 | **Care score:** I draft it ([16](16-care-score-proposal.md)); the grace of a care mistake is the same as the condition's grace. |
| 16 | 24–31 | Dirty checks lower happiness **every check**; after medicine they restart from 20% but **roll first at the next check**; **death checks start at 10%** (then 20%, 30%…); the night counts attenuated; "low happiness" and "too long hungry or thirsty" mean the **lowest level / completely empty**; the room resets to 25 °C at bedtime and the AC stays as left. → DEATH-08 |
| 16 | 32–34 | **Bedtimes** are fixed per stage and **capped by the player's latest-bedtime setting**. The toy has three tiers (**blobs 19:00, legs 20:00, adult 22:00**); tail 19:30 and teenager 21:00 are an experiment. **The player must be shown the expected bedtime.** → SLEEP-05..07, BED-01 |
| 16 | 35–37 | AC rules as read (a switch while suffering **cures** TOO_HOT / TOO_COLD); the entry numbers are fine; start 25 °C, shown as a number. |
| 16 | 38–41 | **Hungry, thirsty and sad only when the meter is completely empty**; what they cause starts at the next check. **Hungry and thirsty have no sprite**; the priority of the rest is **SICK, TOO_HOT/COLD, SAD, DIRTY**. The pet **beeps every 5 minutes**, the same tune for every condition. Sleeping has a sprite and does not call; overweight has none. → COND-01..05 |
| 16 | 42, 43 | Weight numbers are **placeholders** until the toy is checked. **New weight system:** caloric foods (Apple, Hamburger, Noodles) add weight 75% of the time, **Ice Cream always**, non-caloric (Carrot, Chicken Thigh) never, except to a pet below its healthy range; a **won game burns weight 50%** of the time; weight **burns off over time**, faster when heavier. → WEIGHT-03..07 |
| 16 | 44–50 | **Hatching:** empty hunger, thirst and education, happiness in the middle, **light on**, AC off; the egg is only an animation. No other causes of sickness. **Refuse food when full, and food that does not suit the species even when hungry.** No discipline mechanic. A visual clue for AC / light on is to be studied. No other minigames. → LIFE-01, FOODSP-01 |
| 16 | 51–53 | A lit room at night stays at **60%**; Angel and Demon stay **locked until reset** in v1; the Check screen shows weight in kg and age as a number. |
| 16 | 54–56 | The new survival numbers are **enough**. A **bath window in the first hour after waking** is added. Shell colour and pacing can be changed at any time. → DIRT-06, SURVIVE-01 |
| 17 | 65–76 | **The toy manual** ([17](17-manual-review.md)): the left-hand action stays a gentle **Pet** (the toy's Discipline is not copied); the **AC works while the pet sleeps**; happiness has **six levels**, **SuperHappy** reached only by a won game while well fed, watered, educated and healthy; the glossary uses **pt-BR** terms; Jokenpo **default 5 rounds**; the sound chord stays; our bath windows stay; weight ranges by age later; **one icon blinks slowly** for the main problem (order proposed); the branch happens at the tail. → SLEEP-09, HAP-05, PLAY-01, ATTN-01/02, SPEC-08 |
| 18 | 58–64, 77–83 | **Weight:** Apple and Hamburger caloric (75%), **Noodles the middle term (40%)**, Carrot and Chicken Thigh non-caloric; Triceratops accepts all foods. Questions 59 to 64 (any food before the species, Ice Cream for all, hungry / thirsty look and beep, light on at hatching, a newborn alone is gone in a day, bedtime on the clock screen and in settings) and 77, 78 (SuperHappy as read, blinking order with Pet for SAD) **accepted**. **The care score is now real and one score** ([16](16-care-score-proposal.md)): time spent SuperHappy earns points back (1 per hour, up to 8); good care makes sickness and sudden death up to **10% less likely** and lets the pet **live on up to wake-up 30** before it turns Angel or Demon; the **Angel limit grows with the life** (1.7 points per day, later 1.72, 52 at day 30). → CARE-04…08 |
| 18 | 83 + tuning | **Balance:** a twice-a-day player should be an Angel about **50% on normal pacing and about 66% on relaxed**. Done by charging a room lapse (too hot / too cold) **0.5 point on normal pacing and 2 on relaxed**, and the Angel limit grows **1.72 points per day** (52 at day 30). Simulated: 54% and 65%. → CARE-03, CARE-04, [16](16-care-score-proposal.md) |

---

# Open questions

Numbered so you can answer by number. The bracketed text is my proposed default. Questions 1 to 56 and 58 to 83 are answered (see the decisions log); only 57 is open.

57. **Care score draft** ([16](16-care-score-proposal.md)): the list of mistakes (sick, too hot, too cold, dirty, light left on, hungry, thirsty, sad), their weights (1 to 3 points), their graces (15 minutes to 2 hours) and the threshold (**Angel at 32 points or fewer**). It is implemented as drafted; accept, or what should change? [Accept as drafted, then tune]
## Tuning backlog (not questions)

Numbers adjusted by play-testing and the simulator, all kept in `src/core/config/tuning.ts` and reachable from the debug panel. **Needs / pace:** decay rates (a full meter empties in about 12 awake hours), the night attenuation, the room drift (normal 4 hours, relaxed 8), dirt timer 20 to 24 h and onset 2 to 3 h, bedtimes per stage. **Chances:** sickness at wake-up (2% / 60%), suffering entry (3% + 3% per degree), dirty checks (start 20%), death checks (start 10%), loss-streak happiness drop (50%), over-play drop. **Deaths:** the onset range per cause (DEATH-07). **Weight:** every number, until the toy is checked (healthy ranges per stage, 0.25 kg steps, 75% / 100% gain chances, 50% win burn, burn over time). Run `npm run sim` ([15](15-pacing-report.md)) after changing any of them.
