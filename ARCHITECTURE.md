# Agile Toolkit — Architecture Review

Reviewed 2026-09-03 against all twelve repositories at their `main` heads.
Ratings are **GREEN** (solid) / **YELLOW** (workable, has risks) /
**RED** (needs immediate attention), given as *found* → *after this pass*.

Companion documents: `GOALS.md` (human-authored, outcomes) and
`TECH-NOTES.md` (agent-maintained, cross-cutting patterns). This file is the
architectural picture and the standing assessment.

---

## 1. The system

Eleven single-page applications plus a dashboard, each in its own repository,
each built with **React 18 · TypeScript · Vite · Tailwind · react-i18next**
(EN/ES/RU/BE), each deployed to **GitHub Pages** by an identical Actions
workflow. There is no server, no account and no database that the project
operates — a deliberate constraint from `GOALS.md`, not an accident of
scale.

### Components

| Layer | What it is | Where it lives |
|---|---|---|
| **Apps** | 11 independent SPAs, ~1.9k–5.2k LOC each | one repo each |
| **Dashboard** | Reads every app's storage, renders activity cards, owns backup/export and workspaces | `agile-toolkit.github.io` |
| **Design system** | Copy-paste component sources + `check-drift.mjs` | `agile-toolkit.github.io/design-system/` |
| **Key registry** | Which localStorage prefix belongs to which app | `agile-toolkit.github.io/src/data-keys.ts` |
| **Live sessions** | Firebase Realtime Database, one project, two apps | Planning Poker, Moving Motivators |
| **Security rules** | The entire access-control model for that database | `.github/firebase/` *(new)* |
| **Platform docs** | Goals, tech notes, agent state, this file | `.github` |

### The single architectural decision everything rests on

Every app is served from **one origin** — `agile-toolkit.github.io/<app>/` —
so they share one `localStorage`. That is the whole integration layer. It is
why the suite can offer cross-app data flow with no backend, no login and no
CORS, and it is the reason `GOALS.md` can claim "the pieces already share a
browser" as the platform's advantage.

It is a genuinely good decision. It also means the origin's ~5 MB budget is
shared by twelve applications, that any app can read or overwrite any other's
data, and that a corrupt value written by one app is a crash in another. Most
of the findings below are downstream of that trade.

### Data flows

```
                        ┌─────────────────────────────┐
   URL query params ───►│                             │
   (?prefill=, ?join=,  │   one origin, one           │◄─── URL hash
    ?mm_snapshot=…)     │   localStorage              │     (#board=, #charter=)
                        │                             │
   ┌────────────────────┤  team-identity-charter      ├───────────────────┐
   │                    │  agile-toolkit:activeTeam   │                   │
   │  11 apps read ─────┤  <app>:lastSession          ├──── Dashboard     │
   │  and write ────────┤  <app>-<entity>             │     reads all     │
   │                    │  agile-toolkit:workspaces   │                   │
   └────────────────────┴─────────────────────────────┴───────────────────┘
                                     │
                                     │  Planning Poker · Moving Motivators only
                                     ▼
                        ┌─────────────────────────────┐
                        │  Firebase Realtime Database │
                        │  sessions/<app>/<6-digit>   │
                        │  names · votes · rankings   │
                        └─────────────────────────────┘
```

Three distinct channels, with different trust properties:

1. **Shared-origin localStorage** — ambient, the main channel. A writer drops
   a payload; a reader picks it up whenever it next loads.
2. **URL query/hash params** — one-shot handoffs on an explicit "Open in X"
   click. *Attacker-controllable*: anyone can send a link.
3. **Firebase Realtime Database** — the only network state, for live team
   sessions. Reachable by anyone who guesses a PIN.

---

## 2. Ratings

