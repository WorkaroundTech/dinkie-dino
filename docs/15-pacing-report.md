# 15. Pacing report (M3)

The headless simulator plays thousands of seeded lives with scripted players and measures what the rules actually demand. This document records how to run it, what it changed, what it found, and the decisions it needs from you. All numbers below are reproducible: the seeds are fixed (`--seed 1`, 300 lives), so the same command prints the same table.

## 15.1 Running it

```bash
npm run sim                                    # all built-in players, 300 lives each
npm run sim -- --lives 1000 --players twice,thrice
npm run sim -- --room calm                     # the room never changes temperature: needs only
npm run sim -- --diet meat                     # plant, noodles or mixed
npm run sim -- --set temperature.moveChance=0.06 --set needs.checksPerPoint.hunger=9
npm run sim -- --json                          # raw summaries
```

`--set path=value` overrides any tuning number (a typo is an error, not a silent wrong experiment). The command builds the tool with Vite and runs it with Node; it adds no dependency. CI runs a small smoke run.

### The players

Each visits at fixed times and does the same thorough routine: medicine if sick, fill water and food, pet, play a game if not at the happiest, bathe **if dirty**, switch the AC to bring the room back toward the middle, switch the light off.

| Player | Visits |
|--------|--------|
| `absent` | never |
| `unfed` | three times a day, does everything **except** feed and water (shows what hunger and thirst alone do) |
| `morning` | an hour after waking |
| `evening` | 45 minutes before bedtime |
| `twice` | an hour after waking, and 45 minutes before bedtime |
| `thrice` | those two, and 6 hours after waking |
| `hourly` | every hour of the awake day |
| `quarterly` | every 15 minutes |

Nobody in the real game is this regular. The point is to measure the **attention the rules ask for**, not to predict real play.

### The measures

- **final / died:** share of lives that reached the final form, or died before it.
- **trouble:** share of awake time that the pet shows any condition (hungry, thirsty, sad, dirty, sick, too cold, too hot). **needs:** only hungry, thirsty or sad.
- **life p10 / median / p90:** days lived.

## 15.2 What changed in the defaults

Only provisional numbers that were mine; nothing you decided.

| Number | Before | Now | Why |
|--------|--------|-----|-----|
| Hunger / thirst / happiness decay (awake checks per point) | 6 / 4 / 12 | **8 / 8 / 18** | Two visits a day were not enough: a twice-a-day player had a thirsty pet 46% of the time and only 18% reached the final form (PACE-01) |
| Instant death on entering TOO_HOT / TOO_COLD | 1% | **0.2%** | It was the top cause of death (22%) for a player who visits three times a day, because that player enters those states constantly. "Small chance" (TEMP-17) is kept |

A full day is about 14 awake-equivalent hours for needs: a meter filled by a visit takes about **12 awake hours** to reach "hungry" or "thirsty", which is why two visits a day are enough and one is not quite.

## 15.3 Results

### The needs alone (room kept still: `--room calm`)

```text
player   visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  sick
absent   0.0         0%     100%  1.1 / 1.1 / 1.2          75%      75%    75%     75%      55%  54%    35%
unfed    3.0         0%     100%  1.8 / 1.9 / 1.9          82%      82%    82%     82%      67%  8%     0%
morning  1.0         100%   0%    15.8 / 17.8 / 19.8       18%      18%    16%     16%      9%   7%     0%
evening  0.9         1%     99%   1.1 / 1.1 / 1.2          69%      45%    16%     16%      30%  54%    35%
twice    2.0         100%   0%    15.8 / 17.8 / 19.8       18%      11%    7%      7%       6%   7%     0%
thrice   3.0         100%   0%    15.8 / 17.8 / 19.8       8%       0%     0%      0%       0%   7%     0%
hourly   13.5        100%   0%    15.8 / 17.8 / 19.8       0%       0%     0%      0%       0%   0%     0%
```

