# 12. Blog guide review

Source: `rakuraku-general-guide-virtual-pet-blogs.pdf` — "Dinkie Dino / RakuRaku Dinokun - General Guide" (12 pages). Author unknown; photos credited to *Carleesi Chan on Tumblr*, other images from Google Images. It documents the **teal "RakuRaku Dinokun"** toy, whose 10-icon layout and 5-button layout match the toy we are modelling (the photos don't let me verify the LCD dot count).

## How this document is used

- The guide is a **secondary, third-party, unverified source**. You said you aren't sure all of it is true. Nothing here overrides a decision you made in [08](08-target-rules.md).
- Each claim is classified: **✅ confirms** something we already have, **⚠️ conflicts** with a decision or default (needs your ruling), **🆕 new** information, or **👁 photo** observation.
- Confirmed new items get promoted to doc 08. Until then they are proposals (`PROP-nn`) tagged **📖 Blog, unverified** and are meant to be checked on your toy (the checklist, [09](09-toy-verification-checklist.md), lists them).
- Only *facts about behavior* are taken from it. The images and text are third-party work and are **not copied** (ASSET-01/03 still apply).

---

## Rulings so far (round 6)

| Point | Ruling |
|-------|--------|
| C1 mixed diets | **Keep ours** (weighted random) |
| C5 medicine | **Blog adopted** (round 8): hunger and thirst go empty and happiness drops to the lowest level; education and weight presumed untouched |
| C6 temperature pace | **Keep ours** (~1–2 h) |
| C7 poop | **No poop**; the pet gets dirty (dark) and needs a shower |
| C2/C3 pet and education | **Pet** raises education (never past C+) and happiness (never to the top); only studying tops education, only Jokenpo tops happiness; implies the 5-grade scale |
| C4 play | **3–5 rounds, configurable**; decided **per game** by round majority; a pet win raises happiness, a loss doesn't, repeated losses may lower it; over-play (games) may lower education |
| C9 attention icon | **Deferred**: revisit later |
| C12 Ice Cream | **+1 level of happiness** (capped at Happy); not instant |
| Sound | The toy uses simple piezo notes; **we synthesize them**, no files (SND-01…04). The Left + Right chord for muting (PROP-04) is not decided |
| C8 death causes | **Your list adopted** (sick 4–6 h, hot/cold 6–8 h, low happiness 1–2 days, hunger 2 days+, thirst 1 day+); dirty leads to SICK, not directly to death (DEATH-07) |
| Jokenpo hand | The player does **not** see the pet's hand (PLAY-07) |
| C10, C11, C13, C14 and the rest of PROP-01…13 | **Not yet ruled** |

All rulings are in [08](08-target-rules.md) §8.13–8.15, TEMP-09 and SPEC-03.

## 12.1 ✅ Confirms what we already have

| Blog says (page) | Matches |
|------------------|---------|
| Icon order: left = Water, Food, Lights, Pet, Check; right = Play Games, Educate, Bath, Cool Off, Medical (1) | The 10-icon layout, `01-device-and-controls.md` |
| **Left** button moves through the **left** icons, **Right** through the **right** icons, **Enter** selects (1) | CTRL-05 (legacy cursor navigation) |
| Light must be turned off when the dino sleeps, or he **wakes up sick** (3) | SLEEP-01/02 |
| Species by diet: **Meat & hamburgers → T-Rex**, **veggies & fruit → Brontosaurus**, **pasta / everything → Triceratops** (2–3, growth chart) | SPEC-01…07 (with one conflict: see C1) |
| Two shared early forms, then three species branches of four forms each, ending at two special forms (an angel and a demon) (3) | LIFE table: 2 shared stages + 4 species stages, then Angel / Demon |
| Status icon shows **happiness, education, weight, age, hunger, thirst, temperature** (text p.3; photos p.4, in that order) | CHECK-01 order (legacy) |
| Hunger = **4 bowls**, thirst = **4 glasses** (4) | Legacy 0–8 scale, 4 icons |
| **25 °C is the best temperature**; too cold → shivers; too hot → angry (7) | TEMP-01 (your band is 24–26 °C) |
| The pet **beeps** when it needs something (2) | COND-02 |
| It can **die of old age or sickness**; dead screen = blob with a **cross**; **reset button at the back**, press with a stylus (10) | LIFE-10, RESET-01 |

## 12.2 ⚠️ Conflicts that need your ruling

For each row I give a recommendation. **Keep mine** means the current doc stays as is.

| # | Topic | Your decision / my default | Blog says | Recommendation |
|---|-------|---------------------------|-----------|----------------|
| C1 | **Mixed diets** (no group > 50%) | You: random draw weighted by the shares (SPEC-03) | Triceratops is the "**pasta / everything**" branch, i.e. the default for mixed diets | Your call. The blog implies a **deterministic** fallback: Triceratops. Simpler, and testable. If your memory says random, **keep yours**. |
| C2 | **What Pet does** | Raises **happiness** (legacy code; my docs) | "Petting … will raise his **education** meter" (3) | **Keep mine** and verify (A9). The blog may have confused it with Educate; but if it's right, Pet and Educate both raise education and nothing but Play/Ice Cream raises happiness. |
| C3 | **Education scale** | C+ → B+ → A+, start C+ (legacy; `D+` was commented out) | "Start off with an **E+** … all the way up to **A+**" (5) | Use **5 grades, E+ D+ C+ B+ A+, starting at E+**. It explains the legacy `D_plus` comment. Verify (A8). |
| C4 | **Play (Jokenpo)** | Legacy: 3 rounds, no effect | **Goal: let your dino win at least 3 of 5**; just playing raises happiness even without winning (4) | Use the blog: **5 rounds; the dino needs 3 wins; every game raises happiness**. What winning adds is unknown (A9). |
| C5 | **Medicine** | Default (Q-MED-1): one dose, no side effects | A shot, and "**ALL his stats will get empty**; you have to fill them up again" (8) | Use the blog: it's a real cost. Which stats (hunger, thirst, happiness, education, weight?) is unknown (A10). |
| C6 | **Temperature pace** | My default: swing out of the band in ~1–2 h | "Check on him **every ~15 minutes** to control the temperature" (7) | Use the blog as the tuning target: ~**15 min** between needed AC changes. That is a very demanding toy and matters for a PWA (see C14). |
| C7 | **Poop** | Legacy comment mentions poop; my docs assumed poop piles and a Poop event | **No poop at all.** "Select Bath when your dino **turns dark** = gets dirty. It will give him a shower" (6–7) | Treat **DIRTY = the whole pet turns dark**, cleaned by Bath's shower animation, with **no poop piles**, unless you remember poop on the toy. Removes a sprite and a rule (B2). |
| C8 | **Death causes** | You: left sick, dirty, hungry (and old age) | "Can die of **old age, or sickness**" only (10) | **Keep yours**; ask whether starvation / dirtiness kill directly or by causing SICK first. This changes DEATH-05 (the never-fed pet). |
| C9 | **Attention indicator** | My proposal: the relevant icon segment blinks (Q-ATTN-2) | "**There is no attention icon**": only the beep and the pet's look; check the status icon (2) | **Drop my proposal.** No blinking segment; only beep + condition sprite. The shell segments just show the selected action. |
| C10 | **Light left on** | Accepted default: 60% SICK at wake-up | He "**will** wake up sick" (3) | Your 60% was a default for "greatly increases". The blog implies near-certain. Make the default **higher (e.g. 90%)** if you agree. |
| C11 | **Angel / Demon fate** | Locked forever, no care (LIFE-05); manual's "died" state unverified | The growth chart ends with **both Angel and Demon pointing to a dead-with-cross icon** (3) | Plausible answer to LIFE-06: the final form eventually **dies** too. When is unknown. Verify (C6). |
| C12 | **Ice Cream and happiness** | ICE-04 open | Ice cream makes an angry/unhappy dino "**happy immediately**" (8) | Use: Ice Cream **instantly restores happiness** (to full, or a big jump). Verify amount (A6). |
| C13 | **Weight / age display** | Weight scale open; legacy art covered 1–3 | The Check photo shows "**26 kg**" and an age of "**3**" (4) | Weight is shown in **kg** with realistic numbers, not 1–3. Age is a plain number (days is likely; at least consistent with wake-ups). Verify (A7). |
| C14 | **Real-time pace on a phone** | Catch-up simulation (TIME-01) | A 15-minute care cycle (C6), sleep rules, and no attention icon | Not a conflict, but a **product risk**: a real-time toy this demanding gets frustrating when it's not in your hand. Needs a design answer: notifications, gentler default pacing, or faithful pace. See Q-BLOG-2. |

## 12.3 🆕 New information (proposals, unverified)

Proposed rules, to be promoted into doc 08 when you confirm them.

| ID | Proposed rule | Source | Replaces / fills |
|----|---------------|--------|------------------|
| PROP-01 | **Boot flow**: the toy starts in **clock mode** to set the time: *Enter* → the hour blinks; *Left* changes the hour; *Right* switches to minutes; *Left* changes the minutes; *Enter* confirms; *Clock* enters game mode. | p.1 | A1 (start-up flow) |
| PROP-02 | In game mode, **Clock shows the time** (briefly), then returns. | p.1 | Q-CLOCK-1, CTRL-08 |
| PROP-03 | In game mode, **hold Esc + Enter together until a beep** → clock set mode. | p.9 | A2 |
| PROP-04 | **Sound on/off:** hold **Left + Right together for ~3 s** in game mode. | p.1 | Q-UI-5 (mute) |
| PROP-05 | **No attention icon**: attention = periodic beep + the pet's condition sprite only. | p.2 | LCD-06, Q-ATTN-2, C9 |
| PROP-06 | **Temperature** is shown **numerically** ("25°C") on the thermometer screen. | p.4 | Q-AC-1(d) |
| PROP-07 | Weight is in **kg**; age is a plain number. | p.4 | Q-WEIGHT-1, C13 |
| PROP-08 | **Education** has 5 grades E+ to A+, starting at E+ (C3). | p.5 | |
| PROP-09 | **Play**: 5 rounds, the dino needs 3 wins; playing always raises happiness (C4). | p.4 (photos p.5) | Q-PLAY-1 |
| PROP-10 | **Bath**: DIRTY = the pet turns dark; Bath plays a shower sequence (4 frames in the photos) (C7). | p.6–7 | Q-CLEAN-1 |
| PROP-11 | **Medicine** = injection (syringe animation); afterwards **all stats are empty** (C5). | p.8 | Q-MED-1 |
| PROP-12 | **Two different angry faces**: (a) angry from heat (TOO_HOT); (b) angry because he feels **abandoned/unhappy** (SAD); remedy for (b): Ice Cream, or Play. | p.8 (photo p.9) | COND-01 SAD |
| PROP-13 | **Sick sprite** shows a pained face; **sleeping** shows eyes closed with a "z" in the top-right corner. | p.3, 8 | COND-01, art |

## 12.4 👁 Observations from the photos (useful for the art)

- **Check screens** (p.4), in order: a large smiling face (mood); a face with **"A+"** (education); **"26kg"** over a face and **"3"** (weight, age); four bowls (hunger); four glasses (thirst); a thermometer with **"25°C"** (temperature). This matches the legacy order and shows weight as `NNkg`, age as `N`.
- **Sleeping pet** (p.3): "z" at the top-right of the grid, closed eyes. The second photo shows the LCD with the **dot grid visible and dim**, which may be what "lights off" looks like. Verify (B5).
- **Bath sequence** (p.7): four photos: dark pet → shower strokes over the dark pet → shower over a lighter pet → clean smiling pet.
- **Game** (p.5): hand sprites in the LCD for the Rock-Paper-Scissors rounds, a happy face once it finishes.
- **Sick / medicine** (p.8): face with `>  <`-style eyes; the injection frame shows a syringe next to the blob.
- **Death** (p.10): a lying blob and a **cross** in the upper right, with ground detail.
- **Growth chart** (p.3): shared forms 1–2, then a four-form chain per species; the three adult forms are large (about as tall as the LCD).
- The side icons are **paw prints** on the LCD frame (p.11, p.2 photos): the lit segments we modelled in LCD-05.

## 12.5 Rights note (matters for ASSET-03 and the app name)

Page 11 of the guide is the *Dinkie Dino* promotional artwork. It looks **identical to the yellow shell in the legacy project's `dinkie_bg.png`** (same purple horn, logo and teal mascot in the cracked egg), so the legacy shell art was most likely taken from the commercial product, not drawn by you. That reinforces your decision to redraw everything from scratch. **Decision (round 12):** the app is called **Dinkie Dino**. You told me both historical names belonged to 90s bootleg toys whose "brands" are abandoned. I can't verify the legal status, so I haven't relied on it: the project still uses **no logo, mascot or artwork** from those products (ASSET-03). If trademark status ever matters, it is worth a real check before launch.

## 12.6 What changed in the other docs

Round 5: nothing in doc 08 was changed. Round 6: the rulings above were applied to doc 08. Earlier updates: this doc (new), the README index and status legend, the decisions log and follow-ups in [07](07-open-questions.md) (new Q-BLOG-1/2, and notes on Q-AC-1 and Q-ATTN-2), and a pointer in [09](09-toy-verification-checklist.md) listing the blog claims to test.
