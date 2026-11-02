# 10. Art spec & delivery waves

Goal: you draw the sprites in waves while the stage logic is built against placeholders. This doc fixes the grid, the file format, and what to draw in which order. Everything marked 🔶 is a proposal.

## 10.1 Grid

- **LCD: 19 columns × 16 rows, 1 bit per dot** (LCD-01/04 in [08](08-target-rules.md)), matching the real toy.
- **Icon segments are separate** (LCD-05): the 10 action icons (5 left, 5 right) are fixed shapes printed on the shell, each lit or unlit as a whole, like a Game & Watch LCD. They are **not** part of the 19 × 16 grid. You design each icon's silhouette once; the game only switches it on/off (and blinks it). Any other indicator segments the toy has (LCD-06) work the same way.
- A sprite carries its own size, so a food icon can be 5 × 5 and a full-screen scene 19 × 16.
- Coordinates: column 0 is the left edge, row 0 the top. The small blob sits roughly on rows 7–12 (the lower-middle); the pet's "floor" is row 12.
- Facts measured from your small-blob frames (legacy `idle_1yro`):

| Frame | Occupied rows | Occupied cols | Size (dots) |
|-------|---------------|---------------|-------------|
| 0 | 7–12 | 5–12 | 8 × 6 |
| 1 | 6–12 | 4–11 | 8 × 7 |
| 2 | 6–12 | 6–13 | 8 × 7 |
| 3 | 6–12 | 5–12 | 8 × 7 |

Frame 0 has no eye dots (a blink / eyes-closed frame). Frames 1–3 show two eye dots while the blob sways: left (frame 1), right (frame 2), centre (frame 3). The legacy app never loaded these four frames; its idle screen ended up using the 3-year Brontosaurus matrices instead.

## 10.2 File format 🔶

Plain-text bitmaps in the repo, one file per animation. `#` = dot on, `.` = dot off, one blank line between frames. A header line sets timing. Text diffs cleanly and needs no external tool.

```text
# small-blob/idle   size 19x16   frame-ms 750
...................
...................
...................
...................
...................
...................
...................
.......####........
......#....#.......
.....#......#......
.....#......#......
.....#......#......
......######.......
...................
...................
...................

...................
(next frame...)
```

(That is your first frame, converted from the 0/1 array.) I can convert your existing 0/1 arrays automatically, so nothing you already have is lost.

I'll also build a small **sprite viewer/editor page** (click to toggle dots, preview animations at their frame time, export to this format) as part of the tooling, so you can draw in the browser. 🔶

## 10.3 Layers for species 🔶

Species differ only by a head feature in stages 3–6 (SPEC-07): T-Rex mohawk, Triceratops side horn, Brontosaurus none. To avoid drawing every animation three times, the format supports an **overlay**: a small sprite plus an offset per frame, composed on top of the shared base animation. You'd draw the base form once and each species' feature once per pose. If a teenager or adult needs more than a head feature, it gets its own full set instead.

## 10.4 What to draw (per form)

A "full action set" for a form 🔶:

| Animation | Frames (suggested) | Used when |
|-----------|--------------------|-----------|
| idle | 2 | default; also asleep variant ×2 (eyes closed, "z") |
| eat | 3–4 | feeding (food prop drawn beside the pet) |
| drink | 3–4 | drinking |
| burp | 1–2 | after eating/drinking |
| happy | 2 | petting, playing |
| medicate | 2–3 | medicine |
| refuse (negate) | 2 | healthy pet given medicine, or full pet offered food |
| **hungry** | 2 | HUNGRY (COND-01) |
| **thirsty** | 2 | THIRSTY |
| **too hot** | 2 | TOO_HOT |
| **too cold** | 2 | TOO_COLD |
| **sick** | 2 | SICK |
| **sad** | 2 | SAD |
| **dirty (dark)** | 2 | DIRTY (COND-01): the pet looks dark |
| **shower** | 4 | Bath (DIRT-03): dark pet → shower strokes → clean |

Every non-normal state has its own sprites (COND-01), so a full set is about **30 frames per form**. Plus shared props and scenes (food ×6, glass, syringe, lamp, air-conditioner / thermometer, status screens, rock-paper-scissors hands, evolution flash). There is no poop.

**Death screen:** a **dead blob body with a cross and a halo (aureola)**, one per form size (LIFE-10). It can happen at any stage, so every form needs one (or a shared one scaled to the form).

**Conditions:** HUNGRY, THIRSTY, TOO_HOT, TOO_COLD, SICK, SAD and DIRTY are seven separate animations; you can tell them apart at a glance. ❓ Whether sleeping-with-light-on and overweight need their own (COND-05).

**Priority:** if several apply at once, one sprite shows. The order is not decided yet (COND-04), so every condition must be drawable on its own.

Forms: egg (idle, crack, hatch) · small blob · big blob · blob with tail · blob with tail & legs · teenager · adult · Angel · Demon, with the species overlays on the four middle forms.

## 10.5 Waves 🔶

Each wave leaves the game playable and shows the new forms as they're drawn. Until a sprite exists the game falls back to the closest available one (ASSET-04), so you never have to finish a wave before I can test.

| Wave | Contents | Unlocks |
|------|----------|---------|
| **1. Core loop** | Egg (idle + crack + hatch), **small blob** full action set, shared props (6 foods, glass, shower, syringe, lamp/"z", AC/thermometer), **dead blob with cross and halo**, status screens (mood faces, bowls, glasses, temperature), the **10 icon silhouettes** | The whole care loop for the first 2 days; everything testable end to end |
| **2. Big blob** | Big blob full action set | Stage 2, plus the species feeding window |
| **3. Tail & legs** | Blob with tail and blob with tail & legs, base sets + **3 species overlays** (T-Rex mohawk, Triceratops horn; Brontosaurus has none) | Stages 3–4, species reveal |
| **4. Teen & adult** | Teenager and adult base sets, species overlays or full sets | Stages 5–6 |
| **5. Finale** | Angel and Demon, evolution animation, optional extras (mini-game, temperature scenes, polish) | Final forms and care-score outcome |

Wave 1 is the most valuable; stages 1 and 2 already cover the first 5 wake-ups of play.

## 10.6 Sound

**Decided:** there are no sound files. Every sound is synthesized at runtime as simple monophonic square-wave piezo notes (SND-01…04 in [08](08-target-rules.md)). Events: button beep, attention call, eat, drink, shower, injection, refuse, hatch, growth, Jokenpo win/loss, death, final form. You can write the melodies as note lists, or I'll propose a first set for you to adjust.
