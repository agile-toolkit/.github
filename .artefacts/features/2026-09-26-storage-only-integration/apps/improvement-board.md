# Improvement Board — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.
Rule: no links to sibling apps. Exchange data only through shared-origin
localStorage, and each app surfaces other apps' data itself.
**Wave 2** (a sender).

## Links to remove (8)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/BoardView.tsx:290`, `ImprovementBoard.tsx:224` → `utils/kanbanLink.ts` | "Open in Kanban Designer" (`?prefill=<board JSON>`) | kanban-designer | No: KD will read `improvement-board-items` (KD plan) |
| 2 | `ImprovementCard.tsx:166`, `ImprovementBoard.tsx:544` → `utils/planningPokerLink.ts` `buildPokerUrl` | "Estimate in Planning Poker" (`?prefill=<title>`) | planning-poker | No. Poker never parsed it; poker will read `improvement-board-items` |
| 3 | `ImprovementCard.tsx:176`, `ImprovementBoard.tsx:554` → `utils/changePlannerLink.ts` | "Promote to Change Planner" | change-planner | No. CP already imports `improvement-board-items` (`homeScreenLogic.ts:21`) |
| 4 | `ImprovementCard.tsx:186`, `ImprovementBoard.tsx:564` → `utils/movingMotivatorsLink.ts` | "Assess with Moving Motivators" (`?change=<title>`) | moving-motivators | No: MM will read `improvement-board-items` (MM plan) |
| 5–7 | `BoardView.tsx:12-14,171-212` | `from_sprint_metrics` / `from_moving_motivators` / `from_scrum_facilitator` banners with "Open X" links | SM / MM / SF | No. The MM and SF banners have no sender anywhere |
| 8 | `BoardView.tsx:384-394` | "Suite integration" footer link | sprint-metrics | No |

## Delete

- `utils/kanbanLink.ts`, `utils/changePlannerLink.ts`,
  `utils/movingMotivatorsLink.ts`, and their `*.test.ts`.
- `utils/planningPokerLink.ts`: delete `buildPokerUrl` and
  `PLANNING_POKER_BASE`. **Keep `getLastEstimate`**, a legitimate read of
  `planning-poker:history`, and trim its test file to match.
- The `?prefill=` / `utm_source` parser at `App.tsx:91-95` and its uses at
  `App.tsx:184-187` and `BoardView.tsx:28-31,52-53,171-212,400`. After
  sprint-metrics removes its link, nothing sends these.
- Orphaned i18n keys (en/es/ru/be):
  - `from_sprint_metrics`, `open_sprint_metrics`, `from_moving_motivators`,
    `open_moving_motivators`, `suite_link_label`
  - `open_kanban_designer`, `open_kanban_designer_title`
  - `promote_to_change_planner`, `assess_with_mm`, `estimate_in_poker`
  - `from_scrum_facilitator`, `open_scrum_facilitator`

## Add (receivers replacing the deleted inbound banners)

Add both to `AddItemModal`, next to the existing Moving Motivators and Scrum
Facilitator suggestions (`utils/movingMotivatorsImport.ts`,
`utils/scrumFacilitatorImport.ts`):

1. **Sprint Metrics velocity drop.** New `utils/sprintMetricsImport.ts`
   reads `sprint-metrics:lastSession`. When it signals a decline, suggest
   "Velocity drop in <lastSprintName>". This replaces SM's
   `?prefill=Velocity drop…` link. Guard the shape; take the fixture from
   sprint-metrics' `sprintData.ts` types.
2. **Scrum Facilitator daily impediments.** Extend
   `scrumFacilitatorImport.ts` to also offer `impediments` from daily
   ceremonies (`scrum-facilitator-session` / `-history`, `ExportData.impediments`).
   This replaces SF's "Open Improvement Board →" links.

The dismissal/"already imported" marker lives under `improvement-board:`.

## Unchanged

`improvement-board-items` and `improvement-board:lastSession` are already
written on every edit. No producer work is needed.

## Tests

- Delete the link-builder tests.
- New tests for `sprintMetricsImport` and the impediments branch. Build the
  fixtures from the producers' type files.
- Adopt `src/__tests__/no-cross-app-links.test.ts` from the design system.
