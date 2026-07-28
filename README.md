# Pulseboard — Project Tracker

A lightweight, premium-feeling project tracker: Dashboard, Projects, Tasks, and a drag-and-drop Kanban board. Built with vanilla HTML/CSS/JS + Chart.js, styled in a Fluent/Azure Portal/Linear-inspired system. Data is stored in your browser's localStorage — no backend needed to try it out.

## Running it

No build step required. Just open `index.html` in a browser, or serve the folder locally for the best experience:

```bash
# from this folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

(Opening `index.html` directly by double-clicking also works, since everything is relative paths + localStorage.)

## What's included

- **Dashboard** — 8 KPI cards, task-status doughnut chart, estimated-vs-actual hours bar chart, project progress, recent tasks, upcoming deadlines, team workload, and recent activity.
- **Projects** — card grid with search, status/priority filters, add/edit modal, delete with confirmation.
- **Tasks** — sortable/filterable table, search, add/edit modal, quick-complete, delete with confirmation.
- **Kanban Board** — drag cards between status columns, click a card to edit, add tasks per column.
- Light/dark mode, collapsible sidebar, tooltips throughout, toast notifications, and confirmation dialogs on every destructive action.

## Project structure

```
/css        variables.css (design tokens), base.css (shell + shared components),
            dashboard.css, data-views.css (tasks/projects), kanban.css
/js/utils   store.js (data layer), ui.js (toasts/tooltips/formatters), shell.js (nav)
/js/pages   dashboard.js, tasks.js, projects.js, kanban.js
/pages      tasks.html, projects.html, kanban.html
index.html  dashboard (entry point)
```

## Upgrading later

Everything reads/writes through `PT_STORE` in `js/utils/store.js` — every method is already `async`. To move to a real backend, swap the internals of that one file for `fetch()` calls to a REST API; no other file needs to change. It's also where you'd wire up real authentication, multi-user support, or a Postgres/SQLite database down the line.

## Resetting demo data

Open the browser console and run:
```js
localStorage.removeItem('pt_database_v1'); location.reload();
```
