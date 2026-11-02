# 0. Overview & legacy maturity

## Product in one paragraph

A virtual pet that lives on a skeuomorphic handheld "egg" device (yellow shell branded **Dinkie Dino**).
The player cares for a baby dinosaur through a small LCD screen, using two arrow buttons and
Esc / Enter / Clock buttons to select actions from a 10-icon bar (5 icons down each side of the LCD).
The look is deliberately 1-bit/LCD: black pixel art on a pale grey-blue screen.

Players can keep several named pets at once (max 4 slots) and load, create, or delete them from a menu.

## Legacy project facts

| Item | Value |
|------|-------|
| Platform | Android (minSdk 11, targetSdk 19), Java, Eclipse |
| Package | `com.leleusoft.rakurakudinokun` |
| Engine | Custom game framework (`com.leleusoft.gameframework`: Game / Screen / Graphics / Input / Audio). **Not in this archive**; it was moved to another project (commit `f6c6b85`) |
| History | 74 commits, 2014-08-06 → 2015-05-26 |
| Orientation | Portrait and landscape (menu has distinct layouts for each) |
| Permissions | WAKE_LOCK, WRITE_EXTERNAL_STORAGE, VIBRATE |
| License | MIT, © 2015 Leonardo Pereira (code). Art/sound/font licensing is not stated. See [open questions](07-open-questions.md) |

The game framework is missing, so its exact frame rate and delta-time units are unknown. All animation
durations in these docs are in **milliseconds** because the code passes `deltaTime` into millisecond-based frame tables.

## What is built vs. what is not

| Area | State | Notes |
|------|-------|-------|
| Splash → loading → menu boot flow | ✅ | See [02](02-screens-and-flows.md) |
| Main menu: create / list / long-press-drag-to-delete | ✅ | Portrait list + landscape 2-column grid |
| Device shell, icon cursor, 5 buttons | ✅ | See [01](01-device-and-controls.md) |
| Drink | ✅ | |
| Food (6 foods, selector, per-food animation) | ✅ | |
| Study ("Educate") | ✅ | |
| Pet (affection) | ✅ | |
| Play: Rock-Paper-Scissors ("Jokenpo"), 3 rounds | 🟡 | Plays and animates, but **score has no effect** and no end-of-game result |
| Medical | ✅ | Cures SICK, otherwise the pet shakes its head "no" |
| Check (status screens) | 🟡 | 6 screens; temperature screen and out-of-range weight/age are buggy |
| Lamp (sleep) | 💤 | Icon + sleep sprites exist; handler is an empty stub |
| Bath | 💤 | Icon + `DIRTY` state + `last_bath` column; stub |
| Cool (temperature) | 💤 | Icon + `HOT`/`COLD` states + `temperature_up/down()` never called; stub |
| Clock button | 💤 | Hit-rect defined, never handled |
| Time-based stat decay (hunger, thirst, mood…) | 💤 | `last_fed`, `last_drink`… timestamps exist; **nothing reads them** |
| Sickness onset, dirtiness, hot/cold, death | 💤 | Enum states exist; only a debug button can make the pet SICK |
| Aging / evolution / species | 💤 | `age`, `DinoType` enum, 1/2/3-year sprite data exist; age never advances |
| Weight gain | 🟡 | Only from Ice Cream, probabilistic |
| Persistence of pet state | 🐞 | Pets are created in SQLite but **nothing is ever saved back or restored** (only 6 timestamps are read, then unused) |
| Sound | ✅ | Button beep + 4 Jokenpo sounds. Background theme is commented out |
| Dev/debug tools | ✅ | 3 always-visible hidden-ish test buttons (see below) |

## Debug tools present in the legacy build

Three translucent test squares are drawn at the top-left of the game screen on every frame
(`GameScreen.DRAW_TEST_ELEMENTS` / `HANDLE_TEST_BUTTONS`):

| Rect (x,y) | Icon | Effect |
|-----------|------|--------|
| (10,10) | medical | Force pet state to **SICK** |
| (60,10) | pet | Force mood to **VerySad** |
| (10,50) | educate | Force education to **C+** |

This is currently the *only* way to make the pet sick, which means the Medical action can only be tested via this button.
Recommendation: keep an equivalent hidden debug panel in the web build.

## Known legacy bugs (decide: replicate or fix)

| ID | Bug | Where |
|----|-----|-------|
| BUG-01 | **Temperature status screen always shows the 15° image.** Index is computed as `(temp-15) % 5` which is always 0 for temps in steps of 5; should be `/ 5`. | `Check.getImage` |
| BUG-02 | **Crash on out-of-range age/weight.** Age sprites exist only for age 1, weight sprites only for 1–3. `weight` is uncapped, so a 4th weight gain (or any aging) indexes past the array. | `Check.getImage`, `Statistics.eat` |
| BUG-03 | **Ice cream chance comment vs. code mismatch.** Comment says 60% chance to gain weight; code is `rand(100) > 60`, i.e. **39%**. | `Statistics.eat` |
| BUG-04 | **A sick pet looks healthy on the idle screen.** Idle always paints the LCD pixel-matrix sprite; the SICK sprite is only used by a code path the idle screen never draws. | `GameScreen.paint`, `Dino.getImage` |
| BUG-05 | **Esc mid-animation keeps the effect.** Stats are applied when an action starts (or on Enter for food), so cancelling doesn't undo it. Combined with no cooldown, spamming is unlimited. | `GameScreen.handleUpdates` |
| BUG-06 | **Stub actions trap the player in an empty screen.** Lamp / Bath / Cool enter states that draw nothing and handle no input except Esc. | `GameScreen.handleButtons` |
| BUG-07 | **No way back to the menu from the game screen.** Android Back only *pauses*; the exit code is commented out. | `GameScreen.backButton` |
| BUG-08 | **"New Dino" when 4 slots are full does nothing**: no message, no feedback. | `MainMenuScreen.fullDinoSlots` |
| BUG-09 | **Pet names are concatenated into SQL**, so a name containing `'` breaks create/load/delete. (Irrelevant to web storage, but the *name rules* matter: see [05](05-persistence.md).) | `RepositorioRakuraku` |
| BUG-10 | **Jokenpo tie plays the "dino lost" sound.** | `GameScreen.handleUpdates` (PlayAnimation) |
| BUG-11 | **Hunger is mislabeled.** The `hunger` field is really *fullness* (higher = fuller; eating raises it). | `Statistics` |
