# 14. Localization

Status: **decided in principle (round 13); details are proposals** for your approval. No UI exists yet, so this costs almost nothing now and a lot if added later.

## 14.1 Decisions

| ID | Rule | Status |
|----|------|--------|
| I18N-01 | The app is **multilingual**. **Brazilian Portuguese (`pt-BR`) is the primary language** and the source of truth for every text. **English (`en`)** ships alongside it. **Latin American Spanish (`es-419`)** comes later. | ✅ decided |
| I18N-02 | The simulation core (`src/core`) and the simulator contain **no user-facing text**. Events and states are codes (`gotSick`, `tooHot`, `hungry`, …); the app layer turns them into words. | ✅ (already true) |
| I18N-03 | The **art contains no text** except universal symbols: numbers, `°C`, `kg`, and the education grade letters (A+ to E+, as on the toy). | ✅ proposed |
| I18N-04 | The brand name **Dinkie Dino** is never translated. (Pets have no names, PET-01.) | ✅ |
| I18N-05 | Language is chosen from the browser's language list on first run, can be changed in Settings, and the choice is saved. | 🔶 proposed |
| I18N-06 | Adding a language is **content work only**: a new catalog file, no code changes. The type system and tests make an incomplete catalog impossible to ship. | ✅ goal |

## 14.2 What needs translating

The LCD itself is symbolic (sprites, numbers, units), so the text lives in the **app around it**:

| Area | Examples |
|------|----------|
| First run | welcome, set the wake-up time, "add to home screen" instructions (differ for iOS and Android) |
| The device | accessible names and tooltips for the 10 icons and the 5 buttons; a visually hidden description of what the pet is doing and needing, for screen readers (the LCD is a canvas) |
| Settings | language, wake-up time, adult bedtime, Jokenpo rounds, sound, reset |
| Reset | long-press hint, confirmation title, body and buttons |
| "While you were away" | built from engine events: woke up, grew, species, final form, got sick, cured, died (with the cause), too hot or cold, … |
| End screens | captions for the dead pet, the Angel and the Demon |
| System messages | new version available, offline, storage full or unavailable, export and import results |
| Later | notifications, a "how to play" page |
| Not translated | the debug panel (developer tool, English), the specification docs (English), the code |

## 14.3 Technical design (no library)

The string count is small (roughly 100 to 150), and the dependency policy is "one runtime dependency". So: a **tiny typed module plus the browser's `Intl`**, not an i18n library.

- **Locale codes** are BCP 47: `'pt-BR' | 'en' | 'es-419'`. Only shipped locales appear in the language picker.
- **Catalogs** live in `src/i18n/locales/{pt-BR,en,es-419}.ts`. The `pt-BR` file defines the `Messages` type (the key set and the placeholders); every other catalog must satisfy it, so a missing or extra key is a **compile error**.
- **Messages** are strings with `{placeholders}`; counts use plural forms keyed by `Intl.PluralRules` category (Portuguese and Spanish need `many` as well as `one` and `other`; English only `one` and `other`).
- **API sketch:** `t('settings.title')`, `t('summary.grew', { stage })`, `plural('summary.days', 3)`, `setLocale(…)`, `onLocaleChange(…)`.
- **Formatting** always through `Intl`: `DateTimeFormat` for times, `NumberFormat`, `ListFormat` ("a, b e c" / "a, b and c"), never hand-built.
- **Loading:** `pt-BR` is in the main bundle; others are separate chunks loaded on demand and **all precached** by the service worker, so switching language works offline.
- **Detection:** match `navigator.languages` in order: `pt*` → `pt-BR`, `es*` → `es-419` (once shipped), `en*` → `en`; nothing matched → default (Q-I18N-2). Stored as `'auto' | Locale` in settings.
- **Document language:** `<html lang>` follows the active locale; the manifest's `lang` is `pt-BR`.
- **Layout:** Portuguese and Spanish run about 20 to 40% longer than English, so UI chrome must wrap and grow rather than assume English widths.
- **Fonts:** system UI fonts cover the needed characters (á ã ç é í ó õ ú ñ ¿ ¡); no custom font is needed.

### Tests (all in CI)

