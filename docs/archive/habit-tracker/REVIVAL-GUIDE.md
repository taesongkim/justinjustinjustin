# Habit Tracker — Revival Guide

Last active: March 2026

> [!WARNING]
> Historical reference only. The SQL below uses unrestricted `Allow all`
> policies, generic table names, and destructive teardown instructions. Do not
> run it against a current or shared Supabase project. Before any revival,
> namespace the schema and replace every policy with authenticated,
> ownership-scoped RLS.

## Supabase Project Info

- Env vars needed: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`)
- Storage bucket: `avatars` (public)
- Realtime enabled on all 6 tables

---

## Database Schema (full recreation SQL)

Run these in order in the Supabase SQL Editor to recreate from scratch:

```sql
-- 1. Users
create table users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  goals text default '' not null,
  sort_order int default 0 not null,
  created_at timestamptz default now() not null
);
alter table users enable row level security;
create policy "Allow all" on users for all using (true) with check (true);
alter publication supabase_realtime add table users;

-- 2. Cards (one per user per day)
create table cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  date date not null,
  note text default '' not null,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);
alter table cards enable row level security;
create policy "Allow all" on cards for all using (true) with check (true);
alter publication supabase_realtime add table cards;

-- 3. Habits (belong to a card)
create table habits (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references cards(id) on delete cascade not null,
  text text not null,
  checked boolean default false not null,
  sort_order int default 0 not null
);
alter table habits enable row level security;
create policy "Allow all" on habits for all using (true) with check (true);
alter publication supabase_realtime add table habits;

-- 4. Journeys (date ranges per user)
create table journeys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now() not null
);
alter table journeys enable row level security;
create policy "Allow all" on journeys for all using (true) with check (true);
alter publication supabase_realtime add table journeys;

-- 5. Avatar GIFs (one per user per mood)
create table avatar_gifs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  mood text not null check (mood in ('celebrating','walking','walking_happy','dancing','sad','dancing_sensual')),
  storage_path text not null,
  created_at timestamptz default now() not null,
  unique(user_id, mood)
);
alter table avatar_gifs enable row level security;
create policy "Allow all" on avatar_gifs for all using (true) with check (true);
alter publication supabase_realtime add table avatar_gifs;

-- 6. Avatar Moods (per user per day mood selection)
create table avatar_moods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  date date not null,
  mood text not null check (mood in ('celebrating','walking','walking_happy','dancing','sad','dancing_sensual')),
  created_at timestamptz default now() not null,
  unique(user_id, date)
);
alter table avatar_moods enable row level security;
create policy "Allow all" on avatar_moods for all using (true) with check (true);
alter publication supabase_realtime add table avatar_moods;
create index avatar_moods_user_date_idx on avatar_moods(user_id, date);
```

---

## Data Export SQL

Run each of these in the Supabase SQL Editor and export the results as CSV:

```sql
-- Export users
select * from users order by sort_order;

-- Export cards
select * from cards order by date, user_id;

-- Export habits
select h.*, c.date, c.user_id
from habits h
join cards c on c.id = h.card_id
order by c.date, c.user_id, h.sort_order;

-- Export journeys
select * from journeys order by user_id, start_date;

-- Export avatar_gifs
select * from avatar_gifs order by user_id, mood;

-- Export avatar_moods
select * from avatar_moods order by user_id, date;
```

Save these CSVs alongside this file. To re-import later, use Supabase's CSV import in Table Editor, or `\copy` via psql.

---

## Storage Bucket

The `avatars` bucket (public) stores GIF files at paths like `{userId}/{mood}.gif`.

To back up: go to Supabase Dashboard → Storage → avatars → download all files manually, or use the Supabase CLI:

```bash
# List all files
supabase storage ls avatars --project-ref YOUR_PROJECT_REF

# Or use the API to list and download
curl "https://YOUR_PROJECT.supabase.co/storage/v1/object/list/avatars" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Save the GIF files in a folder called `avatar-backups/` next to this guide.

---

## Teardown SQL (to drop everything)

```sql
drop table if exists avatar_moods cascade;
drop table if exists avatar_gifs cascade;
drop table if exists journeys cascade;
drop table if exists habits cascade;
drop table if exists cards cascade;
drop table if exists users cascade;
```

Then delete the `avatars` storage bucket from the dashboard.

---

## App Architecture Notes

- **Framework**: Next.js App Router, React 19, TypeScript, `"use client"` components
- **Supabase client**: `lib/supabase.ts` — needs two env vars
- **Data layer**: `lib/service.ts` — all CRUD + realtime subscriptions
- **Types**: `lib/types.ts` — User, Card, Habit, Journey, AvatarGif, AvatarMoodEntry, AvatarMood
- **Main component**: `components/HabitTracker.tsx` — orchestrates everything
- **Sub-components**: Card, JourneyProgressBar, JourneyManager, AvatarDisplay, AvatarManager
- **Styling**: `habit-tracker.css` — all custom CSS, no Tailwind
- **Animations**: CSS keyframes only (CSP blocks eval), seeded PRNG for sparkle variety
- **Timezone**: stored in localStorage (`ht-timezone`), defaults to America/New_York
- **Journey dots**: dynamic sizing via flex-shrink, sparkle on status change
- **Avatar default mood**: "walking" (no DB row needed, component falls back)
