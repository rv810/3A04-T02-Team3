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

SCEMAS monitors three environmental metrics — temperature, humidity, and oxygen — reported by IoT sensors deployed across five named city zones (downtown, industrial, residential, park, waterfront). The system serves three user roles: **public users** who can view aggregated environmental data without authentication, **city operators** who monitor live sensor feeds and manage alerts, and **system administrators** who configure alert rules and manage user accounts.

Simulated IoT sensors publish telemetry via MQTT over TLS to AWS IoT Core, which authenticates each device using x.509 certificates. AWS IoT Core forwards validated messages to the SCEMAS backend through an HTTP webhook. The backend validates and stores readings, evaluates them against administrator-defined alert rules, and broadcasts updates to connected operator dashboards via WebSocket. Operators can acknowledge and resolve alerts with optional notes, while administrators have full control over alert rule configuration (create, update, delete, toggle) and user management. When an alert is triggered, the system automatically delivers webhook notifications to all registered external subscriber systems.

A public-facing dashboard displays city-wide averages, zone-level summaries, and 24-hour trend charts without requiring authentication. Operator and admin dashboards include an interactive geographical map showing sensor locations across city zones. The public REST API exposes the same data for third-party integration, optionally secured by an API key. A chatbot on the public dashboard provides conversational answers to common environmental queries.

---

## Architecture
 
SCEMAS follows a **PAC (Presentation-Abstraction-Control)** architecture organized as a hierarchy of cooperating agents. At the top of the hierarchy, a **coordinator** serves as the top-level PAC agent, responsible for mounting all sub-agents and wiring inter-agent communication through an **event bus**. The coordinator ensures that agents never import or reference each other directly.
 
Below the coordinator, the system is divided into three subsystem agents, each encapsulating its own Presentation (HTTP routes), Abstraction (database access), and Control (business logic) components. Each subsystem agent employs a distinct internal architectural style and may contain further **sub-agents** that handle specialized responsibilities within the subsystem:
 
- **Account Management** uses the **Repository** pattern, centralizing user accounts, authentication, and role-based access control through a shared data store. This agent contains three sub-agents:
  - **Admin** — alert rule configuration, user management, and audit log access
  - **Operator** — alert triage, acknowledgement, and resolution
  - **Public** — unauthenticated access to aggregated environmental data
 
- **Telemetry Data Management** uses a **Pipe-and-Filter** pattern, processing sensor data through sequential stages: ingestion, validation, storage, and event publication. This agent contains three sub-agents, one per sensor type:
  - **Temperature** — validation and persistence of temperature readings
  - **Humidity** — validation and persistence of humidity readings
  - **Oxygen** — validation and persistence of oxygen readings
 
- **Alert Rules Management** uses a **Blackboard** pattern, where incoming telemetry is evaluated against a shared knowledge base of administrator-defined rules to detect threshold violations and generate alerts. When a violation is detected, this agent also handles webhook notification delivery to subscribed external systems. Human interaction with alert rules and alert triage is handled by the Admin and Operator sub-agents under Account Management.

### PAC Hierarchy
 
```
Coordinator (top-level agent)
├── Account Management agent (Repository)
│   ├── Admin sub-agent
│   ├── Operator sub-agent
│   └── Public sub-agent
├── Telemetry Data Management agent (Pipe-and-Filter)
│   ├── Temperature sub-agent
│   ├── Humidity sub-agent
│   └── Oxygen sub-agent
└── Alert Rules Management agent (Blackboard)
```
 
### Inter-Agent Communication
 
Agents communicate exclusively through a pub-sub pattern **event bus** managed by the top-level coordinator. This enforces PAC's rule that agents interact only through their Control components, never by direct import:
 
- When a sensor reading is validated and stored, the Telemetry agent publishes a `sensor_data_validated` event.
- The Alert Rules Management agent subscribes to this event and evaluates the reading against all enabled rules.
- When a rule violation is detected, the Alerts agent publishes an `alert_triggered` event.
- The coordinator handles broadcasting triggered alerts to connected WebSocket clients.
 
Neither the Telemetry agent nor the Alerts agent has any direct reference to the other.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| IoT Transport | MQTT over TLS → AWS IoT Core |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Real-time | WebSocket (native) |
| Sensor Simulation | Python (paho-mqtt) |

