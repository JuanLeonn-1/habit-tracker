/* Profile switching, backup and reset. */

import { profileById, getActiveId, clearActive } from '../profiles.js';
import { seedFor } from '../seed.js';
import { today } from '../lib/date.js';

export function renderSettings(store, repaint) {
  const profileId = getActiveId();
  const profile = profileById(profileId);
  const state = store.getState();

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

    <section class="card">
      <h3 class="card__title">Backup</h3>
      <p class="card__body">
        Data lives in this browser only. Export a copy before clearing browsing
        data or moving to a new phone.
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

  el.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-act]');
    if (!button) return;

    if (button.dataset.act === 'switch') {
      clearActive();
      location.reload();
      return;
    }

    if (button.dataset.act === 'export') {
      exportState(store.getState(), profileId);
      say('Exported.');
      return;
    }

    if (button.dataset.act === 'reset') {
      if (button.dataset.armed !== 'true') {
        button.dataset.armed = 'true';
        button.textContent = 'Tap again to reset';
        return;
      }
      store.replaceState(seedFor(profileId));
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

function countEntries(state) {
  return Object.values(state.entries).filter((e) => e && e.done).length;
}

function countEvents(state) {
  return state.events.filter((e) => !e.deletedAt).length;
}