| Area | Found | After |
|---|---|---|
| 1. Requirements fit | 🟡 YELLOW | 🟢 GREEN |
| 2. Scalability | 🔴 RED | 🟢 GREEN |
| 3. Reliability | 🔴 RED | 🟢 GREEN |
| 4. Security | 🔴 RED | 🟡 YELLOW *(one step needs a human)* |
| 5. Cost efficiency | 🟢 GREEN | 🟢 GREEN |
| 6. Platform alignment | 🔴 RED | 🟡 YELLOW *(needs product work, not repair)* |

---

### 1. Requirements fit — YELLOW → GREEN

The stated requirements are met: no login, no backend, URL-shareable, offline
where it matters (4 apps ship as PWAs), eleven apps live and deployed.

**Gap found — the workspace primitive did not work.** `GOALS.md` gives the
Dashboard the job of owning "the workspace primitive that everything else
syncs around", and the multi-team story is the first paid tier. The
implementation had three defects that each silently destroyed a team's data.
Detailed under Reliability; all three are fixed and covered by tests.

**Gap found — the shared team object was barely adopted.** Covered under
Platform alignment.

**Gap found — no reviewable security model.** Covered under Security.

---

### 2. Scalability — RED → GREEN

**Static hosting: GREEN at any multiple.** Eleven static bundles on a CDN.
10× and 100× traffic cost nothing and require no change. This is the right
architecture for the load.

**Firebase live sessions: was RED.** Three compounding problems.

*PIN collision.* Both apps minted a PIN with
`Math.floor(1000 + Math.random() * 9000)` — 9,000 values — and wrote it with
`set()` **without checking whether it was taken**. A collision did not fail;
it silently overwrote a live session, dropping a team mid-vote.

*Shared namespace.* Worse, both apps wrote to `sessions/<pin>` in **the same
Firebase project** (both deploy workflows inject the same org-level
`VITE_FIREBASE_*` secrets). The 9,000 PINs were shared between two apps with
incompatible schemas, so a Planning Poker host could destroy a live Moving
Motivators session and vice versa.

*No cleanup.* No session was ever deleted. The database grew without bound
and the PIN space saturated permanently: after 9,000 sessions in the project's
lifetime, every new host was overwriting something.

Fixed in `src/session.ts` in both apps:

- **900,000 PINs** from `crypto.getRandomValues` with rejection sampling
  (`% 900000` alone biases the low end, and a biased generator collides more).
- **`claimSession` checks before it writes** and retries, then fails fast
  rather than hammering a saturated namespace.
- **Namespaced per app** — `sessions/planning-poker/<pin>`,
  `sessions/moving-motivators/<pin>` — so the two can no longer collide at all.
- **24-hour TTL**, enforced in the security rules and honoured on the client,
  after which a PIN is reclaimable. This is what bounds database growth.
- **Sessions are released** when the host ends one, returning the PIN
  immediately.

