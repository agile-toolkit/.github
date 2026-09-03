# Realtime Database security rules

`database.rules.json` is the **complete** access-control model for the suite's
live team sessions. There are no accounts, no server and no backend the agent
operates, so nothing else stands between a session and the open internet.

It lives here rather than in an app repo because **one** Firebase project
serves **both** Planning Poker and Moving Motivators (`deploy.yml` in each repo
passes the same org-level `VITE_FIREBASE_*` secrets), and a Realtime Database
takes exactly one ruleset. Two copies in two repos would be two chances to
deploy the older one.

## What the rules enforce

| | |
|---|---|
| **Namespacing** | `sessions/planning-poker/<pin>` and `sessions/moving-motivators/<pin>`. Before this the two apps shared `sessions/<pin>` in one project, so a PIN issued by one app could overwrite a live session in the other. |
| **PIN shape** | Exactly six digits. Anything else is denied at the path level. |
| **No enumeration** | `sessions` and `sessions/<app>` are unreadable; only a full, correct PIN resolves. The old ruleset (whatever was in the console) was never reviewable, so this could not be asserted at all. |
| **Schema** | Every field is typed and every undeclared field is rejected (`"$other": {".validate": false}`), so a session cannot be used as free storage. |
| **Size caps** | Names ≤ 40 chars, story titles ≤ 200, votes ≤ 16, change text ≤ 500. |
| **Enums** | Phases, deck types, motivator ids and impact levels are matched against the apps' own TypeScript unions. |
| **Server-set `createdAt`** | Must equal server time on create (clients send `serverTimestamp()`) and is immutable after. Clients cannot mint immortal sessions. |
| **24h TTL** | Reads and writes are denied once a session is older than a day, and an expired PIN is reclaimable by a new host. This is what keeps the database — and the PIN space — from growing without bound. |

## Testing

The rules are tested like application code against the Realtime Database
emulator. 21 cases cover both apps' real client write sequences plus the abuse
cases the rules exist to stop.

```bash
npm i -g firebase-tools
npm i --no-save @firebase/rules-unit-testing firebase
./test-rules.sh
```

Run this before every deploy. A rules mistake fails closed — the live-session
feature simply stops working for everyone — so "it parsed" is not enough.

## Deploying

```bash
firebase deploy --only database --project <the real project id>
```

This is a **human step**: it needs credentials for the Firebase project, which
by the platform's own boundary ("no backend the agent operates") no agent holds.
Until someone runs it, the rules in this repo describe the intended model and
the console still describes the real one.

## Known gap: no authentication

These rules deliberately do not require `auth != null`, because that would
break the live feature the moment it deployed unless Anonymous Auth is enabled
in the console first — which is a console change no agent can make or verify.

The consequence, stated plainly: **anyone holding a PIN has full control of
that session**, including overwriting other people's votes and removing
participants. That is roughly the trust model of a meeting link, and for a
6-digit PIN with a 24-hour TTL the exposure is one team's estimates for one
day. It is not adequate if sessions ever carry anything more sensitive.

The upgrade, when someone can enable Anonymous Auth (Firebase console →
Authentication → Sign-in method → Anonymous):

1. Call `signInAnonymously(getAuth(app))` in `firebase.ts` before the first
   database read, and gate `isFirebaseConfigured()` on it resolving.
2. Add `"auth.uid !== null"` to every `.read`/`.write` in this file.
3. Store `hostId: auth.uid` and restrict phase/story/reveal writes to
   `data.parent().child('hostId').val() === auth.uid`, which would make
   host-only actions genuinely host-only rather than convention.

Step 3 is the one that changes the security model rather than just the
authentication one; steps 1–2 alone mostly raise the cost of drive-by writes.
