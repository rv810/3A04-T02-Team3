# SCEMAS 
### Smart City Environmental Monitoring & Alert System

---

SCEMAS is a cloud-native IoT platform that ingests real-time environmental telemetry from distributed city sensors, evaluates configurable alert rules against incoming data, and surfaces actionable information through role-based dashboards and a public REST API. The system monitors temperature, humidity, and oxygen levels across city zones, enabling city operators to respond to environmental anomalies and giving the public access to aggregated environmental data.

**Course:** SE 3A04 — Software Design III, McMaster University, Winter 2026  
**Tutorial:** T02 | **Team:** 3

| Name |
|------|
| Resham Vani |
| Sama Al-Oda |
| Ranvir Jhajj |
| Patrick Molka |
| Atharva Kulkarni |

---

## System Overview

SCEMAS monitors three environmental metrics — temperature, humidity, and oxygen — reported by IoT sensors deployed across named city zones. The system serves three user roles: **public users** who can view aggregated environmental data without authentication, **city operators** who monitor live sensor feeds and manage alerts, and **system administrators** who configure alert rules and manage user accounts.

The platform provides real-time telemetry ingestion through an HTTP webhook that receives sensor data from AWS IoT Core, validates and stores readings, and evaluates them against administrator-defined alert rules. When a reading violates a rule's thresholds, the system generates an alert and broadcasts it to connected operator dashboards via WebSocket. Operators can acknowledge and resolve alerts with optional notes, while administrators have full control over alert rule configuration (create, update, delete, toggle) and user management.

A public-facing dashboard displays city-wide averages, zone-level summaries, and 24-hour trend charts without requiring authentication. The public REST API exposes the same data for third-party integration, optionally secured by an API key. An AI chatbot on the public dashboard provides conversational answers to common environmental queries.

---

## Architecture

SCEMAS follows a **PAC (Presentation-Abstraction-Control)** architecture, where each major subsystem is organized into presentation (routes), abstraction (data access), and control (business logic) layers.

The system comprises three subsystems, each employing a distinct architectural style:

- **Account Management** uses the **Repository** pattern, centralizing user accounts, authentication, and role-based access control through a shared data store.
- **Telemetry Data Management** uses a **Pipe-and-Filter** pattern, processing sensor data through sequential stages: ingestion, validation, storage, and alert rule evaluation.
- **Alert Rules Management** uses a **Blackboard** pattern, where incoming telemetry is evaluated against a shared knowledge base of administrator-defined rules to detect threshold violations.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Real-time | WebSocket (native) |

### Data Flow

```
IoT Sensors (AWS IoT Core)
    → POST /api/telemetry (HTTP webhook)
        → Validate sensor data (type, range, schema)
            → Store reading in Supabase (tempsensor / humiditysensor / oxygensensor)
                → Evaluate enabled alert rules against new reading
                    → If threshold violated: create alert + log to audit trail
                        → Broadcast update to connected WebSocket clients
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # Linux/macOS
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
PUBLIC_API_KEY=optional-api-key-for-public-endpoints
```

Start the server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI is available at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_KEY=optional-api-key-for-public-endpoints
```

Start the development server:

```bash
npm run dev
```

The frontend runs at `http://localhost:3000`.

### Database Setup

The following tables must exist in your Supabase project:

| Table | Purpose |
|-------|---------|
| `accounts` | User profiles (id, username, email, phone_num, userrole, created_at, last_login) |
| `tempsensor` | Temperature readings (sensorid, zone, value, unit, timestamp) |
| `humiditysensor` | Humidity readings (sensorid, zone, value, unit, timestamp) |
| `oxygensensor` | Oxygen readings (sensorid, zone, value, unit, timestamp) |
| `alertrules` | Alert rule definitions (ruletype, lowerbound, upperbound, severity, name, enabled) |
| `activealerts` | Generated alerts (alerttype, status, ruleviolated, zone, message, severity) |
| `auditlog` | Event log (eventtype, description, user_id, timestamp) |

Three RPC functions are also required for city-wide averages: `get_avg_latest_temp()`, `get_avg_latest_humidity()`, `get_avg_latest_oxygen()`.

### Demo Accounts

Register accounts via `POST /auth/register`, then update the `userrole` column in the `accounts` table directly in Supabase:

```sql
UPDATE accounts SET userrole = 'admin' WHERE email = 'admin@scemas.ca';
UPDATE accounts SET userrole = 'operator' WHERE email = 'operator@scemas.ca';
```