**The remaining ceiling is the Firebase Spark tier: 100 concurrent connections
across the whole project.** Comfortable for a 5–9 person team. Not comfortable
for a multi-team PI Planning day, and the failure mode is silent — late
joiners simply do not connect. This is a *plan* limit, not an architecture
limit; `TECH-NOTES.md` already records the WebRTC alternative and the correct
verdict (don't adopt speculatively — a peer-to-peer star topology just moves
the cap onto the host's uplink and adds a new single point of failure).
**Recommendation: upgrade the Firebase plan when a real session hits it; do
not re-architect.**

**localStorage: was the sharper limit.** Each workspace snapshot is a full
copy of every app's data inside a ~5 MB origin budget, so N workspaces cost
roughly N×. Quota failures were swallowed per key, producing silent partial
writes. Now `saveInto` throws `WorkspaceQuotaError` and the UI says so.

---

### 3. Reliability — RED → GREEN

**No error boundary existed in any of the twelve apps.** On its own that is a
polish issue. Combined with the next finding it was the suite's most likely
user-visible failure.

**Cross-app payloads were parsed with `JSON.parse(raw) as SomeType` at 27
sites** — a cast, which checks nothing at runtime. The payload's author is a
*different repository* that is free to change its schema, and
`TECH-NOTES.md` already records **eight shipped bugs** of exactly this shape
(wrong key name, wrong payload shape, wrong enum literals, a write to a key
the receiver had migrated away from). When such a payload is dereferenced —
`session.ranked.slice(0, 3)` — it throws during render, React unmounts the
tree, and the user gets a blank page. **Reloading does not help, because the
bad data is still in localStorage.** The app is bricked until someone opens
devtools.

Fixed:

- **`ErrorBoundary` in all 12 apps**, wired at the root of every `main.tsx`.
  Its fallback offers the action that actually recovers — *clear this app's
  saved data* — scoped by the app's own key prefixes, so recovering one app
  never destroys a neighbour's data on the shared origin. It is deliberately
  dependency-free (a boundary that needs the app's modules to have initialised
  is no use when initialisation is what failed) and carries its own four-locale
  string table.
- **Runtime guards at the highest-risk boundaries** — Change Planner's
  Moving-Motivators and Salary-Formula readers, Sprint Metrics' `tryParse`
  (which validated JSON *syntax* and nothing else, then indexed `stored[0].id`
  before first paint), the Dashboard's backup parser, and Moving Motivators'
  session-history append.
- **Size caps on URL-borne payloads**, and PIN parameters constrained to digits
  before they are interpolated into a database path.

**The test suite was not gating anything.** 301 passing tests existed across
the suite, and CI ran them in **one repository of eleven**. Every other
`deploy.yml` went `npm ci` → `npm run build` → publish. A test could fail for
months without anyone noticing, and the whole `.artefacts/` agent pipeline
insists "nothing ships without passing Bahnik" while the pipeline that
actually ships shipped regardless. All eleven workflows now run `npm test`
before `npm run build`. The Dashboard also used `npm install` rather than
`npm ci`, resolving dependencies afresh on every deploy — it was the only
workflow ignoring its own lockfile.

**Workspace switching lost entire teams' data, three ways.** The Dashboard's
workspace control is the multi-team story and the first paid tier:

1. **The dropdown did not switch anything.** `handleSwitchWorkspace` wrote the
   active *name* and nothing else. The data on screen stayed put — so pressing
   **Save** afterwards wrote the *previous* team's data into the workspace you
   had just switched to, destroying it. Silent, total, unrecoverable.
2. **Restoring never cleared.** `restoreSnapshot` wrote the snapshot's keys
   over the top, leaving every key the incoming workspace had no entry for.
   Team A's improvement board appeared in Team B's workspace.
3. **"New workspace" inherited the current one**, so a new team started as a
   copy of the last one.

The storage layer is now extracted to `src/workspaces.ts` and covered by 18
tests that pin all three behaviours. Switching checkpoints the outgoing
workspace and loads the incoming one; restoring clears first; deleting the
active workspace moves the live data to the fallback.

**Two keys were invisible to the whole data layer.** `wp-sprint-capacity`
(real sprint-capacity data) and `mm_about_dismissed` matched no registered
prefix in `data-keys.ts`, so `claimedByApp` returned `null` and both were
silently excluded from backup, from export, and from every workspace snapshot.
Prefixes corrected, with a test asserting every app group matches at least one
real key.

**Single points of failure that remain, and are accepted:** one GitHub Pages
account, one Firebase project. Both follow directly from "no backend the agent
operates". Static hosting failure is CDN-wide and rare; a Firebase outage
disables live sessions while leaving all eleven apps fully usable, because
`isFirebaseConfigured()` gates the feature rather than the app. That is the
right blast radius.

---

### 4. Security — RED → YELLOW

**The Realtime Database security rules were not in version control anywhere.**
No `database.rules.json`, no `firebase.json`, in any of the twelve repos. The
rules are the *entire* access-control model — the suite has no accounts and no
server — and they existed only as whatever someone had typed into the Firebase
console. Nothing reviewable, nothing testable, no way to know whether the
database holding participants' names was world-writable.

`.github/firebase/database.rules.json` now exists and enforces:

| | |
|---|---|
| Namespacing | `sessions/<app>/<pin>`, so the two apps cannot collide |
| PIN shape | exactly six digits, denied at the path level |
| No enumeration | `sessions` and `sessions/<app>` are unreadable; only a full correct PIN resolves |
| Schema | every field typed; every undeclared field rejected, so a session cannot be used as free storage |
| Size caps | names ≤ 40, story titles ≤ 200, votes ≤ 16, change text ≤ 500 |
| Enums | phases, decks, motivator ids and impact levels matched against the apps' own TypeScript unions |
| Server-set `createdAt` | must equal server time on create, immutable after — no immortal sessions |
| 24-hour TTL | reads and writes denied past it; expired PINs reclaimable |

**These rules are tested, not hoped for.** `rules.test.mjs` runs 21 cases
against a real Realtime Database emulator — both apps' actual client write
sequences, plus the abuse cases. All pass. A rules mistake fails closed and
takes the live feature down for everyone, so "it parsed" is not a standard.

**Data-flow security.** No XSS surface found: no `innerHTML`, no
`dangerouslySetInnerHTML`, no `eval`, no `new Function` anywhere in the suite;
React's escaping does the work. Cross-app URL payloads are now size-capped and
shape-checked. The Dashboard's backup import already filtered to
registry-claimed keys — that was done right.

**Personal data.** Live sessions store participants' real names. They now
expire in 24 hours and are deleted when a host ends a session; before this pass
they were retained forever with no delete path, in a database with no
reviewable rules. That was the most serious finding in this review and it is
the one most worth re-checking after the rules are actually deployed.

**Why this is YELLOW and not GREEN.** The rules deliberately do **not** require
`auth != null`. Adding it would break the live feature the moment it deployed
unless Anonymous Auth is enabled in the Firebase console first — a console
change no agent can make or verify. So, stated plainly:

> **Anyone holding a PIN has full control of that session**, including
> overwriting others' votes and removing participants. There is no
> authorization model, only a shared secret.

That is roughly the trust model of a meeting link, and with a 6-digit PIN and a
24-hour TTL the exposure is one team's estimates for one day. It is not
adequate if sessions ever carry anything more sensitive.

**Two human steps close this out** — both documented with the exact diff in
`.github/firebase/README.md`:

1. `firebase deploy --only database` to make these rules the live ones. Until
   someone runs it, this file describes the *intended* model and the console
   still describes the real one.
2. Enable Anonymous Auth, then gate every rule on `auth.uid` and restrict
   host-only actions to `hostId === auth.uid`. Step 2 is what turns
   "authenticated" into "authorized"; it is the only remaining architectural
   security gap.

Production sourcemaps are published for all eleven apps. For an open-source
client-side suite this leaks nothing — the source is public — so it is left
alone.

---

### 5. Cost efficiency — GREEN

Nothing here is overengineered. Static hosting is free, the Firebase Spark
tier is free, and nine of eleven apps need no network state at all. There is no
Kubernetes, no queue, no ORM, no service mesh — no infrastructure whose
absence anyone would notice. For the current scale this is close to ideal, and
it is worth saying so explicitly: the temptation with a suite this size is to
add a backend it does not need.

Two efficiency findings, both addressed:

**The Firebase SDK shipped to everyone.** Planning Poker and Moving Motivators
imported `firebase.ts` from their entry chunk, so all ~450 kB reached every
visitor — including the large majority who never open a team session. Split the
config-only gate (`firebaseConfig.ts`, no SDK import) from the SDK usage, and
lazy-loaded `TeamSession`. `html2canvas` (~200 kB, used only by "save as
image") got the same treatment.

| | Entry chunk before | after |
|---|---|---|
| Planning Poker | 195 kB gz | **87 kB gz** |
| Moving Motivators | 230 kB gz | **119 kB gz** |

**Duplication is the real ongoing cost, and it is maintenance, not runtime.**
Eleven copies of `ThemeToggle.tsx`, two of `firebase.ts`, a copy-paste design
system. `check-drift.mjs` exists to surface it and `ErrorBoundary.tsx` is now
registered with it. A real package would close the gap properly; `TECH-NOTES.md`
records why that was deliberately deferred (a build-system change in twelve
repos and a registry this suite does not have), and that reasoning still
holds. **Revisit only if drift keeps recurring now that the script exists.**

Sprint Metrics' 255 kB gz entry chunk is the largest in the suite by a wide
margin — `recharts`. Worth a lazy split on the same pattern if it ever matters;
it is not urgent.

---

### 6. Platform alignment — RED → YELLOW

`GOALS.md` is unambiguous: *"Eleven tools are not the product. One platform
is… What holds it together is a shared team object — one team's identity,
people, capacity and history, written once and readable everywhere."*

**That object was written by two apps out of eleven.** `agile-toolkit:activeTeam`
was read/written by Moving Motivators and read by the Dashboard. **Team
Identity — the app whose entire stated role is to produce the team object —
did not write it.** The Dashboard papered over this by inferring a team name
from `team-identity-charter` on a 5-second poll. Which introduced a second
bug: the inference was unconditional, so a team name set in Moving Motivators
was silently reverted within five seconds.

Meanwhile nine apps each keep their own private notion of a team
(`scrum-facilitator-team-name`, a `teamName` field in a charter, a PIN used as
a label), and the cross-app links between them are hand-rolled pair by pair —
which is precisely why `TECH-NOTES.md`'s audit log of broken integrations is as
long as it is. Every pair re-invents a key name and a payload shape, and
nothing checks that the two ends agree.

Fixed in this pass:

- **Team Identity now writes `agile-toolkit:activeTeam`** when a charter is
  saved — the producer finally publishes the contract, so consumers have
  something to adopt.
- **The Dashboard's inference is now a one-time backfill** for charters that
  predate this, and no longer fights another app's write.
- Covered by 9 tests on the producer side.

**Why this stays YELLOW.** The plumbing is now correct but adoption is not
finished: nine apps still ask for their own team name instead of reading the
shared one. That is product work — each app needs a decision about what to do
when the shared name disagrees with its local one — not architectural repair,
and it should not be done silently by a review pass. It is the highest-leverage
platform work available, because `GOALS.md` names platform depth as the
leading indicator and "teams using 3+ tools" is what the paid tier is sold on.

**Recommended next, in order:**

1. Deploy the security rules (`.github/firebase/README.md`), then enable
   Anonymous Auth and tighten them. This is the only open RED-adjacent item.
2. Adopt `readActiveTeam()` in the nine remaining apps, one per repo, replacing
   each private team-name prompt.
3. Give the cross-app contracts one shared, tested module rather than a
   hand-rolled reader per pair — the same treatment `data-keys.ts` gave key
   ownership. Eight shipped bugs is enough evidence.

---

## 3. What changed in this pass

397 tests pass across the twelve repositories (up from 301); all twelve build
clean.

| Repo | Change |
|---|---|
| `.github` | Firebase security rules + 21 emulator-backed tests + deploy runbook; this file |
| `planning-poker` | `session.ts` (PIN claim, namespacing, TTL, release); code-split Firebase + html2canvas; PIN param validated |
| `moving-motivators` | same session hardening; join now verifies the session exists; code-split; guarded history append |
| `agile-toolkit.github.io` | `workspaces.ts` extraction + 3 data-loss fixes; registry gaps closed; backup parser guarded; `activeTeam` backfill made conditional; workflow uses `npm ci` |
| `team-identity` | writes the shared team object |
| `sprint-metrics` | `tryParse` takes a shape guard; `initAppState` no longer throws before first paint |
| `change-planner` | cross-app readers validated; URL payloads capped |
| all 12 | `ErrorBoundary` at the root; `npm test` gates every deploy |
