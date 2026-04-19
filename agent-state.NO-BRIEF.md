# When `.artefacts/BRIEF.md` is missing

Use this **once** to bootstrap scope. Ongoing work uses **`.artefacts/BRIEF.md`** per **`AGENT_AUTONOMOUS.md`**. Canonical lifecycle and `agent-state.json` format: **`AGENT_AUTONOMOUS.md`**.

**Do not** invent features absent from both **`README.md`** and **`src/i18n/en.json`** (and sibling locale files).

---

## 1. Derive the feature list (strict order)

### Step A — `README.md`

Extract the explicit feature list (bullets, “Features”, etc.).

### Step B — `src/i18n/en.json` vs UI

Flatten string leaves to dot paths. For each key, find `t('path')` / templates in **`src/`**. Unreferenced user-facing keys → missing wiring (or remove keys). Respect dynamic keys like `` t(`foo.${id}.bar`) ``.

### Step C — Hardcoded user-visible strings

Literals in JSX/UI not going through **`t(...)`** → i18n bugs.

### Step D — `TODO` / `FIXME` / `XXX` in `src/`

Map each to a concrete `next_task`.

---

## 2. Classify `status` (initial bootstrap only)

Align with **`AGENT_AUTONOMOUS.md` § App Lifecycle** (`not-started` → `scaffolded` → `in-progress` → `stable` → …).

| Condition | `status` |
|-----------|----------|
| No meaningful `src/` yet | `not-started` |
| Vite scaffold, deps, no real features | `scaffolded` |
| `npm run build` fails | `blocked` |
| Build passes but README / i18n / TODO gaps remain | `in-progress` |
| All known **BRIEF** features implemented, CI green, no tracked gaps | `stable` |

For **`stable`** after bootstrap, set **`next_task`** per autonomous agent rules (e.g. *check needs-review issues for human feedback*) — see **`AGENT_AUTONOMOUS.md`**.

---

## 3. Set `next_task`

Walk **A → D**; first concrete gap → **`next_task`**. Must be actionable without re-reading the whole repo (**`agent-state.FIELDS.md`**).

---

## 4. After bootstrap

Create **`.artefacts/BRIEF.md`** using the structure in **`AGENT_AUTONOMOUS.md` § BRIEF.md Updates**. Future runs update that file; **`agent-state.json`** is updated in **`agile-toolkit/.github`** per **`AGENT_AUTONOMOUS.md`**.

## 5. Backfill

If **`agent-state.json`** or **`.artefacts/BRIEF.md`** drifted, re-run this checklist once per app, then push corrections.
