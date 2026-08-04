/* The monthly calendar — the bottom half of the reference sheet.
   Days of the week across, notes stacked inside each day. */

import { calendarWeeks, WEEKDAYS, isToday } from '../lib/date.js';
import { current } from '../lib/month-cursor.js';
import { monthNav } from './month-nav.js';
import { openDaySheet } from './day-sheet.js';

export function renderCalendar(store, repaint) {
  const { year, month } = current();

  const el = document.createElement('section');
  el.append(monthNav(repaint));

  const table = document.createElement('table');
  table.className = 'cal';

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const day of WEEKDAYS) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = day;
    headRow.append(th);
  }
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  for (const week of calendarWeeks(year, month)) {
    const tr = document.createElement('tr');
    for (const day of week) {
      tr.append(dayCell(store, day, repaint));
    }
    body.append(tr);
  }
  table.append(body);

  el.append(table);
  el.append(hint());
  return el;
}

function dayCell(store, { key, day, inMonth }, repaint) {
  const events = store.eventsFor(key);

  const td = document.createElement('td');
  td.className = 'cal__cell';
  td.dataset.inMonth = String(inMonth);
  td.dataset.today = String(isToday(key));

  const button = document.createElement('button');
  button.className = 'cal__day';
  button.setAttribute('aria-label', `${key}, ${events.length} item${events.length === 1 ? '' : 's'}`);
  button.addEventListener('click', () => openDaySheet(store, key, repaint));

  const num = document.createElement('span');
  num.className = 'cal__num';
  num.textContent = String(day);
  button.append(num);

  const notes = document.createElement('span');
  notes.className = 'cal__notes';
  for (const event of events) {
    const note = document.createElement('span');
    note.className = 'cal__note';
    note.dataset.done = String(event.done);
    note.style.setProperty('--pill', `var(--c${event.color})`);
    note.textContent = event.title;
    notes.append(note);
  }
  button.append(notes);

  td.append(button);
  return td;
}

function hint() {
  const p = document.createElement('p');
  p.className = 'cal__hint';
  p.textContent = 'Tap a day to add tasks and notes.';
  return p;
}
