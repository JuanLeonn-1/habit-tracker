/* Profile switching, sync, backup and reset. */

import { profileById, getActiveId, clearActive } from '../profiles.js';
import { seedFor } from '../seed.js';
import { today } from '../lib/date.js';

export function renderSettings(store, repaint, ctx) {
  const profileId = getActiveId();
  const profile = profileById(profileId);
  const state = store.getState();
  const sync = ctx?.sync;
  const syncState = sync ? sync.status() : { connected: false };

  const el = document.createElement('section');
  el.className = 'settings';
  el.innerHTML = `
    <header class="view-head">
      <h2 class="view-head__title">Settings</h2>
    </header>

    <section class="card">
      <h3 class="card__title">Profile</h3>
      <p class="card__body">Signed in as <strong>${profile ? profile.name : '—'}</strong>.</p>
      <p class="card__stat">
        ${store.habits().length} habits · ${countEntries(state)} records · ${countEvents(state)} tasks
      </p>
      <div class="card__actions">
        <button class="btn btn--ghost" data-act="switch">Switch profile</button>
      </div>
    </section>

    ${syncCard(syncState)}

    <section class="card">
      <h3 class="card__title">Backup</h3>
      <p class="card__body">
        Export a copy before clearing browsing data or moving to a new phone.
      </p>
      <div class="card__actions">
        <button class="btn btn--primary" data-act="export">Export a copy</button>
        <label class="btn btn--ghost">
          Restore from a file
          <input type="file" accept="application/json,.json" hidden data-act="import">
        </label>
      </div>
      <p class="card__note" data-role="message"></p>
    </section>

    <section class="card card--danger">
      <h3 class="card__title">Reset</h3>
      <p class="card__body">
        Clears every habit, record and task in this profile and puts the
        starting list back. There is no undo — export first.
      </p>
      <div class="card__actions">
        <button class="btn btn--danger" data-act="reset">Reset ${profile ? profile.name : ''}</button>
      </div>
    </section>
  `;

  const message = el.querySelector('[data-role="message"]');
  const say = (text, tone = 'ok') => {
    message.textContent = text;
    message.dataset.tone = tone;
  };

  const syncNote = el.querySelector('[data-role="sync-message"]');
  const saySync = (text, tone = 'ok') => {
    if (!syncNote) return;
    syncNote.textContent = text;
    syncNote.dataset.tone = tone;
  };

  el.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-act]');
    if (!button) return;
    const act = button.dataset.act;

    if (act === 'switch') {
      clearActive();
      location.reload();
      return;
    }

    if (act === 'export') {
      exportState(store.getState(), profileId);
      say('Exported.');
      return;
    }

    if (act === 'reset') {
      if (button.dataset.armed !== 'true') {
        button.dataset.armed = 'true';
        button.textContent = 'Tap again to reset';
        return;
      }
      store.replaceState(seedFor(profileId));
      repaint();
      return;
    }

    if (act === 'connect') {
      const token = el.querySelector('#sync-token').value.trim();
      const gistId = el.querySelector('#sync-gist').value.trim();
      if (!token) return saySync('Paste a token first.', 'error');

      button.disabled = true;
      saySync('Connecting…');
      try {
        await sync.connect(token, gistId);
        repaint();
      } catch (err) {
        button.disabled = false;
        saySync(err.message, 'error');
      }
      return;
    }

    if (act === 'sync-now') {
      await sync.syncNow();
      const after = sync.status();
      if (after.error) saySync(after.error, 'error');
      return;
    }

    if (act === 'copy-gist') {
      await navigator.clipboard.writeText(syncState.gistId).catch(() => {});
      button.textContent = 'Copied';
      return;
    }

    if (act === 'disconnect') {
      if (button.dataset.armed !== 'true') {
        button.dataset.armed = 'true';
        button.textContent = 'Tap again to disconnect';
        return;
      }
      sync.disconnect();
      repaint();
    }
  });

  el.querySelector('[data-act="import"]').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const clean = validate(parsed);
      store.replaceState(clean);
      say(`Restored ${clean.habits.length} habits from ${file.name}.`);
      repaint();
    } catch (err) {
      say(`Could not read that file: ${err.message}`, 'error');
    } finally {
      event.target.value = '';
    }
  });

  return el;
}

function syncCard(state) {
  if (state.connected) {
    return `
      <section class="card">
        <h3 class="card__title">Sync</h3>
        <p class="card__body">
          Connected. ${state.busy ? 'Syncing…' : `Last synced ${ago(state.lastSyncedAt)}.`}
        </p>
        <p class="card__stat">
          Gist ID <code class="code">${state.gistId}</code>
        </p>
        <div class="card__actions">
          <button class="btn btn--primary" data-act="sync-now" ${state.busy ? 'disabled' : ''}>Sync now</button>
          <button class="btn btn--ghost" data-act="copy-gist">Copy ID</button>
          <button class="btn btn--danger" data-act="disconnect">Disconnect</button>
        </div>
        <p class="card__note" data-role="sync-message" ${state.error ? 'data-tone="error"' : ''}>${state.error ?? ''}</p>
        <p class="card__note">
          Paste that ID on your other device to point it at the same data.
        </p>
      </section>
    `;
  }

  return `
    <section class="card">
      <h3 class="card__title">Sync</h3>
      <p class="card__body">
        Optional. Keeps this profile in step across your phone and laptop.
        Everything works without it — this only saves you moving backups by hand.
      </p>

      <ol class="steps">
        <li>Open <span class="code">github.com/settings/personal-access-tokens</span> and create a fine-grained token.</li>
        <li>Give it <strong>Gists: Read and write</strong> and nothing else.</li>
        <li>Paste it below. Leave the Gist ID empty on the first device — one gets created for you.</li>
      </ol>

      <div class="field">
        <label class="field__label" for="sync-token">Token</label>
        <input class="field__input" id="sync-token" type="password" autocomplete="off" placeholder="github_pat_…">
      </div>

      <div class="field">
        <label class="field__label" for="sync-gist">
          Gist ID <span class="field__hint">second device only</span>
        </label>
        <input class="field__input" id="sync-gist" autocomplete="off" placeholder="leave empty the first time">
      </div>

      <div class="card__actions">
        <button class="btn btn--primary" data-act="connect">Connect</button>
      </div>

      <p class="card__note" data-role="sync-message"></p>
      <p class="card__note">
        The token is kept in this browser. Anyone who can use this browser can
        read it from developer tools, so only do this on your own devices.
      </p>
    </section>
  `;
}

/* The sync token is stored under a separate key and never reaches the state
   object, so it cannot leak into a backup that gets emailed around. */
function exportState(state, profileId) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habit-tracker-${profileId}-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rejects anything that is not a backup, so a wrong file cannot wipe a profile. */
function validate(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('not a backup file');
  if (!Array.isArray(parsed.habits)) throw new Error('no habits in it');
  if (!parsed.entries || typeof parsed.entries !== 'object') throw new Error('no records in it');
  return {
    version: parsed.version ?? 1,
    habits: parsed.habits,
    entries: parsed.entries,
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function ago(timestamp) {
  if (!timestamp) return 'never';
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function countEntries(state) {
  return Object.values(state.entries).filter((e) => e && e.done).length;
}

function countEvents(state) {
  return state.events.filter((e) => !e.deletedAt).length;
}
