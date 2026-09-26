# Moving Motivators — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.
Rule: no links to sibling apps. Apps exchange data only through
shared-origin localStorage, and each app shows other apps' data itself.
**Wave 1.** Ship the IB picker in the same PR that removes `?change=`.

## Links and writes to remove (3 links, 1 foreign write)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/ResultsView.tsx:460,474-483,520-523,637-642` | "Assess in Change Planner" (`?mm_snapshot=`) | change-planner | No: CP will build initiatives from `moving-motivators:lastSession` (CP plan) |
| 2 | `ResultsView.tsx:461,463-472,525-528,643-648` | "Export to Work Profiles" (`?motivators=`), **plus a write into `work-profiles:motivatorSnapshot`** | work-profiles | No: WP will read `moving-motivators:lastSession` (WP plan) |
| 3 | `components/TeamSession.tsx:348-356,451-460` | "Send to Sprint Metrics" (`?mm=`) | sprint-metrics | No. SM never parsed `?mm=`. It can read `moving-motivators:motivationSnapshot` (SM plan, optional) |

## Delete

- `CHANGE_PLANNER_URL`, `WORK_PROFILES_URL`, `buildMmSnapshot`,
  `buildWorkProfilesSnapshot`, both handlers and both buttons.
- `handleSendToSprintMetrics` and its button.
- Icon imports that no longer have a use.
- The `work-profiles:motivatorSnapshot` write. It is a foreign namespace.
- `readChangeParam` (`App.tsx:33-40,64`). Improvement Board is the only
  sender of `?change=`.
- Orphaned i18n keys (en/es/ru/be): `results.exportToChangePlanner`,
  `results.exportToWorkProfiles`, `team.sendToSprintMetrics`.
- README (around lines 127 and 140): replace the handoff descriptions with
  the published-keys list.

## Keep

- `?join=`. It is this app's own live-session link.
- `moving-motivators:lastSession`. It is written on every solo result.
- `moving-motivators:motivationSnapshot`. It is written on every team reveal.

Both keys already carry everything the removed links sent, so no producer
change is needed.

## Add (receiver)

- **"Pick the change from Improvement Board."** This replaces IB's
  `?change=<title>`.
  - Next to the change text field, add a picker that lists open items from
    `improvement-board-items`.
  - Take the item shape from improvement-board's `types.ts`.
  - Guard the shape: parse it to `unknown` and check `title`/`status`.

## Tests

- New test for the IB items reader, using a fixture from IB's types.
- Remove any `readChangeParam` coverage.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
