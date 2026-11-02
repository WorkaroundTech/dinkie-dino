# 15. Pacing report (M3)

The headless simulator plays thousands of seeded lives with scripted players and measures what the rules actually demand. This document records how to run it, what is tuned and why, the current results, and what they mean. All numbers are reproducible: the seeds are fixed (`--seed 1`), so the same command prints the same table. Last updated with your answers of round 16.

## 15.1 Running it

```bash
npm run sim                                     # the built-in players, 300 lives each
npm run sim -- --lives 1000 --players twice,every4h
npm run sim -- --pacing relaxed                 # the relaxed profile (the AC about every 8 hours)
npm run sim -- --room calm                      # the room never changes temperature: needs only
npm run sim -- --players away24 --days 4        # a trip: cared for three days, then gone for one
npm run sim -- --diet meat                      # plant, noodles or mixed
npm run sim -- --set temperature.moveChance=0.04 --set needs.checksPerPoint.hunger=9
npm run sim -- --json                           # raw summaries
```

`--set path=value` overrides any tuning number (a typo is an error, not a silent wrong experiment). The command builds the tool with Vite and runs it with Node; it adds no dependency. CI runs a small smoke run.

### The players

Each visits at fixed times and does the same thorough routine: medicine if sick, fill water and food (only foods the pet accepts), pet, play a game if not at the happiest, **bathe whenever the bath is open** (dirty, the hour before bedtime, or the first hour after waking), switch the AC so the room drifts back toward the middle, switch the light off.

| Player | Visits |
|--------|--------|
| `absent` | never (a newborn left alone) |
| `unfed` | three times a day, does everything **except** feed and water |
| `morning` | half an hour after waking (inside the morning bath window) |
| `evening` | 45 minutes before bedtime (the bath window) |
| `twice` | those two |
| `thrice` | those two, and 5.5 hours after waking |
| `every4h` | half an hour after waking and every 4 hours (while awake) |
| `every8h` | half an hour after waking and 8 hours later |
| `hourly` | every hour of the awake day |
| `away24`, `away48` | hourly for three days, then gone for one or two days |
| `quarterly` | every 15 minutes |

Nobody in the real game is this regular. The point is to measure the **attention the rules ask for**, not to predict real play.

### The measures

- **final / died:** share of lives that reached the final form, or died before it.
- **trouble:** share of awake time the pet is in any condition (empty hunger or thirst, empty happiness, dirty, sick, too hot or cold). **needs:** only hungry, thirsty or sad. **hot / cold:** the pet is suffering from the room.
- **life p10 / median / p90:** days lived.
- The report also prints sicknesses per life by cause, a **shadow of the proposed care score** ([16](16-care-score-proposal.md)) and the lifespan histogram.

## 15.2 What was tuned

These were provisional numbers, tuned with the simulator against your targets.

| Number | Now | Why |
|--------|-----|-----|
| Hunger / thirst / happiness decay (awake checks per point) | **6 / 6 / 16** | A full meter empties in about **12 awake hours**, so a pet needs a visit roughly twice a day (its awake day is 12 to 15 hours). Hungry, thirsty and sad now mean *completely empty*, which made the old 8 / 8 / 18 too gentle (PACE-01) |
| Room drift (chance per awake check that it moves one degree) | normal **0.06**, relaxed **0.03** | The AC wants a look about every 4 hours, or every 8 on relaxed (your round-15 answer) |
| Dirt timer after a bath | **20 to 24 h** (decided) | |
| Suffering: chance per check at 23 / 27 °C, plus per further degree | **3%, +3%** | A cared-for pet left alone usually survives a day |
| Sickness on entering a TOO state | **10%** | Same |
| Instant death on entering a TOO state | **0.2%** | A 1% placeholder was the top killer |
| Weight steps | **a quarter of a kg** per gain or burn | A thorough visit gives 4 to 8 meals, and whole kilos made every diligent pet too heavy (0.4 sicknesses per life) |

