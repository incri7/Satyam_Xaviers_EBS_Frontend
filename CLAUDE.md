# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **frontend** for Satyam Xavier's EBS — a school management PWA for Satyam Xavier's Higher Secondary School, Nepal. The FastAPI backend lives at `../Satyam_Xaviers_EBS` and carries the authoritative build plan (its `CLAUDE.md` defines the 8-block build sequence and non-negotiable rules — read it for product context).

## Commands

```bash
npm run dev       # Vite dev server on http://localhost:5174
npm run build     # tsc -b (typecheck) then vite build — build FAILS on any TS error
npm run lint      # eslint .
npm run preview   # serve the production build locally
```

There is **no test runner configured** — no Jest/Vitest, no `npm test`. The build itself is the gate (`tsc -b` typechecks the whole project). When you change types, run `npm run build` to verify.

## Environment

`VITE_API_BASE_URL` (see `.env.example`) — **must end with a trailing slash**, because services concatenate paths directly (e.g. `` `${ENV_API_URL}auth/refresh-token` `` and `api.post('attendance/student-attendance', ...)`). Local dev: `http://localhost:8002/`. Docker/nginx: `/api/`.

- `VITE_WS_URL` — WebSocket hub URL (e.g. `ws://localhost:8002/ws`).
- **Gotcha:** the hardcoded fallbacks in `src/api/axios.ts` (`http://localhost:8001/`) and `src/hooks/useWebSocket.ts` (`ws://localhost:8001/ws`) point at port **8001**, but the backend runs on **8002**. Always set the env vars explicitly; don't rely on the fallbacks.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7, TanStack Query (server state), Zustand (client/auth state), React Router v7 (`createBrowserRouter`), Tailwind v4, react-hook-form, i18next (en/ne), Recharts, Firebase (FCM push), vite-plugin-pwa.

### Three-layer data flow
1. **`src/api/axios.ts`** — single shared axios instance (`api`). One request interceptor injects the bearer token from the auth store; one response interceptor does two cross-cutting jobs:
   - **401 → silent token refresh:** calls `auth/refresh-token`, updates the access token, retries the original request once (`_retry` flag). On refresh failure it logs out.
   - **422 normalization:** flattens FastAPI/Pydantic `detail` arrays into a single readable string so components can render `error.response.data.detail` without crashing (React error #31). Rely on this — don't re-handle 422 arrays in components.
2. **`src/api/services/*.service.ts`** — one module per backend domain (auth, academics, attendance, finances, exams, leaves, parent, people, permissions, ai, device, etc.). Each exports a plain object of async functions that call `api` and return typed `response.data`. **All network calls go through a service** — components never call `api` directly. Adding a feature = add/extend a service here.
3. **Components** call services via TanStack Query (`useQuery`/`useMutation`). `QueryClient` is created once in `App.tsx`.

### Auth & permissions (RBAC) — the core cross-cutting concern
- **`store/useAuthStore.ts`** — Zustand + `persist` (localStorage key `auth-storage`). Holds `user`, `accessToken`, `refreshToken`, `isAuthenticated`, and a `_hasHydrated` flag.
- **`store/usePermissionsStore.ts`** — persisted permission list (`permissions-storage`) with `hasPermission(resource, action)`, `hasAnyPermission`, `hasAllPermissions`. Actions are `'create' | 'read' | 'update' | 'delete'`.
- **`_hasHydrated` matters:** persisted Zustand stores rehydrate asynchronously. `ProtectedRoute` renders `null` until **both** stores report `_hasHydrated`, then redirects to `/login` if unauthenticated. Don't read auth/permission state for routing decisions before hydration completes — you'll get false negatives.
- **`config/permissionRegistry.ts`** — maps a stable `ComponentId` string (e.g. `students_update`, `classes_create`) to the `{resource, action}` checks that gate that UI element. Gate UI by registering a component ID here and checking it, rather than hardcoding resource/action pairs inline. (Historically, missing registry entries silently hid working features — keep this in sync when adding gated UI.)
- **`hooks/usePermissionsInit.ts`** is called once in `App.tsx` to load/refresh permissions on app load.

### Routing & role-aware home screens
`src/routes/index.tsx` is the single route table. Public routes: `/login`, `/forgot-password`, `/reset-password`, `/register/:token`. Everything else is nested under `<ProtectedRoute>`. Each role has its own home screen under `pages/Home/` (`TeacherHome`, `ParentHome`, `AccountantHome`, `CoordinatorHome`, `StudentHome`, `PrincipalHome`) reached via `/home/<role>` — these are the role landing pages, distinct from the legacy admin `/dashboard`. Parent views child data via `/parent/child/:studentId/{attendance,marks,fees,leave}`.

### Offline attendance (PWA)
`lib/offlineQueue.ts` is a hand-rolled IndexedDB wrapper (`sx_ebs_offline` DB, `attendance_queue` store) — `enqueueAttendance` / `getQueuedAttendance` / `clearQueuedAttendance` / `getQueueCount`. `hooks/useOfflineSync.ts` drains the queue when connectivity returns. The product rule (from backend CLAUDE.md): a teacher marking attendance offline sees **"Saved."**, never an offline error — the queue handles sync transparently. The Service Worker (vite-plugin-pwa, `registerType: 'autoUpdate'`) uses NetworkFirst caching for `/api/` calls.

### Real-time
`hooks/useWebSocket.ts` connects to the backend hub with `?token=<accessToken>`, auto-reconnects (3s delay, max 10 attempts), and dispatches by `event.type` through a handler map. Used for live updates like `attendance.updated`.

### i18n
`src/i18n/index.ts` initializes i18next with `en`/`ne` locales (`src/i18n/locales/*.json`), language persisted in localStorage key `ebs-lang`. Add user-facing strings to both locale files.

## Conventions
- **Path style:** relative imports throughout (`../store/...`) — no path alias configured.
- **`utils/cn.ts`** (clsx + tailwind-merge) is the standard className combiner.
- **Types** live in `src/types/*.ts` by domain; many service files also co-locate their request/response interfaces.
- Shared UI primitives in `components/ui/`, layout in `components/layout/`, domain components grouped by feature folder (`components/academics/`, `components/people/`, …).
- `ErrorBoundary` (`components/common/`) wraps the whole app in `App.tsx`.

## Deployment
Multi-stage `Dockerfile` builds the static bundle; `nginx.conf` serves it and proxies `/api/`. In Docker the dev-server proxy is unused — set `VITE_API_BASE_URL=/api/` (relative) so nginx handles routing. SPA deep-link reloads rely on `historyApiFallback` (dev) / nginx try_files (prod).
