# 5. Persistence & data model

Source: `database/*`, `MainMenuScreen.loadDino / createDino / deleteDino`, `RakurakuLauncher` dialogs.

## 5.1 What the legacy app stores

SQLite database named `DownloadService` (a leftover name from a tutorial), schema version 1. A version change **drops the table** and recreates it (all pets lost). Single table:

```sql
create table tb_dino (
  _id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,         -- unique by app logic only, not by constraint
  type INTEGER NOT NULL,      -- DinoType ordinal
  age INTEGER NOT NULL,
  birthday INTEGER NOT NULL,  -- epoch ms
  hungry INTEGER,  last_fed INTEGER,
  thirst INTEGER,  last_drink INTEGER,
  study INTEGER,   last_study INTEGER,
  happiness INTEGER, last_play INTEGER,
  discipline INTEGER, last_discipline INTEGER,
  heat INTEGER,
  dirty INTEGER,   last_bath INTEGER,
  sick INTEGER,
  sickness_chance REAL,
  weight INTEGER,
  noodles_eaten INTEGER, veggies_eaten INTEGER, meat_eaten INTEGER
);
```

## 5.2 What actually happens

| Operation | Behavior | Status |
|-----------|----------|--------|
| **Create** | Insert a row: name, `type = 0`, `age = 0`, `birthday = now`, every `last_*` timestamp = now, every other numeric = 0. | ✅ |
| **List** | `SELECT name` for all pets; order = insertion. | ✅ |
| **Load** | `SELECT *` by name, reads only the six `last_*` timestamps into a `Timings` object attached to a **fresh** `Dino` with default stats. Name, type, age, birthday and every stat column are ignored. | 🐞 |
| **Save** | `RepositorioRakuraku.update(values, name)` exists. **It is never called.** Nothing is saved during or after play. | 🐞 |
| **Delete** | Delete by name. | ✅ |

Net effect: in the legacy app **closing the game loses all progress**; only the *existence and name* of a pet survives.

## 5.3 Rules to carry over (these are intended and work)

| ID | Rule |
|----|------|
| DATA-01 | Pets are identified by **name**, which must be non-empty and unique (case-sensitive exact match). |
| DATA-02 | Name entry: single line, **max 15 characters**, words auto-capitalized by the keyboard. |
| DATA-03 | **Max 4 pets** stored at once. |
| DATA-04 | A new pet's `birthday` and all `last_*` timestamps are set to creation time. |
| DATA-05 | Deletion is permanent and requires explicit confirmation. |

Gaps to decide: whitespace-only names (MENU-12), trimming, allowed characters/emoji, whether names are case-insensitively unique, and whether duplicate names should be disambiguated. The legacy code itself left a TODO: *"treatment for dinos with equal names, at the moment name is a primary key in search"*.

## 5.4 🆕 Web storage requirements (to design later, after the rules are settled)

- Data must survive closing the PWA and work **offline**.
- Persist all stats + timestamps + `lastSavedAt` so elapsed-time catch-up can work (see 04 §4.7).
- Schema versioning with **non-destructive migrations**. The legacy "drop the table on upgrade" policy should not be replicated.
- Candidate stores: IndexedDB (preferred for structured data and robustness) vs. `localStorage` (enough for ≤ 4 small records, simpler). Browsers can evict storage for non-installed sites → consider `navigator.storage.persist()`.
- Import/export or cloud sync: out of legacy scope → open question.