Your decisions that changed the simulation this round: death checks start at 10%, hungry / thirsty / sad only when empty, new pets hatch with empty hunger, thirst and education and the light on, bedtimes by stage capped by the player's latest bedtime, a morning bath window, and the weight system with caloric foods.

The pacing is a setting: **normal** or **relaxed** (`Settings.pacing`, `contextFor(settings, …)`).

## 15.3 Results

### The needs alone (room kept still: `--room calm`)

```text
player   visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  hot  cold  sick
-------  ----------  -----  ----  -----------------------  -------  -----  ------  -------  ---  -----  ---  ----  ----
absent   0.0         0%     100%  1.0 / 1.1 / 1.2          100%     100%   100%    100%     49%  26%    0%   0%    32%
unfed    3.5         0%     100%  1.1 / 1.1 / 1.2          100%     100%   100%    100%     54%  0%     0%   0%    0%
evening  1.0         73%    28%   6.9 / 16.8 / 19.8        34%      30%    25%     25%      19%  15%    0%   0%    5%
morning  1.0         100%   0%    15.8 / 17.8 / 19.8       18%      18%    13%     13%      12%  3%     0%   0%    0%
twice    2.0         100%   0%    15.8 / 17.8 / 19.8       17%      17%    10%     10%      11%  0%     0%   0%    0%
thrice   3.0         100%   0%    15.8 / 17.8 / 19.8       1%       1%     0%      0%       1%   0%     0%   0%    0%
```

