# Agile Toolkit — Platform Tech Notes

Cross-cutting technical patterns and decisions that apply across repos.
Unlike `GOALS.md` (human-authored, names outcomes not mechanisms), this file
is agent-maintained and documents *how*, not *why*. Update it when a pattern
is adopted, reconsidered, or ruled out in more than one repo.

## Real-time multi-user sync

Two apps need live cross-device sync for a "team session": **Planning
Poker** (host/join by PIN, simultaneous voting, instant reveal) and
**Moving Motivators** (host/join by PIN, live ranking + assessment). Both
currently use the same mechanism.

### Current: Firebase Realtime Database

- **How it works:** each app's `src/firebase.ts` reads `VITE_FIREBASE_*`
  from the environment; `isFirebaseConfigured()` gates the feature off
  entirely (a disabled button + tooltip) when the config is absent, so
  solo/local use is never affected. `deploy.yml` passes the same
  `VITE_FIREBASE_*` repo/org secrets into the production build.
- **Why it was picked:** a session doc keyed by PIN, written by whoever
  acts, read by everyone in the room — exactly the BaaS model Firebase
  Realtime DB is built for. Near-zero app code for the sync layer itself
  (`getFirebaseDb()` plus `onValue`/`update` calls in `TeamSession.tsx`).
- **Cost of this choice:** requires a real Firebase project and its
  credentials to exist as GitHub Actions secrets — an external account
  only a human can create. Planning Poker shipped with `TeamSession.tsx`
  fully built but the deploy workflow never wired the secrets through, so
  team sessions were live in the codebase but dead on the live site for
  an unknown period until this was caught (2026-09-03) and fixed to match
  Moving Motivators' already-working deploy config.
- **Known limit:** the free "Spark" tier caps Realtime Database at 100
  simultaneous connections across the *whole project* (not per session).
  Fine for the 5–9 people a normal Scrum team's Planning Poker session
  has. Not fine if several concurrent sessions across teams — e.g. a
  multi-team PI/Increment Planning day — push the project past that cap
  at the same time; the failure mode is late joiners silently unable to
  connect, not a clean error.

### Alternative on record: WebRTC via PeerJS (no account)

Raised as a platform-level option (2026-09-03), specifically for the
large-group-session case (multi-team Increment/PI Planning) where a
single shared Firebase project's connection cap is the actual constraint,
and for any future app that wants live sync without asking for external
credentials at all.

- **How it would work:** PeerJS wraps WebRTC's data channels and, by
  default, uses its free public signaling/broker server (`0.peerjs.com`)
  purely to introduce peers to each other — no account, no API key. Once
  connected, session traffic (votes, rankings, reveals) flows
  browser-to-browser, not through any server the agent or the org
  operates — a clean fit for the platform boundary "no backend the agent
  operates."
- **Real trade-offs, not just upside:**
  - The public broker is explicitly **not** a production SLA per PeerJS's
    own docs — no uptime guarantee, can be slow or unavailable.
  - **Topology, not just "no server," is the actual scaling question.**
    Firebase's star-shaped fan-out (every client talks only to the
    server) is *better* suited to large groups than raw peer-to-peer:
    a naive P2P mesh costs each participant bandwidth/CPU that scales
    with the number of *other* participants, and a single-host star
    topology (the simpler PeerJS pattern) just moves the connection cap
    from "Firebase project" to "whoever is hosting's upload bandwidth" —
    plus a new single point of failure: host disconnects, session dies
    for everyone, unless a host-handoff is built.
  - True large-scale, resilient fan-out without a Firebase-style backend
    needs an SFU (Selective Forwarding Unit) relaying media/data between
    peers — which is itself server infrastructure, so it re-opens the
    "no backend the agent operates" question rather than avoiding it.
  - No free public TURN relay exists at the scale this would need; some
    participants behind strict corporate NATs simply won't connect
    without one.
  - Non-trivial rewrite: `TeamSession.tsx` in both apps is built around
    "read/write one shared doc," not "maintain N peer connections and
    reconcile state across them."
- **Verdict for now:** don't adopt speculatively. Firebase already works
  (confirmed working in production on Moving Motivators, now fixed on
  Planning Poker too) and is the better technical fit for small-team
  sessions and even most multi-team scale, right up to the Spark tier's
  100-connection ceiling. Reach for PeerJS/WebRTC specifically if/when:
  (a) that connection ceiling becomes a real, observed problem, e.g.
  during an actual multi-team PI Planning session, and upgrading the
  Firebase plan isn't the answer, or (b) a future app wants live sync but
  there is no appetite for asking the user to provision a Firebase
  project.

## Deploy secrets pattern

Any app that gates a feature behind `VITE_FIREBASE_*` (or similar)
env-only config must:
1. Ship the same env-var read pattern as `firebase.ts` in Moving
   Motivators / Planning Poker (`isFirebaseConfigured()` boolean gate,
   feature UI disabled with a tooltip when false, never a hard error).
2. Add the matching `env:` block to `.github/workflows/deploy.yml` so the
   *build* actually receives the secrets — code existing is not the same
   as the deploy pipeline passing its inputs through. This was the exact
   gap found and fixed in Planning Poker (2026-09-03): the feature was
   fully coded but permanently disabled in production because this one
   step was missing.
3. Ship `.env.example` documenting the required keys for local dev.

## Shared component drift (design-system/)

