/* Merging two copies of a profile — the piece that decides whether syncing
   ever loses data.

   The naive approach is "whichever file was saved last wins", which throws away
   everything the other device did. Instead this merges KEY BY KEY: two devices
   that ticked different habits offline both keep their ticks, and only a
   genuine collision — the same habit on the same day — falls back to the later
   timestamp.

   Deletions are tombstones (deletedAt) rather than missing keys, because an
   absent key is indistinguishable from one the other device has not seen yet.
   Without them, deleting a habit on the phone would have the laptop cheerfully
   put it back. */

export function merge(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  return {
    version: Math.max(local.version ?? 1, remote.version ?? 1),
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    habits: mergeById(local.habits, remote.habits),
    entries: mergeEntries(local.entries, remote.entries),
    events: mergeById(local.events, remote.events),
  };
}

/** Habits and events: one record per id, the more recently touched one wins. */
function mergeById(a = [], b = []) {
  const byId = new Map();
  for (const item of [...a, ...b]) {
    if (!item?.id) continue;
    const seen = byId.get(item.id);
    if (!seen || (item.updatedAt ?? 0) > (seen.updatedAt ?? 0)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

/**
 * Entries are a flat map keyed "habitId|YYYY-MM-DD", which is exactly what
 * makes this safe: a tick is its own key, so two devices touching different
 * days never collide at all.
 */
function mergeEntries(a = {}, b = {}) {
  const out = { ...a };
  for (const [key, theirs] of Object.entries(b)) {
    const mine = out[key];
    if (!mine || (theirs?.updatedAt ?? 0) > (mine.updatedAt ?? 0)) out[key] = theirs;
  }
  return out;
}
