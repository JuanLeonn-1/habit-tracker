/* Starting habit lists. These are only a starting point — everything here can
   be renamed, retyped, recoloured, reordered, archived or deleted in the app. */

import { uid } from './lib/id.js';

const MARIANA = [
  ['Drink 2L of water',   'daily',    '💧'],
  ['Morning skincare',    'daily',    '🌿'],
  ['Night skincare',      'daily',    '🌙'],
  ['Make the bed',        'daily',    '🛏️'],
  ['Cat care',            'daily',    '🐱', 'litter · food · water'],
  ['Exercise',            'flexible', '🏃'],
  ['English lessons',     'flexible', '📖'],
  ['No spend day',        'flexible', '💰'],
  ['No sugar day',        'flexible', '🍰'],
  ['Laundry',             'flexible', '🧺'],
];

const LEON = [
  ['Morning skincare',          'daily',    '🌿'],
  ['Night skincare',            'daily',    '🌙'],
  ['Make the bed',              'daily',    '🛏️'],
  ['Drink 2L of water',         'daily',    '💧'],
  ['Review tasks & assignments','daily',    '📋'],
  ['Sleep 7h+',                 'daily',    '😴'],
  ['Walk 6k steps',             'daily',    '👟'],
  ['Dog care (Candy)',          'flexible', '🐶'],
  ['Go to the gym',             'flexible', '🏋️'],
  ['Sweep the room',            'flexible', '🧹'],
  ['Read',                      'flexible', '📚'],
  ['Organize clothes',          'flexible', '👕'],
  ['Independent study session', 'flexible', '✏️'],
  ['Plan the week',             'weekly',   '🗓️'],
];

const LISTS = { mariana: MARIANA, leon: LEON };

export const PALETTE_SIZE = 12;

export function seedFor(profileId) {
  const now = Date.now();
  const rows = LISTS[profileId] || [];

  return {
    version: 1,
    updatedAt: now,
    habits: rows.map(([name, type, icon, note], i) => ({
      // Deterministic, not random: two devices that seed the same profile
      // independently must land on the same ids, or syncing would treat them
      // as twenty different habits instead of ten.
      id: `${profileId}-${i}`,
      name,
      type,
      icon,
      note: note || '',
      color: i % PALETTE_SIZE,
      order: i,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    })),
    entries: {},
    events: [],
  };
}

export function emptyState() {
  return { version: 1, updatedAt: Date.now(), habits: [], entries: {}, events: [] };
}