### Data Flow

```
Simulated IoT Sensors (paho-mqtt)
    → MQTT over TLS (port 8883, x.509 cert auth)
        → AWS IoT Core (message broker)
            → IoT Rule forwards to SCEMAS backend
                → POST /api/telemetry (HTTP webhook)
                    → Validate sensor data (type, range, schema)
                        → Store reading in Supabase (tempsensor / humiditysensor / oxygensensor)
                            → Event bus: publish sensor_data_validated
                                → Alerts agent evaluates enabled rules
                                    → If threshold violated: create alert + audit log
                                        → Event bus: publish alert_triggered
                                            → Broadcast to connected WebSocket clients
                                            → POST webhook notifications to subscribed external systems
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project
- An AWS IoT Core endpoint with device certificates (for sensor simulation)

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
TELEMETRY_SECRET_KEY=your-telemetry-secret-key
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

### Sensor Simulator Setup

The `sensors/` directory contains simulated IoT sensors that publish telemetry to AWS IoT Core via MQTT over TLS. Each sensor type runs as an independent Python script, generating realistic readings across five city zones with diurnal cycles, seasonal variation, and configurable high-reading burst events for testing alert logic.

```bash
cd sensors
pip install -r requirements.txt
```

Create a `.env` file in `sensors/` and place the three AWS IoT Core certificate files in the same directory:

```env
AWS_ENDPOINT=your-iot-endpoint.iot.region.amazonaws.com
AWS_PORT=8883
AWS_CA_CERT=AmazonRootCA1.pem
AWS_CLIENT_CERT=your-device.cert.pem
AWS_PRIVATE_KEY=your-device.private.key
```

Run each sensor type in a separate terminal:

```bash
python temperature_sensor.py
python humidity_sensor.py
python oxygen_sensor.py
```

Each simulator creates one sensor per zone (5 sensors) and publishes readings every 10 seconds to MQTT topics in the format `scemas/telemetry/{zone}/{sensor_type}`. AWS IoT Core authenticates devices via x.509 certificates over TLS 1.2 — no unauthenticated device can publish telemetry.

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
| `webhook_subscribers` | Webhook subscriber registry (id, url, description, active, created_at, created_by) |

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
| `TELEMETRY_SECRET_KEY` | Yes | Secret key used to authenticate incoming AWS IoT Core webhook requests |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend REST API base URL (e.g., `http://localhost:8000`) |
| `NEXT_PUBLIC_WS_URL` | Yes | Backend WebSocket base URL (e.g., `ws://localhost:8000`) |
| `NEXT_PUBLIC_API_KEY` | No | If set, attached as x-api-key header on public API calls |

### Sensor Simulators (`sensors/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ENDPOINT` | Yes | AWS IoT Core device data endpoint |
| `AWS_PORT` | No | MQTT broker port (default: `8883` for TLS) |
| `AWS_CA_CERT` | Yes | Path to Amazon Root CA certificate file |
| `AWS_CLIENT_CERT` | Yes | Path to device certificate file |
| `AWS_PRIVATE_KEY` | Yes | Path to device private key file |

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

**Webhooks** — external system notification management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/webhooks` | Admin | List all webhook subscribers |
| POST | `/admin/webhooks` | Admin | Register external system URL |
| DELETE | `/admin/webhooks/{id}` | Admin | Remove a subscriber |
| PATCH | `/admin/webhooks/{id}/toggle` | Admin | Toggle subscriber active/inactive |

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
| GET | `/public/zones/hourly-max` | API key* | Hourly max readings per zone |
| GET | `/public/five-min-avg` | API key* | Five-minute averages by zone |
| GET | `/public/dashboard` | API key* | Combined zones, 5-min averages, and hourly max |

*API key required only if `PUBLIC_API_KEY` is set in the backend environment. All public endpoints are rate-limited to 30 requests per minute per IP.

**Telemetry** — IoT data ingestion

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/telemetry` | None* | Webhook for AWS IoT Core sensor data |

*In production, this endpoint is only reachable by AWS IoT Core's rule action. Device authentication is handled at the MQTT broker level via x.509 certificates before data reaches this endpoint.

