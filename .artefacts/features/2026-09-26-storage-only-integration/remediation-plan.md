# Storage-only integration — suite remediation plan

**Date:** 2026-09-26 · **Scope:** all 11 apps + Dashboard · **Status:** plan approved (D1–D4 accepted), not started

## The problem

The suite's integration principle (`GOALS.md`: *"data each app can read from
the others"*; `ARCHITECTURE.md` §1: *"one origin, one localStorage — that is
the whole integration layer"*) is that apps never talk to each other directly.
Each app publishes its own data to the shared origin's `localStorage`; any
other app that finds that data surfaces it itself. Navigation between apps
belongs to the Dashboard alone.

Over time the apps grew **28 direct links to sibling apps** (8 of 11 apps
contain at least one). They split into three shapes:

| Shape | Count | Problem |
|---|---|---|
| **Payload link** — `?prefill=`, `?mm_snapshot=`, `?change=`, `?participants=`, `?kanban-board=`, `?motivators=`, `?ceremony=`, `?kanban=`, `?mm=` | 12 | A second, parallel integration channel. Point-to-point, attacker-controllable (anyone can send a link), and the reason `TECH-NOTES.md` logs 8 shipped "sender and receiver disagree" bugs. |
| **Bare navigation link** — "Open Improvement Board →" | 16 | Makes apps depend on each other's URLs and duplicates the Dashboard's job. |
| **Foreign-namespace write** — app A writes into app B's key prefix | 3 | Breaks key ownership: B's "clear this app's data", backup and workspace snapshot now own data B never wrote. |

The audit also found **dead code on both ends**, which is a further argument
for one channel:

- Receivers nothing sends to: planning-poker `?stories=` and
  `?source=change-planner`, kanban-tracker `?prefill=`, improvement-board's
  `utm_source=moving-motivators` / `utm_source=scrum-facilitator` banners.
- Senders nothing receives: kanban-designer `?kanban=` and
  moving-motivators `?mm=` (Sprint Metrics never parses either), and
  improvement-board `?prefill=` to Planning Poker.
- A write nothing reads: planning-poker writes
  `change-planner:pendingEstimates`, and no app reads it.

## Target rules

1. **No links to sibling apps.** The only cross-app URL an app may contain is
   `DASHBOARD_URL` in `AppHeader`. Self-share links (`#board=`, `#charter=`,
   `#share=`, formula hash, `?join=` / `?joinPin=` for live sessions) are
   user-to-user sharing within one app and stay.
2. **Publish continuously, in your own namespace.** A producer writes its
   shareable state on every save, never on a "send" click, and only under its
   own prefix from `data-keys.ts`.
3. **Receivers pull and surface.** A receiver shows an *"Import from X"*
   picker or a dismissible *"Found … from X"* banner. It stores its dismissal
   marker under **its own** prefix, and never deletes the producer's key.
4. **Parse as untrusted** (existing rule in `TECH-NOTES.md`): parse to
   `unknown`, guard the fields you dereference, and write fixtures from the
   producer's own types.
5. **Copy never navigates.** Text such as "Open the X app first" becomes
   neutral: "Nothing from X on this device yet".

## Contract keys after remediation

Every flow that exists today survives, and moves to one of these keys. All of
them are already written except where marked.

| Key (owner) | Written | Read by (after) |
|---|---|---|
| `moving-motivators:lastSession` | every solo results | change-planner *(new: create-initiative banner)*, work-profiles *(new: replaces `work-profiles:motivatorSnapshot`)*, team-identity, improvement-board, sprint-metrics |
| `moving-motivators:motivationSnapshot` | every team reveal | sprint-metrics *(new: preferred over solo when newer, D4)*, Dashboard |
| `improvement-board-items` | every edit | change-planner, work-profiles, sprint-metrics, kanban-designer *(new)*, planning-poker *(new)*, moving-motivators *(new)* |
| `kanban-designer:currentBoard` | every board save | sprint-metrics, work-profiles, planning-poker *(new)* |
| `kanban-designer-boards` | every edit | kanban-tracker |
| `scrum-facilitator-session` | every state change | planning-poker *(new: participants)*, improvement-board *(new: daily impediments)*, Dashboard |
| `scrum-facilitator-history` | ceremony complete | improvement-board, sprint-metrics *(new: review → sprint entry)* |
| `sprint-metrics:lastSession` | add sprint → *every sprint edit (change)* | scrum-facilitator *(new: retro-suggest banner)*, improvement-board *(new: velocity-drop suggestion)* |
| `salary-formula:pendingChangeRecord` | save with "log change" | change-planner (unchanged) |
| `team-identity-charter`, `agile-toolkit:activeTeam` | charter save | unchanged |
| `planning-poker:history` | session end | improvement-board (unchanged); change-planner *(optional, see D3)* |

**Foreign-namespace writes to retire:**

