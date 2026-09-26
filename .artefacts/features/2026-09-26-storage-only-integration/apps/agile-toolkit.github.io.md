# Dashboard: storage-only integration

The suite plan lives in `agile-toolkit/.github` at
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.
Its rule: apps never link to one another. They exchange data only through
shared-origin localStorage, each app surfaces the other apps' data itself,
and **the Dashboard is the only navigator**.

## Audit result

The app cards in `src/apps.ts:22-102` are plain links. They carry no query
or hash payloads. That is legitimate, because navigation is the Dashboard's
job. No link removals are needed.

## Work in this repo (Wave 3; the guard can land first)

1. **Guard test for the design system.** Add
   `design-system/components/no-cross-app-links.test.ts`, meant to be
   copied into each app as `src/__tests__/no-cross-app-links.test.ts`.
   - It reads every non-test file under `src/` and fails on:
     - `agile-toolkit\.github\.io/<segment>`, where anything other than the
       Dashboard root counts;
     - `\.\./(<11 app ids>)/`;
     - `localStorage.setItem('<literal>'`, when the literal's prefix belongs
       to another app.
   - The prefix table is inlined from `APP_KEY_GROUPS`, with a comment
     pointing back to `data-keys.ts`.
   - The test needs an allowlist parameter for the owning app's own id.
   - Register it in `check-drift.mjs` `COPYABLE_COMPONENTS`. The script's
     `APPS` list is also missing `kanban-tracker`; add it.
2. **Published-contract registry.** Add a `PUBLISHED_KEYS` table to
   `data-keys.ts` listing, for each contract key: owner, one-line shape, and
   known readers (copy the "Contract keys" table from the suite plan). This
   is documentation plus a test that every entry is claimed by its owner's
   prefix. It is the first step of ARCHITECTURE.md recommendation #3, "one
   shared, tested module for cross-app contracts".
3. **Legacy cleanup note.** After the apps land, three handoff keys are no
   longer written:
   - `work-profiles:motivatorSnapshot`
   - `change-planner:pendingEstimates`
   - `sprint-metrics:motivatorSnapshot`, which nothing writes today

   They still sit in users' storage and in workspace snapshots. The owning
   apps delete their own stale key. The Dashboard does nothing.

## Tests

- Unit-test the guard itself against fixtures: one violating file and one
  clean file.
- The `PUBLISHED_KEYS` ownership test.
