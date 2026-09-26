# Sprint Metrics — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.
The rule: no links to sibling apps. Apps exchange data only through
shared-origin localStorage, and each app surfaces other apps' data itself.
This repo is in **Wave 1**, because scrum-facilitator's removal depends on
the new reader below.

## Links to remove (5)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `App.tsx:297-304` | "Open Improvement Board" in the add-sprint toast | improvement-board | No. Keep the toast text |
| 2 | `App.tsx:322-329` | "Review with Change Planner" in the decline alert | change-planner | No. Keep the alert text |
| 3 | `App.tsx:331-341` → `sprintData.ts:173-188` `buildImprovementBoardUrl` | "Log as improvement item" (`?prefill=Velocity drop in …`) | improvement-board | No: IB will read `sprint-metrics:lastSession` (IB plan) |
| 4 | `App.tsx:443-452` | Team Identity badge link | team-identity | No. Render it as `<span>` |
| 5 | `App.tsx:511-519` | "Start Retrospective" → `scrum-facilitator/?ceremony=retro` | scrum-facilitator | No: SF will show a retro-suggest banner from `sprint-metrics:lastSession` (SF plan) |

Links that are dead today and need nothing here: kanban-designer's
`?kanban=` and moving-motivators' `?mm=`. This app never parsed either; it
already reads `kanban-designer:currentBoard`.

## Delete

- `buildImprovementBoardUrl` and `IMPROVEMENT_BOARD_URL` (`sprintData.ts:173-188`)
- The import at `App.tsx:26`
- `describe('buildImprovementBoardUrl')` in `sprintData.test.ts`
- Orphaned i18n keys (en/es/ru/be): `integration.improvementBoardLink`,
  `changePlannerLink`, `improvementBoardLogLink`, `startRetro`
- Reword `teamIdentityBadgeTitle` so it no longer implies a link
- Keep `improvementBoardOpen`, `changePlannerAlert` and `teamIdentityBadge`,
  which stay as text

## Producer change

- **Write `sprint-metrics:lastSession` on every sprint edit** (`updateSprints`).
  Today it is written only on add-sprint and on the Start Retro click, and
  the click goes away. Scrum Facilitator and Improvement Board depend on it
  being current.

## Add (receivers)

1. **Scrum Facilitator review → sprint entry.** This replaces SF's direct
   write into `sprint-metrics-projects`, which is a foreign-namespace write
   being retired. Add a new reader in `utils/scrumFacilitatorImport.ts`,
   next to the existing retro-notes reader, for review ceremonies in
   `scrum-facilitator-history`. Offer "Add sprint from Scrum review (date)"
   in the sprint table, and keep an "already imported" marker under
   `sprint-metrics:`.
   Check first that SF's review export has the fields needed (date, and
   planned/completed if present). Use SF's `types.ts` for the fixture.
2. *(D4, accepted)* In `loadMotivatorSnapshot`, prefer
   `moving-motivators:motivationSnapshot` (team) over `lastSession` (solo)
   when it is newer.

## Tests

- Remove the builder test.
- Add tests for the review reader, for the "lastSession on every edit"
  write, and for team-vs-solo motivator selection (newer wins).
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
