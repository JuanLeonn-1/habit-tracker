# Habit Tracker

A habit tracker and monthly calendar, hosted on GitHub Pages.

**Live:** https://JuanLeonn-1.github.io/habit-tracker/

## What it is

Two independent profiles, each with their own habits, records and calendar.
Data lives in `localStorage`, with optional sync to a secret Gist so a phone and
a laptop stay in step.

No build step — plain HTML, CSS and ES modules. Editing a file and pushing is
the whole deploy cycle.

## Local development

Modules need to be served over HTTP, not opened from the filesystem:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

## Planning

See [PLAN.md](PLAN.md) for the architecture and the decisions behind it.
