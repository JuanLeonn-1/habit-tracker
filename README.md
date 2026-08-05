# Habit Tracker

A habit tracker and monthly calendar, hosted on GitHub Pages.

**Live:** https://JuanLeonn-1.github.io/habit-tracker/
**Tests:** https://JuanLeonn-1.github.io/habit-tracker/tests/

## What it is

Two independent profiles, each with their own habits, records, calendar and
theme. Data lives in `localStorage`, with optional sync to a secret Gist so a
phone and a laptop stay in step. Installable as a PWA and fully usable offline.

No build step — plain HTML, CSS and ES modules. Editing a file and pushing is
the whole deploy cycle.

## Views

- **Today** — the daily checklist. Open, tick, leave.
- **Month** — the paper grid: habits down, days across.
- **Year** — one thin bar per day, a year at a glance.
- **Calendar** — month view with tasks and notes per day.
- **Settings** — profile, sync, backup, reset.

## Local development

Modules need to be served over HTTP, not opened from the filesystem:

```sh
python -m http.server 8000
# app   → http://localhost:8000
# tests → http://localhost:8000/tests/
```

## Deploying

`git push` to `main`. GitHub Pages publishes in about a minute.

Bump `VERSION` in `sw.js` whenever a cached file changes, or clients keep
serving the previous build until their second visit.

## Before changing date, merge or sync logic

Run the tests. `js/lib/date.js`, `js/lib/merge.js` and `js/sync.js` are the
three places where a bug is silent — nothing crashes, a day just lands on the
wrong date or a tick quietly disappears.

## Architecture

See [PLAN.md](PLAN.md) for the data model, the sync design, and the reasoning
behind the decisions — including the ones learned by breaking them.