**WebSocket** — real-time updates

| Protocol | Endpoint | Auth | Description |
|----------|----------|------|-------------|
| WS | `/ws?token=JWT` | Bearer (query) | Live sensor updates for operators/admins |

---

## Project Structure
 
```
backend/
├── main.py                                    # FastAPI app entry point, delegates to coordinator
├── coordinator.py                             # Top-level PAC agent: mounts sub-agents, wires event bus
├── database.py                                # Supabase client initialization
├── websocket_manager.py                       # WebSocket connection manager
├── limiter.py                                 # Rate limiter configuration (slowapi)
├── middleware/
│   └── auth.py                                # JWT verification, role-based access dependencies
├── models/
│   ├── account.py                             # Account, login, role models
│   └── alerts_info.py                         # Alert, rule, audit log models
├── events/
│   └── event_bus.py                           # Inter-agent communication (pub-sub pattern)
├── agents/
│   ├── account/                               # Account Management agent (Repository)
│   │   ├── presentation.py                    # Auth and account HTTP endpoints
│   │   ├── control.py                         # AccountsController — registration, login, profile logic
│   │   ├── abstraction.py                     # AccountsAbstraction — Supabase auth and account queries
│   │   ├── admin/                             # Admin sub-agent
│   │   │   ├── presentation.py                # Alert rule CRUD and audit log endpoints
│   │   │   ├── control.py                     # AdminController — rule management logic
│   │   │   └── abstraction.py                 # AdminAbstraction — rule and audit log queries
│   │   ├── operator/                          # Operator sub-agent
│   │   │   ├── presentation.py                # Alert triage and acknowledgement endpoints
│   │   │   ├── control.py                     # OperatorController — alert lifecycle logic
│   │   │   └── abstraction.py                 # OperatorAbstraction — alert status queries
│   │   └── public/                            # Public sub-agent
│   │       ├── presentation.py                # Public zone and metrics endpoints
│   │       ├── control.py                     # PublicController — data aggregation logic
│   │       └── abstraction.py                 # PublicAbstraction — public data queries
│   ├── telemetry/                             # Telemetry Data Management agent (Pipe-and-Filter)
│   │   ├── presentation.py                    # Telemetry webhook, WebSocket, sensor endpoints
│   │   ├── control.py                         # SensorsController — cross-sensor queries
│   │   ├── abstraction.py                     # SensorsAbstraction — sensor data queries
│   │   ├── temperature/                       # Temperature sub-agent
│   │   │   ├── control.py                     # TemperatureController — validation and processing
│   │   │   └── abstraction.py                 # TemperatureAbstraction — reading storage
│   │   ├── humidity/                          # Humidity sub-agent
│   │   │   ├── control.py                     # HumidityController — validation and processing
│   │   │   └── abstraction.py                 # HumidityAbstraction — reading storage
│   │   └── oxygen/                            # Oxygen sub-agent
│   │       ├── control.py                     # OxygenController — validation and processing
│   │       └── abstraction.py                 # OxygenAbstraction — reading storage
│   └── alerts/                                # Alert Rules Management agent (Blackboard)
│       ├── presentation.py                    # Webhook subscriber management endpoints
│       ├── control.py                         # AlertsController — rule evaluation + webhook delivery
│       ├── abstraction.py                     # AlertsAbstraction — alert storage and audit logging
│       └── webhook_abstraction.py             # WebhookAbstraction — subscriber CRUD
├── PUBLIC_API.md                              # Public API documentation
└── requirements.txt                           # Python dependencies

sensors/
├── sensor_base.py                             # Shared MQTT client, zone config, reading generation
├── temperature_sensor.py                      # Temperature simulator (5 zones, 10s interval)
├── humidity_sensor.py                         # Humidity simulator (5 zones, 10s interval)
└── oxygen_sensor.py                           # Oxygen simulator (5 zones, 10s interval)
 
demo/
└── webhook_receiver.py                        # Demo external system receiver (port 9000, for ngrok demo)
 
frontend/
├── app/
│   ├── page.tsx                               # Public dashboard (no auth)
│   ├── login/page.tsx                         # Login page
│   ├── operator/page.tsx                      # Operator dashboard
│   ├── admin/page.tsx                         # Admin dashboard
│   ├── layout.tsx                             # Root layout
│   └── globals.css                            # Global styles
├── components/
│   ├── AlertHistoryTable.tsx                  # Alert history with filters
│   ├── AlertRulesTab.tsx                      # Rule CRUD interface
│   ├── AlertsTable.tsx                        # Active alert management
│   ├── Badge.tsx                              # Status/severity badges
│   ├── Gauge.tsx                              # Circular metric gauges
│   ├── OverviewTab.tsx                        # Dashboard overview metrics
│   ├── SensorsTab.tsx                         # Sensor network display
│   ├── Sidebar.tsx                            # Navigation sidebar
│   ├── Toast.tsx                              # Notification toasts
│   ├── UsersTab.tsx                           # User management interface
│   ├── WebhooksTab.tsx                        # Webhook subscriber management
│   ├── EnvironmentalChatbot.tsx               # Environmental Q&A chatbot
│   └── MapTab.tsx                             # Interactive zone map with Leaflet
├── lib/
│   ├── api.ts                                 # REST API client
│   ├── types.ts                               # TypeScript type definitions
│   ├── useWebSocket.ts                        # WebSocket hook with reconnection
│   └── data.ts                                # Shared style constants
├── tailwind.config.ts                         # Tailwind CSS configuration
├── postcss.config.js                          # PostCSS configuration
├── tsconfig.json                              # TypeScript configuration
├── next.config.mjs                            # Next.js configuration
├── leaflet.d.ts                               # Leaflet CSS type declaration
└── package.json                               # Dependencies and scripts
```

