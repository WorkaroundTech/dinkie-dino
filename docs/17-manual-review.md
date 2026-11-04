# 17. The toy manual review (round 17)

Source: `rakuraku.pdf`, a scan of the toy's own leaflet in Portuguese (European, partly machine-translated), English, Spanish and Japanese. It is the **first primary source** we have; it outranks the blog ([12](12-blog-guide-review.md)). Only facts about behaviour are taken from it; its text and pictures are not copied (ASSET-01/03). The Japanese was read by me and is the least certain.

## 17.1 Confirms what we have

| The manual says | Matches |
|-----------------|---------|
| 10 icons, Left / Right selection, Esc, Enter, Clock | CTRL, LCD-05 |
| Setting the clock: six steps, Enter then hour, minutes, Clock to play | PROP-01 |
| The best temperature is 25 °C; cold makes it shiver, heat makes it angry; both make it get sick easily | TEMP-01, entry sickness |
| A dirty pet turns dark; a shower cleans it fully; a dirty pet is unhappy and gets sick easily; no poop | DIRT |
| Vegetarian or non-vegetarian food shapes its life form | SPEC |
| The light must be off when it sleeps | SLEEP-01..03 |
| Medicine only works on a sick pet; it refuses food, drink, shower and injection when it has had enough | MED-04, full refusal |
| It beeps for food, drink and shower; check the report | COND-02, Q61 |
| Dies of old age or bad health; reset key on the back | LIFE-10, RESET-01 |
| Left + Right held 3 seconds toggles sound in game mode | SND-04 |
| Jokenpo: win 3 or more of 5 and its mood improves | PLAY-01, PLAY-04 |
| Report screens: age and weight, hunger (bowls), thirst (glasses), temperature, happiness (faces), discipline grade | CHECK-01 |

## 17.2 What changed or was added (your rulings)

| # | Finding | Ruling |
|---|---------|--------|
| 65 | The left-hand icon is **Discipline**, for an angry pet; the report's grade is called "Discipline" | **Keep the gentle Pet** with the rules we have; no angry pet, nothing to scold (PET-02) |
| 66 | Asleep, the player can use the report, the light **and the air conditioner** | AC added to what works at night (SLEEP-09) |
| 67 | The report shows **six** mood faces | Five normal levels plus **SuperHappy**, reached only by a won game while the pet is in good shape (HAP-05) |
| 68 | A Portuguese section exists, but in European Portuguese | Use it as a base; the app uses **pt-BR** terms ([14](14-localization.md)) |
| 69 | Original plays 5 rounds | **Default 5**, 3 to 5 configurable (PLAY-01) |
| 70 | Sound chord confirmed | As proposed: the chord and a visible mute control (SND-04) |
| 71 | The toy refuses a bath when not dirty | Keep our bath windows (BATH-01) |
| 72 | The sample weight of 0.5 kg at age 14 | A placeholder; weight ranges by age later (WEIGHT-08) |
| 73, 74 | Report order; species refusal | Keep ours |
| 75 | A "care mark" in the Japanese text | The toy **slowly blinks the icon that would fix the main problem**, one at a time (ATTN-01); I propose the priority in ATTN-02 |
| 76 | The branching diagram | Branching happens at the **tail**; the first two blob stages have no species; each tail has its own mark (SPEC-08) |

## 17.3 SuperHappy as implemented

A won game takes happiness from VeryHappy to SuperHappy when **all** hold: hunger above 3 bowls and thirst above 3 glasses (7 of 8 half-steps), education B+ or better, no sickness, no dirt, no too-hot or too-cold. The last three go beyond your list ("and so on"): please confirm. The thresholds are `care.superHappy` in `tuning.ts`. Nothing else depends on SuperHappy yet (no extra effect, no change to decay); over-play counts it like VeryHappy.

## 17.4 The blinking icon as implemented

`attentionIcon(pet, ctx)` returns the icon to blink, or nothing. The proposed order, from how soon each problem hurts: **sick → Medicine, too cold / too hot → AC, dirty → Bath, thirsty → Drink, hungry → Food, sad → Pet**. Asleep, only what works at night counts: a light left on (Lamp), then suffering from the room (AC). The rhythm and where it shows are UI decisions.

## 17.5 Effect on the simulator

The default of 5 rounds and the six-level happiness changed nothing material: the targets in [15](15-pacing-report.md) still hold (twice a day 26% reach the final form on normal pacing, 93% for a visit every 8 hours).
