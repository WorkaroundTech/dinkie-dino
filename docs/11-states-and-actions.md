# 11. States & actions catalogue

One place that lists **every action the player can take** and **every state the pet or its environment can be in**, with how well each is specified. It exists so the **care score** (deferred, CARE-02) can be decided with the whole picture: the last column is for you to mark each item as good, bad, or neutral for care.

Status: ✅ decided · 🔶 proposed/inferred · ❓ unknown · 💤 legacy only. Details live in [08](08-target-rules.md) and the legacy docs.

## 11.1 Player actions (the 10 icon segments + Clock)

| Icon (side, row) | Action | What we know | Open | Care role (you) |
|------------------|--------|--------------|------|-----------------|
| Left 0 | **Drink** | Raises thirst fullness; always followed by a burp (legacy). 💤 | Does the toy have thirst? Refusal when full? Amounts? (A4, A5) | |
| Left 1 | **Food** | 6 foods; meals raise fullness; first 5 wake-ups' meals decide species ✅. Ice Cream: no fullness, +happiness, 70% chance +1 weight ✅ | Meal sizes per food (A4); refusal when full (A5); Ice Cream amounts (ICE-03) | |
| Left 2 | **Lamp** | Turns the light on/off; light on while asleep → SICK chance at wake-up 2% off / 60% on ✅ | Visuals, behavior when lit awake (B5) | |
| Left 3 | **Pet** | Raises happiness (never to the top) and education (never past C+) ✅ | Amounts, caps (Q-HAP-1, Q-EDU-1) | |
| Left 4 | **Check** | Status screens: mood, education(?), weight/age, hunger, thirst, temperature. 💤 | Which screens exist on the toy, and their order (A7) | |
| Right 0 | **Play** | Rock-paper-scissors, 3–5 rounds (setting); the majority of rounds decides the **game**. A pet game win gives +1 happiness (can top it up); a loss gives nothing; from 2 lost games in a row happiness may drop; over-play after VeryHappy (3–5 games) may lower education ✅ | Whether the player sees the pet's hand; numbers (Q-PLAY-5, Q-EDU-3) | |
| Right 1 | **Educate** | Raises education up to A+; the only way past C+ ✅ | Amounts, limits (Q-EDU-1) | |
| Right 2 | **Bath** | Shower; clears dirt fully and resets the timer ✅. Only when DIRTY or in the hour before bedtime ✅. Not while asleep ✅. No poop ✅ | Numbers (Q-DIRT-3) | |
| Right 3 | **Air conditioner** (was "Cool") | On/off switch ✅. In a TOO state a toggle snaps to 24/26 °C and clears it; outside, a one-off non-stacking bump ✅ | Rates, chance curves, display (Q-AC-1/3) | |
| Right 4 | **Medical** | Injection; works only when SICK; one dose cures; afterwards **hunger and thirst empty and happiness drops to the lowest** ✅ | Education/weight; timing (Q-MED-3) | |
| Bottom | **Clock** | Unknown | Show time? set time? (A2) | |
| Bottom | **Esc / Enter** | Cancel / confirm; arrows move the selection (legacy) 💤 | Same on the toy? (A3) | |
| (settings) | **Wake-up time** | 06:00–09:00, configurable ✅ | Default 07:00 🔶 | |

## 11.2 Pet conditions

