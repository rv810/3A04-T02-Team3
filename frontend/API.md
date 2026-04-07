# SCEMAS Backend API Documentation

Base URL (local): `http://localhost:8000`

All protected routes require a `Bearer` token in the `Authorization` header obtained from Supabase Auth.

---

## Overview

SCEMAS uses **Supabase Auth** for identity management. Users authenticate via email/password and receive a JWT access token. This token is sent as `Authorization: Bearer <access_token>` on all protected requests.

Three roles exist: **public**, **operator**, and **admin**. Each role gates access to different endpoint groups (see [Role Authorization Summary](#role-authorization-summary)).

Sensor types in the system are: `temp` (temperature), `humidity`, and `ox` (oxygen).

---

## 1. Authentication

### POST `/auth/register`

Register a new account. Self-registered accounts always receive the `public` role.

**Auth**: none

**Request body**
```json
{
  "username": "alexchen",
  "email": "alex.chen@city.ca",
  "password": "hunter2",
  "phone_num": "905-555-0100"
}
```
`phone_num` is optional.

**Response 200**
```json
{
  "id": "d4e5f6a7-...",
  "username": "alexchen",
  "email": "alex.chen@city.ca",
  "phone_num": "905-555-0100",
  "userrole": "public",
  "created_at": "2026-04-05T12:00:00Z",
  "last_login": null
}
```

**Response 409** — `"An account with this email already exists"`
**Response 400** — validation error

---

### POST `/auth/login`

Authenticate and receive an access token.

**Auth**: none

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
  "access_token": "<Supabase JWT>",
  "token_type": "bearer",
  "user": {
    "id": "d4e5f6a7-...",
    "username": "alexchen",
    "email": "alex.chen@city.ca",
    "phone_num": "905-555-0100",
    "userrole": "admin",
    "created_at": "2026-04-01T08:00:00Z",
    "last_login": "2026-04-05T12:00:00Z"
  }
}
```

**Response 401** — `"Invalid credentials"`

---

### POST `/auth/logout`

Invalidate the current session.

**Auth**: any authenticated user

**Response 200**
```json
{ "message": "Logged out successfully" }
```

---

## 2. Account Management

### GET `/accounts/me`

Get the current user's account information.

**Auth**: any authenticated user

**Response 200** — `AccountInformation` object (same shape as the `user` field in login response)

**Response 404** — `"Account not found"`

---

### PUT `/accounts/me`

Update the current user's account. All fields are optional — only send what you want to change.

**Auth**: any authenticated user

**Request body**
```json
{
  "username": "newname",
  "phone_num": "905-555-0200",
  "password": "newpassword123"
}
```

**Response 200** — updated `AccountInformation` object

---

### DELETE `/accounts/me`

Delete the current user's account permanently.

**Auth**: any authenticated user

**Response 200**
```json
{ "message": "Account deleted successfully" }
```

---

## 3. Admin User Management

### POST `/accounts/create-user`

Create a new user account with a specified role. Only admins can assign `operator` or `admin` roles.

**Auth**: admin only

**Request body**
```json
{
  "username": "janesmith",
  "email": "jane.smith@city.ca",
  "password": "tempPass123",
  "phone_num": "905-555-0300",
  "userrole": "operator"
}
```
`phone_num` is optional. `userrole` is required and must be one of: `admin`, `operator`, `public`.

**Response 200** — `AccountInformation` object

**Response 403** — `"Only admins can assign operator or admin roles"`
**Response 409** — `"An account with this email already exists"`

---

### GET `/accounts/users`

List all user accounts, ordered by creation date (newest first).

**Auth**: admin only

**Response 200**
```json
[
  {
    "id": "d4e5f6a7-...",
    "username": "alexchen",
    "email": "alex.chen@city.ca",
    "phone_num": "905-555-0100",
    "userrole": "admin",
    "created_at": "2026-04-01T08:00:00Z",
    "last_login": "2026-04-05T12:00:00Z"
  }
]
```

---

### PUT `/accounts/users/{user_id}`

Edit another user's account (admin only). All fields are optional.

**Auth**: admin only

**Path parameter**: `user_id` (string, UUID)

**Request body**
```json
{
  "username": "updatedname",
  "phone_num": "905-555-0400",
  "userrole": "admin"
}
```

**Response 200** — updated `AccountInformation` object

---

### DELETE `/accounts/users/{user_id}`

Delete a user account permanently.

**Auth**: admin only

**Path parameter**: `user_id` (string, UUID)

**Response 200**
```json
{ "message": "User deleted successfully" }
```

---

## 4. Alerts

### GET `/operator/alerts`

Return alerts with optional status filtering and pagination.

**Auth**: operator or admin

**Query parameters**

| Param    | Type   | Default    | Description                                         |
|----------|--------|------------|-----------------------------------------------------|
| `status` | string | `"active"` | Comma-separated statuses: `active,acknowledged,resolved` |
| `limit`  | int    | `200`      | Max rows to return                                  |
| `offset` | int    | `0`        | Pagination offset                                   |

**Response 200**
```json
[
  {
    "alertid": 42,
    "alerttype": "temp",
    "status": "active",
    "ruleviolated": 5,
    "humidity_sensor_id": null,
    "oxygen_sensor_id": null,
    "temp_sensor_id": 128,
    "zone": "Downtown Core",
    "message": "temp value 38.5 C violated rule 5 (acceptable range: 15.0\u201335.0)",
    "severity": "high",
    "triggered_at": "2026-04-05T09:42:00Z",
    "resolved_note": null
  }
]
```

---

### GET `/operator/alerts/acknowledged`

Return all acknowledged alerts.

**Auth**: operator or admin

**Response 200** — array of `AlertsInfo` objects

---

### GET `/operator/alerts/resolved`

Return all resolved alerts.

**Auth**: operator or admin

**Response 200** — array of `AlertsInfo` objects

---

### PUT `/operator/alerts/{alert_id}/acknowledge`

Acknowledge an active alert.

**Auth**: operator or admin

**Path parameter**: `alert_id` (int)

**Response 200**
```json
{ "message": "Alert acknowledged" }
```

**Response 409** — `"Alert is already acknowledged"` or `"Alert is already resolved"`

---

### PUT `/operator/alerts/{alert_id}/resolve`

Resolve an alert with an optional note.

**Auth**: operator or admin

**Path parameter**: `alert_id` (int)

**Request body** (optional)
```json
{ "note": "Investigated on-site, sensor recalibrated" }
```

**Response 200**
```json
{ "message": "Alert resolved", "note": "Investigated on-site, sensor recalibrated" }
```

**Response 409** — `"Alert is already resolved"`

---

## 5. Alert Rules (admin only)

### GET `/admin/rules`

Return all alert rules.

**Auth**: admin only

**Response 200**
```json
[
  {
    "ruleID": 5,
    "createdby": "d4e5f6a7-...",
    "lowerbound": 15.0,
    "upperbound": 35.0,
    "ruletype": "temp",
    "severity": "high",
    "name": "Temperature Warning",
    "enabled": true
  }
]
```

---

### POST `/admin/rules`

Create a new alert rule.

**Auth**: admin only

**Request body**
```json
{
  "lowerbound": 15.0,
  "upperbound": 35.0,
  "ruletype": "temp",
  "severity": "high",
  "name": "Temperature Warning"
}
```
`severity` and `name` are optional. `ruletype` must be one of: `temp`, `humidity`, `ox`.

**Response 200** — `AlertRule` object with auto-generated `ruleID` and `createdby`

**Response 400** — `"Lower bound must be less than upper bound"` (when `lowerbound >= upperbound`)
**Response 409** — `"An identical alert rule already exists"` (same `ruletype`, `lowerbound`, `upperbound`)

---

### PUT `/admin/rules/{rule_id}`

Update an existing alert rule. All fields are optional — only send what you want to change.

**Auth**: admin only

**Path parameter**: `rule_id` (int)

**Request body**
```json
{
  "lowerbound": 10.0,
  "upperbound": 40.0,
  "ruletype": "temp",
  "severity": "medium",
  "name": "Updated Rule Name",
  "enabled": true
}
```

**Response 200** — updated `AlertRule` object

**Response 400** — `"Lower bound must be less than upper bound"`

---

### DELETE `/admin/rules/{rule_id}`

Delete an alert rule permanently.

**Auth**: admin only

**Path parameter**: `rule_id` (int)

**Response 204** — no body

**Response 404** — `"Alert rule not found"`

---

### PATCH `/admin/rules/{rule_id}/toggle`

Toggle the `enabled` state of a rule.

**Auth**: admin only

**Path parameter**: `rule_id` (int)

**Response 200** — `AlertRule` object with `enabled` flipped

**Response 404** — `"Alert rule not found"`

---

## 6. Audit Log

### GET `/operator/audit-log`

Return audit log entries visible to operators. Ordered by timestamp descending.

**Auth**: operator or admin

**Query parameters**

| Param    | Type | Default | Description        |
|----------|------|---------|--------------------|
| `limit`  | int  | `200`   | Max rows to return |
| `offset` | int  | `0`     | Pagination offset  |

**Response 200**
```json
[
  {
    "id": 101,
    "timestamp": "2026-04-05T09:42:00Z",
    "eventtype": "alert_acknowledged",
    "description": "Alert 42 acknowledged",
    "user_id": "d4e5f6a7-...",
    "humidity_sensor_id": null,
    "oxygen_sensor_id": null,
    "temp_sensor_id": 128
  }
]
```

---

### GET `/admin/audit-log`

Return audit log entries (same data, admin-level access). Ordered by timestamp descending.

**Auth**: admin only

**Query parameters**: same as `/operator/audit-log`

**Response 200** — array of `AuditLog` objects (same shape as above)

---

## 7. Sensors

### GET `/sensors`

Return all sensors with their latest readings, optionally filtered by zone.

**Auth**: operator or admin

**Query parameters**

| Param  | Type   | Default | Description        |
|--------|--------|---------|--------------------|
| `zone` | string | none    | Filter by zone name |

**Response 200**
```json
[
  {
    "sensorid": "b64c30d7-b063-4d1e-96cc-c995130ff48d",
    "zone": "waterfront",
    "value": 65.202,
    "timestamp": "2026-04-03T18:47:42.258190+00:00",
    "sensor_type": "humidity"
  }
]
```

`sensor_type` is added by the backend: `"temperature"`, `"humidity"`, or `"oxygen"`.

---

### GET `/sensors/{id}`

Return the latest reading for a single sensor.

**Auth**: operator or admin

**Path parameter**: `id` (string, sensor UUID)

**Response 200**
```json
{
  "zone": "waterfront",
  "value": 65.202,
  "timestamp": "2026-04-03T18:47:42.258190+00:00",
  "sensor_type": "humidity"
}
```

**Response 404** — `"sensor not found"`

---

### GET `/sensors/city-averages`

City-wide averages from the latest readings across all zones.

**Auth**: operator or admin

**Response 200**
```json
{
  "temperature": 22.4,
  "humidity": 57.1,
  "oxygen": 20.8
}
```

---

### GET `/sensors/readings-today`

Total number of sensor readings received today (UTC).

**Auth**: operator or admin

**Response 200**
```json
{ "count": 1482 }
```

---

## 8. Public Data

These endpoints serve read-only data for public displays. All public endpoints are rate-limited to **30 requests per minute per IP**. In production, they require an API key via the `x-api-key` header. In development (when `PUBLIC_API_KEY` env var is not set), no key is required.

If the key is missing or invalid in production:
**Response 401** — `"Invalid or missing API key"`

---

### GET `/public/summary/{zone}`

Latest temperature, humidity, and oxygen for one zone.

**Path parameter**: `zone` (string)

**Response 200**
```json
{
  "zone": "Downtown Core",
  "temperature": {
    "value": 22.5,
    "unit": "C",
    "last_updated": "2026-04-05T12:00:00Z"
  },
  "humidity": {
    "value": 55.0,
    "unit": "%",
    "last_updated": "2026-04-05T11:58:00Z"
  },
  "oxygen": {
    "value": 20.9,
    "unit": "%",
    "last_updated": "2026-04-05T11:55:00Z"
  },
  "status": "online"
}
```

Metrics with no data return `null` instead of the object. `status` is `"online"` if any metric has data, `"offline"` otherwise.

---

### GET `/public/zones`

Summaries for all zones that have sensor data.

**Response 200** — array of zone summary objects (same shape as above)

---

### GET `/public/metrics/history`

Hourly averaged readings for the last 24 hours.

**Response 200**
```json
[
  {
    "time": "09:00",
    "temperature": 21.3,
    "humidity": 58.2,
    "oxygen": 20.9
  },
  {
    "time": "10:00",
    "temperature": 22.1,
    "humidity": 56.8,
    "oxygen": null
  }
]
```

Metrics with no readings in an hour return `null`.

---

### GET `/public/five-min-avg`

City-wide and per-zone 5-minute rolling averages for all metrics.

**Response 200**
```json
{
  "city": {
    "temperature": 22.4,
    "humidity": 57.1,
    "oxygen": 20.8
  },
  "zones": [
    {
      "zone": "Downtown Core",
      "temperature": 23.1,
      "humidity": 55.0,
      "oxygen": 20.9
    },
    {
      "zone": "Waterfront",
      "temperature": 21.7,
      "humidity": 59.2,
      "oxygen": 20.7
    }
  ]
}
```

Averages are computed from readings within the last 5 minutes. Metrics are `null` if no readings exist. Values are rounded to 1 decimal place.

---

### GET `/public/zones/hourly-max`

Maximum sensor readings per zone for the current hour.

**Response 200**
```json
[
  {
    "zone": "Downtown Core",
    "temperature": 24.5,
    "humidity": 62.3,
    "oxygen": 21.0
  },
  {
    "zone": "Waterfront",
    "temperature": 20.1,
    "humidity": 58.0,
    "oxygen": 20.9
  }
]
```

Returns the maximum value per metric per zone within the current UTC hour. Metrics are `null` if no readings exist. Values are rounded to 1 decimal place.

---

### GET `/public/dashboard`

Combined endpoint returning zones, five-minute averages, and hourly max in a single response. Used by the public frontend to reduce request count.

**Response 200**
```json
{
  "zones": [
    {
      "zone": "Downtown Core",
      "temperature": { "value": 22.5, "unit": "C", "last_updated": "2026-04-05T12:00:00Z" },
      "humidity": { "value": 55.0, "unit": "%", "last_updated": "2026-04-05T11:58:00Z" },
      "oxygen": { "value": 20.9, "unit": "%", "last_updated": "2026-04-05T11:55:00Z" },
      "status": "online"
    }
  ],
  "five_min_avg": {
    "city": {
      "temperature": 22.4,
      "humidity": 57.1,
      "oxygen": 20.8
    },
    "zones": [
      {
        "zone": "Downtown Core",
        "temperature": 23.1,
        "humidity": 55.0,
        "oxygen": 20.9
      }
    ]
  },
  "hourly_max": [
    {
      "zone": "Downtown Core",
      "temperature": 24.5,
      "humidity": 62.3,
      "oxygen": 21.0
    }
  ]
}
```

`zones` uses the same format as `GET /public/zones`. `five_min_avg` uses the same format as `GET /public/five-min-avg`. `hourly_max` uses the same format as `GET /public/zones/hourly-max`.

---

## 9. Telemetry Ingestion

### POST `/api/telemetry`

Receives sensor data from AWS IoT Core. Not intended for frontend use.

**Auth**: none (webhook endpoint)

**Request body**
```json
{
  "sensor_type": "temp",
  "sensor_id": "b64c30d7-...",
  "zone": "waterfront",
  "value": 22.5,
  "unit": "C",
  "timestamp": "2026-04-05T12:00:00Z"
}
```

`sensor_type` must be one of: `temp`, `humidity`, `ox`.

**Response 200**
```json
{ "status": "success", "message": "Validated, stored, and broadcasted" }
```

**Response 400** — `"Missing sensor type"` or `"Unknown sensor type"`
**Response 422** — `"Data validation failed"`

---

## 10. WebSocket — Real-time Updates

**Endpoint**: `ws://localhost:8000/ws?token=<access_token>`

**Auth**: JWT passed as `token` query parameter. Only `operator` and `admin` roles are allowed. Connection is closed with code `1008` if the token is missing, invalid, or the user lacks the required role.

**Server pushes** when a new sensor reading arrives:
```json
{
  "event": "sensor_update",
  "data": {
    "value": 22.5,
    "sensor_id": "b64c30d7-...",
    "zone": "waterfront",
    "unit": "C",
    "timestamp": "2026-04-05T12:00:00Z",
    "db_sensor_id": 128
  }
}
```

The client does not send meaningful messages. The connection is kept alive by the server's receive loop.

Note: Alert updates are not pushed via WebSocket. The frontend re-fetches alerts on a debounced timer after receiving sensor updates.

---

## 11. Role Authorization Summary

| Endpoint Group          | `public` | `operator` | `admin` |
|-------------------------|----------|------------|---------|
| Auth (register/login)   | \u2713        | \u2713          | \u2713       |
| Auth (logout)           | \u2713        | \u2713          | \u2713       |
| Account (own)           | \u2713        | \u2713          | \u2713       |
| Admin User Management   | \u2014        | \u2014          | \u2713       |
| Alerts                  | \u2014        | \u2713          | \u2713       |
| Acknowledge / Resolve   | \u2014        | \u2713          | \u2713       |
| Alert Rules             | \u2014        | \u2014          | \u2713       |
| Audit Log (operator)    | \u2014        | \u2713          | \u2713       |
| Audit Log (admin)       | \u2014        | \u2014          | \u2713       |
| Sensors                 | \u2014        | \u2713          | \u2713       |
| Webhooks                | \u2014        | \u2014          | \u2713       |
| Public Data             | \u2713 *     | \u2713 *        | \u2713 *     |
| WebSocket               | \u2014        | \u2713          | \u2713       |
| Telemetry Ingestion     | n/a      | n/a        | n/a     |

\* Public Data endpoints use API key auth, not role-based auth.

---

## 12. Webhook Subscribers (admin only)

### GET `/admin/webhooks`

Return all registered webhook subscribers.

**Auth**: admin only

**Response 200**
```json
[
  {
    "id": 1,
    "url": "https://emergency.hamilton.ca/api/alerts",
    "description": "City Emergency Management System",
    "created_at": "2026-04-05T12:00:00Z",
    "active": true,
    "created_by": "d4e5f6a7-..."
  }
]
```

---

### POST `/admin/webhooks`

Register a new external system webhook URL.

**Auth**: admin only

**Request body**
```json
{
  "url": "https://emergency.hamilton.ca/api/alerts",
  "description": "City Emergency Management System"
}
```
`description` is optional (defaults to empty string).

**Response 201** — the created subscriber object

---

### DELETE `/admin/webhooks/{webhook_id}`

Remove a webhook subscriber.

**Auth**: admin only

**Path parameter**: `webhook_id` (int)

**Response 204** — no body

---

### PATCH `/admin/webhooks/{webhook_id}/toggle`

Toggle a subscriber's active/inactive status.

**Auth**: admin only

**Path parameter**: `webhook_id` (int)

**Response 200** — updated subscriber object with `active` flipped

**Response 404** — `"Subscriber not found"`

---

### Webhook Delivery Behavior

When an alert is triggered, the system automatically POSTs the alert payload to all active webhook subscribers. The payload sent to each subscriber:

```json
{
  "alerttype": "temp",
  "zone": "downtown",
  "message": "TEMP value 38.5 °C violated rule 5 (acceptable range: 15.0–35.0)",
  "severity": "high",
  "triggered_at": null,
  "ruleviolated": 5
}
```

Delivery failures are logged but never block alert processing — a single unreachable subscriber does not prevent other subscribers from receiving the notification.

---

## 13. Error Response Format

All errors follow:

```json
{
  "detail": "Human-readable error message"
}
```

FastAPI's 422 validation errors use:

```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "field required", "type": "value_error.missing" }
  ]
}
```

---

## Health Check

### GET `/`

**Auth**: none

**Response 200**
```json
{ "status": "SCEMAS Backend is awake and healthy!" }
```