---

## Deliverables

| Deliverable | Title | Description |
|-------------|-------|-------------|
| D1 | Software Requirements Specification | Stakeholder analysis, business events, functional and non-functional requirements, use cases |
| D2 | High-Level Architectural Design | PAC architecture, subsystem decomposition, analysis class diagrams, CRC cards |
| D3 | Detailed Design | State charts, sequence diagrams, detailed class diagrams |
| D4 | Final Implementation | This codebase — working backend, frontend, sensor simulators, and database integration |

---

## Key Design Decisions

**Scoped sensor types.** The original requirements specified air quality, noise, temperature, and humidity. The implementation focuses on temperature, humidity, and oxygen — three concrete metrics that demonstrate the full pipeline while keeping the scope achievable.

**MQTT via AWS IoT Core.** Sensors publish telemetry over MQTT with TLS 1.2 and x.509 certificate authentication to AWS IoT Core. An IoT Rule forwards messages to the SCEMAS backend via an HTTP webhook. This approach satisfies the MQTT ingestion requirement while leveraging AWS-managed device authentication and encryption rather than self-hosting a broker.

**Zone-based simulation.** Each sensor type is simulated across five city zones with realistic environmental modeling including diurnal temperature cycles, seasonal variation, zone-specific offsets (e.g., urban heat island for downtown, higher humidity at waterfront), and configurable high-reading burst events that trigger alert rules during demonstrations.

**PAC agent hierarchy.** The backend is organized as a hierarchy of PAC agents with a top-level coordinator, three subsystem agents, and sub-agents within each. Agents communicate exclusively through a pub-sub event bus; no agent directly imports another. This makes the architectural pattern visible in the directory structure itself.

**Zone map visualization.** The operator and admin dashboards include an interactive Leaflet map centered on Hamilton, Ontario, displaying colored markers for each of the five city zones. The map uses CartoDB dark_matter tiles to match the dashboard's dark theme and shows current sensor readings in marker popups. Leaflet is loaded via dynamic import to avoid Next.js SSR compatibility issues.

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

**Sensor simulator won't connect**  
Verify that all three certificate files exist in `sensors/` and the paths in `sensors/.env` match. Ensure the AWS IoT Core endpoint is correct and the device certificate is registered and activated in the AWS console.

---

## Deployment

| Component | Platform | URL |
|-----------|--------|--------|
| Backend | Render | https://threea04-t02-team3.onrender.com/ |
| Frontend | Vercel | https://3a04-t02-team3.vercel.app/ | 