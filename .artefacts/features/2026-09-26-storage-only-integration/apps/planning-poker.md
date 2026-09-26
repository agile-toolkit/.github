# Planning Poker — storage-only integration

The suite-wide plan is in `agile-toolkit/.github` at
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

The rule: apps never link to each other. They exchange data only through
shared-origin localStorage, and each app surfaces other apps' data itself.

This repo is in **Wave 1**. It is a pure receiver, and its new importers let
kanban-designer, scrum-facilitator and improvement-board drop their links.

## Outbound links

None. There is one foreign-namespace write to remove:

- `App.tsx:156-157` and `:219-220` write `change-planner:pendingEstimates`.
  - It only happens when `?source=change-planner` is present, and no app
    sends that param.
  - No app reads the key.
  - Delete the write (suite decision D3).

## URL receivers to replace or delete (`src/deeplink.ts`)

| Param | Sender | After |
|---|---|---|
| `?kanban-board=` (`:60-70`, `App.tsx:39,43`) | kanban-designer (board **name** only) | Replaced by an "Import from Kanban Designer" option that reads `kanban-designer:currentBoard` and turns card titles and descriptions into stories. Richer than today's single story. |
| `?participants=` (`:72-77`, `App.tsx:43,51-53`) | scrum-facilitator | Replaced by an "Import participants from Scrum Facilitator" option that reads `scrum-facilitator-session` → `participants[].name`. It sits next to the existing Team Identity import (`App.tsx:63-68`). |
| `?stories=` (`:21-37`) | **none in the suite** | Delete. |
| `?source=change-planner&initiativeId=` (`:39-44`) | **none** | Delete, along with the `pendingEstimates` write. |
| (`?prefill=` from improvement-board) | never parsed | Nothing to delete. Add an "Import from Improvement Board" option that reads open items from `improvement-board-items`. |

Keep `?joinPin=`, which is this app's own live-session link.

## Add

- One import menu in session setup with three sources:
  - Kanban Designer board
  - Improvement Board items
  - Scrum Facilitator participants

  Team Identity is already there.
- Each source is hidden or disabled with neutral copy when its key is absent.
- Every reader parses to `unknown` and guards the shape. Build fixtures from
  the producers' own types:
  - kanban-designer `App.tsx` `writeCurrentBoard`
  - improvement-board `types.ts`
  - scrum-facilitator `types.ts`

## Delete / reword

- In `deeplink.ts`, delete `parseKanbanBoardParam`, `parseParticipantsParam`,
  `parseDeeplinkStories` and `parseChangePlannerParams`, plus their tests
  and their uses in `App.tsx`.
- `setup.deeplink_banner` ("…imported from Change Planner") gets a
  source-neutral reword, or is deleted if the banner goes away.
- `setup.import_team_empty` ("Save a charter in Team Identity first") becomes
  "No Team Identity charter on this device yet".
- README.md:46: remove the kanban-board param mention.

## Tests

- Add tests for the three new readers.
- Remove the deeplink parser tests. Keep the `joinPin` tests.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