Or use `POST /accounts/create-user` from an existing admin account to create operator and admin users directly.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anonymous/public API key (used for standard client operations) |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (used for admin operations like deleting users) |
| `PUBLIC_API_KEY` | No | If set, public API endpoints require this value in the `x-api-key` header |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend REST API base URL (e.g., `http://localhost:8000`) |
| `NEXT_PUBLIC_WS_URL` | Yes | Backend WebSocket base URL (e.g., `ws://localhost:8000`) |
| `NEXT_PUBLIC_API_KEY` | No | If set, attached as x-api-key header on public API calls |

---

## API Reference

Interactive API documentation is available via Swagger UI at `http://localhost:8000/docs`.

For public API details including response schemas and examples, see [`backend/PUBLIC_API.md`](backend/PUBLIC_API.md).

### Endpoint Groups

**Auth** — registration, login, logout

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register a new public user |
| POST | `/auth/login` | None | Login with email and password |
| POST | `/auth/logout` | Bearer | Logout and revoke session |

**Accounts** — user profile and admin user management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/accounts/me` | Bearer | Get current user profile |
| PUT | `/accounts/me` | Bearer | Edit own account |
| DELETE | `/accounts/me` | Bearer | Delete own account |
| GET | `/accounts/users` | Admin | List all accounts |
| POST | `/accounts/create-user` | Admin | Create operator or admin user |
| PUT | `/accounts/users/{id}` | Admin | Edit user (including role) |
| DELETE | `/accounts/users/{id}` | Admin | Delete user account |

**Operator** — alert monitoring and management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/operator/alerts` | Operator+ | Get alerts by status (query: `status`) |
| PUT | `/operator/alerts/{id}/acknowledge` | Operator+ | Acknowledge an alert |
| PUT | `/operator/alerts/{id}/resolve` | Operator+ | Resolve an alert with optional note |
| GET | `/operator/audit-log` | Operator+ | View audit log |

**Admin** — alert rule configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/rules` | Admin | List all alert rules |
| POST | `/admin/rules` | Admin | Create alert rule |
| PUT | `/admin/rules/{id}` | Admin | Update alert rule |
| DELETE | `/admin/rules/{id}` | Admin | Delete alert rule |
| PATCH | `/admin/rules/{id}/toggle` | Admin | Toggle rule enabled/disabled |
| GET | `/admin/audit-log` | Admin | View audit log |

**Sensors** — sensor data queries

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sensors` | Operator+ | List sensors (optional zone filter) |
| GET | `/sensors/{id}` | Operator+ | Get single sensor info |
| GET | `/sensors/city-averages` | Operator+ | City-wide metric averages |
| GET | `/sensors/readings-today` | Operator+ | Count of readings received today |

**Public** — unauthenticated environmental data

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/public/zones` | API key* | Summaries for all zones |
| GET | `/public/summary/{zone}` | API key* | Latest readings for a zone |
| GET | `/public/metrics/history` | API key* | Last 24 hours of hourly averages |

*API key required only if `PUBLIC_API_KEY` is set in the backend environment.

**Telemetry** — IoT data ingestion

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/telemetry` | None | Webhook for AWS IoT sensor data |

**WebSocket** — real-time updates

| Protocol | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| WS | `/ws?token=JWT` | Bearer (query) | Live sensor updates for operators/admins |

---

## Project Structure

