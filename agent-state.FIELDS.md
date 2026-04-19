# `agent-state.json` field reference

State for the **Agile Tools** autonomous agent lives in `**agile-toolkit/.github`** — file `**agent-state.json**`. Full run protocol: `**AGENT_AUTONOMOUS.md**`.

## Top-level fields


| Field         | Description                                                                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `updated`     | ISO-8601 UTC timestamp when this file was last written (after lock release).                                                                                                                                                                                                                     |
| `lock`        | `null`, or `{ "repo": "<slug>", "started_at": "<ISO UTC>" }` — see `**AGENT_AUTONOMOUS.md` § Locking**.                                                                                                                                                                                          |
| `last_picked` | Object with **exactly** these keys, each `**null`** or a **repo slug**: `blocked`, `in-progress`, `scaffolded`, `not-started`, `stable`. Used for **round-robin target selection** within the active status. Update to the repo that was **picked** this run (status **before** any transition). |
| `apps`        | Map **repo slug → app state**. **All 10** suite repos must always be present.                                                                                                                                                                                                                    |


## Per-app fields (`apps.<slug>`)


| Field         | Description                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`      | After this run: one of `**not-started`**, `**scaffolded**`, `**in-progress**`, `**stable**`, `**blocked**`. Lifecycle and meanings: `**AGENT_AUTONOMOUS.md` § App Lifecycle**. |
| `last_run`    | `YYYY-MM-DD` of this run, or `null` if no run touched the repo.                                                                                                                |
| `last_commit` | Short SHA of the commit **just pushed** to that app repo, or `null` if no code commit (e.g. research-only).                                                                    |
| `next_task`   | **Specific** next action for the **next** run — readable without re-scanning the whole repo. For `**stable`**, typically: *check needs-review issues for human feedback*.      |
| `blockers`    | Human-input blockers (strings); `[]` if none.                                                                                                                                  |


### `next_task` quality bar

- **Good:** *Implement share button in `ResultsView` using `html2canvas`; `results.share` exists in `src/i18n/en.json` and `ru.json`.* — or *check needs-review issues for human feedback*.
- **Bad:** *continue work*, *implement next feature*.

## When `BRIEF` scope is unclear

If `**.artefacts/BRIEF.md*`* is missing or empty, derive once using `**agent-state.NO-BRIEF.md**` (README → `en.json` vs UI → hardcoded strings → TODOs). After that, `**.artefacts/BRIEF.md**` is maintained per `**AGENT_AUTONOMOUS.md` § BRIEF.md Updates**.

## Writing state

After **one** app repo run: update `**lock`**, `**apps**`, `**last_picked**`, `**updated**`; commit and push `**agile-toolkit/.github**` once (combine lock release + state write when possible — `**AGENT_AUTONOMOUS.md**`).