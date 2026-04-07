"""
Cross-sensor query aggregation across all three sensor tables.

PAC Layer: Abstraction
PAC Agent: Telemetry Data Management
Pattern:   Repository
Reqs:      BE4
"""

from database import supabase
from typing import Optional
from datetime import datetime, timezone
import time


def _query_with_retry(query_fn, retries=2):
    """Retry transient Supabase connection errors (common on Render free tier)."""
    for attempt in range(retries + 1):
        try:
            return query_fn()
        except Exception:
            if attempt == retries:
                raise
            time.sleep(0.1)

class SensorsAbstraction:
    def getSensors(self, zone: Optional[str] = None, limit: int = 50, offset: int = 0) -> dict:
        '''
        Return paginated sensors with their latest readings.
        '''
        temp_query = supabase.table("tempsensor").select("sensorid, zone, value, timestamp", count="exact")
        humidity_query = supabase.table("humiditysensor").select("sensorid, zone, value, timestamp", count="exact")
        oxygen_query = supabase.table("oxygensensor").select("sensorid, zone, value, timestamp", count="exact")

        if zone:
            temp_query = temp_query.eq("zone", zone)
            humidity_query = humidity_query.eq("zone", zone)
            oxygen_query = oxygen_query.eq("zone", zone)

        temp_resp = _query_with_retry(lambda: temp_query.order("timestamp", desc=True).execute())
        humidity_resp = _query_with_retry(lambda: humidity_query.order("timestamp", desc=True).execute())
        oxygen_resp = _query_with_retry(lambda: oxygen_query.order("timestamp", desc=True).execute())

        total = (temp_resp.count or 0) + (humidity_resp.count or 0) + (oxygen_resp.count or 0)

        # label each reading with its sensor type, merge, and sort
        result = []
        for row in temp_resp.data:
            result.append({**row, "sensor_type": "temperature"})
        for row in humidity_resp.data:
            result.append({**row, "sensor_type": "humidity"})
        for row in oxygen_resp.data:
            result.append({**row, "sensor_type": "oxygen"})

        result.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
        page = result[offset:offset + limit]

        return {"items": page, "total": total, "limit": limit, "offset": offset}

    def getSensor(self, sensorid: str):
        '''
        Return a single sensor and its information
        '''
        sensor_types = {
            "tempsensor": "temperature",
            "humiditysensor": "humidity",
            "oxygensensor": "oxygen"
        }

        # Why: no unified sensor table exists; each type has its own table by
        # design, so we must iterate all three to find a match.
        for table in ["tempsensor", "humiditysensor", "oxygensensor"]:
            result = _query_with_retry(lambda t=table: (
                supabase.table(t)
                .select("zone, value, timestamp")
                .eq("sensorid", sensorid)
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )).data
            if result:
                return {**result[0], "sensor_type": sensor_types[table]}
        return None

    def calculateCityAverages(self):
        '''
        Pre-aggregated city-wide averages across all sensors.
        Used by the Sensor tab gauges.

        Why: uses Supabase RPCs instead of raw queries to push aggregation
        to the database for performance.
        '''
        temp = _query_with_retry(lambda: supabase.rpc("get_avg_latest_temp").execute()).data
        humidity = _query_with_retry(lambda: supabase.rpc("get_avg_latest_humidity").execute()).data
        oxygen = _query_with_retry(lambda: supabase.rpc("get_avg_latest_oxygen").execute()).data

        return {
            "oxygen": oxygen,
            "temperature": temp,
            "humidity": humidity
        }

    def getReadingsToday(self):
        '''
        Count all sensor readings from today (UTC).
        '''
        cutoff = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        temp = _query_with_retry(lambda: supabase.table("tempsensor").select("id", count="exact").gte("timestamp", cutoff).execute())
        humidity = _query_with_retry(lambda: supabase.table("humiditysensor").select("id", count="exact").gte("timestamp", cutoff).execute())
        oxygen = _query_with_retry(lambda: supabase.table("oxygensensor").select("id", count="exact").gte("timestamp", cutoff).execute())
        total = (temp.count or 0) + (humidity.count or 0) + (oxygen.count or 0)
        return {"count": total}
