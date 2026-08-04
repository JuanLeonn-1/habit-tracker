/* One day's to-dos. Opens from a calendar cell.
   Titles are always live inputs rather than click-to-edit — one less state to
   get wrong, and on a phone it means one tap to fix a typo instead of two. */

import { fromKey, MONTHS, WEEKDAYS } from '../lib/date.js';
import { PALETTE_SIZE } from '../seed.js';

export function openDaySheet(store, dateKey, onDone) {
  const date = fromKey(dateKey);
  let draftColor = 0;

  const dialog = document.createElement('dialog');
  dialog.className = 'sheet';
  dialog.innerHTML = `
    <div class="sheet__form">
      <h2 class="sheet__title">
        ${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]} ${date.getDate()}
      </h2>

      <ul class="todos"></ul>

      <form class="todo-add">
        <input class="field__input" id="ds-title" placeholder="Add something" autocomplete="off">
        <div class="swatches swatches--compact" id="ds-colors"></div>
        <button class="btn btn--primary" type="submit">Add</button>
      </form>

      <div class="sheet__actions">
        <button type="button" class="btn btn--ghost" data-act="close">Done</button>
      </div>
    </div>
  `;

  const list = dialog.querySelector('.todos');
  const colors = dialog.querySelector('#ds-colors');
  const input = dialog.querySelector('#ds-title');

  for (let i = 0; i < PALETTE_SIZE; i++) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.dataset.i = String(i);
    swatch.style.setProperty('--pill', `var(--c${i})`);
    swatch.setAttribute('aria-label', `Colour ${i + 1}`);
    swatch.setAttribute('aria-pressed', String(i === draftColor));
    swatch.addEventListener('click', () => {
      draftColor = i;
      for (const s of colors.children) s.setAttribute('aria-pressed', String(Number(s.dataset.i) === i));
    });
    colors.append(swatch);
  }

  function paintList() {
    const events = store.eventsFor(dateKey);
    list.replaceChildren();

    if (events.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'todos__empty';
      empty.textContent = 'Nothing planned.';
      list.append(empty);
      return;
    }

    for (const event of events) {
      list.append(todoRow(store, event, paintList));
    }
  }

  dialog.querySelector('.todo-add').addEventListener('submit', (submitEvent) => {
    submitEvent.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    store.addEvent({ date: dateKey, title, color: draftColor });
    input.value = '';
    input.focus();
    paintList();
  });

  const close = () => {
    dialog.close();
    dialog.remove();
    onDone?.();
  };

  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-act="close"]')) close();
  });
  dialog.addEventListener('cancel', close);

  paintList();
  document.body.append(dialog);
  dialog.showModal();
  input.focus();
}

function todoRow(store, event, refresh) {
  const li = document.createElement('li');
  li.className = 'todo';
  li.dataset.done = String(event.done);
  li.style.setProperty('--pill', `var(--c${event.color})`);

  const check = document.createElement('button');
  check.className = 'todo__check';
  check.setAttribute('aria-pressed', String(event.done));
  check.setAttribute('aria-label', `Mark "${event.title}" done`);
  check.addEventListener('click', () => {
    store.toggleEvent(event.id);
    refresh();
  });

  const title = document.createElement('input');
  title.className = 'todo__title';
  title.value = event.title;
  title.addEventListener('change', () => {
    const value = title.value.trim();
    // An emptied field means delete — otherwise a blank row lingers with no
    // obvious way to get rid of it.
    if (value) store.updateEvent(event.id, { title: value });
    else store.deleteEvent(event.id);
    refresh();
  });

  const remove = document.createElement('button');
  remove.className = 'todo__remove';
  remove.textContent = '×';
  remove.setAttribute('aria-label', `Delete "${event.title}"`);
  remove.addEventListener('click', () => {
    store.deleteEvent(event.id);
    refresh();
  });

  li.append(check, title, remove);
  return li;
}
