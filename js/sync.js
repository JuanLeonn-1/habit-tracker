/* Sync orchestration.

   Deliberately sits OUTSIDE the store: localStorage stays the source of truth
   and every write lands there instantly, so the UI never waits on the network.
   This module just watches for changes and reconciles with the gist in the
   background. Pull the plug on it and the app carries on working. */

import { syncKey, profileById } from './profiles.js';
import { createGistClient } from './storage/gist.js';
import { merge } from './lib/merge.js';

const DEBOUNCE_MS = 3000;
const ATTEMPTS = 4;

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
      pending: Boolean(config?.pending),
      busy,
      error: lastError,
    };
  }

  function announce() {
    onStatus?.(status());
  }

  /**
   * Whether this device holds changes the gist has not got yet.
   *
   * Kept in storage rather than memory on purpose: a tick made offline and
   * then closed would otherwise be forgotten on the next launch and never
   * upload at all. Comparing timestamps instead was worse — two changes in the
   * same millisecond made the app decide it had nothing to send.
   */
  function markPending() {
    if (config && !config.pending) writeConfig({ ...config, pending: true });
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

  /**
   * Pull, merge, push — in that order, every time.
   *
   * The gist API cannot express "write only if unchanged", so pulling
   * immediately before pushing keeps the window where a concurrent write could
   * be missed down to milliseconds. A gist is a git repo underneath, so
   * simultaneous writes are rejected with 409 rather than merged; re-reading
   * and replaying the merge fixes that, and the merge is idempotent so
   * replaying costs nothing.
   */
  async function reconcile(client) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const remote = await client.read(config.gistId);
      assertSameProfile(remote);

      // Guarded so writing the merge back into the store does not look like a
      // user edit and schedule another push, which would loop forever.
      applying = true;
      store.replaceState(merge(store.getState(), remote));
      applying = false;

      // Nothing of ours to contribute. Pushing anyway was the whole problem:
      // two devices opening the app each sent an identical copy and collided
      // with each other for no reason.
      if (!config.pending) return;

      try {
        await client.write(config.gistId, store.getState(), profileId);
        writeConfig({ ...config, pending: false });
        return;
      } catch (err) {
        if (!err.message.includes('(409)') || attempt === ATTEMPTS) throw err;
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  async function syncNow() {
    if (!status().connected || busy) return;

    busy = true;
    lastError = null;
    announce();

    try {
      await reconcile(createGistClient(config.token));
      writeConfig({ ...config, lastSyncedAt: Date.now() });
    } catch (err) {
      lastError = err.message;
    } finally {
      applying = false;
      busy = false;
      announce();
    }
  }

  async function connect(token, gistId) {
    const client = createGistClient(token);
    await client.verify();

    let id = gistId?.trim() || null;

    if (!id) {
      // Left empty, so look before creating. Creating blindly is how a second
      // device ends up syncing against its own private copy while looking
      // perfectly connected.
      const found = await client.findForProfile(profileId);

      if (found.length > 1) {
        throw new Error(
          `This account already has ${found.length} sync files for this profile. `
          + 'Paste the Gist ID shown on the device you want to match, instead of '
          + 'leaving this empty.'
        );
      }

      if (found.length === 0) {
        id = await client.create(store.getState(), profileId);
        writeConfig({ token, gistId: id, pending: false, lastSyncedAt: Date.now() });
        return id;
      }

      id = found[0];
    }

    const remote = await client.read(id);
    assertSameProfile(remote);

    // A device joining an existing sync before it has been used has nothing
    // worth keeping, so it adopts the remote outright. Merging instead would
    // pair its untouched starting list against the real one and leave every
    // habit sitting there twice.
    const pristine = isPristine(store.getState());
    if (pristine) {
      applying = true;
      store.replaceState(remote);
      applying = false;
    }

    writeConfig({ token, gistId: id, pending: !pristine, lastSyncedAt: null });
    await syncNow();
    if (lastError) throw new Error(lastError);
    return id;
  }

  /** Never ticked a habit, never added a task — nothing here to lose. */
  function isPristine(state) {
    return Object.keys(state.entries).length === 0
      && state.events.filter((e) => !e.deletedAt).length === 0;
  }

  function disconnect() {
    clearTimeout(timer);
    writeConfig(null);
    lastError = null;
    announce();
  }

  store.subscribe(() => {
    if (applying) return;
    markPending();
    if (!status().connected) return;
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
