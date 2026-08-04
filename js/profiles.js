/* Profiles live in the STORAGE layer, not in the data model.
   Picking a profile only changes which localStorage key the store reads from —
   so store.js and every view stay single-user code and never learn that
   profiles exist. That is the whole reason this feature was nearly free. */

export const PROFILES = [
  { id: 'mariana', name: 'Mariana' },
  { id: 'leon', name: 'Leon' },
];

const ACTIVE_KEY = 'ht:activeProfile';

export function profileById(id) {
  return PROFILES.find((p) => p.id === id) || null;
}

export function getActiveId() {
  const id = localStorage.getItem(ACTIVE_KEY);
  return profileById(id) ? id : null;
}

export function setActiveId(id) {
  if (!profileById(id)) throw new Error(`Unknown profile: ${id}`);
  localStorage.setItem(ACTIVE_KEY, id);
}

export function clearActive() {
  localStorage.removeItem(ACTIVE_KEY);
}

/** Where this profile's habits, entries and events live. */
export function stateKey(id) {
  return `ht:profile:${id}`;
}

/** Sync config, kept OUT of the state object so it never lands in an export.
    The token is a credential; a backup file is meant to be shareable. */
export function syncKey(id) {
  return `ht:profile:${id}:sync`;
}
