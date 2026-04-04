# SCEMAS Backend API Documentation

Base URL (local): `http://localhost:8000`  
Base URL (AWS): `https://api.scemas.city.ca` *(update when deployed)*

All protected routes require a `Bearer` token in the `Authorization` header obtained from AWS Cognito.

---

## Authentication

SCEMAS uses **AWS Cognito** for identity. The frontend exchanges credentials for a Cognito JWT (ID Token), which it attaches to every subsequent request.

### POST `/auth/login`

Authenticate a user and receive tokens.

**Request body**
```json
{
  "email": "alex.chen@city.ca",
  "password": "hunter2"
}
```

**Response 200**
```json
{
  "access_token": "<Cognito AccessToken>",
  "id_token":     "<Cognito IdToken>",
  "refresh_token": "<Cognito RefreshToken>",
  "expires_in":   3600,
  "user": {
    "id":    "u1",
    "name":  "Alex Chen",
    "email": "alex.chen@city.ca",
    "role":  "admin"
  }
}
```

**Response 401** — wrong credentials  
**Response 403** — account disabled

> **Frontend usage**: store `id_token` + `user` in localStorage key `scemas_session`. Send `Authorization: Bearer <id_token>` on all protected requests.

---

### POST `/auth/logout`

Invalidates the refresh token server-side (Cognito global sign-out).

**Headers**: `Authorization: Bearer <id_token>`  
**Response 204** — no body

---

### POST `/auth/refresh`

Obtain a new access/id token using the refresh token.

**Request body**
```json
{ "refresh_token": "<Cognito RefreshToken>" }
```

**Response 200** — same shape as `/auth/login` (no new refresh token)

---

## Sensors

### GET `/sensors`

Return all sensors with their latest readings.

**Headers**: `Authorization: Bearer <id_token>`  
**Query params** (all optional):

| Param    | Type   | Description                          |
|----------|--------|--------------------------------------|
| `zone`   | string | Filter by zone name                  |
| `status` | string | `active` \| `warning` \| `offline`   |

**Response 200**
```json
[
  {
    "id":          "s1",
    "name":        "DT-01",
    "zone":        "Downtown Core",
    "status":      "active",
    "aqi":         48,
    "noise":       62,
    "temperature": 22,
    "humidity":    58,
    "last_seen":   "2026-04-03T09:41:00Z"
  }
]
```

---

### GET `/sensors/{id}`

Return a single sensor.

**Response 200** — same object shape as above  
**Response 404** — sensor not found

---

### GET `/sensors/city-averages`

Pre-aggregated city-wide averages across all **non-offline** sensors. Used by the Sensor tab gauges.

**Headers**: `Authorization: Bearer <id_token>`

**Response 200**
```json
{
  "aqi":         56,
  "noise":       63,
  "temperature": 22,
  "humidity":    57,
  "active_count":    11,
  "total_count":     12
}
```

---

## Metrics / Chart Data

### GET `/metrics/history`

Hourly aggregated readings for the 24-hour trend chart on the Overview tab.

**Headers**: `Authorization: Bearer <id_token>`  
**Query params**:

| Param    | Type     | Description                               |
|----------|----------|-------------------------------------------|
| `from`   | ISO 8601 | Start of window (default: 24 h ago)       |
| `to`     | ISO 8601 | End of window (default: now)              |
| `zone`   | string   | Limit to one zone (default: city-wide)    |

**Response 200**
```json
[
  { "time": "00:00", "aqi": 38, "noise": 42, "temperature": 17, "humidity": 65 },
  { "time": "01:00", "aqi": 35, "noise": 40, "temperature": 17, "humidity": 66 }
]
```

Time strings are `HH:MM` in the requester's local time (server returns UTC epoch; frontend formats).

---

## Alerts

### GET `/alerts`

Return alerts with optional filtering. Supports both active alerts and history views.

**Headers**: `Authorization: Bearer <id_token>`  
**Query params**:

| Param      | Type   | Description                                                 |
|------------|--------|-------------------------------------------------------------|
| `status`   | string | Comma-separated: `active,acknowledged,resolved`             |
| `zone`     | string | Filter by zone name                                         |
| `severity` | string | `low` \| `medium` \| `high` \| `critical`                   |
| `from`     | date   | ISO date string — filter `triggered_at >= from`            |
| `to`       | date   | ISO date string — filter `triggered_at <= to`              |
| `limit`    | int    | Max rows (default 200)                                      |
| `offset`   | int    | Pagination offset                                           |

**Response 200**
```json
[
  {
    "id":            "a1",
    "sensor_name":   "IN-01",
    "zone":          "Industrial Zone",
    "metric":        "noise",
    "message":       "Noise level exceeded 80 dB threshold (current: 82 dB)",
    "severity":      "high",
    "status":        "active",
    "triggered_at":  "2026-03-26T09:42:00Z",
    "resolved_note": null
  }
]
```

---

### PATCH `/alerts/{id}/acknowledge`

Set alert status to `acknowledged`.

**Headers**: `Authorization: Bearer <id_token>`  
**Request body**: none  
**Response 200**
```json
{ "id": "a1", "status": "acknowledged" }
```
**Response 403** — caller lacks `operator` or `admin` role  
**Response 404** — alert not found

---

### PATCH `/alerts/{id}/resolve`

Set alert status to `resolved` with an optional note.

**Headers**: `Authorization: Bearer <id_token>`  
**Request body**
```json
{ "note": "Investigated on-site — compressor noise, scheduled for maintenance" }
```
`note` is optional (omit or send `null`).

**Response 200**
```json
{ "id": "a1", "status": "resolved", "resolved_note": "..." }
```
**Response 403** — caller lacks `operator` or `admin` role

---

## Alert Rules *(admin only)*

### GET `/alert-rules`

