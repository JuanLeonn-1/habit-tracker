/* localStorage adapter — the source of truth.
   Writes here are synchronous and instant, so the UI never waits on storage.
   The Gist adapter (added later) implements this same interface. */

export function createLocalAdapter(key) {
  return {
    name: 'local',

    async load() {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (err) {
        // Corrupt payload: keep it aside rather than overwrite it. If this ever
        // fires, the backup is the only copy of that data left.
        console.error('Could not parse stored state; keeping a copy.', err);
        localStorage.setItem(`${key}:corrupt:${Date.now()}`, raw);
        return null;
      }
    },

    async save(state) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (err) {
        // Quota is the realistic failure. Surfacing it matters: silently
        // dropping writes would look like the app working until a reload.
        console.error('Could not save state.', err);
        throw err;
      }
    },
  };
}
