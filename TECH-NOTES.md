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
