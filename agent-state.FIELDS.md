# `agent-state.json` field reference

`agent-state.json` in this repository is the cross-repo snapshot for agent runs. Each entry under `apps.<repo-name>` uses the same shape.

| Field | Description |
|--------|---------------|
| `updated` | ISO-8601 UTC timestamp of when this file was last written. |
| `lock` | Optional lock object for coordinating concurrent agents; use `null` when no lock is held. |
| `apps` | Map of repository name (GitHub repo slug) to that app’s state object. |
| `status` | **New status after this run’s work.** Allowed values: `not-started`, `blocked`, `in-progress`, `stable`. See **`agent-state.NO-BRIEF.md`** for how to assign them when **`BRIEF.md`** is missing. |
| `last_run` | **Today’s date** in `YYYY-MM-DD` for the run that produced this snapshot. |
| `last_commit` | **Short SHA** of the commit **just pushed** to the target repo (the app repository on GitHub). |
| `next_task` | **Specific description** of what the **next** agent run **must** do so it can act **without re-reading the whole repo**; use `null` if nothing is queued. Name exact files, symbols, dependencies, and i18n keys. |
| `blockers` | **List of human-input blockers** (strings). Use an **empty array `[]`** when there are none. |

### `next_task` quality bar

- **Good:** actionable in one pass — e.g. *Implement share button in `ResultsView` using `html2canvas`; `results.share` i18n key already exists in `src/i18n/en.json` and `ru.json`.*
- **Bad:** vague handoffs — e.g. *continue work*, *implement next feature*, *polish UX* (forces the next run to rediscover scope).

When **`BRIEF.md`** is absent in an app repo, derive features and status using **`agent-state.NO-BRIEF.md`** (README → `en.json` vs UI → hardcoded strings → TODOs).

When you finish a run: bump `updated`, set each touched app’s `status`, `last_run`, `last_commit`, `next_task`, and `blockers`, then open a PR or push to `main` on **`agile-toolkit/.github`**.
