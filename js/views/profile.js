/* Profile picker. Shown once per device, then remembered.
   Reachable again from Settings. */

import { PROFILES } from '../profiles.js';

export function renderProfilePicker(onPick) {
  const el = document.createElement('section');
  el.className = 'picker';
  el.innerHTML = `
    <h1 class="wordmark">Habit <span>Tracker</span></h1>
    <p class="picker__hint">Who's this?</p>
    <div class="picker__options"></div>
  `;

  const options = el.querySelector('.picker__options');
  PROFILES.forEach((profile, i) => {
    const button = document.createElement('button');
    button.className = 'picker__option';
    button.style.setProperty('--pill', `var(--c${i * 4})`);
    button.textContent = profile.name;
    button.addEventListener('click', () => onPick(profile.id));
    options.append(button);
  });

  return el;
}
