/* Create / edit a habit. Opens as a modal <dialog> — native gives escape-to-close
   and a focus trap for free.
   Delete confirms inline rather than via window.confirm: a native confirm blocks
   the whole page and is a worse experience on a phone. */

import { PALETTE_SIZE } from '../seed.js';

const TYPES = [
  ['daily', 'Daily', 'Streak in days'],
  ['weekly', 'Weekly', 'Streak in weeks'],
  ['flexible', 'Flexible', 'No streak, no target'],
];

export function openHabitEditor(store, habitId, onDone) {
  const habit = habitId ? store.habitById(habitId) : null;
  const draft = habit
    ? { ...habit }
    : { name: '', type: 'daily', icon: '', note: '', color: store.getState().habits.length % PALETTE_SIZE };

  const dialog = document.createElement('dialog');
  dialog.className = 'sheet';
  dialog.innerHTML = `
    <form method="dialog" class="sheet__form">
      <h2 class="sheet__title">${habit ? 'Edit habit' : 'New habit'}</h2>

      <div class="field field--split">
        <label class="field__label" for="he-icon">Icon</label>
        <input class="field__input field__input--icon" id="he-icon" maxlength="4" value="${attr(draft.icon)}" placeholder="✨">
        <label class="field__label" for="he-name">Name</label>
        <input class="field__input" id="he-name" value="${attr(draft.name)}" placeholder="Read for 20 min" required>
      </div>

      <fieldset class="field">
        <legend class="field__label">Type</legend>
        <div class="chips" id="he-types"></div>
      </fieldset>

      <fieldset class="field">
        <legend class="field__label">Colour</legend>
        <div class="swatches" id="he-colors"></div>
      </fieldset>

      <div class="field">
        <label class="field__label" for="he-note">Note <span class="field__hint">optional</span></label>
        <input class="field__input" id="he-note" value="${attr(draft.note)}" placeholder="litter · food · water">
      </div>

      <div class="sheet__actions">
        <button type="button" class="btn btn--ghost" data-act="cancel">Cancel</button>
        <button type="button" class="btn btn--primary" data-act="save">Save</button>
      </div>

      ${habit ? `
      <div class="sheet__danger">
        <button type="button" class="btn btn--ghost" data-act="archive">
          ${habit.archivedAt ? 'Unarchive' : 'Archive'}
        </button>
        <button type="button" class="btn btn--danger" data-act="delete">Delete</button>
        <p class="sheet__note">Archiving keeps the history. Deleting removes the habit and every record of it.</p>
      </div>` : ''}
    </form>
  `;

  /* type chips */
  const types = dialog.querySelector('#he-types');
  for (const [value, label, hint] of TYPES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.value = value;
    chip.innerHTML = `<span>${label}</span><small>${hint}</small>`;
    chip.setAttribute('aria-pressed', String(draft.type === value));
    chip.addEventListener('click', () => {
      draft.type = value;
      for (const c of types.children) c.setAttribute('aria-pressed', String(c.dataset.value === value));
    });
    types.append(chip);
  }

  /* colour swatches */
  const colors = dialog.querySelector('#he-colors');
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.setProperty('--pill', `var(--c${i})`);
    swatch.setAttribute('aria-label', `Colour ${i + 1}`);
    swatch.setAttribute('aria-pressed', String(draft.color === i));
    swatch.addEventListener('click', () => {
      draft.color = i;
      for (const s of colors.children) s.setAttribute('aria-pressed', String(Number(s.dataset.i) === i));
    });
    swatch.dataset.i = String(i);
    colors.append(swatch);
  }

  const close = () => {
    dialog.close();
    dialog.remove();
    onDone?.();
  };

  dialog.addEventListener('click', (event) => {
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (!act) return;

    if (act === 'cancel') return close();

    if (act === 'save') {
      const name = dialog.querySelector('#he-name').value.trim();
      if (!name) return dialog.querySelector('#he-name').focus();
      const patch = {
        name,
        type: draft.type,
        color: draft.color,
        icon: dialog.querySelector('#he-icon').value.trim(),
        note: dialog.querySelector('#he-note').value.trim(),
      };
      if (habit) store.updateHabit(habit.id, patch);
      else store.addHabit(patch);
      return close();
    }

    if (act === 'archive') {
      if (habit.archivedAt) store.unarchiveHabit(habit.id);
      else store.archiveHabit(habit.id);
      return close();
    }

    if (act === 'delete') {
      const button = event.target.closest('[data-act]');
      // Two-step: the second click is the confirmation.
      if (button.dataset.armed !== 'true') {
        button.dataset.armed = 'true';
        button.textContent = 'Tap again to delete';
        return;
      }
      store.deleteHabit(habit.id);
      return close();
    }
  });

  dialog.addEventListener('cancel', close);

  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('#he-name').focus();
}

function attr(value) {
  return String(value ?? '').replace(/"/g, '&quot;');
}