The **PACE-01 principle holds**: two visits a day keep the pet healthy (11% of the time any need shows, 100% grow up), one visit a day starts causing conditions (18%), three leave none. A pet left alone dies after about **1.1 days**.

### The whole game (default temperature)

```text
player     visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  hot  cold  sick
absent     0.0         0%     100%  0.8 / 0.8 / 1.0          68%      61%    55%     55%      56%  18%    63%  0%    18%
unfed      3.0         0%     100%  1.3 / 1.8 / 1.9          83%      82%    81%     81%      76%  8%     11%  13%   5%
morning    0.5         0%     100%  0.8 / 1.2 / 1.8          64%      53%    33%     33%      49%  6%     42%  19%   17%
evening    0.9         0%     100%  1.1 / 1.1 / 1.2          75%      51%    16%     16%      47%  53%    19%  32%   40%
twice      1.8         0%     100%  1.2 / 2.2 / 4.2          60%      43%    9%      9%       41%  6%     35%  17%   14%
thrice     3.0         52%    48%   10.0 / 15.8 / 18.8       37%      15%    0%      0%       15%  7%     15%  15%   8%
hourly     13.5        98%    2%    15.8 / 17.8 / 19.8       1%       0%     0%      0%       0%   0%     0%   0%    0%
quarterly  53.3        100%   0%    15.8 / 17.8 / 19.8       0%       0%     0%      0%       0%   0%     0%   0%    0%
```

## 15.4 Findings

### F1. The AC cannot be kept with two visits a day (needs a decision)

With the default drift (the room leaves the 24 to 26 band in 1 to 2 hours, TEMP-09), **a twice-a-day player loses every pet, and even three visits a day lose 48%.** Only hourly attention works. Survival to the final form, by how fast the room drifts (`temperature.moveChance`) and by visits:

| Drift (`moveChance`) | About | morning | twice | thrice | hourly | AC actions/day needed (hourly) |
|----------------------|-------|---------|-------|--------|--------|--------------------------------|
| 0.25 (now) | 1 °C an hour | 0% | 0% | 52% | 98% | 6.3 |
| 0.12 | 1 °C per 2 hours | 0% | 0% | 73% | 100% | 3.3 |
| 0.06 | 1 °C per 4 hours | 0% | 3% | 91% | 100% | 1.8 |
| 0.03 | 1 °C per 8 hours | 7% | 38% | 96% | 100% | 1.0 |

Making getting sick on entering a TOO state rarer (25% to 10%) helps only a little. Even at 1 °C per 16 hours (0.015), two visits a day keep 75 to 79%. In short, **the AC is inherently a high-attention mechanic**, which matches the toy ("check on him every ~15 minutes", from the blog), and it is the one part of the game that does not obey "two interactions a day".

Why: while the room is wrong the pet suffers, suffering raises the sickness chance, a sick pet dies after 4 to 6 hours untreated, and being too hot or cold also kills on its own after 6 to 8 hours. With visits 5 to 10 hours apart, the chain completes.

**Options** (Q-PACE-1):
- **A. Keep it faithful (default now).** The AC is the demanding mechanic of the toy; the game wants about hourly attention, and the "two visits" principle applies to the needs only. Honest to the toy; very demanding on a phone.
- **B. A relaxed profile.** Keep the rules and slow only the drift (for example `0.03`) and soften the entry (sickness `0.10`): three visits a day are then enough (98%), two give about 44%. Classic stays available as a setting.
- **C. A global time scale.** Slow all time-based pressure by a factor in a "relaxed" setting (this is the `timeScale` hook from Q-BLOG-2), keeping the numbers decided with the toy untouched in "classic".

My recommendation: **A as the default profile and B or C as a selectable "relaxed" mode**, because the toy's feel is a goal but a phone is not a keychain in your hand. The simulator can tune either.

### F2. Evening-only visits cannot keep a pet alive; a morning visit can

