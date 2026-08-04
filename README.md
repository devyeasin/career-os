# Career OS Tracker

A single-file, no-build daily life tracker for freelancers — deen, work, study, and money in one dashboard. Built as one static `.html` file backed by [Supabase](https://supabase.com), so it runs anywhere with a browser and syncs across devices.

**[Live demo](#)** · Just open `career-os-tracker.html` in a browser once it's connected to your own Supabase project.

## Why this exists

Freelancing, studying for a job exam, staying consistent with prayers, and marketing yourself across half a dozen platforms all compete for the same 24 hours. This tracker puts them on one screen instead of five different apps, so a single daily check-in updates everything: habit streaks, weekly targets, monthly totals, and a running 4-month plan.

## Features

- **Daily log** — one form, one save button. Study hours, commits, proposals, exercise, income/expenses, and more.
- **Deen** — 5-times prayer tracker with streaks, a tap-to-count tasbih counter, Qur'an pages/minutes, and a surah memorization checklist.
- **Work** — a freelance to-do list (Fiverr / Upwork / LinkedIn / client work), plus a social posting tracker across Instagram, Facebook, WhatsApp, Email, LinkedIn, X, YouTube, and TikTok with 7-day and 30-day rollups per platform.
- **Ideas** — a fast-capture inbox so ideas don't get lost mid-task.
- **Study** — a checklist for exam/engineering topics, plus a pre-built skill roadmap checklist.
- **4-Month Plan** — a title, target date, vision statement, and milestones grouped by month, with a live progress bar and day countdown.
- **Weekly / Monthly / Habits / Dashboard** — auto-generated rollups and a 30-day habit grid, all computed from the daily logs — nothing to fill in twice.

Everything auto-saves to Supabase as you go; the checklist-style features (tasks, ideas, study topics, milestones, surahs) save instantly on every check or add, no separate submit step.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run:
   ```sql
   create table tracker_data (
     id text primary key,
     payload jsonb not null,
     updated_at timestamptz default now()
   );
   alter table tracker_data enable row level security;
   create policy "allow all" on tracker_data for all using (true) with check (true);
   ```
   > This demo policy allows full read/write with just the anon key — fine for a single-user personal tracker, not for a multi-user or public deployment.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon/publishable key**.
4. Open `career-os-tracker.html` and near the bottom of the `<script>` tag, set:
   ```js
   const SUPABASE_URL = 'your-project-url';
   const SUPABASE_KEY = 'your-anon-key';
   ```
5. Open the file in a browser (or host it — see below). If the keys aren't set, the app shows a setup banner instead of failing silently.

## Hosting

No build step, so any static host works:

- **GitHub Pages** — push this file to a repo and enable Pages on the branch/folder it lives in.
- **Netlify / Vercel** — drag-and-drop deploy of the single HTML file.
- **Local** — just double-click the file; it still syncs, since all data lives in Supabase, not on disk.

## Data model

Everything is stored as JSON blobs in one `tracker_data` table, keyed by `id`:

| id | shape | contents |
|---|---|---|
| `entries` | `{ "YYYY-MM-DD": {...} }` | one object per day — prayers, Qur'an, study hours, income/expenses, social post counts, etc. |
| `config` | object | current level, quarter, focus skill, project, weekly/monthly goals |
| `tasks` | array | freelance to-do items, tagged by platform |
| `study` | array | exam/engineering study topics |
| `skills` | array | skill roadmap checklist (pre-seeded, editable) |
| `quran` | array | surahs being learned/memorized |
| `ideas` | array | idea inbox, tagged by type |
| `plan` | object | 4-month plan title, target date, vision |
| `milestones` | array | plan milestones, tagged by month (1–4) |

## Tech

Plain HTML/CSS/JS, no framework, no bundler. Talks to Supabase directly over its REST API using the anon key. All rollups (weekly/monthly/habit grid/dashboard) are computed client-side from the `entries` table on every load.

## License

Personal project — use and adapt freely.
