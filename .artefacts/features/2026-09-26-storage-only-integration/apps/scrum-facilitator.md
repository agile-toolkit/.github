# Scrum Facilitator: storage-only integration

The suite-wide plan lives in `agile-toolkit/.github` at
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

**The rule:** apps never link to each other. They exchange data only through
shared-origin localStorage, and each app shows other apps' data itself.

**Wave 2. Ship only after sprint-metrics can read review ceremonies from
`scrum-facilitator-history`.** Until then, removing the direct write below
would drop review → sprint entries.

## Links and writes to remove (5 links + 1 foreign write)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/ExportView.tsx:141-152,160-162` | Button: "Export to Sprint Metrics". Calls `window.open` and **writes into `sprint-metrics-projects` / `sprint-metrics-sprints`** through `utils/sprintMetricsHandoff.ts:44-93` `appendSprintEntryToSprintMetrics` | sprint-metrics | No, once sprint-metrics reads `scrum-facilitator-history` |
| 2 | `ExportView.tsx:165-173` | Link: "Open Improvement Board →" (daily impediments) | improvement-board | No, once IB offers daily impediments from `scrum-facilitator-session` / `-history` |
| 3 | `components/CeremonyComplete.tsx:52-59` | Same link as #2 | improvement-board | Same as #2 |
| 4 | `components/CeremonyRunner.tsx:400-407` | Link: "Open Planning Poker →" with `?participants=` | planning-poker | No, once poker imports participants from `scrum-facilitator-session` |
| 5 | `CeremonyRunner.tsx:410-417` | Bare link: "Open Planning Poker" | planning-poker | No |

## Delete

- In `ExportView.tsx`: `SPRINT_METRICS_URL`, `IMPROVEMENT_BOARD_URL`,
  `exportToSprintMetrics`, the review-only button and the `smExported` toast.
- The `<a>` in `CeremonyComplete.tsx`.
- In `CeremonyRunner.tsx`: change the poker banner (`:391-420`) to plain text,
  or delete it. The recommendation is text: "Participants are available to
  Planning Poker on this device."
- In `utils/sprintMetricsHandoff.ts`:
  - `appendSprintEntryToSprintMetrics` and its tests.
  - `parseCeremonyParam` and its tests.
  - The `?ceremony=` handling at `App.tsx:53-58`.
  - **Keep `readLastSprintSession`.**
- Orphaned i18n keys, in all four locales (en/es/ru/be):
  - `daily.openImprovementBoard`
  - `export.sprintMetrics`
  - `export.sprintMetricsToast`
  - `poker.open`
  - `poker.noParticipants`
  - `poker.bannerTitle` and `poker.bannerDesc`, but only if the banner is
    deleted rather than kept as text.

## Add

- A **retro suggestion banner on Home.** It replaces Sprint Metrics'
  `?ceremony=retro` link. Use `readLastSprintSession()`, which already exists.
  When the last sprint is newer than the last retro in
  `scrum-facilitator-history`, show "Sprint <name> finished — start a
  retrospective" with a button that starts a retro in this app. Store the
  dismissal marker under `scrum-facilitator:`.

## Producer check

- Confirm that review-ceremony entries in `scrum-facilitator-history` hold
  what Sprint Metrics needs for a sprint row (date, and planned/completed if
  captured).
- If a field is missing, add it to the history entry in this PR. Do not add
  it to a write into Sprint Metrics' keys.

## Tests

- Remove the tests for `appendSprintEntryToSprintMetrics` and
  `parseCeremonyParam`.
- Add a test for the retro-suggest condition.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
