# 9. Real-toy verification checklist

You have the real toy. This is the shortlist of things worth checking on it, **ordered by how much they change the design**. Fill in the "Result" column as you go; I'll fold the answers into [08](08-target-rules.md).

You don't need to do all of it. Items marked **quick** take minutes. Items marked **long** need hours or days of observation, so start those early and check back.

Tip: on a fresh pet, note the time you started; take quick notes (a phone voice memo is fine) when the pet calls for attention.

## Blog claims to verify

A third-party guide ([12](12-blog-guide-review.md)) makes claims that you can check against your toy. The most valuable: **C1** (mixed diet → Triceratops?), **C2** (does Pet raise education?), **C3** (education starts at E+?), **C4** (5 rounds, 3 dino wins?), **C5** (medicine empties all stats?), **C6** (temperature needs attention every ~15 min?), **C7** (no poop, dirty = pet turns dark?), **C10** (light on → always sick?), **C11** (do Angel/Demon eventually die?), and **C13** (weight shown in kg, age as a number?). The ID in the "Why it matters" column of the checks below points to the related claim.

## A. Quick checks (minutes)

| # | What to check | Why it matters | Result |
|---|---------------|----------------|--------|
| A1 | **Start-up flow**: does it ask to set the clock? What's the egg animation? What are the starting stat values? | Onboarding & initial state (Q-START-1) | |
| A2 | **Clock button**: what does it do, how do you set the time? | Q-CLOCK-1; also wake time | |
| A3 | **All 10 icons: what does each one do** and in what order are they on the screen? Which icon names does the toy use? (The legacy had Drink, Food, Lamp, Pet, Check / Play, Educate, Bath, Cool, Medical.) | Make sure the action set is right | |
| A4 | **Meal sizes**: how many "bowls/hearts" does each food fill (Hamburger, Chicken Thigh, Apple, Carrot, Noodles, Ice Cream)? How about Drink? | FOOD rules (legacy: ½ / ½ / 1 / 1 / 1 / 0) | |
| A5 | **Feed when full**: does the pet refuse? Same for drink. | Q-FOOD-3 | |
| A6 | **Ice cream**: effect on weight/happiness/health? | Q-FOOD-2 | |
| A7 | **Check screens**: which stats, in what order? Does it show age (in days?), weight, discipline/education, happiness? | Check screen content | |
| A8 | **Educate**: what does it do exactly, and what is displayed? Any limit/cooldown? | Q-ACT-1, Q-DISC-1 | |
| A9 | **Pet** and **Play**: is the pet's hand shown **before** you choose (so you can let it win)? How many rounds? How does happiness change on a win, a loss, or several losses in a row? | Q-PLAY-4, PLAY-07 | |
| A10 | **Sick pet**: which actions are refused while it's sick (we assume eat, drink, play, study, bath, pet; Lamp, Check, Clock, AC still work)? **Medicine**: reaction on a healthy pet? Confirm what the injection resets: hunger and thirst empty, happiness to the lowest; do education and weight change? | MED-02/04, Q-MED-2 | |
| A11 | **Reset**: we know it's a pinhole in the back. Does the toy ask for the clock after a reset? What does the death screen look and sound like? Can the Angel/Demon also only be reset? | RESET-05, DEATH-03 | |
| A13 | **Icon segments**: which segments light (selected action? calls? AC on? lamp?). Any other indicators on the LCD? | LCD-05/06, Q-ATTN-2 | |
| A12 | **Sound design**: what sounds exist (beep, call, eat, death, evolution)? (We will create our own, but need to know which events have sounds.) | Audio spec | |

## B. Medium (an hour or two)

| # | What to check | Why it matters | Result |
|---|---------------|----------------|--------|
| B1 | **Hunger/thirst depletion**: how long from full to the first "call", and to empty? Is the rate the same for each growth stage? | Q-LOOP-1 (the most important tuning values) | |
| B2 | **Dirtiness & bath**: what makes the pet turn dark (time? meals?), how often, how long until it gets sick or dies, what the shower does and whether bathing a clean pet does anything. (We decided there is no poop; the blog agrees.) | Q-DIRT-1; DIRT-02…05 | |
| B3 | **Sickness**: what are the signs? What triggers it (try leaving it dirty, overfeeding, etc.)? How many doses to cure? | Q-SICK-1 | |
| B4 | **Attention call**: how does the pet call (sound, icon)? How long until a "care mistake" is counted? | Q-ATTN-1; also drives Angel/Demon outcome | |
| B5 | **Lamp / sleep**: bedtime & wake-up time. We assume 2% / 60% SICK at wake-up (light off / on): roughly right? Measure bedtime for each growth stage (blob ≈ 19:00, adult ≈ 22:00?). What does the pet look like asleep, with the light on, and does it decay while asleep? | Q-SLEEP-3; SLEEP-03…08, TIME-03/05 | |
| B6 | **Air conditioner**: with the AC on, how long from 25 °C to ≤ 23? With it off, how long to ≥ 27? Step size per change? Check the **bump** (19 °C + AC off → 21–22 °C?), the **snap** to 24/26 °C in a TOO state, and that repeated toggling doesn't stack. How long can the pet stay TOO_COLD / TOO_HOT before it gets SICK or dies? Is the temperature shown as a number? | Q-AC-1/3/4; TEMP-05…18 | |

## C. Long (hours to days)

| # | What to check | Why it matters | Result |
|---|---------------|----------------|--------|
| C1 | **Growth timing**: the exact wake-up time at which the pet evolves (6–9 am). Does the toy's own clock define "morning"? Does the time of evolution depend on when the pet was born? | LIFE-02, TIME-05 (default time) | |
| C2 | **Stage durations**: confirm 2/3/3/3/4 days and the 1–5 days to the final form. Are they counted from hatching or from the previous evolution? Are they affected by care? | LIFE table | |
| C3 | **Species**: we decided ">50% of the diet wins, else a weighted random draw, revealed at the tail stage" (SPEC-01…07). Does the toy agree? Does it count feedings or amounts? How does Ice Cream count? | SPEC-02…06 | |
| C4 | **Angel vs Demon**: we decided a hidden care score. Which conditions does the toy penalize, and does the number of days (1–5) depend on care? | LIFE-04, CARE-01…04 | |
| C5 | **Death timers**: how long to die from hunger (must be < ~4 wake-ups), thirst / dirty / sick / too cold / too hot / unhappiness? Does an older stage tolerate more? | DEATH-02/05, Q-DEATH-1 | |
| C6 | **Locked final state**: truly no care? Does it ever die ("died" state in the manual)? | LIFE-05, LIFE-06 | |
| C7 | **Age display**: does the toy count age in days, "years", or something else? | Check screen, Q-LIFE-2 | |
| C8 | **Changing the clock** (if possible): does the toy skip ahead or do something odd? | TIME-04 | |

## If you can't test something

For anything in the table you can't verify, tell me "default" and I'll use the proposed value from [07](07-open-questions.md), tunable in a config so we can adjust after we play it.

> If your toy has a manual, photos or videos, a photo of each page/screen would be an efficient substitute for many of the long tests.
