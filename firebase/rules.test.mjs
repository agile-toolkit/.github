/**
 * Verifies database.rules.json against the exact write sequences Planning
 * Poker and Moving Motivators actually perform, plus the abuse cases the
 * rules exist to stop.
 *
 * Run:  ./test-rules.sh      (starts the emulator, runs this, tears it down)
 *
 * These rules are the ONLY access control on the shared Realtime Database —
 * the suite has no accounts and no backend — so they are worth testing like
 * application code rather than editing live in the console.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { ref, set, update, get, serverTimestamp, remove } from 'firebase/database'

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-agile-toolkit',
  database: {
    host: '127.0.0.1',
    port: 9000,
    rules: readFileSync(new URL('./database.rules.json', import.meta.url), 'utf8'),
  },
})

const db = () => testEnv.unauthenticatedContext().database()
const PP = (pin) => `sessions/planning-poker/${pin}`
const MM = (pin) => `sessions/moving-motivators/${pin}`

const ppSession = (over = {}) => ({
  phase: 'lobby',
  deck: 'fibonacci',
  hostId: 'host-abc12345',
  participants: { 'host-abc12345': { name: 'Ada', isHost: true } },
  currentStory: '',
  blindMode: false,
  createdAt: serverTimestamp(),
  ...over,
})

const mmSession = (pin, over = {}) => ({
  pin,
  hostId: 'host',
  change: '',
  phase: 'lobby',
  createdAt: serverTimestamp(),
  ...over,
})

test.afterEach(async () => {
  await testEnv.clearDatabase()
})

// ── Planning Poker: the real client sequence must pass ────────────────────────

test('PP: host creates a session', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
})

test('PP: participant joins, votes, host reveals and estimates', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertSucceeds(
    update(ref(db(), `${PP('123456')}/participants/p-99887766`), {
      name: 'Grace',
      isHost: false,
      isObserver: true,
    }),
  )
  await assertSucceeds(
    set(ref(db(), `${PP('123456')}/stories/s-11223344`), {
      title: 'Search should paginate',
      order: 0,
      votes: {},
    }),
  )
  await assertSucceeds(
    update(ref(db(), PP('123456')), { phase: 'voting', currentStory: 's-11223344' }),
  )
  await assertSucceeds(
    set(ref(db(), `${PP('123456')}/stories/s-11223344/votes/p-99887766`), '5'),
  )
  await assertSucceeds(update(ref(db(), PP('123456')), { phase: 'revealed' }))
  await assertSucceeds(
    update(ref(db(), `${PP('123456')}/stories/s-11223344`), { finalEstimate: '5' }),
  )
})

test('PP: joining a PIN that does not exist reads as empty, not denied', async () => {
  const snap = await assertSucceeds(get(ref(db(), PP('654321'))))
  assert.equal(snap.exists(), false)
})

test('PP: host can delete its own session on end', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertSucceeds(remove(ref(db(), PP('123456'))))
})

// ── Planning Poker: abuse cases must fail ─────────────────────────────────────

test('PP: a 4-digit PIN is rejected (namespace is 6 digits)', async () => {
  await assertFails(set(ref(db(), PP('1234')), ppSession()))
})

test('PP: a non-numeric PIN is rejected', async () => {
  await assertFails(set(ref(db(), PP('abcdef')), ppSession()))
})

test('PP: the whole sessions tree cannot be enumerated', async () => {
  await assertFails(get(ref(db(), 'sessions')))
  await assertFails(get(ref(db(), 'sessions/planning-poker')))
})

test('PP: client-chosen createdAt is rejected (must be server time)', async () => {
  await assertFails(set(ref(db(), PP('123456')), ppSession({ createdAt: 4102444800000 })))
})

test('PP: createdAt is immutable once set', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertFails(set(ref(db(), `${PP('123456')}/createdAt`), 1))
})

test('PP: an oversized participant name is rejected', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertFails(
    update(ref(db(), `${PP('123456')}/participants/p-1`), { name: 'x'.repeat(41) }),
  )
})

test('PP: an unknown phase is rejected', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertFails(update(ref(db(), PP('123456')), { phase: 'hacked' }))
})

test('PP: undeclared fields are rejected', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertFails(update(ref(db(), PP('123456')), { payload: 'x'.repeat(1000) }))
})

test('PP: a session missing required children is rejected', async () => {
  await assertFails(set(ref(db(), PP('123456')), { phase: 'lobby' }))
})

test('PP: a Moving Motivators payload cannot be written into the PP namespace', async () => {
  await assertFails(set(ref(db(), PP('123456')), mmSession('123456')))
})

// ── Moving Motivators: the real client sequence must pass ─────────────────────

test('MM: host creates, participant joins and completes, host advances phase', async () => {
  await assertSucceeds(set(ref(db(), MM('123456')), mmSession('123456')))
  await assertSucceeds(
    set(ref(db(), `${MM('123456')}/participants/-Nabc123`), {
      name: 'Linus',
      completed: false,
      motivators: [
        { id: 'curiosity', rank: 0, impact: 'neutral' },
        { id: 'mastery', rank: 1, impact: 'positive' },
      ],
    }),
  )
  await assertSucceeds(
    set(ref(db(), `${MM('123456')}/timer`), { startedAt: Date.now(), durationSecs: 300 }),
  )
  await assertSucceeds(set(ref(db(), `${MM('123456')}/timer`), null))
  await assertSucceeds(
    update(ref(db(), `${MM('123456')}/participants/-Nabc123`), {
      completed: true,
      change: 'Moving to a new squad',
      motivators: [{ id: 'freedom', rank: 0, impact: 'negative' }],
    }),
  )
  await assertSucceeds(set(ref(db(), `${MM('123456')}/phase`), 'revealed'))
})

// ── Moving Motivators: abuse cases must fail ──────────────────────────────────

test('MM: pin field must match its own path', async () => {
  await assertFails(set(ref(db(), MM('123456')), mmSession('999999')))
})

test('MM: an unknown motivator id is rejected', async () => {
  await assertSucceeds(set(ref(db(), MM('123456')), mmSession('123456')))
  await assertFails(
    set(ref(db(), `${MM('123456')}/participants/-Nabc123`), {
      name: 'Linus',
      completed: false,
      motivators: [{ id: 'not-a-motivator', rank: 0, impact: 'neutral' }],
    }),
  )
})

test('MM: an unknown impact level is rejected', async () => {
  await assertSucceeds(set(ref(db(), MM('123456')), mmSession('123456')))
  await assertFails(
    set(ref(db(), `${MM('123456')}/participants/-Nabc123`), {
      name: 'Linus',
      completed: false,
      // 'increase' is the value change-planner wrongly assumed for a year;
      // the rules now make that class of mistake fail loudly at the boundary.
      motivators: [{ id: 'curiosity', rank: 0, impact: 'increase' }],
    }),
  )
})

test('MM: an absurd timer duration is rejected', async () => {
  await assertSucceeds(set(ref(db(), MM('123456')), mmSession('123456')))
  await assertFails(
    set(ref(db(), `${MM('123456')}/timer`), { startedAt: Date.now(), durationSecs: 999999 }),
  )
})

test('MM: the two apps cannot collide on one PIN', async () => {
  await assertSucceeds(set(ref(db(), PP('123456')), ppSession()))
  await assertSucceeds(set(ref(db(), MM('123456')), mmSession('123456')))
  const pp = await get(ref(db(), PP('123456')))
  assert.equal(pp.val().deck, 'fibonacci')
})

// ── Nothing outside sessions/ is reachable ────────────────────────────────────

test('the database root is closed', async () => {
  await assertFails(get(ref(db(), '/')))
  await assertFails(set(ref(db(), 'anything'), { a: 1 }))
  await assertFails(set(ref(db(), 'sessions/some-other-app/123456'), { a: 1 }))
})

test.after(async () => {
  await testEnv.cleanup()
})