`agile-toolkit.github.io/design-system/components/` holds the source of
truth for UI pieces meant to appear in every app (`LanguagePicker.tsx`,
`AppHeader.tsx`, `ThemeToggle.tsx`, plus Dashboard-only ones). Adoption
is copy-paste (`components.md`: "copy into `src/components/` when
adding to an app") — there is no package/import boundary, so a fix made
in one app's copy, or a fix made only to the source, does not
automatically reach anywhere else.

This bit twice on 2026-09-03, both found from a single user report
("language switcher isn't dark in a lot of apps"):
- `LanguagePicker.tsx`'s **source** had zero `dark:` classes. 5 of 10
  apps had copied it before dark mode existed and never revisited it
  (light-only dropdown in dark mode); the other 5 had already
  independently patched their own copy, each landing on slightly
  different shades.
- `AppHeader.tsx`'s **source** was missing 3 `dark:` additions that
  every single one of the 10 apps had already independently made —
  the opposite failure mode: all the copies agreed with each other and
  disagreed with the source.

Fix applied: brought both source files to full `dark:` coverage
(cross-checked against whichever apps already had it right), then
re-copied `LanguagePicker.tsx` into all 10 apps verbatim so they're now
byte-identical to the source. `AppHeader.tsx` was left as-is in each
app (the residual per-app diffs are cosmetic class-order/shade
variance, or in Team Identity's case a deliberate documented prop
addition — not worth 10 more mechanical commits for zero user-visible
change).

**Structural fix**: added `design-system/check-drift.mjs` — diffs every
app's copy of each distributable component against the source and
reports MATCH / DRIFTED / not-adopted. Not wired into CI (this suite
has none); run it manually before/after touching a shared component, or
periodically as its own audit pass. It does not judge — a reported diff
can be a real bug (as above) or a deliberate override; component authors
still decide, the script just makes the candidates visible instead of
requiring someone to notice by accident (as happened here).

A real npm package (or git submodule) for `design-system/` would close
this gap at the tooling level instead of the honor system — considered
and deliberately not done: it would need a build-system change in all
11 repos and a private registry or workspace layout this suite doesn't
have. `check-drift.mjs` is the pragmatic middle ground; revisit the
package idea only if drift like this keeps recurring after the script
exists to catch it.

## Cross-app "Open in X" link audit (2026-09-03)

A user report ("these links don't actually pass data anywhere") plus
the explicit standing instruction that this class of bug is ours to
find, not the user's, triggered a suite-wide audit of every
`window.open`/`href` that points at another suite app. Finding: most
senders build a real payload (URL query param or a shared-origin
`localStorage` write); the receiver frequently never reads it — same
failure shape as the LanguagePicker/AppHeader drift above, but for data
flow instead of a shared component. Fixed as receiver in this pass:

- **change-planner** (v0.2.4): Moving Motivators' `?mm_snapshot=`,
  Improvement Board's `?prefill=`/`description=` convention, Salary
  Formula's `salary-formula:pendingChangeRecord`; also the reverse
  direction (Stakeholder Motivator Profiles pulling from Moving
  Motivators' `moving-motivators:lastSession`).
- **kanban-designer** (v0.2.4): Improvement Board's `?prefill=<JSON
  board>`, as a fallback to the app's own `#board=` hash import.
- **work-profiles** (v0.2.4): Moving Motivators' `?motivators=` /
  `work-profiles:motivatorSnapshot` (issue #57's core gap — left open
  for its fuller "attach to an existing profile" design).
- **planning-poker** (v0.2.6): Kanban Designer's `?kanban-board=`,
  Scrum Facilitator's `?participants=`.

**Not every flagged link was actually broken** — worth recording so it
isn't re-flagged. Kanban Designer's "Send to Sprint Metrics" button
(`?kanban=<base64 JSON>`) looks unread (Sprint Metrics has zero
`URLSearchParams` usage anywhere), but Sprint Metrics separately reads
`kanban-designer:currentBoard` — a *different*, already-working
same-origin localStorage key Kanban Designer keeps live on every board
edit — and gets the same `{todo, inProgress, done}` counts from it
(`readKanbanCfdCounts()` in `SprintDataView.tsx`). Since both channels
carry the same board and both apps share an origin, the query param
is redundant dead code, not a silent data-loss bug. Confirmed by
reading the actual receiver logic, not just grepping for
`URLSearchParams` — the grep alone would have (and initially did)
flagged this as broken.

**scrum-facilitator** (v0.2.5) turned up a second, more serious failure
shape worth naming separately: not "nobody reads this," but "writes to
a key nothing reads *anymore*." `ExportView.tsx`'s "Export to Sprint
Metrics" wrote to the legacy `sprint-metrics-sprints` key from Sprint
Metrics' pre-multi-project data model. Sprint Metrics' `initAppState()`
only ever consults that key when its new `sprint-metrics-projects` key
is completely empty — which is true for at most one page load ever,
since that same function creates and saves a default project
synchronously on first visit. So for any user who'd opened Sprint
Metrics even once before, the button showed a "Sprint added" success
toast while writing to a key that would never be read again — this
looks identical to "working" in manual testing unless you check what
the *receiver* actually does with old keys after a schema migration,
not just whether a write happens. Fixed to append into the active
project. Worth a pass over other apps' localStorage writes for the
same trap wherever a receiver has since migrated its own storage
schema. Same repo also received `?ceremony=<type>` (jump straight into
a ceremony) and `sprint-metrics:lastSession` (a dismissible "last
sprint" context banner during retro), neither read before.

Remaining from the same audit, not yet fixed: improvement-board
(`utils/kanbanLink.ts`/`changePlannerLink.ts` senders look fine —
still need the receiving apps' `utm_source` handling double-checked),
salary-formula (`FormulaBuilder.tsx` receiver side), moving-motivators
(`ResultsView.tsx`'s `ranked`/`topMotivators` field-name mismatch
noted during the earlier work-profiles pass — check before assuming
the sender payload is correct).
