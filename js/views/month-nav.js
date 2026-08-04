/* Shared month pager for the Month and Calendar views. */

import { MONTHS } from '../lib/date.js';
import { current, step } from '../lib/month-cursor.js';

export function monthNav(repaint, onStep) {
  const { year, month } = current();

  const nav = document.createElement('header');
  nav.className = 'month-nav';
  nav.innerHTML = `
    <button class="month-nav__arrow" data-step="-1" aria-label="Previous month">‹</button>
    <h2 class="month-nav__label">${MONTHS[month]} ${year}</h2>
    <button class="month-nav__arrow" data-step="1" aria-label="Next month">›</button>
  `;

  nav.addEventListener('click', (event) => {
    const value = event.target.closest('[data-step]')?.dataset.step;
    if (!value) return;
    step(Number(value));
    onStep?.();
    repaint();
  });

  return nav;
}
