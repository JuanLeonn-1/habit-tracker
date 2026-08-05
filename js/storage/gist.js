/* GitHub Gist as the sync store.

   A secret gist is used rather than a file in the repo because the repo has to
   be public for Pages to be free, and habit data has no business being public. */

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

  async function read(gistId) {
    const gist = await request(`/gists/${gistId}`);
    const file = gist.files?.[FILENAME];
    if (!file) throw new Error(`That gist has no ${FILENAME} in it.`);

    // Gists past 1MB come back with the content stripped and a raw_url in its
    // place. Unlikely here, but syncing a truncated file would corrupt the
    // data rather than fail loudly.
    const content = file.truncated
      ? await fetch(file.raw_url).then((r) => r.text())
      : file.content;

    return JSON.parse(content);
  }

  return {
    /** Hits the gists endpoint directly, so it tests the one permission we need. */
    async verify() {
      await request('/gists?per_page=1');
      return true;
    },

    read,

    /**
     * Sync files on this account that belong to this profile.
     *
     * Connecting with the Gist ID left empty used to create a new one every
     * time, so a second device would quietly start syncing against its own
     * private copy while appearing to work. Looking first turns that into
     * either the right answer or a clear question.
     */
    async findForProfile(profileId) {
      const gists = await request('/gists?per_page=100');
      const found = [];

      for (const gist of gists) {
        if (!gist.files?.[FILENAME]) continue;
        try {
          const data = await read(gist.id);
          // Gists created before profiles were stamped have no marker; they
          // are still candidates rather than silently ignored.
          if (!data.profile || data.profile === profileId) found.push(gist.id);
        } catch {
          /* unreadable or not ours — skip */
        }
      }

      return found;
    },

    async create(state, profileId) {
      const gist = await request('/gists', {
        method: 'POST',
        body: JSON.stringify({
          description: `Habit Tracker data (${profileId}) — managed by the app, do not edit by hand`,
          public: false,
          files: { [FILENAME]: { content: stamp(state, profileId) } },
        }),
      });
      return gist.id;
    },

    async write(gistId, state, profileId) {
      await request(`/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          files: { [FILENAME]: { content: stamp(state, profileId) } },
        }),
      });
    },
  };
}

/* Every gist carries which profile it belongs to, so pasting the wrong ID into
   the wrong profile bounces instead of blending two people's habits together. */
function stamp(state, profileId) {
  return JSON.stringify({ ...state, profile: profileId });
}

function explain(status) {
  if (status === 401) return 'GitHub rejected that token. Check it was copied whole.';
  if (status === 403) return 'That token is missing Gist read/write permission.';
  if (status === 404) return 'No gist with that ID is visible to this token.';
  if (status === 422) return 'GitHub rejected the data.';
  if (status === 429) return 'Too many requests to GitHub. Try again in a minute.';
  return `GitHub returned an error (${status}).`;
}
