# TableTrack — Restaurant Meal Subscription Manager

A prototype web app for tracking daily and subscription-based meal customers via QR code check-in.

## Current status

This phase delivers the **complete frontend** (`client/`), now in **TypeScript**, wired end-to-end with mock data so every screen and flow is clickable and demoable before the backend exists. Each service file in `client/src/services/` is written with the same function signatures the real REST API will expose, so swapping mock logic for `axios` calls later is a small, mechanical change — not a rewrite.

The backend (Node.js + Express + PostgreSQL) is the next phase — see the architecture discussion for the schema, the rotating-QR security design, and the SSE real-time push design.

### The workflow this version implements

The QR direction is reversed from the original draft: the **restaurant** displays a QR code (shown via `RestaurantQrDisplay` on the admin Dashboard) that **rotates every 30 seconds**, and customers scan it from their own device to claim a meal. This defeats the "photograph the code and use it from home" attack, since a screenshot goes stale within a minute. The rotation logic (`services/restaurantQrService.ts`) is a faithful stand-in for the HMAC-based design discussed for the real backend — the secret currently lives in `mockData.ts` purely for demo purposes and must move to a server-side environment variable once the Express API exists.

A customer can only successfully scan if their account has been **approved** by an admin (`isApproved`). New self-registrations and admin-created customers default to unapproved. Try logging in as `sneha@example.com` (seeded unapproved) and scanning to see the rejection path.

### Real-time admin notification, without a backend yet

The architecture calls for Server-Sent Events pushing a "customer just checked in" event to the admin dashboard the instant a self-scan succeeds. Since there's no server yet, `services/mockEventBus.ts` uses the browser's `BroadcastChannel` API to demo the same UX across browser tabs:

1. Open the admin Dashboard in one tab (or device) and log in as `admin@tabletrack.com`.
2. Open the Scanner in another tab/device, logged in as an **approved** customer.
3. Point the Scanner's camera at the QR code shown on the Dashboard and scan it.
4. Watch the Dashboard's "Live Check-in Feed" update within a second — no refresh needed.

When the real backend exists, replace `mockEventBus.ts`'s `subscribeToCheckins` with an `EventSource` listening to `GET /api/events/admin-stream`, and drop `publishCheckin` entirely (the server broadcasts after its own DB write). The SSE endpoint code is in the architecture discussion.

## Getting started (run this on your machine, in VS Code)

This sandbox has no access to the npm registry, so dependencies could not be installed or build-verified here. Run these commands yourself once you open the project:

```bash
cd client
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`). `npm run build` runs `tsc -b` first, so any type errors will surface there.

## Demo accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@tabletrack.com | admin123 | Full dashboard |
| Supervisor | raj@tabletrack.com | supervisor123 | Bulk tiffin logging |
| Customer | aarav@example.com | customer123 | Approved ✓ |
| Customer | priya@example.com | customer123 | Approved ✓ |
| Customer | rohan@example.com | customer123 | Approved ✓ |
| Customer | sneha@example.com | customer123 | **Unapproved** — demonstrates rejection path |

Registering a new account creates an additional, unapproved customer in memory (resets on page reload, since there's no backend yet).

## Project structure

```
client/
  src/
    types/          Shared TS types: Role, MealType (breakfast/lunch/dinner), AttendanceSource, etc.
    components/      Sidebar, Navbar, QRCodeDisplay (generic), RestaurantQrDisplay, StatusBadge
    layouts/         AdminLayout, CustomerLayout, AuthLayout — shells with nav + outlet
    pages/
      auth/          Login, Register
      admin/         Dashboard (live feed + rotating QR), Customers (tabbed), CustomerForm, CustomerDetail
      customer/       Profile (details + subscription + recent check-ins), Scanner
    context/         AuthContext — mock session handling (localStorage-backed)
    routes/          ProtectedRoute — role-based route guarding
    services/        Mock data + service functions standing in for the future REST API,
                      plus restaurantQrService (rotation) and mockEventBus (live push demo)
    utils/           Date formatting helpers
    _legacy/         Superseded pages from the pre-pivot design, kept for reference only —
                      renamed to .txt so the build tooling ignores them
```

## Admin navigation

- **Dashboard** — headline stats, the rotating restaurant QR code, and the live check-in feed
- **Customers** — two tabs:
  - *Get meal by supervisor*: the customer list, with approve/revoke, edit/delete, and a manual "log a meal" override per row
  - *Get meal by customer*: read-only log of self-scanned check-ins

## Customer navigation

Trimmed to two items per the latest spec:

- **Scanner** — camera view that scans the restaurant's rotating QR and claims the current meal (server decides breakfast/lunch/dinner from the clock, not the client)
- **My Profile** — account details, subscription status, and recent check-ins

## What's implemented

- TypeScript throughout, with shared types in `src/types/index.ts`
- Three meal types (breakfast/lunch/dinner) with time windows enforced server-side-equivalent in `attendanceService.ts`
- A single `attendance_logs`-equivalent array with a `source` field (`supervisor` | `self_scan`) and a duplicate-claim guard per customer/date/meal — mirrors the planned Postgres `UNIQUE` constraint
- Approval gating (`isApproved`) blocking unauthorized self check-in
- Rotating QR token generation and validation (`restaurantQrService.ts`), mirroring the HMAC/time-bucket design
- Cross-tab live push demo via `BroadcastChannel` (`mockEventBus.ts`), standing in for the planned SSE stream

## Next steps

1. Scaffold the Express + PostgreSQL backend: the `meal_type`/`attendance_source` enums, the `UNIQUE (customer_id, date, meal_type)` constraint, `is_approved` on `users`, and the `GET /api/restaurant-qr/current` + `POST /api/attendance/self-checkin` + `GET /api/events/admin-stream` routes from the architecture discussion
2. Replace the mock functions in `client/src/services/*.ts` with real `axios` calls against that API
3. Move the QR rotation secret out of the client (`mockData.ts`) and into a server-side environment variable
4. Swap `mockEventBus.ts` for a real `EventSource` against the SSE endpoint
5. Swap the mock `AuthContext` for real JWT-based auth
6. Deploy: frontend to Vercel, backend to Render, database to Supabase
