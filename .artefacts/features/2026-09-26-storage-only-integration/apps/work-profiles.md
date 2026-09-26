# Work Profiles — storage-only integration

Suite plan: `agile-toolkit/.github` →
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

The rule: apps never link to each other. They exchange data only through
shared-origin localStorage, and each app surfaces other apps' data itself.
This repo is in **Wave 1**.

## Outbound links

None.

## Receiver to change

Today Moving Motivators pushes data into this app two ways when its "Export
to Work Profiles" button is clicked:

- it adds `?motivators=` to the URL;
- it writes into **this app's** namespace, `work-profiles:motivatorSnapshot`.

Moving Motivators is removing both.

Change:

1. `utils/motivatorHandoff.ts` `readMotivatorSnapshot` should read
   **`moving-motivators:lastSession`** instead. It carries `date`, `ranked`
   and `topMotivators`, so the existing banner in `ProfilesView.tsx:484-502`
   ("new profile" / "attach to profile") and the staleness check (`:54-59`)
   keep working unchanged. The fixture comes from moving-motivators'
   `sessionEntry.ts`.
2. Replace "clear on use" with a dismissal marker under this app's own
   prefix: `work-profiles:motivatorsSeenAt = <savedAt>`. The source key
   belongs to Moving Motivators and must never be removed.
3. Delete `parseMotivatorsParam` (`motivatorHandoff.ts:21-29`), the param
   branch in `ProfilesView.tsx:75-82`, and its tests. Update the header
   comment at `motivatorHandoff.ts:1-7`.
4. Migration: when the legacy `work-profiles:motivatorSnapshot` exists,
   remove it once. It is this app's own prefix, so this is safe.

## Copy

`motivators_stale` ("Consider running a fresh Moving Motivators session
first") is optional to reword. It names the data, not a route, so it can
stay.

## Tests

- Reader test using Moving Motivators' `lastSession` shape.
- Dismissal-marker test.
- Adopt `src/__tests__/no-cross-app-links.test.ts`.
