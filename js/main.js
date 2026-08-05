/* Boot: resolve the profile, load that profile's state, render.
   Profile resolution happens here and only here — everything downstream is
   plain single-user code. */

import { getActiveId, setActiveId, profileById, stateKey } from './profiles.js';
import { createLocalAdapter } from './storage/local.js';
import { createStore } from './store.js';
import { seedFor } from './seed.js';
import { renderProfilePicker } from './views/profile.js';
import { renderToday } from './views/today.js';
import { renderMonth } from './views/grid.js';
import { renderYear } from './views/year.js';
import { renderCalendar } from './views/calendar.js';
import { renderSettings } from './views/settings.js';
import { createSync } from './sync.js';

const root = document.getElementById('app');

const ROUTES = {
  '#/today': { label: 'Today', render: renderToday },
  '#/month': { label: 'Month', render: renderMonth },
  '#/year': { label: 'Year', render: renderYear },
  '#/calendar': { label: 'Calendar', render: renderCalendar },
  '#/settings': { label: 'Settings', render: renderSettings },
};

// Keeps the phone's browser chrome in step with the profile's theme; a cream
// bar above a dark page is the tell that an app was themed halfway.
const THEME_COLOR = { mariana: '#fbf7f0', leon: '#171a1f' };

function applyTheme(profileId) {
  if (profileId) document.documentElement.dataset.profile = profileId;
  else delete document.documentElement.dataset.profile;

  document.querySelector('meta[name="theme-color"]')
    .setAttribute('content', THEME_COLOR[profileId] ?? '#fbf7f0');
}

boot();

async function boot() {
  const profileId = getActiveId();

  if (!profileId) {
    applyTheme(null);
    root.replaceChildren(renderProfilePicker(async (id) => {
      setActiveId(id);
      await boot();
    }));
    return;
  }

  // The only line that themes the app. Every colour downstream is a token,
  // so a profile theme is a CSS override block and nothing else.
  applyTheme(profileId);

  const adapter = createLocalAdapter(stateKey(profileId));
  // First run for this profile seeds the starting habit list; every later run
  // loads whatever is there.
  const state = (await adapter.load()) || seedFor(profileId);
  const store = createStore({ adapter, state });

  await adapter.save(state);

  const shell = renderShell(profileId, store);
  root.replaceChildren(shell);

  const ctx = { profileId };
  ctx.sync = createSync({
    store,
    profileId,
    onStatus: () => paint(shell, store, ctx),
  });

  store.subscribe(() => paint(shell, store, ctx));
  window.addEventListener('hashchange', () => paint(shell, store, ctx));
  paint(shell, store, ctx);

  // Pull whatever the other device did while this one was closed.
  ctx.sync.syncNow();
}

function renderShell(profileId, store) {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.innerHTML = `
    <header class="topbar">
      <h1 class="wordmark">Habit <span>Tracker</span></h1>
      <button class="topbar__profile" title="Switch profile">${profileById(profileId).name}</button>
    </header>
    <nav class="tabs"></nav>
    <main class="main"></main>
  `;

  // Goes to Settings rather than switching straight away — tapping your own
  // name and being signed out is a nasty surprise.
  shell.querySelector('.topbar__profile').addEventListener('click', () => {
    location.hash = '#/settings';
  });

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

function paint(shell, store, ctx) {
  const hash = ROUTES[location.hash] ? location.hash : '#/today';

  for (const tab of shell.querySelectorAll('.tabs__tab')) {
    tab.setAttribute('aria-current', String(tab.dataset.hash === hash));
  }

  const repaint = () => paint(shell, store, ctx);
  shell.querySelector('.main').replaceChildren(ROUTES[hash].render(store, repaint, ctx));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Failure is not fatal — the app runs fine without it, just without
    // offline support.
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