An `evening` player loses the pet on day 1 even with the room still. The cause is a rule interplay: the pet turns dirty overnight and is **already dirty when it wakes** (DIRT-08), the dirty checks begin 2 to 3 hours later (DIRT-09) and make it sick, and a sick pet dies after 4 to 6 hours (DEATH-07). Reaching it only in the evening is some 11 hours too late. A **morning visit that bathes a dirty pet** is what the system rewards.

This also makes the pre-bed bath window (DIRT-06) a trap in the simulation: a bath at bedtime restarts the 16 to 20 hour timer, so the pet is dirty again by midday and stays dirty until the next evening. The simulated players therefore bathe **only when the pet is dirty**.

**Question** (Q-PACE-2): is that how the toy behaves, or does the pre-bed window exist so that an evening bath keeps the pet clean through the next day? If the second, the dirt timer (16 to 20 hours) is likely too short, and 24 hours or more would fit "one bath a day".

### F3. Neglect kills within about a day, but not by starvation

Two different neglect scenarios:

- **Nobody looks at the pet at all (`absent`).** It dies at a median of **1.1 days** in a still room (100% of **sickness**) and **0.8 days** when the room drifts (74% of heat). It never starves: the pet turns dirty 16 to 20 hours after hatching, the dirty checks make it sick, and untreated sickness kills after 4 to 6 hours, well before any hunger or thirst clock finishes.
- **Everything except food and water (`unfed`).** A pet that is kept clean, cool and medicated but never fed or watered dies of **thirst (91%)** or low happiness (9%) at a median of **1.9 days**. This is the "about two days" of DEATH-06, and it is also before the 5th wake-up, as DEATH-05 asks.

So the hunger and thirst clocks match what you described, but a pet left completely alone dies **about a day sooner** than that, from the dirt and the heat. A single missed day is then usually fatal. If a missed day should usually be survivable, what would change is the dirt timer and the temperature, not the thirst clock. (Q-PACE-3.)

### F4. Instant death was too common (fixed)

See 15.2: 1% per entry killed 22% of the pets of a three-visits-a-day player; 0.2% brings it to about 5%.

### F5. Sickness is the main killer in the real game

For players who can keep the needs but not the room, sickness (mostly from the 25% chance on entering a TOO state, then 4 to 6 hours untreated) is the leading cause of death (33 to 40%). If that feels too harsh, the lever is the entry sickness chance (Q-PACE-1 option B), not the needs.

## 15.5 Targets now enforced by tests

`tests/sim/targets.test.ts` runs full simulated lives with the default numbers:

| Target | Check |
|--------|-------|
| PACE-01 | twice a day: at least 95% grow up and a need shows at most 15% of the time; one visit shows clearly more (over 1.3x, at least 12%); three visits at most 3%; more visits are never worse |
| DEATH-05, 06 | a pet nobody looks at dies within about 2.5 days; a pet fed nothing but otherwise cared for dies of thirst at 1.5 to 2.5 days (median); both before the species decision |
| TEMP-09 | an hourly player who keeps the room comfortable grows the pet up (at least 90%) |
| LIFE-07 | the final form arrives on wake-up 16 to 20 |
| SPEC-02 | a diet of only meat / plants / noodles gives T-Rex / Brontosaurus / Triceratops in at least 95%; a mixed diet gives all three |

If you change the tuning on purpose, these tests will tell you which of your own targets moved.

## 15.6 Questions for you

Also in [07](07-open-questions.md) as Q-PACE-1…3.

1. **Q-PACE-1.** Temperature pacing: A (faithful), B (relaxed profile) or C (global time scale)? Or a different target for how many visits the AC may ask for?
2. **Q-PACE-2.** Dirtiness: should a bath in the pre-bed window keep the pet clean through the next day (a longer timer), or is "dirty by midday" right?
3. **Q-PACE-3.** Should a pet left alone for **one** day usually survive? (Today it usually does not: dirt and heat kill it in about a day, ahead of the thirst clock.)
