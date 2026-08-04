/* The daily interaction: open, tick two or three things, leave.
   This is the default view on a phone because the month grid is for reviewing,
   not for doing — 31 columns on a 375px screen give untappable cells. */

import { today, fromKey, WEEKDAYS, MONTHS } from '../lib/date.js';
import { stats } from '../lib/streaks.js';

export function renderToday(store) {
  const el = document.createElement('section');
  const key = today();
  const date = fromKey(key);

  el.innerHTML = `
    <header class="view-head">
      <p class="view-head__eyebrow">${WEEKDAYS[date.getDay()]}</p>
      <h2 class="view-head__title">${MONTHS[date.getMonth()]} ${date.getDate()}</h2>
    </header>
    <ul class="habits"></ul>
  `;

  const list = el.querySelector('.habits');
  const habits = store.habits();

  if (habits.length === 0) {
    list.replaceWith(emptyState());
    return el;
  }

  for (const habit of habits) {
    list.append(habitRow(store, habit, key, date));
  }

  return el;
}

function habitRow(store, habit, key, date) {
  const done = store.isDone(habit.id, key);
  const info = stats(habit, store.getState().entries, date.getFullYear(), date.getMonth());

  const li = document.createElement('li');
  li.className = 'habit';
  li.style.setProperty('--pill', `var(--c${habit.color})`);

  const button = document.createElement('button');
  button.className = 'habit__hit';
  button.setAttribute('aria-pressed', String(done));
  button.innerHTML = `
    <span class="habit__check" aria-hidden="true"></span>
    <span class="habit__body">
      <span class="habit__name">
        <span class="habit__icon" aria-hidden="true">${habit.icon || ''}</span>${escapeHtml(habit.name)}
      </span>
      <span class="habit__meta">${escapeHtml(info.label)}${habit.note ? ` · ${escapeHtml(habit.note)}` : ''}</span>
    </span>
  `;
  button.addEventListener('click', () => store.toggleEntry(habit.id, key));

  li.dataset.done = String(done);
  li.append(button);
  return li;
}

function emptyState() {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = 'No habits yet. Add one to get started.';
  return p;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
