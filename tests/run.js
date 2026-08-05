/* Tests. Open tests/index.html over http — no build, no npm, no dependencies.
   These cover the places where a bug is SILENT: nothing crashes, a day just
   lands on the wrong date or a tick quietly disappears. */

import * as date from '../js/lib/date.js';
import { merge } from '../js/lib/merge.js';
import { dailyStreak, weeklyStreak, stats, doneDays } from '../js/lib/streaks.js';
import { createStore } from '../js/store.js';
import { createSync } from '../js/sync.js';
import { seedFor } from '../js/seed.js';

/* ---------- tiny harness ---------- */

const suites = [];
let current = null;

function suite(name, fn) {
  current = { name, tests: [] };
  suites.push(current);
  return fn();
}

function test(name, fn) {
  current.tests.push({ name, fn });
}

function eq(actual, expected, note = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${note}\n  expected ${b}\n  got      ${a}`);
}

function ok(value, note = '') {
  if (!value) throw new Error(note || `expected truthy, got ${JSON.stringify(value)}`);
}

const noopAdapter = { async load() { return null; }, async save() {} };
const blankState = () => ({ version: 1, updatedAt: 1000, habits: [], entries: {}, events: [] });

/* ---------- dates ---------- */

suite('dates', () => {
  test('keys are built in local time, not UTC', () => {
    // The classic bug: toISOString() on a late-evening local date rolls the day
    // forward in a negative offset, so a 9pm tick lands on tomorrow.
    const lateEvening = new Date(2026, 7, 4, 23, 30);
    eq(date.toKey(lateEvening), '2026-08-04');
    const earlyMorning = new Date(2026, 7, 4, 0, 15);
    eq(date.toKey(earlyMorning), '2026-08-04');
  });

  test('round-trips through fromKey', () => {
    eq(date.toKey(date.fromKey('2026-02-29')), '2026-03-01', 'no leap day in 2026');
    eq(date.toKey(date.fromKey('2024-02-29')), '2024-02-29', '2024 has one');
  });

  test('daysBetween survives a daylight-saving boundary', () => {
    // Normalising to midday is what stops a ±1h shift rounding to a whole day.
    eq(date.daysBetween('2026-03-01', '2026-04-01'), 31);
    eq(date.daysBetween('2026-10-01', '2026-11-01'), 31);
    eq(date.daysBetween('2026-08-05', '2026-08-04'), -1);
  });

  test('weeks start on Monday', () => {
    eq(date.weekKey('2026-08-03'), '2026-08-03', 'Monday anchors its own week');
    eq(date.weekKey('2026-08-05'), '2026-08-03', 'Wednesday');
    eq(date.weekKey('2026-08-09'), '2026-08-03', 'Sunday closes that week, not a new one');
    eq(date.weekKey('2026-08-10'), '2026-08-10', 'the next Monday opens one');
  });

  test('calendar rows start on Monday and include neighbouring days', () => {
    const weeks = date.calendarWeeks(2026, 7);
    eq(weeks[0].map((c) => c.day), [27, 28, 29, 30, 31, 1, 2]);
    eq(date.fromKey(weeks[0][0].key).getDay(), 1, 'first cell is a Monday');
    eq(weeks[0][5].inMonth, true, 'Aug 1 is in-month');
    eq(weeks[0][0].inMonth, false, 'Jul 27 is not');
  });

  test('header order is Monday-first while WEEKDAYS stays a getDay lookup', () => {
    eq(date.WEEK_ORDER.map((i) => date.WEEKDAYS[i]),
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    eq(date.WEEKDAYS[0], 'SUN', 'index 0 must stay Sunday for getDay()');
  });

  test('month lengths', () => {
    eq(date.daysInMonth(2026, 1), 28);
    eq(date.daysInMonth(2024, 1), 29);
    eq(date.monthDays(2026, 7).length, 31);
  });
});

/* ---------- merge ---------- */

suite('merge', () => {
  const withEntries = (entries) => ({ ...blankState(), entries });

  test('two devices ticking different days keep both', () => {
    const m = merge(
      withEntries({ 'h1|2026-08-01': { done: true, updatedAt: 100 } }),
      withEntries({ 'h2|2026-08-02': { done: true, updatedAt: 200 } }),
    );
    eq(Object.keys(m.entries).sort(), ['h1|2026-08-01', 'h2|2026-08-02']);
  });

  test('a real collision takes the later write', () => {
    const m = merge(
      withEntries({ 'h1|2026-08-01': { done: true, updatedAt: 100 } }),
      withEntries({ 'h1|2026-08-01': { done: false, updatedAt: 300 } }),
    );
    eq(m.entries['h1|2026-08-01'].done, false);
  });

  test('an un-tick is a fact, not an absence', () => {
    // done:false must beat a stale done:true, or unticking never propagates.
    const m = merge(
      withEntries({ 'h1|2026-08-01': { done: false, updatedAt: 500 } }),
      withEntries({ 'h1|2026-08-01': { done: true, updatedAt: 100 } }),
    );
    eq(m.entries['h1|2026-08-01'].done, false);
  });

  test('a deletion is not resurrected by a stale copy', () => {
    const m = merge(
      { ...blankState(), habits: [{ id: 'h1', name: 'A', updatedAt: 500, deletedAt: 500 }] },
      { ...blankState(), habits: [{ id: 'h1', name: 'A', updatedAt: 100, deletedAt: null }] },
    );
    eq(m.habits.length, 1);
    eq(m.habits[0].deletedAt, 500);
  });

  test('remote-only records arrive and newer renames win', () => {
    const arrived = merge(blankState(), { ...blankState(), habits: [{ id: 'h2', name: 'New', updatedAt: 10 }] });
    eq(arrived.habits.map((h) => h.name), ['New']);

    const renamed = merge(
      { ...blankState(), habits: [{ id: 'h1', name: 'Renamed', updatedAt: 900 }] },
      { ...blankState(), habits: [{ id: 'h1', name: 'Old', updatedAt: 400 }] },
    );
    eq(renamed.habits[0].name, 'Renamed');
  });

  test('seeding the same profile twice does not double the list', () => {
    // Derived ids are what makes this hold; random ones gave 28 habits.
    const a = seedFor('leon');
    const b = seedFor('leon');
    eq(a.habits[0].id, b.habits[0].id);
    eq(merge(a, b).habits.length, a.habits.length);
  });

  test('different profiles do not share ids', () => {
    ok(seedFor('leon').habits[0].id !== seedFor('mariana').habits[0].id);
  });

  test('merging is idempotent, so a retry is free', () => {
    const a = withEntries({ 'h1|2026-08-01': { done: true, updatedAt: 100 } });
    const b = withEntries({ 'h2|2026-08-02': { done: true, updatedAt: 200 } });
    eq(merge(merge(a, b), b).entries, merge(a, b).entries);
  });
});

/* ---------- streaks ---------- */

suite('streaks', () => {
  const at = (offset) => date.addDays(date.today(), offset);
  const setOf = (...offsets) => new Set(offsets.map(at));

  test('a day not yet ticked does not read as a broken streak', () => {
    // Someone with a 3-day run must not be shown 0 every morning.
    eq(dailyStreak(setOf(-1, -2, -3)).current, 3);
  });

  test('today counts once ticked', () => {
    eq(dailyStreak(setOf(0, -1, -2)).current, 3);
  });

  test('a gap ends the run but the best is remembered', () => {
    const { current, best } = dailyStreak(setOf(-2, -3, -4, -5));
    eq(current, 0, 'yesterday missing ends it');
    eq(best, 4, 'the earned number survives');
  });

  test('weekly streaks count weeks, not days', () => {
    const weeks = new Set([date.weekKey(date.today()), date.addDays(date.weekKey(date.today()), -7)]);
    eq(weeklyStreak(weeks).current, 2);
  });

  test('a weekly habit is not broken by the specific weekday', () => {
    const thisMonday = date.weekKey(date.today());
    // Done on a Friday one week and a Monday the next: still two in a row.
    const done = new Set([date.addDays(thisMonday, -3), thisMonday]);
    eq(weeklyStreak(done).current, 2);
  });

  test('flexible habits report time since, never a streak', () => {
    const entries = { [`h1|${at(-4)}`]: { done: true, updatedAt: 1 } };
    const info = stats({ id: 'h1', type: 'flexible' }, entries, 2026, 7);
    eq(info.type, 'flexible');
    eq(info.label, '4 days ago');
    ok(!('current' in info), 'no streak field at all');
  });

  test('a broken daily streak shows the best, not a zero', () => {
    const entries = {};
    for (const offset of [-5, -6, -7]) entries[`h1|${at(offset)}`] = { done: true, updatedAt: 1 };
    const info = stats({ id: 'h1', type: 'daily' }, entries, 2026, 7);
    ok(info.label.startsWith('Best:'), `got "${info.label}"`);
  });

  test('doneDays ignores un-ticked entries', () => {
    const entries = {
      'h1|2026-08-01': { done: true, updatedAt: 1 },
      'h1|2026-08-02': { done: false, updatedAt: 1 },
    };
    eq([...doneDays(entries, 'h1')], ['2026-08-01']);
  });
});

/* ---------- store ---------- */

suite('store', () => {
  test('un-ticking records done:false rather than dropping the key', () => {
    const store = createStore({ adapter: noopAdapter, state: blankState() });
    store.toggleEntry('h1', '2026-08-01');
    store.toggleEntry('h1', '2026-08-01');
    eq(store.isDone('h1', '2026-08-01'), false);
    ok('h1|2026-08-01' in store.getState().entries, 'the fact must survive to sync');
  });

  test('archiving hides a habit but keeps its history', () => {
    const store = createStore({ adapter: noopAdapter, state: blankState() });
    const habit = store.addHabit({ name: 'Gym', type: 'flexible' });
    store.toggleEntry(habit.id, '2026-06-01');
    store.archiveHabit(habit.id);
    eq(store.habits().length, 0);
    eq(store.archivedHabits().length, 1);
    eq(store.isDone(habit.id, '2026-06-01'), true);
  });

  test('deleting tombstones instead of splicing, so sync cannot revive it', () => {
    const store = createStore({ adapter: noopAdapter, state: blankState() });
    const habit = store.addHabit({ name: 'Oops' });
    store.deleteHabit(habit.id);
    eq(store.habits().length, 0);
    eq(store.getState().habits.length, 1);
    ok(store.getState().habits[0].deletedAt, 'carries a tombstone');
  });

  test('dedupe moves records across before retiring the extra copy', () => {
    const store = createStore({
      adapter: noopAdapter,
      state: {
        ...blankState(),
        habits: [
          { id: 'old', name: 'Make the bed', type: 'daily', color: 0, order: 0, createdAt: 1, updatedAt: 1, archivedAt: null, deletedAt: null },
          { id: 'new', name: 'Make the bed', type: 'daily', color: 0, order: 1, createdAt: 2, updatedAt: 2, archivedAt: null, deletedAt: null },
        ],
        entries: {
          'old|2026-08-01': { done: true, updatedAt: 10 },
          'old|2026-08-02': { done: true, updatedAt: 11 },
          'new|2026-08-05': { done: true, updatedAt: 12 },
        },
      },
    });

    eq(store.duplicateGroups().length, 1);
    store.dedupeHabits();

    const kept = store.habits();
    eq(kept.length, 1);
    eq(kept[0].id, 'old', 'the copy with more history wins');
    ok(store.isDone('old', '2026-08-05'), "the twin's tick moved over, not lost");
    ok(store.isDone('old', '2026-08-01') && store.isDone('old', '2026-08-02'));
  });

  test('dedupe leaves a clean list alone', () => {
    const store = createStore({ adapter: noopAdapter, state: seedFor('leon') });
    eq(store.duplicateGroups().length, 0);
    eq(store.dedupeHabits(), 0);
  });

  test('events tombstone on delete', () => {
    const store = createStore({ adapter: noopAdapter, state: blankState() });
    const event = store.addEvent({ date: '2026-08-06', title: 'Exam' });
    eq(store.eventsFor('2026-08-06').length, 1);
    store.deleteEvent(event.id);
    eq(store.eventsFor('2026-08-06').length, 0);
    ok(store.getState().events[0].deletedAt);
  });
});

/* ---------- sync ---------- */

suite('sync', () => {
  // A stand-in for the gist API. Never touches a real profile or a real token.
  const KEY = 'ht:profile:__test__:sync';

  function harness(failures = 0) {
    const realFetch = window.fetch;
    let writes = 0;
    let left = failures;
    let server = blankState();

    window.fetch = async (url, options = {}) => {
      if (!String(url).includes('api.github.com')) return realFetch(url, options);
      if ((options.method ?? 'GET') === 'GET') {
        return new Response(
          JSON.stringify({ files: { 'habit-tracker.json': { content: JSON.stringify(server) } } }),
          { status: 200 },
        );
      }
      if (left-- > 0) return new Response('{}', { status: 409 });
      writes++;
      server = JSON.parse(JSON.parse(options.body).files['habit-tracker.json'].content);
      return new Response('{}', { status: 200 });
    };

    localStorage.setItem(KEY, JSON.stringify({ token: 'test', gistId: 'g1', pending: false }));

    return {
      get writes() { return writes; },
      get server() { return server; },
      restore() {
        window.fetch = realFetch;
        localStorage.removeItem(KEY);
      },
    };
  }

  const make = () => {
    const store = createStore({ adapter: noopAdapter, state: blankState() });
    return { store, sync: createSync({ store, profileId: '__test__', onStatus() {} }) };
  };

  test('an idle device does not write at all', async () => {
    const h = harness();
    try {
      const { sync } = make();
      await sync.syncNow();
      eq(h.writes, 0, 'redundant writes are what collided into 409s');
    } finally { h.restore(); }
  });

  test('two changes in the same millisecond both upload', async () => {
    const h = harness();
    try {
      const { store, sync } = make();
      store.toggleEntry('h1', '2026-08-05');
      store.toggleEntry('h2', '2026-08-06');
      await sync.syncNow();
      eq(h.writes, 1);
      ok(h.server.entries['h1|2026-08-05'] && h.server.entries['h2|2026-08-06'],
        'comparing timestamps used to drop these silently');
    } finally { h.restore(); }
  });

  test('a conflict is retried until it lands', async () => {
    const h = harness(2);
    try {
      const { store, sync } = make();
      store.toggleEntry('h3', '2026-08-07');
      await sync.syncNow();
      eq(sync.status().error, null);
      ok(h.server.entries['h3|2026-08-07']?.done, 'survived two 409s');
    } finally { h.restore(); }
  });

  test('a change made offline survives a restart and uploads', async () => {
    const h = harness();
    try {
      const { store } = make();
      store.toggleEntry('h4', '2026-08-08');
      eq(JSON.parse(localStorage.getItem(KEY)).pending, true, 'the flag is on disk');

      // Stand-in for closing and reopening the app.
      const reopened = createStore({ adapter: noopAdapter, state: store.getState() });
      const sync = createSync({ store: reopened, profileId: '__test__', onStatus() {} });
      await sync.syncNow();
      ok(h.server.entries['h4|2026-08-08']?.done);
    } finally { h.restore(); }
  });

  test('a device upgrading from before the flag pushes once', async () => {
    const h = harness();
    try {
      localStorage.setItem(KEY, JSON.stringify({ token: 'test', gistId: 'g1' })); // no flag
      const { store, sync } = make();
      store.toggleEntry('h5', '2026-08-09');
      await sync.syncNow();
      ok(h.server.entries['h5|2026-08-09']?.done, 'must not sit on what it owes');
    } finally { h.restore(); }
  });

  test('the other profile\'s gist is refused before anything merges', async () => {
    const h = harness();
    try {
      const { store, sync } = make();
      store.toggleEntry('h6', '2026-08-10');
      // Server claims to belong to Leon; this sync is for __test__.
      const realFetch = window.fetch;
      window.fetch = async (url, options = {}) => {
        if (String(url).includes('api.github.com') && (options.method ?? 'GET') === 'GET') {
          return new Response(JSON.stringify({
            files: { 'habit-tracker.json': { content: JSON.stringify({ ...blankState(), profile: 'leon' }) } },
          }), { status: 200 });
        }
        return realFetch(url, options);
      };
      await sync.syncNow();
      ok(/Leon/.test(sync.status().error ?? ''), `got "${sync.status().error}"`);
      eq(h.writes, 0, 'nothing was written');
    } finally { h.restore(); }
  });
});

/* ---------- run ---------- */

const results = document.getElementById('results');
let passed = 0;
let failed = 0;

for (const group of suites) {
  const heading = document.createElement('h2');
  heading.textContent = group.name;
  const list = document.createElement('ul');

  for (const item of group.tests) {
    const li = document.createElement('li');
    try {
      await item.fn();
      li.dataset.pass = 'true';
      li.innerHTML = `<span class="mark">✓</span>${item.name}`;
      passed++;
    } catch (err) {
      li.dataset.pass = 'false';
      li.innerHTML = `<span class="mark">✕</span>${item.name}`;
      const pre = document.createElement('pre');
      pre.textContent = err.message;
      li.append(pre);
      failed++;
    }
    list.append(li);
  }

  results.append(heading, list);
}

const tally = document.getElementById('tally');
tally.dataset.ok = String(failed === 0);
tally.textContent = failed === 0
  ? `${passed} passing`
  : `${failed} failing · ${passed} passing`;
