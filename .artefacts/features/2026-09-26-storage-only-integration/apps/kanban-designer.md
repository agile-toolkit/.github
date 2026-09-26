# Kanban Designer: storage-only integration

The suite-wide plan is in `agile-toolkit/.github` at
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.
The rule it sets: apps never link to each other. They exchange data only
through shared-origin localStorage, and each app surfaces other apps' data
itself.

This repo is in **Wave 1**, because the new Improvement Board import lets
improvement-board drop its link.

## Links to remove (2)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/BoardDesigner.tsx:363-375` | "Send to Sprint Metrics" (`?kanban=`) | sprint-metrics | No. Sprint Metrics never parsed it, and it already reads `kanban-designer:currentBoard` |
| 2 | `BoardDesigner.tsx:376-385` | "Send to Planning Poker" (`?kanban-board=<name>`) | planning-poker | No. Planning Poker will read `kanban-designer:currentBoard` (see the Planning Poker plan) |

Delete the orphaned i18n keys `designer.send_to_sprint_metrics` and
`designer.send_to_planning_poker` in all four locales (en/es/ru/be).

In the README, fix line 32: it wrongly says Planning Poker reads
`currentBoard`. Also fix line 43.

## URL receiver to replace

- `?prefill=<board JSON>`: `utils/prefillBoard.ts`, used at `App.tsx:45-50`.
  Improvement Board is the only sender.
  - Replace it with **"New board from Improvement Board"** in the board
    picker or in the "new board" flow. It reads `improvement-board-items`
    and maps identified / in_progress / done to three columns.
  - Move the column mapping here from improvement-board's
    `utils/kanbanLink.ts:5-32`, which is being deleted.
  - Guard the item shape, and write the test fixture from improvement-board
    `types.ts`.
- After that, delete `parsePrefillBoard` and its test. Keep
  `unwrapBoardExport` (`boardExport.ts`) and the `#board=` share link, which
  is this app's own.

## Producer

No change. `kanban-designer:currentBoard` and `kanban-designer-boards` are
already written on every save.

## Tests

- Add a test for the new Improvement Board mapper.
- Remove the prefill test.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
