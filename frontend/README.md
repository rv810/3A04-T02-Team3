# SCEMAS Frontend

Smart City Environmental Monitoring & Alert System — Next.js web application.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- npm v10 or higher

## Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:3000**.

## Demo Accounts

Navigate to `http://localhost:3000/login` and use one of the quick-access buttons, or enter credentials manually:

| Role | Email | Password | Access |
|---|---|---|---|
| Administrator | `admin@scemas.ca` | `admin123` | Full access: alert rules, user management, all dashboards |
| City Operator | `operator@scemas.ca` | `operator123` | Monitor sensors, acknowledge & resolve alerts |

The public dashboard at `http://localhost:3000` requires no login.

## Pages

| Route | Description |
|---|---|
| `/` | Public environmental dashboard — live city metrics, zone status, AI chatbot |
| `/login` | Staff login page |
| `/admin` | Administrator dashboard (requires admin login) |
| `/operator` | Operator dashboard (requires operator or admin login) |

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx          # Public dashboard
│   ├── login/page.tsx    # Login page
│   ├── admin/page.tsx    # Admin dashboard
│   └── operator/page.tsx # Operator dashboard
├── lib/
│   └── data.ts           # Types, mock data, shared constants
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## Notes

- All data is currently **mock/static** — no backend is connected. State (alerts, rules, users) resets on page refresh.
- Session is stored in `localStorage` under the key `scemas_session` as `{ role, name }`.
- The config file must be `next.config.mjs` — Next.js 14 does not support `next.config.ts`.

## Troubleshooting

**`EPERM: operation not permitted` on `.next/trace`**

A stale Node process is holding a lock on the build cache. Kill all Node processes and delete the cache:

```bash
# Windows
taskkill //F //IM node.exe
rm -rf .next
npm run dev
```

**Port 3000 already in use**

```bash
npm run dev -- -p 3001
```

## Deployment

Deploy to [Vercel](https://vercel.com) by connecting the repository. Set the root directory to `frontend/` in the Vercel project settings.