| Written by | Key | Replaced by |
|---|---|---|
| moving-motivators | `work-profiles:motivatorSnapshot` | work-profiles reads `moving-motivators:lastSession` |
| planning-poker | `change-planner:pendingEstimates` | delete (no reader); see D3 |
| scrum-facilitator | `sprint-metrics-projects` / `sprint-metrics-sprints` (append on click) | sprint-metrics reads `scrum-facilitator-history` |

## Per-repo plans

Per-repo plans are in `apps/<repo>.md` next to this file. A working copy
also sits in each repo's local `.artefacts/features/2026-09-26-storage-only-integration/`,
which is gitignored in most app repos.

| Repo | Remove links | New receivers | Parsers to delete | Size |
|---|---|---|---|---|
| improvement-board | 8 (4 link utils, 3 banners, footer) | sprint-metrics decline, SF daily impediments | `?prefill` / `utm_source` | L |
| sprint-metrics | 5 | SF review → sprint | — | M |
| scrum-facilitator | 5 + 1 foreign write | SM retro-suggest banner | `?ceremony` | M |
| moving-motivators | 3 + 1 foreign write | IB change picker | `?change` | M |
| planning-poker | 0 + 1 foreign write | KD board, IB items, SF participants | `?kanban-board`, `?participants`, `?stories`, `?source` | M |
| change-planner | 1 | MM create-initiative banner | `?mm_snapshot`, `?prefill` | M |
| kanban-designer | 2 | IB → new board | `?prefill` | S |
| work-profiles | 0 | switch to `moving-motivators:lastSession` | `?motivators` | S |
| salary-formula | 3 | — | — | S |
| kanban-tracker | 1 | — | `?prefill` (dead) | XS |
| team-identity | 0 | — | — | guard only |
| agile-toolkit.github.io | 0 (app cards are the legit navigator) | — | — | guard + registry |
| .github | — | — | — | docs |

## Sequencing

Each repo deploys on its own, so the order matters in one place only: **a
receiver's storage import must ship no later than the sender's link
removal.** Otherwise a flow goes dark in between. Every producer key above is
already written continuously, with two exceptions, so almost every
repo can do its whole plan (add readers, remove links, delete parsers) in one
PR.

**Wave 1 — receivers that unlock sender removals**

- sprint-metrics (reads `scrum-facilitator-history`; also writes
  `lastSession` on every edit)
- planning-poker, change-planner, work-profiles, kanban-designer,
  moving-motivators

**Wave 2 — senders and the rest**

- scrum-facilitator. Must follow sprint-metrics: its direct write into
  sprint-metrics is the only flow without an existing storage twin.
- improvement-board, salary-formula, kanban-tracker

**Wave 3 — guard and docs**

- Dashboard: add `design-system/no-cross-app-links.test.ts`, distributed by
  copy like `ErrorBoundary`.
- `.github`: update `ARCHITECTURE.md` and `TECH-NOTES.md`.

Wave 3's guard can be written first and adopted per repo as each repo
lands its PR. That keeps the guard green from day one.

## The guard (so this doesn't regrow)

A copy-paste Vitest file, `src/__tests__/no-cross-app-links.test.ts`,
registered in `check-drift.mjs` `COPYABLE_COMPONENTS`. It reads every
non-test file under `src/` and fails on:

- `agile-toolkit\.github\.io/<anything>` other than the Dashboard root;
- `\.\./(<11 app ids>)/`;
- `localStorage.setItem(` with a literal key whose prefix `claimedByApp`
  resolves to a *different* app. The app-id → prefix table is inlined from
  `data-keys.ts`, since the test can't import across repos.

It runs under the existing `npm test` step, so every deploy is gated on it.

## Decisions (product, not mechanical) — all accepted 2026-09-26

- **D1 — One-click convenience lost.** Four payload links pre-filled a
  specific item: IB card → CP initiative, IB card → MM change, IB card →
  poker story, SM decline → IB item. Storage pull replaces this with "pick
  from list" in the receiver.
  *Accepted:* the receiver-side picker is one extra click and
  works without the sender being open.
- **D2 — Should nav hints name the Dashboard?** For example, "Open Scrum
  Facilitator from the Dashboard".
  *Accepted:* name the data ("Nothing from Scrum Facilitator on
  this device yet"), not the route.
- **D3 — Planning Poker ↔ Change Planner round trip.** The round trip was
  half-built and is dead on both ends.
  *Accepted:* delete it now. If wanted later, rebuild it as
  change-planner publishing `change-planner:storiesForEstimation` and
  reading `planning-poker:history` back, as its own feature.
- **D4 — Sprint Metrics motivator source.** Should the team snapshot win
  over the latest solo session?
  *Accepted:* yes when newer. In scope for sprint-metrics.

## Verification per repo (Bahnik)

- The guard test passes.
- The existing tests still pass, after deleting the tests of removed
  parsers and builders.
- Each new receiver has a test with a fixture typed from the *producer's*
  type file.
- Browser check: seed the producer key, open the receiver, and confirm the
  banner or picker shows and imports.
- Orphaned i18n keys are removed in all 4 locales (en/es/ru/be).
