# badminton-team-manager

React + TypeScript foundation for a badminton team management system.

## Features

- Protected app with Supabase email/password authentication
- **Club Contacts** page with curated league contact details, venue addresses, and structured venue notes
- **Matches** page with chronological numbering (`Match 1`, `Match 2`, …), calendar export, and admin-only match creation
- Home/away match entry with home venue managed in Settings and away venue selection from opponent club venues
- Add Match opponent selection from the curated club list, including filtered venue choices and optional opponent team number (`1` to `5`)
- Supabase-backed player accounts with self-serve match availability, plus admin availability updates, squad selection, and pair assignment for each fixture
- Admin-only user management page for inviting new users into Supabase
- **Overview** page with a read-only match table, player availability/selection snapshots, and per-match calendar export
- Match result logging for configurable league formats, with configurable squad rules, pair slots, rubbers per player, and best-of-3 game scoring to 21 with a 30-point cap
- **Settings** page for editing the current team profile and default league/match-format configuration

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Project structure

- `/src/app/router.tsx` - route map and feature page wiring
- `/src/auth` - authentication context/provider, hook, and auth service layer
- `/src/components/layout` - responsive app shell/header/navigation
- `/src/components/routing` - route protection pattern for private pages
- `/src/components/ui` - reusable UI primitives (`Button`, `Card`, `Input`)
- `/src/pages` - public login, protected dashboard, and domain placeholders
- `/src/styles/global.css` - global design tokens, base styles, and responsive rules

## Supabase setup

Create a `.env.local` file with:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app expects a `profiles` table with these columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Matches `auth.users.id` |
| `email` | `text` | User login email |
| `full_name` | `text` | Display name |
| `first_name` | `text` | Short display name |
| `role` | `text` | `admin` or `player` |
| `gender` | `text` | `lady` or `man`, nullable for admins |

The app also expects a Supabase Edge Function named `invite-user` that:

1. creates the auth user by email with a temporary password,
2. creates the related `profiles` row,
3. supports first-login password change.

Admins see an **Add Match** form on the Matches page and can create new fixtures.  
When an opponent club has multiple venues, the venue picker is filtered to that club and displays any venue notes such as day/time details or parking restrictions.  
Optional opponent team numbers let you record fixtures such as **Orpington 2** while enforcing the supported range of **1 to 5**.

Player accounts can mark themselves available on each match, and admins can also record availability for players before building a fixture squad, assigning configured pairs, and keeping both lists visible on the match card.

## Match results

Each match stores a configurable format. The default setup matches the current league format:

- 6 rubbers
- 3 rubbers per player
- 6-player squad with 3 ladies and 3 men
- 3 configured pair slots
- best of 3 games per rubber
- rally scoring to 21, win by 2, capped at 30

Admins can log per-game scores for each rubber and add optional result notes. The app validates plausible badminton scores and summarizes rubbers won and lost from the recorded games.

## Team and league configuration

The default team profile is **Parklangley 3 Mixed**.  
Use the **Settings** page to edit:

- team name
- team number
- team label
- league name
- home club and venue
- number of rubbers
- rubbers per player
- squad size and gender split
- pairing slots
- pairing rule and player reuse across pairs
- scoring preset/rules

New matches snapshot the current settings so future configuration changes do not overwrite existing fixture formats.
