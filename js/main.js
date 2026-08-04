/* Boot: resolve the profile, load that profile's state, render.
   Profile resolution happens here and only here — everything downstream is
   plain single-user code. */

import { getActiveId, setActiveId, profileById, stateKey } from './profiles.js';
import { createLocalAdapter } from './storage/local.js';
import { createStore } from './store.js';
import { seedFor } from './seed.js';
import { renderProfilePicker } from './views/profile.js';
import { renderToday } from './views/today.js';

const root = document.getElementById('app');

const ROUTES = {
  '#/today': { label: 'Today', render: renderToday },
};

boot();

async function boot() {
  const profileId = getActiveId();

  if (!profileId) {
    root.replaceChildren(renderProfilePicker(async (id) => {
      setActiveId(id);
      await boot();
    }));
    return;
  }

  const adapter = createLocalAdapter(stateKey(profileId));
  // First run for this profile seeds the starting habit list; every later run
  // loads whatever is there.
  const state = (await adapter.load()) || seedFor(profileId);
  const store = createStore({ adapter, state });

  await adapter.save(state);

  const shell = renderShell(profileId, store);
  root.replaceChildren(shell);

  store.subscribe(() => paint(shell, store));
  window.addEventListener('hashchange', () => paint(shell, store));
  paint(shell, store);
}

function renderShell(profileId, store) {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.innerHTML = `
    <header class="topbar">
      <h1 class="wordmark">Habit <span>Tracker</span></h1>
      <p class="topbar__profile">${profileById(profileId).name}</p>
    </header>
    <nav class="tabs"></nav>
    <main class="main"></main>
  `;

  const tabs = shell.querySelector('.tabs');
  for (const [hash, route] of Object.entries(ROUTES)) {
    const a = document.createElement('a');
    a.className = 'tabs__tab';
    a.href = hash;
    a.dataset.hash = hash;
    a.textContent = route.label;
    tabs.append(a);
  }

  return shell;
}

function paint(shell, store) {
  const hash = ROUTES[location.hash] ? location.hash : '#/today';

  for (const tab of shell.querySelectorAll('.tabs__tab')) {
    tab.setAttribute('aria-current', String(tab.dataset.hash === hash));
  }

  shell.querySelector('.main').replaceChildren(ROUTES[hash].render(store));
}