**PACE-01 holds in the form that fits your rules.** A full meter empties in about 12 awake hours. Twice a day keeps every pet alive (100% grow up) with a need empty 17% of the time (hungry 10%, thirsty 10%, sad 11%, mostly the adult's long evening), three visits leave 1%. The **morning visit** with its bath window keeps every dirt problem away (`dirty` 3%, no sicknesses from dirt) and also grows every pet up in a still room; the **evening-only** visitor loses 28%. A newborn left alone is gone in **1.1 days**: it hatches empty, and the thirst clock starts at once.

### The whole game, normal pacing (the AC about every 4 hours)

```text
player   visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  hot  cold  sick
-------  ----------  -----  ----  -----------------------  -------  -----  ------  -------  ---  -----  ---  ----  ----
absent   0.0         0%     100%  1.0 / 1.0 / 1.2          100%     100%   100%    100%     49%  23%    13%  0%    30%
unfed    3.5         0%     100%  1.0 / 1.1 / 1.2          100%     100%   100%    100%     55%  0%     1%   1%    0%
evening  1.0         10%    91%   2.1 / 9.1 / 16.8         43%      37%    25%     25%      25%  14%    8%   9%    6%
morning  0.9         14%    86%   2.2 / 8.8 / 16.8         33%      31%    16%     16%      19%  3%     11%  6%    3%
twice    2.0         28%    72%   4.2 / 12.3 / 18.3        28%      26%    9%      9%       19%  0%     7%   8%    2%
thrice   3.0         95%    5%    15.8 / 17.8 / 19.8       5%       3%     0%      0%       3%   0%     2%   2%    0%
every4h  3.5         99%    1%    15.8 / 17.8 / 19.8       5%       2%     1%      1%       0%   3%     1%   1%    0%
every8h  2.0         95%    5%    15.8 / 17.8 / 19.8       11%      6%     2%      2%       5%   3%     3%   3%    1%
```

### The whole game, relaxed pacing (the AC about every 8 hours)

```text
player   visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  hot  cold  sick
-------  ----------  -----  ----  -----------------------  -------  -----  ------  -------  ---  -----  ---  ----  ----
absent   0.0         0%     100%  1.0 / 1.1 / 1.2          100%     100%   100%    100%     49%  25%    4%   0%    31%
evening  1.0         40%    61%   4.0 / 14.3 / 18.8        37%      32%    25%     25%      21%  15%    3%   3%    5%
morning  1.0         51%    49%   5.2 / 15.8 / 18.8        23%      22%    14%     14%      15%  3%     5%   3%    1%
twice    2.0         67%    33%   9.2 / 16.8 / 19.4        20%      20%    9%      9%       14%  0%     3%   3%    1%
thrice   3.0         99%    1%    15.8 / 17.8 / 19.8       2%       2%     0%      0%       1%   0%     1%   0%    0%
every4h  3.5         100%   0%    15.8 / 17.8 / 19.8       4%       2%     1%      1%       0%   3%     0%   0%    0%
every8h  2.0         98%    2%    15.8 / 17.8 / 19.8       8%       4%     2%      2%       3%   3%     1%   1%    0%
```

### Time spent suffering from the room (too hot or too cold, share of awake time)

| Visitor | normal | relaxed |
|---------|--------|---------|
| every 4 hours | 1.1% | 0.3% |
| every 8 hours | 5.3% | 1.8% |
| twice a day | 15.4% | 5.7% |

### A trip: three days of hourly care, then nobody comes

| Pacing | Dead within 1 day alone | Dead within 2 days alone |
|--------|-------------------------|--------------------------|
| normal | **15%** (heat and cold 14%, sickness 2%) | 100% (83% sickness) |
| relaxed | **6%** | 100% (94% sickness) |

## 15.4 Findings

### F1. "Attention" and "death" fit together once attention means trouble

A visitor every 4 hours finds the pet suffering 1% of the time, one every 8 hours 5% (five times as often), and twice a day 15%. Death needs 6 to 8 hours of that, so a cared-for pet left alone survives a day 85% of the time (94% relaxed) and not two.

### F2. The bath windows fit the 20 to 24 hour timer

A bath in the first hour after waking restarts a 20 to 24 hour timer that runs out around the next wake-up, so a **morning visitor never meets a dirty pet** (no sicknesses from dirt in a still room). The pre-bed window serves the evening visitor. Without the morning window, a morning-only visitor lost 89% of pets.

### F3. Two visits a day cover the needs but not the AC

Twice a day keeps 100% alive in a still room, but 28% on normal pacing and 67% on relaxed once the AC is in play. Three visits keep 95% (normal) to 99% (relaxed).

### F4. Newborns are fragile by design

A pet hatches with empty hunger and thirst and the light on. Left alone from birth it is gone in about a day, and a light left on through the first night makes it wake up sick 60% of the time. Both follow from your rules and teach the player to act at once.

### F5. Weight needed finer steps

With whole-kilo gains the diligent players' pets were too heavy (0.4 sicknesses per life); with quarter-kilo steps weight causes none. The weight numbers are placeholders either way.

## 15.5 Targets enforced by tests

`tests/sim/targets.test.ts` runs full simulated lives with the default numbers.

| Target | Check |
|--------|-------|
| PACE-01 | twice a day: at least 95% grow up and a need is empty at most 22% of the time; one (evening) visit shows clearly more (over 1.3x, at least 25%); three visits at most 3%; more visits are never worse |
| TEMP-09 | a visitor every 4 hours: at least 95% grow up, suffering at most 3%; every 8 hours suffers over 3 times as much; twice a day keeps at most 40%; on relaxed, every 8 hours keeps at least 85% and suffers less |
| Trips | a cared-for pet left alone for a day is dead at most 20% of the time on both pacings, and for two days at least 90% |
| DEATH-05, 06 | a newborn nobody looks at, or fed nothing, dies within about two days, before the species decision |
| DIRT-02 | a morning visit in the bath window keeps dirt away (at most 0.1 dirt sicknesses per life, 95% grow up); an evening bath each day keeps at least 60% alive |
| LIFE-07, SPEC-02 | the final form on wake-up 16 to 20; a diet of only meat, plants or noodles gives the matching species in at least 95% |

If you change the tuning on purpose, these tests will tell you which of your own targets moved.
