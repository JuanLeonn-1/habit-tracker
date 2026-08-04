/* The month grid — the paper sheet, one row per habit, one column per day.
   This view is for REVIEWING a month. The daily tick lives in Today, because
   31 columns on a 375px screen give ~10px cells that nobody can hit. */

import { WEEKDAYS, monthDays, fromKey, isToday } from '../lib/date.js';
import { current } from '../lib/month-cursor.js';
import { stats } from '../lib/streaks.js';
import { monthNav } from './month-nav.js';
import { openHabitEditor } from './habit-editor.js';

// Re-rendering rebuilds the table, which would snap the horizontal scroll back
// to day 1 every time a cell is ticked. Remembered here and restored after paint.
let scrollLeft = 0;

export function renderMonth(store, repaint) {
  const { year, month } = current();

  const el = document.createElement('section');
  el.append(monthNav(repaint, () => { scrollLeft = 0; }));

  const habits = store.habits();
  if (habits.length === 0) el.append(empty('No habits yet.'));
  else el.append(table(store, habits, year, month));

  el.append(addButton(store, repaint));

  const archived = store.archivedHabits();
  if (archived.length) el.append(archivedList(store, archived, repaint));

  return el;
}

function table(store, habits, year, month) {
  const days = monthDays(year, month);
  const entries = store.getState().entries;

  const wrap = document.createElement('div');
  wrap.className = 'grid-wrap';

  const table = document.createElement('table');
  table.className = 'grid';

  /* head — weekday initial over the day number, as on the reference sheet */
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th class="grid__corner" scope="col">Habit</th>`;
  for (const key of days) {
    const date = fromKey(key);
    const th = document.createElement('th');
    th.className = 'grid__day';
    th.scope = 'col';
    th.dataset.today = String(isToday(key));
    th.dataset.weekend = String(date.getDay() === 0 || date.getDay() === 6);
    th.innerHTML = `<small>${WEEKDAYS[date.getDay()][0]}</small>${date.getDate()}`;
    headRow.append(th);
  }
  headRow.insertAdjacentHTML('beforeend', `<th class="grid__total" scope="col">Total</th>`);
  head.append(headRow);
  table.append(head);

  /* body */
  const body = document.createElement('tbody');
  for (const habit of habits) {
    const info = stats(habit, entries, year, month);
    const tr = document.createElement('tr');
    tr.style.setProperty('--pill', `var(--c${habit.color})`);

    const name = document.createElement('th');
    name.className = 'grid__name';
    name.scope = 'row';
    const nameButton = document.createElement('button');
    nameButton.className = 'grid__pill';
    nameButton.innerHTML = `
      <span class="grid__pill-icon" aria-hidden="true">${habit.icon || ''}</span>
      <span class="grid__pill-text">
        <span class="grid__pill-name">${escapeHtml(habit.name)}</span>
        <small>${escapeHtml(info.label)}</small>
      </span>`;
    nameButton.addEventListener('click', () => openHabitEditor(store, habit.id, () => {
      scrollLeft = wrap.scrollLeft;
    }));
    name.append(nameButton);
    tr.append(name);

    for (const key of days) {
      const td = document.createElement('td');
      td.className = 'grid__cell';
      td.dataset.today = String(isToday(key));
      const cell = document.createElement('button');
      cell.className = 'grid__tick';
      const done = store.isDone(habit.id, key);
      cell.dataset.done = String(done);
      cell.setAttribute('aria-pressed', String(done));
      cell.setAttribute('aria-label', `${habit.name}, ${key}`);
      cell.addEventListener('click', () => {
        scrollLeft = wrap.scrollLeft;
        store.toggleEntry(habit.id, key);
      });
      td.append(cell);
      tr.append(td);
    }

    const total = document.createElement('td');
    total.className = 'grid__total';
    total.textContent = String(info.count);
    tr.append(total);

    body.append(tr);
  }
  table.append(body);
  wrap.append(table);

  // Restore after the browser has laid the table out.
  requestAnimationFrame(() => { wrap.scrollLeft = scrollLeft; });

  return wrap;
}

function addButton(store, repaint) {
  const button = document.createElement('button');
  button.className = 'btn btn--add';
  button.textContent = '+  Add habit';
  button.addEventListener('click', () => openHabitEditor(store, null, repaint));
  return button;
}

function archivedList(store, archived, repaint) {
  const details = document.createElement('details');
  details.className = 'archived';
  details.innerHTML = `<summary>Archived (${archived.length})</summary>`;
  const list = document.createElement('div');
  list.className = 'archived__list';
  for (const habit of archived) {
    const button = document.createElement('button');
    button.className = 'archived__item';
    button.style.setProperty('--pill', `var(--c${habit.color})`);
    button.textContent = `${habit.icon || ''} ${habit.name}`;
    button.addEventListener('click', () => openHabitEditor(store, habit.id, repaint));
    list.append(button);
  }
  details.append(list);
  return details;
}

function empty(text) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = text;
  return p;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
