# 16. Care score: a draft for you to correct

You asked me to draft the classification (question 22). This is a **proposal**; nothing in the engine uses it yet (`careVerdict` still returns Angel, CARE-02). Every number is a starting point that can be changed in one place.

## 16.1 What it decides

A **hidden** score, never shown to the player, that decides **Angel or Demon** at the final transformation (LIFE-09). It does not affect survival, growth, or the species (CARE-05).

## 16.2 The model: care mistakes

The toy's usual idea: a **care mistake** is one episode of a bad condition that **outlasts its grace period**. It is counted **once per episode**, not per check, so a long neglect and a short one differ by how many times it happened, not by how long it lasted (long neglect has other consequences: sickness and death).

Each mistake costs **points**. The pet becomes an **Angel** if its total over its whole life is **at most the threshold**; otherwise a **Demon**.

| Mistake | It counts when | Grace (awake time) | Points |
|---------|----------------|--------------------|--------|
| **Sick** | the pet stays SICK past the grace | 1 hour | 3 |
| **Too hot** | the pet stays TOO_HOT past the grace | 1 hour | 2 |
| **Too cold** | the pet stays TOO_COLD past the grace | 1 hour | 2 |
| **Dirty** | the pet stays DIRTY past the grace | 2 hours (the same as the grace before the dirty checks) | 2 |
| **Light left on** | the light is still on after the first check of the night | 15 minutes | 2 |
| **Hungry** | the hunger meter stays completely empty past the grace | 1 hour | 1 |
| **Thirsty** | the thirst meter stays completely empty past the grace | 1 hour | 1 |
| **Sad** | happiness stays at the lowest level past the grace | 2 hours | 1 |

Notes:

- **Awake time only.** An episode keeps its count over the night (a hungry pet at bedtime is still hungry at wake-up); the sleeping hours do not add to it.
- **Hungry and thirsty count** although they have no sprite: the pet beeps for them (every 5 minutes), which is the "ignored call" of question 23.
- **Overlap is intended.** A light left on can make the pet sick: that costs the 2 points for the light **and** the 3 for a sick episode that is then left too long.
- **Dirty** and **sick** are the costliest because they mean the player ignored a visible sprite.
- **Weight** is deliberately not a mistake: it already makes the pet sick (WEIGHT-01), which counts through "sick".
- The shell, the pacing and the language do not matter to the score.

## 16.3 The threshold, and what it means

I measured the proposal with the simulator (the care points over a whole life of players who reached their final form, 500 lives each). The share that would be an **Angel**, by threshold:

**Normal pacing** (the AC wants a look about every 4 hours)

| Visitor | ≤ 8 points | ≤ 16 | ≤ 24 | **≤ 32** | ≤ 48 |
|---------|-----------|------|------|----------|------|
| every hour | 100% | 100% | 100% | **100%** | 100% |
| every 4 hours | 93% | 100% | 100% | **100%** | 100% |
| three times a day | 67% | 99% | 100% | **100%** | 100% |
| every 8 hours | 26% | 81% | 99% | **100%** | 100% |
| twice a day | 0% | 0% | 5% | **37%** | 95% |
| once, in the morning | 0% | 0% | 1% | **24%** | 89% |

**Relaxed pacing**

| Visitor | ≤ 8 | ≤ 16 | ≤ 24 | **≤ 32** | ≤ 48 |
|---------|-----|------|------|----------|------|
| every 4 hours | 99% | 100% | 100% | **100%** | 100% |
| every 8 hours | 83% | 100% | 100% | **100%** | 100% |
| twice a day | 0% | 6% | 48% | **90%** | 100% |
| once, in the morning | 0% | 0% | 28% | **73%** | 100% |

(Pets that died young never reach the final form, so these shares are about the survivors.)

**Proposal: Angel at 32 points or fewer**, which is about **1.7 points a day** over a 16 to 20 day life. Reading it in plain terms: a player who looks in three or more times a day is an Angel almost always; twice a day is a toss-up on normal pacing and mostly an Angel on relaxed; a pet that is mostly ignored becomes a Demon (if it survives at all).

Choosing 16 instead would make two visits a day a Demon every time; choosing 48 would make almost everyone an Angel.

## 16.4 How I would implement it

Add a small tracker to the pet's state (a run length per kind and a count per kind), updated on each check, and have `careVerdict` compare the points with the threshold. The weights, graces and threshold go in the tuning file. The simulator already contains a shadow of it (`tools/sim/care.ts`) that the real one would replace and be tested against.

## 16.5 What I need from you

1. **The list of mistakes** (§16.2): add, remove or rename any.
2. **The weights** (1, 2 or 3 points) and the **graces**.
3. **The threshold** (proposed 32), or how strict an Angel should be: "three visits a day" or "two"?
4. Whether **Demon should mean a bad life only**, or also a *neglected but alive* one (it already does: any pet over the threshold).
