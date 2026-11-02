# 1. Device & controls

Source: `GameScreen.java` (`setButtons`, `handleButtons`, `drawIcons`, `paint`), `models/Device.java`, `assets/dinkie_bg.png`.

## 1.1 The device

The game screen shows a single skeuomorphic handheld, centered in the viewport.

| Property | Value | Status |
|----------|-------|--------|
| Shell image | `dinkie_bg.png`, 512 × 470 px, yellow egg with a purple "horn", logo "Dinkie Dino" | ✅ |
| Placement | Centered on screen, using top-left = `(W/2 − 256, H/2 − 256)`. No scaling: fixed 1:1 pixels | ✅ |
| LCD content area | 151 × 127 px, at `(+173, +182)` from the shell's top-left | ✅ |
| Behind-device colour | Light grey (`Color.LTGRAY`) | ✅ |
| Skins | `Device.Color {White, Red, Yellow, Green}` × `Device.Type {DinkieDino, RakurakuDinokun}`. Only the one yellow **Dinkie Dino** shell art exists. | 💤 |

The shell has **two arrow buttons** (left/right, pink triangles at the LCD's sides) and **three oval buttons** underneath
labelled **Esc**, **Enter**, **Clock** (hand-lettered, red).

> 🆕 The web build needs a responsive scale factor. The legacy coordinates below are in native shell pixels (512 × 470).

## 1.2 Button hit areas

All coordinates are relative to the shell's top-left (add the placement offset to get screen coordinates).
Buttons fire on **touch-down** (not release) and play the `bip` sound at 0.8 volume **whenever the hit-area is touched, even if the press has no effect** (✅ `CTRL-01`).

| Button | Rect `(left, top) – (right, bottom)` | Size | Status |
|--------|--------------------------------------|------|--------|
| Left arrow | (55, 272) – (95, 329) | 40 × 57 | ✅ |
| Right arrow | (400, 272) – (440, 329) | 40 × 57 | ✅ |
| Esc | (158, 368) – (215, 406) | 57 × 38 | ✅ |
| Enter | (223, 375) – (280, 413) | 57 × 38 | ✅ |
| Clock | (286, 371) – (343, 409) | 57 × 38 | 💤 defined, never handled |

Note Esc / Enter / Clock have slightly different `top` values because the shell art arcs them.

## 1.3 Icon bar and cursor

Ten action icons are printed down the two sides of the LCD in the shell art (paw-print placeholders). A single **cursor icon** (35 × 31 px) is drawn over the slot of the currently selected action.

- Left column cursor X = `+132`; right column cursor X = `+326`.
- Row Y = `+170 + row × 27`, for rows 0–4.

| Row | Left column | Right column |
|-----|-------------|--------------|
| 0 | **Drink** | **Play** |
| 1 | **Food** | **Educate** |
| 2 | **Lamp** | **Bath** |
| 3 | **Pet** | **Cool** |
| 4 | **Check** | **Medical** |

Rules:

- `CTRL-02` ✅ Initial selection is **None**: no cursor is drawn.
- `CTRL-03` ✅ The cursor icon is drawn **on every frame while the game is running**, including during animations and sub-screens (it does not hide).
- `CTRL-04` ✅ The selected action is **remembered** after returning to the idle screen.

### Cursor navigation (Idle screen only)

Behavior of the two arrow buttons when no action is active (`CTRL-05`, ✅):

| From ↓ / Press → | **Left arrow** goes to | **Right arrow** goes to |
|------------------|------------------------|-------------------------|
| None | Drink | Play |
| Drink | Food | Play |
| Food | Lamp | Educate |
| Lamp | Pet | Bath |
| Pet | Check | Cool |
| Check | Drink | Medical |
| Play | Drink | Educate |
| Educate | Food | Bath |
| Bath | Lamp | Cool |
| Cool | Pet | Medical |
| Medical | Check | Play |

Interpretation, which is the actual design intent:

- **Left arrow** cycles *down* the **left** column (Drink → Food → Lamp → Pet → Check → wraps to Drink). If the cursor is in the right column, it jumps to the **same row of the left column**.
- **Right arrow** cycles *down* the **right** column (Play → Educate → Bath → Cool → Medical → wraps to Play). If the cursor is in the left column, it jumps to the **same row of the right column**.

Pressing both arrows alternately therefore swaps columns while keeping the row. There is **no way to move the cursor upward**.

## 1.4 What each button does, by screen state

| Screen state | Left | Right | Enter | Esc |
|--------------|------|-------|-------|-----|
| **Idle** | Cursor nav (§1.3) | Cursor nav (§1.3) | Start the selected action (does nothing if None) | Nothing (beep only) |
| **Food selection** | Previous food | Next food | Confirm: feed | Back to Idle |
| **Play selection** (Jokenpo) | Cycle shape one way | Cycle shape the other way | Lock in the shape, play the round | Abandon game → Idle |
| **Check** (status) | Previous stat screen | Next stat screen | (ignored) | Back to Idle |
| **Any animation** (drinking, feeding, burping, studying, petting, medicating, negating, Jokenpo reveal) | ignored | ignored | ignored | **Cancel → Idle immediately** |
| **Stub states** (Lamp, Bath, Cool) | ignored | ignored | ignored | Back to Idle |

- `CTRL-06` ✅ Input is effectively **locked during animations** except Esc.
- `CTRL-07` 🐞 Esc during an animation skips the rest of it but does **not** undo the stat change (see BUG-05).
- `CTRL-08` ❓ Clock button: no behavior defined. (Original handhelds usually show time / set time. See [open questions](07-open-questions.md).)

## 1.5 Haptics, sound, and touch

- Button sound: `bip.wav` @ 0.8 on every button hit.
- Vibration: only used on the main menu (delete flow), 50 ms pulses. The in-game screen does not vibrate.
- 🆕 For the web: `navigator.vibrate` is unsupported on iOS Safari; treat it as optional.
