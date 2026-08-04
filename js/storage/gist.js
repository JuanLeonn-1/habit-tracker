/* GitHub Gist as the sync store.

   A secret gist is used rather than a file in the repo because the repo has to
   be public for Pages to be free, and habit data has no business being public.
   A secret gist has an unguessable URL and is not indexed. */

const API = 'https://api.github.com';
const FILENAME = 'habit-tracker.json';

export function createGistClient(token) {
  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });

    if (!response.ok) throw new Error(explain(response.status));
    return response.status === 204 ? null : response.json();
  }

  return {
    /** Hits the gists endpoint directly, so it tests the one permission we need. */
    async verify() {
      await request('/gists?per_page=1');
      return true;
    },

    async create(state) {
      const gist = await request('/gists', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Habit Tracker data — managed by the app, do not edit by hand',
          public: false,
          files: { [FILENAME]: { content: JSON.stringify(state) } },
        }),
      });
      return gist.id;
    },

    async read(gistId) {
      const gist = await request(`/gists/${gistId}`);
      const file = gist.files?.[FILENAME];
      if (!file) throw new Error(`That gist has no ${FILENAME} in it.`);

      // Gists past 1MB come back with the content stripped and a raw_url in
      // its place. Unlikely here, but silently syncing a truncated file would
      // corrupt the data rather than fail loudly.
      const content = file.truncated
        ? await fetch(file.raw_url).then((r) => r.text())
        : file.content;

      return JSON.parse(content);
    },

    async write(gistId, state) {
      await request(`/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          files: { [FILENAME]: { content: JSON.stringify(state) } },
        }),
      });
    },
  };
}

function explain(status) {
  if (status === 401) return 'GitHub rejected that token. Check it was copied whole.';
  if (status === 403) return 'That token is missing Gist read/write permission.';
  if (status === 404) return 'No gist with that ID is visible to this token.';
  if (status === 422) return 'GitHub rejected the data.';
  if (status === 429) return 'Too many requests to GitHub. Try again in a minute.';
  return `GitHub returned an error (${status}).`;
}
