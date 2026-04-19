# When `BRIEF.md` is missing

Some repos were seeded before an agent run and have **no `BRIEF.md`**. Use this procedure to derive the feature list and **`agent-state.json`** fields **without inventing scope**.

**Do not** add features that appear in neither **`README.md`** nor **`src/i18n/en.json`** (and sibling locale files). Those two sources bound product intent for this pass.

---

## 1. Derive the feature list (strict order)

### Step A — `README.md`

Read **`README.md`** at the repo root and extract the **explicit feature list** (bullets, sections like “Features”, user stories, or numbered capabilities). Treat that list as the **authoritative backlog** for “what should exist.”

### Step B — `src/i18n/en.json` vs UI

Read **`src/i18n/en.json`** and flatten nested keys to dot paths (e.g. `results.share`).

For each key whose **value is user-visible copy** (not structural / not dev-only):

- Search **`src/`** for references: `t('…')`, `` t(`…`) ``, or `i18n.t('…')` with a path that resolves to that key (account for shared prefixes and dynamic segments where applicable).
- If **no** `.tsx` / `.ts` file under **`src/`** ever uses that key in a way that **renders** that string to the user, treat it as a **missing feature** (copy exists in locale files but no UI) until wired or intentionally removed from locales.

**Invention rule:** do **not** add backlog items that appear in **neither** **`README.md`** **nor** **`src/i18n/en.json`** (and related locale files). Keys present only in **`ru.json`** but not **`en.json`** should still be checked against **`en.json`** as the primary inventory for parity.

### Step C — Hardcoded user-visible strings (i18n bugs)

Search **`src/`** for **user-visible** English (or other) literals in JSX or UI logic **without** going through **`t(...)`** (or equivalent i18n helper). Examples: raw text in `<button>…</button>`, `placeholder="…"`, `title="…"`, `alert('…')` meant for users.

Each such string is an **i18n bug** and counts as a **missing feature** for parity (README + locales are the contract; the UI must be translatable as the rest of the app).

### Step D — `TODO` in `src/`

Search **`src/`** for `TODO`, `FIXME`, `XXX` (comments). Each item is a **tracked gap** unless README explicitly excludes it. Map the comment to a **concrete** `next_task` (file + action).

---

## 2. Classify `status`

Apply **one** status in this priority (evaluate in a sensible order: build first, then scaffold, then gaps):

| Condition | `status` |
|-----------|----------|
| No **`src/`** directory, or **`src/`** contains only empty / placeholder scaffold (no real components, no meaningful routes) | `not-started` |
| Has real components **`and`** `npm run build` **fails** | `blocked` |
| Has components **`and`** build passes **`and`** all README features are implemented **`and`** there are **no** i18n gaps from steps B–C **`and`** no open TODOs from step D that affect shipped scope | `done` |
| Has components **`and`** build passes **`but`** README features are incomplete **or** i18n wiring is incomplete **or** TODOs remain for shipped features | `in-progress` |

**Notes**

- **Build** means the repo’s normal CI build (e.g. `npm run build`).
- **`done`** requires both **README coverage** and **no** outstanding i18n/TODO gaps from the rules above — not merely “green build.”

---

## 3. Set `next_task`

- Set **`next_task`** to the **first** **specific** missing feature or bug discovered when walking **A → B → C → D** (same order as above).
- It must be **actionable without re-reading the entire repo** (exact files, keys, symbols) — see **`agent-state.FIELDS.md`**.
- If status is **`done`**, set **`next_task`** to **`null`**.
- If status is **`blocked`**, **`next_task`** should describe the **first build failure** (command, file, error) so the next run can fix the toolchain before features.

---

## 4. Optional: `BRIEF.md` later

If a **`BRIEF.md`** is added later, it **supersedes** this derivation for scope on subsequent runs; keep **`README.md`** and locales in sync with it.

## 5. Backfill

Older **`agent-state.json`** rows may still use legacy values (e.g. `stable`) or claim **`done`** without this checklist. Agents should **re-run** sections 1–3 once per app repo and then update **`agile-toolkit/.github`** so **`status`** and **`next_task`** match evidence.