| Condition | Type | Source | What we know | Open | Care role (you) |
|-----------|------|--------|--------------|------|-----------------|
| **Hunger / fullness** | meter **0–8** (4 bowls × ½) ✅ | legacy, toy | Meals raise it; time lowers it (decay ❓ tunable; ≥ 2 interactions a day); **empty 2 days+ → death checks** ✅ | Decay rate; HUNGRY threshold | |
| **Thirst** | meter **0–8** (4 glasses × ½) ✅ | legacy, toy | Drinks raise it; **empty 1 day+ → death checks** ✅ | Decay rate; THIRSTY threshold | |
| **Happiness / mood** | 5 levels | legacy, toy | Pet and Ice Cream raise it (not to the top); Play raises it and is the only way to the top ✅; "sad" is a state | Decay, amounts (Q-HAP-1) | |
| **Weight** | integer | legacy, toy | Ice Cream raises it (70%); too heavy → SICK / death, worse before adulthood ✅ | Scale, threshold, how to lose it (Q-WEIGHT-1) | |
| **Education** | 5 grades E+…A+ 🔶 | toy, blog | Educate raises it to A+; Pet only to C+; too much Play may lower it ✅ | Confirm scale, amounts (Q-EDU-1) | |
| **DIRTY** | state | toy ✅ | Dirt builds up 16–20 h after the last bath; DIRTY never starts during sleep (computed at wake-up); after 2–3 h dirty, a check every 15 min with 20% (+10% each) chance of the negative effects ✅; left too long → death ✅. **No poop** ✅ | What a fired check does; death timer (Q-DIRT-4) | |
| **SICK** | state | legacy, toy | Cured by Medicine; left sick → death ✅; **while sick the pet refuses eat, drink, play, study, bath and pet** ✅; high chance at wake-up if the light was on ✅; fired dirty checks can cause it 🔶 | Other triggers, signs (Q-SICK-1, Q-SICK-2) | |
| **TOO_COLD** | state | toy ✅ | At ≤ 23 °C the chance rises; own sprite + beeps; entry → happiness drop, higher SICK chance, small instant-death chance; clears at 24 °C or on AC toggle ✅ | Chance curve, magnitudes (Q-AC-1/4) | |
| **TOO_HOT** | state | toy 🔶 | Mirror of TOO_COLD at ≥ 27 °C; clears at 26 °C or on AC toggle | Same | |
| **Asleep / awake** | state | toy ✅ | Pet sleeps at night (bedtime by stage: blob ≈ 19:00, adult ≈ 22:00); light must be off. **Only Lamp, Check, Clock work.** Room temperature resets to comfort (or stays fixed if TOO_HOT/COLD) ✅ | Mid-stage bedtimes; decay while asleep (Q-SLEEP-5) | |
| **HUNGRY / THIRSTY / SAD** | states | toy ✅ | Each has its own sprites; the pet beeps from time to time ✅ | Thresholds, priority, beep interval (Q-COND-1) | |
| **Calling for attention** | event | toy ✅ | Periodic beeps while in a non-normal state | What lights (LCD-06); when a call counts as a mistake (B4) | |
| **Life stage** | stage 0–7 | toy ✅ | [08 §8.3](08-target-rules.md) | Needs per stage differ? (B1) | |
| **Species** | T-Rex / Bronto / Triceratops | toy ✅ | Set at the tail stage from meals in stages 1–2 | — | |
| **DEAD** | final | toy ✅ | Dead blob with cross and halo; any stage; stays until **reset** (pinhole) ✅ | Death timers (Q-DEATH-1) | |
| **Angel / Demon** | final | toy ✅ | Locked, no care; decided by hidden care score | Factors deferred (CARE-02) | |

## 11.3 Environment

| Variable | What we know | Open |
|----------|--------------|------|
| **Room temperature** | 16–40 °C; comfort 24–26; drifts down with AC on, up with AC off, noisy, one-way ✅ | Tick period, probability, initial value |
| **AC on/off** | Player switch ✅ | Visible indicator |
| **Light on/off** | Player switch (Lamp) ✅ | Visuals |
| **Reset** | Pinhole button on the back, thin pick; the only way to start a new egg ✅ | Web UX (Q-RESET-1) |
| **Time of day** | Night = sleep; wake-up time configurable ✅ | Exact night window |

## 11.4 Scheduled events

| Event | When | Effect |
|-------|------|--------|
| **Temperature tick** | periodic (period ❓) | AC on: stay or −1 °C; AC off: stay or +1 °C ✅ |
| **Need decay** | continuous (rates ❓) | fullness, thirst, happiness drop ✅ |
| **Dirtying** | time-based (rate ❓) | the pet becomes DIRTY ✅ |
| **Morning wake-up** | wake-up time | stage growth ✅; sickness roll (higher if the light was on) ✅; wake-up counter +1 ✅ |
| **Species decision** | arrival at stage 3 (5th wake-up) | meals share → species ✅ |
| **Final transformation** | random wake-up 16–20 | Angel or Demon by care score ✅ |
| **Starvation / neglect checks** | continuous | death timers ❓ |

## 11.5 How to use this for the care score

When you're ready, go through the **Care role** column and mark each item **good / bad / neutral**, and for the bad ones whether time matters ("too long") or just the occurrence. From that I'll propose the factor list, weights, grace periods and the Angel/Demon threshold, which you can tune in play-testing.
