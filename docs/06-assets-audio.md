# 6. Assets & audio

> **Reference only.** Per ASSET-01 in [08](08-target-rules.md), **none of these files will be reused**; everything is recreated from scratch. This inventory documents *what the legacy app had*, so we know what art and sound the new version needs (and the sizes/timings that worked). `gato_chrono.mp3` and the legacy font are excluded.

Source: `rakurakudino-archive/assets/` (109 PNG, 5 audio files + 1 WAV, 1 font) and `res/`.

## 6.1 Art style

- **1-bit LCD look**: solid black pixel shapes on transparent background, designed to sit on the shell's pale grey-blue LCD. No grayscale/colour inside the LCD.
- All in-LCD sprites are **151 × 127 px** (full-LCD canvases; the pet and props are positioned within).
- UI icons (the 10 action icons / cursor) are **35 × 31 px**.
- The shell (`dinkie_bg.png`) is a full-colour illustration, 512 × 470.
- Chunky 8 px "pixels" for the idle pixel-matrix pet (`PixelMatrix` 19 × 16).

> 🆕 Web: render the LCD at an integer scale with `image-rendering: pixelated`. Keep sprites as PNG (or sprite sheets).

## 6.2 Inventory (what exists)

| Group | Files | Used? |
|-------|-------|-------|
| Shell & chrome | `dinkie_bg.png`, `splash.png`, `baby_dino_add.png`, `btn_border.png`, `btn_fill.png`, `trashcan.png`, `progress_bar_outer.png`, `progress_bar_fill.png` | ✅ (`btn_border.png` is the left cap; the right cap is a horizontal flip of it) |
| Action icons (35×31) | `drink`, `food`, `lamp`, `pet`, `check`, `play`, `educate`, `bath`, `cool`, `medical` `.png` | ✅ all drawn as the cursor |
| Food sprites | `apple`, `burger`, `carrot`, `chicken`, `ice_cream`, `noodles` `.png` | ✅ |
| Food eating anims | `anim_apple0-1`, `anim_carrot0-2`, `anim_chicken0-2`, `anim_hamburger0-2`, `anim_ice_cream0-2`, `anim_noodles1` | ✅ |
| Pet idle (PNG, 1-yr) | `dino_1yr_idle0-4` | 🟡 loaded and animated, but the Idle screen draws the pixel-matrix instead |
| Pet action anims (1-yr) | `drinking0-6`, `studying0-1`, `peting0-1`, `medicate0-3`, `sick0-1`, `negate0-1`, `burp` | ✅ (`sick` only on a path that isn't drawn: BUG-04) |
| Pet pixel-matrix data | `idle_1yro` (4 fr), `idle_2yro` (4 fr), `idle_3yro_bronto` (2 fr), in `Constants.DinoGraphics` as 16 × 19 byte arrays | 🟡 only `3yro_bronto` is loaded |
| Status screens | `stat_face_*` (5), `stat_education_{a,b,c}plus` (3), `stat_food0-8`, `stat_drink0-8`, `stat_temperature_{15,20,25,30,35}`, `stat_age1`, `stat_weight1-3`, `stat_age_weight_base` | ✅ |
| Jokenpo | `jkp_human_{rock,paper,scissors}`, `jkp_dino_{rock,paper,scissors}` | ✅ |
| Sleep screens | `sleep_1_1.png`, `sleep_1_2.png` (opaque RGB, a sleeping pet with a "z") | 💤 unused |
| Misc | `transparent.png` | 💤 unused |
| Font | `fonts/Fredoka.ttf` (menu text) | ✅ |
| App icons | `res/drawable-{m,h,xh,xxh}dpi/ic_launcher.png`, `ic_launcher-web.png` | PWA icon candidates |

**Missing art** (needed for the full game but not drawn): poop; dirty/hot/cold/dead pet; sick idle on the LCD; 2- and 3-year action sprites for any stage; the other two adult species; "attention" indicator; sleep animation; the Jokenpo win/lose result screens; status screens for ages 2–3 and weights above 3; Discipline.

## 6.3 Audio

| File | Use | Volume | Notes |
|------|-----|--------|-------|
| `bip.wav` | Every button hit | 0.8 | |
| `jokenpo_selection_clean.mp3` | New round start; each shape change | 0.8 | |
| `jokenpo_evaluate_clean.mp3` | Player confirms a shape | 0.8 | |
| `jokenpo_dino_win_clean.mp3` | Pet wins a round | 0.8 | |
| `jokenpo_dino_loss_clean.mp3` | Pet loses a round **and** ties (BUG-10) | 0.8 | |
| `click_clean.mp3` | Loaded, never played | | 💤 |
| `gato_chrono.mp3` | Background theme (loop, 0.85), **commented out** | | 💤 Possibly derived from game music (name suggests Chrono Trigger "Gato"): confirm rights before shipping. |

🆕 Web audio notes: browsers (especially iOS) require a user gesture to unlock audio; short SFX should use Web Audio. A mute control is typical and is missing in the legacy build.

## 6.4 Rights / provenance

Resolved by policy: all assets will be newly created (ASSET-01…03 in [08](08-target-rules.md)). The legacy code itself is MIT-licensed (© 2015 Leonardo Pereira) but the legacy art, sounds and font are not carried over.

**New art needed** (superset of the "missing art" list above): egg + crack animation; the seven growth forms (small blob, big blob, blob with tail, tail & legs, teenager, adult ×3 species, Angel, Demon) each with idle/eat/drink/sick/sleep/etc.; poop; the icons; stat screens; shell; and original sound effects. Sizing depends on the LCD resolution decision (Q-ART-2).