| Test | What it prevents |
|------|------------------|
| Key parity | a language missing a key or having a stale one |
| Placeholder parity | `{name}` present in one language and renamed or dropped in another |
| Plural completeness | a language lacking a plural form that its rules need |
| Pseudo-locale (`en-XA`, dev only) | untranslated hard-coded text and overflow: every string is accented and padded by 40% |
| No raw text in the UI layer | strings typed straight into UI code instead of the catalog (a simple scan) |
| Event coverage | every engine event type and every sickness / death cause has a message in the summary |

## 14.4 Glossary (draft, for you to correct)

There was **no Brazilian manual** to take the wording from, so the **pt-BR column is drafted from scratch** and is my proposal for you to correct. The Spanish column is a placeholder for later and needs a native reviewer.

| Concept | pt-BR (proposed) | en | es-419 (later) |
|---------|------------------|----|----------------|
| Drink | Beber / Água | Water | Beber / Agua |
| Food | Comida | Food | Comida |
| Lamp | Luz | Lights | Luz |
| Pet | Carinho | Pet | Mimos |
| Check | Status | Status | Estado |
| Play | Jogar | Play | Jugar |
| Educate | Estudar | Educate | Estudiar |
| Bath | Banho | Bath | Baño |
| Air conditioner | Ar-condicionado | Air conditioner | Aire acondicionado |
| Medicine | Remédio | Medicine | Medicina |
| Clock | Relógio | Clock | Reloj |
| Hungry / thirsty | Com fome / Com sede | Hungry / Thirsty | Con hambre / Con sed |
| Sad | Triste | Sad | Triste |
| Dirty | Sujo | Dirty | Sucio |
| Sick | Doente | Sick | Enfermo |
| Too cold / too hot | Com frio / Com calor | Too cold / Too hot | Con frío / Con calor |
| Egg | Ovo | Egg | Huevo |
| Small blob / big blob | Bolinha / Bolinha grande | Small blob / Big blob | Bolita / Bolita grande |
| Blob with tail / with legs | Com rabinho / Com perninhas | With a tail / With legs | Con colita / Con patitas |
| Teenager / adult | Adolescente / Adulto | Teenager / Adult | Adolescente / Adulto |
| Angel / Demon | Anjinho / Diabinho | Angel / Demon | Angelito / Diablito |
| T-Rex / Brontosaurus / Triceratops | T-Rex / Brontossauro / Triceratops | T-Rex / Brontosaurus / Triceratops | T-Rex / Brontosaurio / Triceratops |
| Foods | Hambúrguer, Coxa de frango, Maçã, Cenoura, Sorvete, Macarrão | Hamburger, Chicken thigh, Apple, Carrot, Ice cream, Noodles | Hamburguesa, Muslo de pollo, Manzana, Zanahoria, Helado, Fideos |
| Rock-paper-scissors | Jokenpô: Pedra, Papel, Tesoura | Rock, Paper, Scissors | Piedra, papel o tijera |
| Reset | Reiniciar | Reset | Reiniciar |
| Wake-up time / bedtime | Hora de acordar / Hora de dormir | Wake-up time / Bedtime | Hora de despertar / Hora de dormir |

## 14.5 Process

- **pt-BR** is written by you (a native speaker, and the one who remembers the toy's tone). Each new string starts in the pt-BR catalog.
- **English** is drafted by me from the pt-BR text and reviewed by you.
- **es-419** later, by a native reviewer. Machine translation alone is not enough for a game this small and playful.
- A contributor guide (`docs/translating.md`) comes with the first public catalog.

## 14.6 Effect on the plan

| Milestone | Change |
|-----------|--------|
| M3 (simulator) | none: the core and the tools have no text |
| M4 (UI shell) | gains the i18n module, the pt-BR and en catalogs, the language picker, accessible names, the parity tests and the pseudo-locale |
| M5 (PWA) | manifest `lang`, precache of all catalogs |
| M8 (polish) | a "how to play" page in each shipped language |
| After v1 | `es-419` catalog (content only), then any further languages |

## 14.7 Open questions

Decided in round 15: the glossary is drafted from scratch (and reviewed by you), an unmatched browser language shows **English**, the clock is **24-hour**, the grades **A+ to E+** stay as on the toy, Spanish comes **after v1 with a native reviewer**, the docs stay in English (a pt-BR README later), and there is **one URL** with an in-app language switch. Nothing is open here except the wording of the glossary itself.
