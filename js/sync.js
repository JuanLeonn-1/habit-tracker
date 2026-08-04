/* Sync orchestration.

   Deliberately sits OUTSIDE the store: localStorage stays the source of truth
   and every write lands there instantly, so the UI never waits on the network.
   This module just watches for changes and reconciles with the gist in the
   background. Pull the plug on it and the app carries on working. */

import { syncKey, profileById } from './profiles.js';
import { createGistClient } from './storage/gist.js';
import { merge } from './lib/merge.js';

const DEBOUNCE_MS = 3000;

export function createSync({ store, profileId, onStatus }) {
  let config = readConfig();
  let timer = null;
  let applying = false;
  let busy = false;
  let lastError = null;

  function readConfig() {
    try {
      return JSON.parse(localStorage.getItem(syncKey(profileId))) || null;
    } catch {
      return null;
    }
  }

  function writeConfig(next) {
    config = next;
    if (next) localStorage.setItem(syncKey(profileId), JSON.stringify(next));
    else localStorage.removeItem(syncKey(profileId));
  }

  function status() {
    return {
      connected: Boolean(config?.token && config?.gistId),
      gistId: config?.gistId ?? null,
      lastSyncedAt: config?.lastSyncedAt ?? null,
      busy,
      error: lastError,
    };
  }

  function announce() {
    onStatus?.(status());
  }

  /**
   * Pull, merge, push — in that order, every time.
   *
   * The gist API has no way to say "only write if nobody changed this since I
   * read it", so pulling immediately before pushing keeps the window where a
   * concurrent write could be missed down to a few milliseconds. And because
   * the merge is per-entry, even losing that race only costs the very last
   * tick, not the other device's day.
   */
  async function syncNow() {
    if (!status().connected || busy) return;

    busy = true;
    lastError = null;
    announce();

    try {
      const client = createGistClient(config.token);
      const remote = await client.read(config.gistId);
      assertSameProfile(remote);
      const merged = merge(store.getState(), remote);

      // Guarded so writing the merge back into the store does not look like a
      // user edit and schedule another push, which would loop forever.
      applying = true;
      store.replaceState(merged);
      applying = false;

      await client.write(config.gistId, store.getState(), profileId);
      writeConfig({ ...config, lastSyncedAt: Date.now() });
    } catch (err) {
      lastError = err.message;
    } finally {
      applying = false;
      busy = false;
      announce();
    }
  }

  /** Refuses a gist belonging to the other profile before anything is merged. */
  function assertSameProfile(remote) {
    if (!remote?.profile || remote.profile === profileId) return;
    const owner = profileById(remote.profile);
    throw new Error(
      `That Gist ID belongs to ${owner ? owner.name : remote.profile}'s profile. `
      + 'Use the ID shown on a device already syncing this profile.'
    );
  }

  async function connect(token, gistId) {
    const client = createGistClient(token);
    await client.verify();

    let id = gistId?.trim() || null;
    if (id) assertSameProfile(await client.read(id));
    else id = await client.create(store.getState(), profileId);

    writeConfig({ token, gistId: id, lastSyncedAt: null });
    await syncNow();
    if (lastError) throw new Error(lastError);
    return id;
  }

  function disconnect() {
    clearTimeout(timer);
    writeConfig(null);
    lastError = null;
    announce();
  }

  store.subscribe(() => {
    if (applying || !status().connected) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, DEBOUNCE_MS);
  });

  // Coming back to the app is the moment the other device's changes matter,
  // and on a phone that is a visibility change, not a page load.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });

  return { status, syncNow, connect, disconnect };
}
