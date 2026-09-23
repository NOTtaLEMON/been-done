# DidIt — a past-tense work log

Not a planner. A log of what you actually did, organized Monday–Sunday, with
stats, a GitHub-style heatmap, and streaks. Static site, no backend, no
login — everything lives in your browser's localStorage. Neo-brutalist UI
(thick borders, hard shadows, Space Grotesk), built mobile-first since a work
log is something you fill in from your phone.

## Running it

```bash
python -m http.server 8935
```

Then open http://localhost:8935. Or just open `index.html` directly (some
browsers restrict localStorage on `file://`, so a local server is more
reliable).

To install it as an app on your phone or laptop, open it in Chrome/Edge and
use "Install app" / "Add to Home Screen".

## Hosting on GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → Deploy from branch → `main` / root.
3. Your log is live at `https://<username>.github.io/<repo>/`.

## Features

- **Week view**: Monday–Sunday cards for the current week, entry counts per
  day, "What did I do today?" quick-log button. Navigate to any week to
  back-fill.
- **Log a session**: the log modal works like a todo list — type a task, hit
  + Add (or Enter), it drops into "This session," and you keep adding as many
  as you did that day before hitting Save. Each task can carry its own tag and
  mood. Quick-add chips surface things you've logged more than once, so
  repeat tasks are one tap.
- **History**: every entry, searchable and filterable by tag, grouped by day.
- **Calendar heatmap**: GitHub-contributions-style year view — darker squares
  mean more logged that day. Click any square to see/add entries for it.
- **Stats**: total logged, active days, current & longest streak, a bar chart
  of which weekday you log the most on, a 12-week trend chart, a by-tag
  breakdown, and a word cloud of your most common words.
- **Streak counter**: shown as a 🔥 pill in the header once you're on one.
- **Badges**: unlockable milestones — first entry, 7/30-day streaks, 50/100/500
  logged, night owl, early bird, weekend warrior, full week, tag explorer —
  with a confetti pop the moment you earn one.
- **"On this day"**: a flashback card on the Week tab showing what you did 1/2/3/4
  weeks or a year ago, if anything was logged.
- **Surprise me**: pulls a random past entry from your whole history.
- **Tags**: fully editable (name + color) in Settings.
- **Theme**: auto/light/dark. **Layout**: force phone or laptop, or auto.
- **Backup**: export/import as JSON (this is your only backup — localStorage
  is wiped if you clear browser data).
- **Keyboard shortcuts**: `L` opens the log modal, `/` jumps to History and
  focuses search.

## Data model

Everything is plain JSON in localStorage:
- `worklog.entries.v1` — array of `{ id, date, text, tag, mood, createdAt }`
- `worklog.tags.v1` — array of `{ name, color }`
- `worklog.settings.v1` — `{ theme, layout }`

No external services, no analytics, no CDN dependencies — charts and the
heatmap are hand-rolled SVG/CSS so it works fully offline.