Return all alert rules.

**Headers**: `Authorization: Bearer <id_token>` *(admin role required)*

**Response 200**
```json
[
  {
    "id":        "r1",
    "name":      "High AQI Alert",
    "metric":    "aqi",
    "operator":  "gt",
    "threshold": 75,
    "severity":  "high",
    "enabled":   true,
    "zone":      null
  }
]
```

`zone` is `null` for rules that apply to all zones.

---

### POST `/alert-rules`

Create a new alert rule.

**Headers**: `Authorization: Bearer <id_token>` *(admin)*  
**Request body**
```json
{
  "name":      "High AQI Alert",
  "metric":    "aqi",
  "operator":  "gt",
  "threshold": 75,
  "severity":  "high",
  "enabled":   true,
  "zone":      "Industrial Zone"
}
```
`zone` is optional — omit or send `null` for all zones.

**Response 201**
```json
{ "id": "r7", "name": "High AQI Alert", ... }
```
**Response 422** — validation error (missing required field, bad metric/operator value)

---

### PUT `/alert-rules/{id}`

Replace an existing rule entirely.

**Headers**: `Authorization: Bearer <id_token>` *(admin)*  
**Request body**: same shape as POST  
**Response 200** — updated rule object  
**Response 404** — rule not found

---

### PATCH `/alert-rules/{id}/toggle`

Flip the `enabled` boolean.

**Headers**: `Authorization: Bearer <id_token>` *(admin)*  
**Request body**: none  
**Response 200**
```json
{ "id": "r1", "enabled": false }
```

---

### DELETE `/alert-rules/{id}`

Delete a rule permanently.

**Headers**: `Authorization: Bearer <id_token>` *(admin)*  
**Response 204** — no body  
**Response 404** — rule not found

---

## Users *(admin only)*

### GET `/users`

Return all user accounts.

**Headers**: `Authorization: Bearer <id_token>` *(admin)*

**Response 200**
```json
[
  {
    "id":         "u1",
    "name":       "Alex Chen",
    "email":      "alex.chen@city.ca",
    "role":       "admin",
    "status":     "active",
    "last_login": "2026-03-26T09:01:00Z"
  }
]
```

---

### POST `/users`

Create a Cognito account and insert a user record. The user receives a Cognito-generated temporary password via email.

**Headers**: `Authorization: Bearer <id_token>` *(admin)*  
**Request body**
```json
{
  "name":  "Jane Smith",
  "email": "jane.smith@city.ca",
  "role":  "operator"
}
```

**Response 201**
```json
{
  "id":     "u6",
  "name":   "Jane Smith",
  "email":  "jane.smith@city.ca",
  "role":   "operator",
  "status": "active",
  "last_login": null
}
```
**Response 409** — email already exists  
**Response 422** — invalid role value

---

## Realtime — Sensor Updates (WebSocket)

For live sensor readings without polling.

**Endpoint**: `ws://localhost:8000/ws/sensors`  
**Auth**: pass the id token as a query param: `?token=<id_token>`

**Server pushes** whenever a sensor reading is updated by AWS IoT:
```json
{
  "event": "sensor_update",
  "data": {
    "id":          "s1",
    "aqi":         51,
    "noise":       64,
    "temperature": 22,
    "humidity":    59,
    "status":      "active",
    "last_seen":   "2026-04-03T09:45:00Z"
  }
}
```

**Server pushes** when a new alert is created by the rule engine:
```json
{
  "event": "new_alert",
  "data": {
    "id":           "a9",
    "sensor_name":  "DT-02",
    "zone":         "Downtown Core",
    "metric":       "aqi",
    "message":      "AQI exceeded 75 threshold (current: 79)",
    "severity":     "high",
    "status":       "active",
    "triggered_at": "2026-04-03T09:45:00Z"
  }
}
```

Client does not send messages — read-only subscription.

---

## Error Response Format

All errors follow:

```json
{
  "detail": "Human-readable error message"
}
```

FastAPI's default 422 validation errors use:

```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "field required", "type": "value_error.missing" }
  ]
}
```

---

## Role Authorization Summary

| Endpoint group     | `public` | `operator` | `admin` |
|--------------------|----------|------------|---------|
| Auth               | ✓        | ✓          | ✓       |
| GET /sensors       | ✓        | ✓          | ✓       |
| GET /metrics       | ✓        | ✓          | ✓       |
| GET /alerts        | —        | ✓          | ✓       |
| PATCH acknowledge  | —        | ✓          | ✓       |
| PATCH resolve      | —        | ✓          | ✓       |
| Alert Rules        | —        | —          | ✓       |
| Users              | —        | —          | ✓       |
| WebSocket /sensors | —        | ✓          | ✓       |

---

## Frontend Integration Notes

### Replacing mock data

The frontend currently imports mock constants from `frontend/lib/data.ts`. When connecting to the real backend:

1. **Create `frontend/lib/api.ts`** — thin fetch wrappers that attach the Cognito token from `localStorage.getItem('scemas_session')`.
2. **Replace direct imports** in each component:
   - `SENSORS` → `GET /sensors`
   - `INITIAL_ALERTS` → `GET /alerts`
   - `INITIAL_RULES` → `GET /alert-rules`
   - `USERS` → `GET /users`
   - `CHART_DATA` → `GET /metrics/history`
3. **Auth**: replace the hardcoded `localStorage` session logic in `app/admin/page.tsx` and `app/operator/page.tsx` with a real call to `POST /auth/login`.
4. **WebSocket**: in `SensorsTab.tsx`, open `ws://.../ws/sensors` on mount and merge incoming `sensor_update` events into React state.

### CORS

The FastAPI backend must allow `http://localhost:3000` (and the production frontend domain) in `CORSMiddleware`.

### Environment variables

Add to `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```
