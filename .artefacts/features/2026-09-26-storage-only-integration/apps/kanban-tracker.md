# Kanban Tracker — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

Rule: apps never link to each other. They exchange data only through
shared-origin localStorage, and each app shows other apps' data itself.
This repo is in **Wave 2**, an extra-small change.

## Links to remove (1)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/ImportPanel.tsx:11,18-31` (empty state only) | "Design one in Kanban Designer" | kanban-designer | No. This app already imports from `kanban-designer-boards` (`designerImport.ts:36`) |

Replace the link with plain text: "No Kanban Designer boards on this device
yet." Then delete `import.designLink` in all four locales, or reword it.

## Dead receiver to delete

- Delete `parsePrefillBoard` (`boardImport.ts:37-46`) and its use at
  `App.tsx:20-23`. No app in the suite sends `?prefill=` here; its own
  comment says "a future link". Delete its tests too.
- Keep `parseBoardFromHash` (`#board=`), since that format is also used for
  user-shared board links.

## Tests

- Remove the prefill tests.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
