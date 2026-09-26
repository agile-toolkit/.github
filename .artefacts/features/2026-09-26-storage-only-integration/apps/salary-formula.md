# Salary Formula — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

The rule: apps never link to each other. They exchange data only through
shared-origin localStorage, and each app surfaces other apps' data itself.
This repo is **Wave 2**, and it needs no receivers elsewhere.

## Links to remove (3)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/FormulaBuilder.tsx:9,262-273` | "Open Change Planner" after a logged change | change-planner | No. `salary-formula:pendingChangeRecord` is already read by Change Planner's banner |
| 2 | `components/SalaryCalculator.tsx:10,241-250` | "no data" hint linking to Work Profiles | work-profiles | No (this app reads `wp-profiles-export`) |
| 3 | `SalaryCalculator.tsx:11,304-313` | "no data" hint linking to Team Identity | team-identity | No (this app reads `team-identity-charter`) |

## Changes

- Delete the `CHANGE_PLANNER_URL`, `WORK_PROFILES_URL` and
  `TEAM_IDENTITY_URL` constants, along with their anchors.
- Render the `wpNoData` and `tiNoData` hints as plain text.
- Reword the following strings in en/es/ru/be:
  - `scenario.change_logged` → "Logged: it will appear in Change Planner on
    this device."
  - `calculator.wp_no_data` → "No Work Profiles data on this device yet."
  - `calculator.ti_no_data` → "No Team Identity charter on this device yet."
- Delete the orphaned i18n key `scenario.open_change_planner`.
- No producer change.
- The `#formula` share hash stays, since it is this app's own share link.

## Tests

- No existing tests reference these links.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
