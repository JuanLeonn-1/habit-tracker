/* In-memory state plus every mutation the views are allowed to make.
   The store knows nothing about profiles — it is handed one adapter and one
   state object, and that indirection is what keeps profiles free. */

import { uid } from './lib/id.js';
import { PALETTE_SIZE } from './seed.js';

export function entryKey(habitId, dateKey) {
  return `${habitId}|${dateKey}`;
}

export function createStore({ adapter, state }) {
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) fn(state);
  }

  /** Apply a mutation, stamp it, persist it, notify. */
  function commit(mutate) {
    mutate();
    state.updatedAt = Date.now();
    adapter.save(state).catch(() => {
      /* already logged by the adapter; the in-memory state stays usable */
    });
    emit();
  }

  function countFor(habitId) {
    const prefix = `${habitId}|`;
    let total = 0;
    for (const [key, value] of Object.entries(state.entries)) {
      if (key.startsWith(prefix) && value?.done) total++;
    }
    return total;
  }

  const store = {
    getState: () => state,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /* ---- habits ---- */

    /** Visible habits, in display order. Archived and deleted ones drop out. */
    habits() {
      return state.habits
        .filter((h) => !h.deletedAt && !h.archivedAt)
        .sort((a, b) => a.order - b.order);
    },

    archivedHabits() {
      return state.habits.filter((h) => !h.deletedAt && h.archivedAt);
    },

    habitById(id) {
      return state.habits.find((h) => h.id === id && !h.deletedAt) || null;
    },

    addHabit({ name, type = 'daily', icon = '', note = '' }) {
      const now = Date.now();
      const habit = {
        id: uid(),
        name: name.trim(),
        type,
        icon,
        note,
        color: state.habits.length % PALETTE_SIZE,
        order: state.habits.length,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        deletedAt: null,
      };
      commit(() => state.habits.push(habit));
      return habit;
    },

    updateHabit(id, patch) {
      commit(() => {
        const habit = state.habits.find((h) => h.id === id);
        if (!habit) return;
        Object.assign(habit, patch, { updatedAt: Date.now() });
      });
    },

    /** The default way to retire a habit: history survives. */
    archiveHabit(id) {
      store.updateHabit(id, { archivedAt: Date.now() });
    },

    unarchiveHabit(id) {
      store.updateHabit(id, { archivedAt: null });
    },

    /**
     * Hard delete, for capture mistakes only. Tombstoned rather than spliced
     * out so the removal survives a sync instead of the other device
     * resurrecting the habit.
     */
    deleteHabit(id) {
      commit(() => {
        const habit = state.habits.find((h) => h.id === id);
        if (!habit) return;
        habit.deletedAt = Date.now();
        habit.updatedAt = habit.deletedAt;
        for (const key of Object.keys(state.entries)) {
          if (key.startsWith(`${id}|`)) delete state.entries[key];
        }
      });
    },

    reorderHabits(orderedIds) {
      commit(() => {
        const now = Date.now();
        orderedIds.forEach((id, i) => {
          const habit = state.habits.find((h) => h.id === id);
          if (habit) {
            habit.order = i;
            habit.updatedAt = now;
          }
        });
      });
    },

    /* ---- entries ---- */

    isDone(habitId, dateKey) {
      return Boolean(state.entries[entryKey(habitId, dateKey)]?.done);
    },

    /** Toggling off writes `done: false` rather than dropping the key, so the
        un-tick is a real fact that survives a merge instead of looking absent. */
    toggleEntry(habitId, dateKey) {
      commit(() => {
        const key = entryKey(habitId, dateKey);
        const done = !state.entries[key]?.done;
        state.entries[key] = { done, updatedAt: Date.now() };
      });
    },

    /* ---- calendar ---- */

    eventsFor(dateKey) {
      return state.events
        .filter((e) => !e.deletedAt && e.date === dateKey)
        .sort((a, b) => a.createdAt - b.createdAt);
    },

    addEvent({ date, title, color = 0 }) {
      const now = Date.now();
      const event = {
        id: uid(),
        date,
        title: title.trim(),
        color,
        done: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      commit(() => state.events.push(event));
      return event;
    },

    updateEvent(id, patch) {
      commit(() => {
        const event = state.events.find((e) => e.id === id);
        if (!event) return;
        Object.assign(event, patch, { updatedAt: Date.now() });
      });
    },

    toggleEvent(id) {
      const event = state.events.find((e) => e.id === id);
      if (event) store.updateEvent(id, { done: !event.done });
    },

    deleteEvent(id) {
      store.updateEvent(id, { deletedAt: Date.now() });
    },

    /* ---- duplicate cleanup ---- */

    /** Visible habits sharing a name — the residue of two devices that built
        their starting lists separately and then synced. */
    duplicateGroups() {
      const groups = new Map();
      for (const habit of store.habits()) {
        const key = habit.name.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(habit);
      }
      return [...groups.values()].filter((group) => group.length > 1);
    },

    /**
     * Collapses same-named habits onto one copy.
     *
     * Records are moved across BEFORE the extra copies are retired, so a tick
     * made against either twin survives — deleting the twin outright would
     * silently take its history with it.
     */
    dedupeHabits() {
      const groups = store.duplicateGroups();
      if (groups.length === 0) return 0;

      commit(() => {
        const now = Date.now();

        for (const group of groups) {
          // Keep whichever copy carries the most history; ties go to the older.
          const ranked = [...group].sort(
            (a, b) => countFor(b.id) - countFor(a.id) || a.createdAt - b.createdAt
          );
          const [keeper, ...extras] = ranked;

          for (const extra of extras) {
            const prefix = `${extra.id}|`;
            for (const key of Object.keys(state.entries)) {
              if (!key.startsWith(prefix)) continue;
              const target = entryKey(keeper.id, key.slice(prefix.length));
              const mine = state.entries[target];
              const theirs = state.entries[key];
              if (!mine || (theirs?.updatedAt ?? 0) > (mine.updatedAt ?? 0)) {
                state.entries[target] = theirs;
              }
              delete state.entries[key];
            }
            extra.deletedAt = now;
            extra.updatedAt = now;
          }
        }
      });

      return groups.length;
    },

    /* ---- whole-state swap, for restore and reset ---- */

    /** Mutated in place rather than reassigned, so the closure and every
        subscriber keep pointing at the same object. */
    replaceState(next) {
      commit(() => {
        state.version = next.version ?? 1;
        state.habits = next.habits ?? [];
        state.entries = next.entries ?? {};
        state.events = next.events ?? [];
      });
    },
  };

  return store;
}
