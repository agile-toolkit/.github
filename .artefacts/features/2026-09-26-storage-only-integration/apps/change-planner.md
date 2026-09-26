# Change Planner — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

**Rule:** no links to sibling apps. Apps exchange data only through
shared-origin localStorage, and each app surfaces other apps' data itself.

**Wave 1:** the new MM banner is what lets moving-motivators drop its link.

## Links to remove (1)

| # | Where | What | Target | Data lost? |
|---|---|---|---|---|
| 1 | `components/StakeholderProfilePanel.tsx:7,109-116` | "Open Moving Motivators" | moving-motivators | No. The "Prefill from Moving Motivators" button (`:181-187`) already reads `moving-motivators:lastSession` |

**Copy to reword in en/es/ru/be** so it no longer tells the user to navigate:

- `mind_profiles.open_mm_hint` (drop the `mind_profiles.open_mm` link label).
- `import_board.empty_desc` ("Open the Improvement Board app…"). New wording:
  "No Improvement Board items on this device yet".

`progress.copy_retro_hint` copies to the clipboard. It is not a link, so keep it.

## URL receivers to replace/delete

| Param | Sender | After |
|---|---|---|
| `?mm_snapshot=` (`utils/crossAppImport.ts:47-83`, `App.tsx:247-254`) | moving-motivators | Replace with the banner below. Then delete the parser and its tests (`crossAppImport.test.ts:18-116`). |
| `?prefill=&description=` (`crossAppImport.ts:125-138`) | improvement-board (its only sender) | Delete. "Import from Improvement Board" (`homeScreenLogic.ts:21`, `HomeScreen.tsx:59-82`) already covers this. Tests at `crossAppImport.test.ts:196,383` go too. |

Keep `#share=`. It is this app's own share link.

## Add

1. **"Create initiative from Moving Motivators session (date)" banner** on
   HomeScreen.
   - Reads `readMmLastSession()`.
   - Converts with a new `mmSessionToInitiative(session)`, extracted from the
     body of `parseMmSnapshotParam`, which also carries `motivatorContext`
     and the mind-facet note.
   - Follow the pattern of the salary pending-change banner (`App.tsx:58-60,
     257-267, 352-355`).
   - Dismissal marker: `change-planner:dismissedMmSession = <savedAt>`.
   - Never delete MM's key.
2. *(Deferred — D1 accepted the pick-from-list trade-off; not in this feature)* In the Improvement Board import modal,
   add a per-item "New initiative from this item" action. It restores the
   one-item → initiative shortcut that IB's link gave.

## Comments to update

- `App.tsx:241-247`
- `types.ts:73`
- `data/templates.ts:14`
- `MotivatorContextPanel.tsx:21`

These comments describe the URL handoff.

## Not in scope (suite decision D3)

A Planning Poker round trip via `change-planner:pendingEstimates` was never
wired up here. Planning Poker deletes its write. If estimates are wanted
back, a separate feature can add a reader of `planning-poker:history`.

## Tests

- `mmSessionToInitiative`: build the fixture from moving-motivators
  `sessionEntry.ts` and `ImpactLevel` (`positive|negative|neutral`), not
  from this repo's assumptions.
- Banner show/dismiss.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
