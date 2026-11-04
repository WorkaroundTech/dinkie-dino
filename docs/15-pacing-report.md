# 15. Pacing report (M3)

The headless simulator plays thousands of seeded lives with scripted players and measures what the rules actually demand. This document records how to run it, what is tuned and why, the current results, and what they mean. All numbers are reproducible: the seeds are fixed (`--seed 1`), so the same command prints the same table. Last updated with round 18 (the care score now lengthens good lives, so the runs go up to 40 days).

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
- The report also prints sicknesses per life by cause, the **care score** ([16](16-care-score-proposal.md)) and the lifespan histogram.

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
absent   0.0         0%     100%  1.0 / 1.1 / 1.2          100%     100%   100%    100%     49%  27%    0%   0%    30%
unfed    3.5         0%     100%  1.1 / 1.1 / 1.2          100%     100%   100%    100%     54%  0%     0%   0%    0%
evening  1.0         73%    27%   6.9 / 16.8 / 19.8        34%      30%    25%     25%      19%  15%    0%   0%    4%
morning  1.0         100%   0%    17.8 / 18.8 / 19.8       19%      19%    13%     13%      13%  3%     0%   0%    0%
twice    2.0         100%   0%    20.8 / 21.8 / 22.8       19%      19%    12%     12%      12%  0%     0%   0%    0%
thrice   3.0         100%   0%    29.8 / 29.8 / 29.8       2%       2%     0%      0%       2%   0%     0%   0%    0%
```

**PACE-01 holds in the form that fits your rules.** A full meter empties in about 12 awake hours. Twice a day keeps every pet alive (100% grow up) with a need empty 19% of the time (hungry 12%, thirsty 12%, sad 12%, mostly the adult's long evening), three visits leave 2%. The **morning visit** with its bath window keeps every dirt problem away (`dirty` 3%, no sicknesses from dirt) and also grows every pet up in a still room; the **evening-only** visitor loses 27%. A newborn left alone is gone in **1.1 days**: it hatches empty, and the thirst clock starts at once.

### The whole game, normal pacing (the AC about every 4 hours)

```text
player   visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  hot  cold  sick
-------  ----------  -----  ----  -----------------------  -------  -----  ------  -------  ---  -----  ---  ----  ----
absent   0.0         0%     100%  1.0 / 1.0 / 1.2          100%     100%   100%    100%     50%  24%    13%  0%    28%
unfed    3.5         0%     100%  1.1 / 1.1 / 1.2          100%     100%   100%    100%     55%  0%     1%   1%    0%
evening  1.0         9%     91%   2.2 / 8.3 / 16.8         43%      37%    25%     25%      25%  14%    8%   9%    6%
morning  0.9         13%    87%   2.2 / 8.3 / 16.8         34%      31%    16%     16%      19%  3%     11%  7%    2%
twice    2.0         21%    79%   4.2 / 12.2 / 19.2        29%      26%    10%     10%      19%  0%     8%   8%    2%
thrice   3.0         88%    12%   24.8 / 28.8 / 29.8       6%       4%     0%      0%       4%   0%     2%   2%    0%
every4h  3.7         99%    1%    27.8 / 28.8 / 28.8       5%       1%     1%      1%       0%   3%     1%   1%    0%
every8h  2.0         91%    9%    23.8 / 26.8 / 27.8       10%      6%     1%      1%       5%   3%     3%   3%    1%
```

### The whole game, relaxed pacing (the AC about every 8 hours)

```text
player   visits/day  final  died  life p10/med/p90 (days)  trouble  needs  hungry  thirsty  sad  dirty  hot  cold  sick
-------  ----------  -----  ----  -----------------------  -------  -----  ------  -------  ---  -----  ---  ----  ----
evening  1.0         39%    61%   4.1 / 14.2 / 18.8        37%      32%    25%     25%      21%  15%    4%   3%    5%
morning  1.0         52%    48%   5.3 / 16.8 / 18.8        23%      22%    13%     13%      15%  3%     5%   3%    1%
twice    2.0         59%    41%   8.3 / 18.8 / 20.8        21%      20%    10%     10%      14%  0%     3%   3%    1%
thrice   3.0         98%    2%    27.8 / 28.8 / 29.8       3%       2%     0%      0%       2%   0%     1%   1%    0%
every4h  3.7         100%   0%    28.8 / 28.8 / 28.8       4%       1%     1%      1%       0%   3%     0%   0%    0%
every8h  2.0         99%    1%    25.8 / 27.8 / 28.8       7%       3%     1%      1%       3%   3%     1%   1%    0%
```

### Time spent suffering from the room (too hot or too cold, share of awake time)

| Visitor | normal | relaxed |
|---------|--------|---------|
| every 4 hours | 1.1% | 0.2% |
| every 8 hours | 5.5% | 1.8% |
| twice a day | 15.8% | 6.1% |

### A trip: three days of hourly care, then nobody comes

| Pacing | Dead within 1 day alone | Dead within 2 days alone |
|--------|-------------------------|--------------------------|
| normal | **15%** (heat and cold 14%, sickness 2%) | 100% (83% sickness) |
| relaxed | **4%** | 100% (95% sickness) |

## 15.4 Findings

### F1. "Attention" and "death" fit together once attention means trouble

A visitor every 4 hours finds the pet suffering 1% of the time, one every 8 hours 5.5% (five times as often), and twice a day 16%. Death needs 6 to 8 hours of that, so a cared-for pet left alone survives a day 85% of the time (96% relaxed) and not two.

### F2. The bath windows fit the 20 to 24 hour timer

A bath in the first hour after waking restarts a 20 to 24 hour timer that runs out around the next wake-up, so a **morning visitor never meets a dirty pet** (no sicknesses from dirt in a still room). The pre-bed window serves the evening visitor. Without the morning window, a morning-only visitor lost 89% of pets.

### F3. Two visits a day cover the needs but not the AC

Twice a day keeps 100% alive in a still room, but 21% on normal pacing and 59% on relaxed once the AC is in play. Three visits keep 88% (normal) to 98% (relaxed): they used to keep 95% and 99%, but a well cared for pet now lives up to 30 days instead of 20, so it spends more time in the room's reach (F6).

### F4. Newborns are fragile by design

A pet hatches with empty hunger and thirst and the light on. Left alone from birth it is gone in about a day, and a light left on through the first night makes it wake up sick 60% of the time. Both follow from your rules and teach the player to act at once.

### F5. Weight needed finer steps

With whole-kilo gains the diligent players' pets were too heavy (0.4 sicknesses per life); with quarter-kilo steps weight causes none. The weight numbers are placeholders either way.

### F6. A good life is now longer (round 18)

The care score ([16](16-care-score-proposal.md)) now lengthens good lives: a pet reaching its drawn final-form day (16 to 20) lives on, once, by its care quality of the way up to day 30. The simulator shows it: a visit every 4 hours reaches the final form on day 29 (median 28.8 days), three visits on day 29 (28.8), every 8 hours on day 27 (26.8), twice a day on day 12 (most of those pets die before it). Because the lives are longer, the share that reach the final form falls a little for the middle players (three visits 95% to 88%, every 8 hours 95% to 91%) while the reward is ten more days. The Angel share is on the care page; the Angel limit grows with the life (1.72 points per day once above 32).

## 15.5 Targets enforced by tests

`tests/sim/targets.test.ts` runs full simulated lives with the default numbers.

| Target | Check |
|--------|-------|
| PACE-01 | twice a day: at least 95% grow up and a need is empty at most 22% of the time; one (evening) visit shows clearly more (over 1.3x, at least 25%); three visits at most 3%; more visits are never worse |
| TEMP-09 | a visitor every 4 hours: at least 95% grow up, suffering at most 3%; every 8 hours suffers over 3 times as much; twice a day keeps at most 40%; on relaxed, every 8 hours keeps at least 85% and suffers less |
| Trips | a cared-for pet left alone for a day is dead at most 20% of the time on both pacings, and for two days at least 90% |
| DEATH-05, 06 | a newborn nobody looks at, or fed nothing, dies within about two days, before the species decision |
| DIRT-02 | a morning visit in the bath window keeps dirt away (at most 0.1 dirt sicknesses per life, 95% grow up); an evening bath each day keeps at least 60% alive |
| LIFE-07, CARE-07, SPEC-02 | the final form on wake-up 16 to 30, and exactly 30 for a perfect (hourly) player; a diet of only meat, plants or noodles gives the matching species in at least 95% |

If you change the tuning on purpose, these tests will tell you which of your own targets moved.
