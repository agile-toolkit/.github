# Team Identity — storage-only integration

The suite-wide plan is in `agile-toolkit/.github`, at
`.artefacts/features/2026-09-26-storage-only-integration/remediation-plan.md`.

The rule: apps never link to each other. They exchange data only through
shared-origin localStorage, and each app surfaces other apps' data itself.

## Audit result: compliant

- **No outbound links.** The only link is `DASHBOARD_URL`, and `#charter=` is
  the app's own share link.
- **No URL receivers.**
- **Publishes** `team-identity-charter`, `team-identity:lastSession` and
  `agile-toolkit:activeTeam` on charter save.
- **Reads** `work-profiles-data` and `moving-motivators:lastSession` through
  import banners. This is the reference pattern the other apps are moving to.

Salary Formula and Sprint Metrics currently link *to* this app. They remove
those links in their own plans, and nothing changes here.

## Only change

Adopt `src/__tests__/no-cross-app-links.test.ts` from the design system so
that this stays true.
