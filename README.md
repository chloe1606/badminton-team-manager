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

## Authentication integration

The auth flow is intentionally provider-agnostic. Swap the default `mockAuthService`
implementation in `/src/auth/services/mockAuthService.ts` with your real auth backend
implementation (same `AuthService` interface in `/src/types/auth.ts`) and pass it to
`AuthProvider`.
