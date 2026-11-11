# TaskFlow Web

The shared TaskFlow interface for web, Electron and Capacitor. Built with Next.js App Router, TypeScript, Tailwind v4, Radix components, TanStack Query, Zustand, React Hook Form/Zod, Recharts, dnd-kit, date-fns and Socket.IO.

## Run

1. Install Node.js 22.14+ and start the TaskFlow backend on port 4000 (see the backend repository).
2. `npm ci`.
3. For local backend development, copy `.env.example` to `.env.development.local` and set `NEXT_PUBLIC_API_URL` to `http://localhost:4000` (no `/api/v1` suffix).
4. `npm run dev`, then open http://localhost:3000.
5. Register an account, or use the explicit development seed credentials from the backend's ignored environment file.

Windows PowerShell users can use `npm.cmd` and `npx.cmd`. Never add database passwords, S3 credentials, signing keys or deployment tokens to this project. Only the API origin is a public build variable. All three clients default to `https://taskflow-backend-ouuj.onrender.com` in production builds. Set `NEXT_PUBLIC_API_URL` explicitly in the build environment to override it. Next.js also loads `.env.local` for production builds, so remove any old localhost value there or replace it with the production origin before packaging; `.env.development.local` takes precedence during local development.

## Build and test

```text
npm run typecheck
npm test
npm run build
npm run preview
```

Static output is `out/`; preview is http://localhost:4173. `next start` does not serve this static-export application. Browser routes use hash destinations, so reload and local packaged navigation work without a Next.js server.

For browser integration tests, leave the local API running and execute `npx playwright install chromium` then `npm run test:e2e`. Tests register accounts in the local development API and persist project/task data. Use a disposable development instance when running repeatedly. Desktop and Pixel viewport suites test real writes; they do not substitute for physical-device tests.

## Organization

- `src/app`: static application entry, metadata and responsive design tokens/styles.
- `src/components/application.tsx`: reusable application shell, session guard, workspace queries and navigation.
- `src/components/dashboard.tsx`: server-fed metrics, progress, compact task list and activity.
- `src/components/task-editor.tsx`: task forms, properties, checklist, comments and uploads.
- `src/components/board.tsx`: keyboard/pointer drag-and-drop with server persistence and conflict handling.
- `src/components/views.tsx`: projects, calendar, team, discussions, files, reports and settings.
- `src/components/ui.tsx`: shared accessible dialogs, cards, avatars, badges and states.
- `src/lib`: typed API contracts, public endpoint configuration, UI preferences and secure native adapters.
- `tests`: component and browser workflow tests.
- `public`: repository-native logo assets.

The dashboard follows the supplied TaskFlow reference: fixed sidebar/header, four summary cards, progress ring, compact tasks, board preview, calendar and activity. Mobile uses a drawer and five-item bottom navigation. Counts and content are API data, including explicit development seed records if chosen. Avatar initials are used instead of embedding third-party profile photos.

## Native reuse

Build the same `out/` once, then use the native repositories' `npm run assets`. Their workflows build an immutable `FRONTEND_REF` from this repository and bundle it. Production native apps do not navigate to the Vercel-hosted UI.

Browser sessions use HttpOnly cookies. Desktop and Android adapters persist opaque session tokens through OS-backed native bridges; browser localStorage contains nonsensitive workspace/sidebar preferences. There is no complete offline queue: writes require a network connection. Dashboard/board/calendar previews currently use the first 100 task records and show a limit notice for larger workspaces; the task page is paginated. Reports aggregate all matching records on the server. Details are modals rather than shareable task URL deep links.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel setup, domain/cookie configuration, GitHub secrets, tag releases and deployment approvals.

API connection controls are intentionally absent from the product UI. Developers configure `NEXT_PUBLIC_API_URL` before building the shared frontend for all clients.
