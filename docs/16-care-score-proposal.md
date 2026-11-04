# 16. The care score

Status: **implemented with the draft numbers** (round 18); the Angel limit grows with the length of the life (question 83, answered yes). The mistakes, graces, weights and threshold below are my proposal; you have not commented on them yet (question 57), so they stay easy to change: all of them are in the `careScore` block of `src/core/config/tuning.ts`.

## 16.1 What it decides

A **hidden** score, never shown to the player. It is **one score** (CARE-08) that does three things:

1. **Angel or Demon** at the final transformation (CARE-04).
2. **A little less risk** all life long (CARE-06): up to 10% less chance of waking up sick, of getting sick on entering a too hot / too cold state, and of dying at once on entering it.
3. **A longer life** (CARE-07): a pet that reaches its drawn final-form day (16 to 20) lives on, once, by its care quality of the way up to wake-up 30.

It does not change growth timing or the species.

## 16.2 The model: care mistakes

A **care mistake** is one episode of a bad condition that **outlasts its grace period**. It is counted **once per episode**, not per check, so a long neglect and a short one differ by how many times it happened, not by how long it lasted (long neglect has other consequences: sickness and death).

| Mistake | It counts when | Grace | Points |
|---------|----------------|-------|--------|
| **Sick** | the pet stays SICK past the grace | 1 hour awake | 3 |
| **Too hot** | the pet stays TOO_HOT past the grace | 1 hour awake | 0.5 on normal pacing, 2 on relaxed |
| **Too cold** | the pet stays TOO_COLD past the grace | 1 hour awake | 0.5 on normal pacing, 2 on relaxed |
| **Dirty** | the pet stays DIRTY past the grace | 2 hours awake | 2 |
| **Light left on** | the light is still on after the first check of the night | 15 minutes asleep | 2 |
| **Hungry** | the hunger meter stays completely empty past the grace | 1 hour awake | 1 |
| **Thirsty** | the thirst meter stays completely empty past the grace | 1 hour awake | 1 |
| **Sad** | happiness stays at the lowest level past the grace | 2 hours awake | 1 |

Time spent **SuperHappy gives points back** (CARE-05, your round-18 answer): every episode of one awake hour gives 1 point, up to 8 in a life. The score is the mistake points less this bonus, and never below 0.

Notes:

- **Awake time only**, except the light. An episode keeps its count over the night (a hungry pet at bedtime is still hungry at wake-up); the sleeping hours do not add to it.
- **Hungry and thirsty count** although they have no sprite: the pet beeps for them.
- **Overlap is intended.** A light left on can make the pet sick: that costs the 2 points for the light **and** the 3 for a sick episode that is then left too long.
- **A light left on counts every night it happens**, so a pet that never gets its light switched off loses 2 points a night and is a Demon by day 16.
- **The room costs less on normal pacing.** There the room drifts twice as fast and slips out of the band several times as often, so a player who looks in twice a day makes about 2.4 too-hot and 2.4 too-cold mistakes in a life on normal pacing and a fraction of that on relaxed. Charging the same would make normal pacing almost always a Demon unless the limit were raised for everyone, which then makes relaxed almost always an Angel. With 0.5 and 2 the room weighs about the same on either pacing (round 18, tuned with the simulator).
- **Weight** is deliberately not a mistake: it already makes the pet sick (WEIGHT-01), which counts through "sick".

## 16.3 Quality, risk and living on

- **The Angel limit** is **32 points** for a young pet and **1.72 points for every wake-up** once that comes to more: 34 at day 20, 43 at day 25, **52 at day 30** (CARE-04). A long life is not judged harder than a short one.
- **Quality** is 1 for a pet with no points and falls in a straight line to 0 at the Angel limit.
- **Risk** is multiplied by `1 − 0.10 × quality`: from 0.90 for a spotless pet to 1 for one at the limit.
- **Living on:** on its drawn day the pet gets `round(quality × (30 − drawn day))` more wake-ups, once. A perfect pet transforms on day 30; one with 16 points (quality 0.5) lives half of the way; a neglected pet transforms on its drawn day. The verdict is judged afterwards on the whole life, so the extra days still have to be cared for.

## 16.4 What it looks like (the simulator, 300 lives each)

The share of the pets that reach the final form that would be an **Angel**, by threshold (care points at most):

**Normal pacing**

| Visitor | ≤ 8 points | ≤ 16 | ≤ 24 | ≤ 32 | ≤ 48 | **Real (limit grows)** |
|---------|-----------|------|------|------|------|-----------------------|
| every 4 hours | 98% | 100% | 100% | 100% | 100% | **100%** |
| three times a day | 66% | 99% | 100% | 100% | 100% | **100%** |
| every 8 hours | 26% | 94% | 100% | 100% | 100% | **100%** |
| twice a day | 0% | 0% | 0% | 23% | 100% | **61%** (54% in a run of 2000 lives) |
| once, in the morning | 0% | 0% | 0% | 10% | 100% | **10%** |

**Relaxed pacing**

| Visitor | ≤ 8 | ≤ 16 | ≤ 24 | ≤ 32 | ≤ 48 | **Real (limit grows)** |
|---------|-----|------|------|------|------|-----------------------|
| every 4 hours | 99% | 100% | 100% | 100% | 100% | **100%** |
| three times a day | 80% | 100% | 100% | 100% | 100% | **100%** |
| every 8 hours | 48% | 97% | 100% | 100% | 100% | **100%** |
| twice a day | 0% | 0% | 0% | 35% | 100% | **64%** (65% in a run of 2000 lives) |
| once, in the morning | 0% | 0% | 0% | 17% | 98% | **18%** |

(Pets that died young never reach the final form, so these shares are about the survivors. The twice-a-day rows have few survivors on normal pacing, so a run of 300 lives is noisy: use the 2000-life figure.)

**Where the twice-a-day numbers come from (round 18 request: about 50% on normal, about 66% on relaxed).** Raising the limit alone cannot give both: the Angel share of a twice-a-day player was 9% on normal and 63% on relaxed, and any limit that lifted normal to 50% lifted relaxed above 90%. The room is what separates them, so a room lapse now costs 0.5 point on normal pacing and 2 on relaxed, and the growth of the limit went from 1.7 to 1.72 points per day. In a run of 2000 lives that gives **54% on normal and 65% on relaxed**. Three or more visits a day are almost always Angel.

## 16.5 What I need from you

1. **Question 57, still open:** the list of mistakes, weights, graces and the 32 threshold.
2. **The balance** now sits at a twice-a-day player being an Angel 54% of the time on normal pacing and 65% on relaxed. The limit is very sensitive on normal pacing (1.70 gives 46%, 1.75 gives 60%), so tell me if you want it moved.