```
backend/
├── main.py                        # FastAPI app, router registration, CORS
├── database.py                    # Supabase client initialization
├── websocket_manager.py           # WebSocket connection manager
├── middleware/
│   └── auth.py                    # JWT verification, role-based dependencies
├── models/
│   ├── account.py                 # Account, login, role models
│   └── alerts_info.py             # Alert, rule, audit log models
├── controllers/
│   ├── accounts_controller.py     # Account business logic
│   ├── admin_controller.py        # Alert rule management logic
│   ├── alerts_controller.py       # Alert evaluation and generation
│   ├── humidity_controller.py     # Humidity data validation and processing
│   ├── operator_controller.py     # Alert acknowledgement and resolution
│   ├── oxygen_controller.py       # Oxygen data validation and processing
│   ├── public_controller.py       # Public data aggregation
│   ├── sensors_controller.py      # Sensor query logic
│   └── temperature_controller.py  # Temperature data validation and processing
├── abstractions/
│   ├── accounts_abstraction.py    # Account database operations
│   ├── admin_abstraction.py       # Alert rule database operations
│   ├── alerts_abstraction.py      # Alert database operations
│   ├── humidity_abstraction.py    # Humidity reading storage
│   ├── operator_abstraction.py    # Operator alert database operations
│   ├── oxygen_abstraction.py      # Oxygen reading storage
│   ├── public_abstraction.py      # Public data queries
│   ├── sensors_abstraction.py     # Sensor data queries
│   └── temperature_abstraction.py # Temperature reading storage
├── routes/
│   ├── accounts.py                # Auth and account endpoints
│   ├── admin.py                   # Admin rule endpoints
│   ├── operator.py                # Operator alert endpoints
│   ├── public.py                  # Public data endpoints
│   └── telemetry.py               # Telemetry webhook, WebSocket, sensor endpoints
├── PUBLIC_API.md                  # Public API documentation
└── requirements.txt               # Python dependencies

frontend/
├── app/
│   ├── page.tsx                   # Public dashboard (no auth)
│   ├── login/page.tsx             # Login page with demo accounts
│   ├── operator/page.tsx          # Operator dashboard
│   ├── admin/page.tsx             # Admin dashboard
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── components/
│   ├── AlertHistoryTable.tsx      # Alert history with filters
│   ├── AlertRulesTab.tsx          # Rule CRUD interface
│   ├── AlertsTable.tsx            # Active alert management
│   ├── Badge.tsx                  # Status/severity badges
│   ├── Gauge.tsx                  # Circular metric gauges
│   ├── OverviewTab.tsx            # Dashboard overview metrics
│   ├── SensorsTab.tsx             # Sensor network display
│   ├── Sidebar.tsx                # Navigation sidebar
│   ├── Toast.tsx                  # Notification toasts
│   └── UsersTab.tsx               # User management interface
├── lib/
│   ├── api.ts                     # REST API client
│   ├── types.ts                   # TypeScript type definitions
│   ├── useWebSocket.ts            # WebSocket hook with reconnection
│   └── data.ts                    # Shared style constants
└── package.json                   # Dependencies and scripts
```

---

## Deliverables

| Deliverable | Title | Description |
|-------------|-------|-------------|
| D1 | Software Requirements Specification | Stakeholder analysis, business events, functional and non-functional requirements, use cases |
| D2 | High-Level Architectural Design | PAC architecture, subsystem decomposition, analysis class diagrams, CRC cards |
| D3 | Detailed Design | State charts, sequence diagrams, detailed class diagrams |
| D4 | Final Implementation | This codebase — working backend, frontend, and database integration |

---

## Key Design Decisions

**Scoped sensor types.** The original requirements specified air quality, noise, temperature, and humidity. The implementation focuses on temperature, humidity, and oxygen — three concrete metrics that demonstrate the full pipeline while keeping the scope achievable.

**HTTP webhook over direct MQTT.** Rather than connecting directly to an MQTT broker, the backend receives sensor data via an HTTP POST webhook from AWS IoT Core. This simplified integration and deployment within the project timeline.

**Supabase for auth and database.** The system uses Supabase (managed PostgreSQL with built-in authentication and row-level security) instead of separate AWS RDS and Cognito services. This reduced infrastructure complexity while providing auth, database, and admin tooling in one platform.

**PAC with pragmatic simplifications.** The architecture follows PAC's presentation-abstraction-control separation faithfully (routes, abstractions, controllers), but makes practical concessions where the pattern's full formality would add complexity without proportional benefit.

---

## Troubleshooting

**`EPERM: operation not permitted` on `.next/trace`**  
Kill any stale Node.js processes, delete the `.next/` directory, and restart the dev server:

```bash
rm -rf frontend/.next
cd frontend && npm run dev
```

**Port 3000 already in use**  
Run the frontend on an alternate port:

```bash
cd frontend && npm run dev -- -p 3001
```

**Port 8000 already in use**  
Check for and kill stale uvicorn processes, then restart.

**WebSocket connection rejected (code 1008)**  
The WebSocket endpoint requires a valid operator or admin JWT token. Ensure the user is logged in with the correct role.

**401 Unauthorized on API calls**  
The JWT token may have expired. Log out and log back in to obtain a fresh token. The frontend automatically redirects to `/login?expired=true` on 401 responses.

---

## Deployment

| Component | Target | Status |
|-----------|--------|--------|
| Backend | TBD | Pending |
| Frontend | Vercel (root directory: `frontend/`) | Pending |
| Production URL | TBD | Pending |

---

## License

This is an academic project developed for SE 3A04 — Software Design III at McMaster University, Winter 2026 term. It is not licensed for commercial use.
