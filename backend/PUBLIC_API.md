# SCEMAS Public API Documentation

---

## Endpoints

### 1. Health Check

#### GET `/`

Checks if the API is running.

**Response 200**
```json
{
  "status": "SCEMAS Backend is awake and healthy!"
}
```

---

### 2. Zone Summary

#### GET `/public/summary/{zone}`

Returns the latest temperature, humidity, and oxygen readings for a specified zone. Intended for public digital signage and dashboards.

**Path parameter**: `zone` (string) — the zone name to retrieve data for

**Example request**: `GET /public/summary/Downtown%20Core`

**Success response (sensors online)**
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

**No data response (sensors offline)**
```json
{
  "zone": "Downtown Core",
  "temperature": null,
  "humidity": null,
  "oxygen": null,
  "status": "offline"
}
```

Notes:
- Each metric is `null` when no readings exist for that sensor type
- `status` is `"online"` if at least one metric has data, `"offline"` otherwise

---

### 3. All Zones Summary

#### GET `/public/zones`

Returns summaries for every zone that has sensor data. Each entry has the same shape as the single-zone summary above.

**Example request**: `GET /public/zones`

**Success response**
```json
[
  {
    "zone": "Downtown Core",
    "temperature": { "value": 22.5, "unit": "C", "last_updated": "2026-04-05T12:00:00Z" },
    "humidity": { "value": 55.0, "unit": "%", "last_updated": "2026-04-05T11:58:00Z" },
    "oxygen": { "value": 20.9, "unit": "%", "last_updated": "2026-04-05T11:55:00Z" },
    "status": "online"
  },
  {
    "zone": "Waterfront",
    "temperature": { "value": 19.8, "unit": "C", "last_updated": "2026-04-05T11:50:00Z" },
    "humidity": null,
    "oxygen": null,
    "status": "online"
  }
]
```

Notes:
- Zones are collected from all three sensor tables (temperature, humidity, oxygen)
- Returns an empty array if no sensor data exists

---

### 4. Metrics History (24 Hours)

#### GET `/public/metrics/history`

Returns hourly averaged readings for the last 24 hours across all zones. Useful for trend charts on public dashboards.

**Example request**: `GET /public/metrics/history`

**Success response**
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

Notes:
- Each entry represents one hour, with the average of all readings in that hour
- Metrics are `null` if no readings exist for that sensor type in that hour
- Time format is `"HH:MM"` in UTC
- Returns an empty array if no readings exist in the last 24 hours

---

### 5. Five-Minute Averages

#### GET `/public/five-min-avg`

City-wide and per-zone 5-minute rolling averages for all metrics.

**Example request**: `GET /public/five-min-avg`

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

Notes:
- Averages are computed from readings within the last 5 minutes
- Metrics are `null` if no readings exist for that sensor type in the window
- Values are rounded to 1 decimal place

---

### 6. Hourly Maximum by Zone

#### GET `/public/zones/hourly-max`

Maximum sensor readings per zone for the current hour.

**Example request**: `GET /public/zones/hourly-max`

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

Notes:
- Returns the maximum value per metric per zone within the current UTC hour
- Metrics are `null` if no readings exist for that sensor type in the current hour
- Values are rounded to 1 decimal place

---

### 7. Public Dashboard

#### GET `/public/dashboard`

Combined endpoint returning zones, five-minute averages, and hourly max in a single response. Used by the public frontend to reduce request count.

**Example request**: `GET /public/dashboard`

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

Notes:
- `zones` uses the same format as `GET /public/zones`
- `five_min_avg` uses the same format as `GET /public/five-min-avg`
- `hourly_max` uses the same format as `GET /public/zones/hourly-max`

---

## Rate Limiting

All public endpoints are rate-limited to **30 requests per minute per IP**. Exceeding the limit returns `429 Too Many Requests`.

---

## Authentication

In production, all public endpoints require an API key passed via the `x-api-key` HTTP header. If the server is running without `PUBLIC_API_KEY` set (development mode), no key is required.

**Example request with API key**:
```bash
curl -H "x-api-key: YOUR_API_KEY" https://api.scemas.ca/public/zones
```

If the key is missing or invalid, the server returns:

**Response 401**
```json
{ "detail": "Invalid or missing API key" }
```

To obtain an API key, contact the SCEMAS system administrator.

---

## Notes

- All public endpoints are read-only
- In production they require an API key (see [Authentication](#authentication) above)
- Data is intended for public display only and does not include sensitive information
- The health check endpoint (`GET /`) does not require an API key
- Sensor types tracked: temperature, humidity, and oxygen
