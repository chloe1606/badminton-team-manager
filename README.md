# badminton-team-manager

React + TypeScript foundation for a badminton team management system.

## Features

- Protected app with mock admin/user accounts for local testing
- **Club Contacts** page with curated league contact details, venue addresses, and structured venue notes
- **Matches** page with chronological numbering (`Match 1`, `Match 2`, …), calendar export, and admin-only match creation
- Add Match opponent selection from the curated club list, including filtered venue choices and optional opponent team number (`1` to `5`)
- Match result logging for configurable league formats, with default support for 6 rubbers, 3 repeated pair slots, and best-of-3 game scoring to 21 with a 30-point cap
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

## Login accounts

Two built-in roles are available for testing with the mock auth service:

| Role  | Email                      | Password  | Capabilities                          |
|-------|----------------------------|-----------|---------------------------------------|
| Admin | admin@badminton.local      | admin123  | View matches + add new match dates    |
| User  | user@badminton.local       | user123   | View matches only (read-only)         |

Admins see an **Add Match** form on the Matches page and can create new fixtures.  
When an opponent club has multiple venues, the venue picker is filtered to that club and displays any venue notes such as day/time details or parking restrictions.  
Optional opponent team numbers let you record fixtures such as **Orpington 2** while enforcing the supported range of **1 to 5**.

User-role accounts see the match list, results, club contacts, and can export the calendar but cannot add matches.

## Match results

Each match stores a configurable format. The default setup matches the current league format:

- 6 rubbers
- 3 pair slots reused twice
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
- number of rubbers
- pairing slots
- scoring preset/rules

New matches snapshot the current settings so future configuration changes do not overwrite existing fixture formats.



The auth flow is intentionally provider-agnostic. Swap the default `mockAuthService`
implementation in `/src/auth/services/mockAuthService.ts` with your real auth backend
implementation (same `AuthService` interface in `/src/types/auth.ts`) and pass it to
`AuthProvider`.
