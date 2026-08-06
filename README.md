# badminton-team-manager

React + TypeScript foundation for a badminton team management system.

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
User-role accounts see the match list and can export the calendar but cannot add or edit matches.



The auth flow is intentionally provider-agnostic. Swap the default `mockAuthService`
implementation in `/src/auth/services/mockAuthService.ts` with your real auth backend
implementation (same `AuthService` interface in `/src/types/auth.ts`) and pass it to
`AuthProvider`.
