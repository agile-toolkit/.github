# `agent-state.json` field reference

`agent-state.json` in this repository is the cross-repo snapshot for agent runs. Each entry under `apps.<repo-name>` uses the same shape.

| Field | Description |
|--------|---------------|
| `updated` | ISO-8601 UTC timestamp of when this file was last written. |
| `lock` | Optional lock object for coordinating concurrent agents; use `null` when no lock is held. |
| `apps` | Map of repository name (GitHub repo slug) to that app’s state object. |
| `status` | **New status after this run’s work** (e.g. `stable`, `in-progress`, `blocked`). |
| `last_run` | **Today’s date** in `YYYY-MM-DD` for the run that produced this snapshot. |
| `last_commit` | **Short SHA** of the commit **just pushed** to the target repo (the app repository on GitHub). |
| `next_task` | **Specific description** of what the **next** agent run **must** do; use `null` if nothing is queued. |
| `blockers` | **List of human-input blockers** (strings). Use an **empty array `[]`** when there are none. |

When you finish a run: bump `updated`, set each touched app’s `status`, `last_run`, `last_commit`, `next_task`, and `blockers`, then open a PR or push to `main` on **`agile-toolkit/.github`**.
