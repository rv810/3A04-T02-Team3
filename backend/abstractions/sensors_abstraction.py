"""
Cross-sensor query aggregation across all three sensor tables.

Subsystem: Telemetry Data Management
PAC Layer: Abstraction
Pattern:   Pipe-and-Filter
Reqs:      BE4
"""

from database import supabase
from typing import Optional
from datetime import datetime, timezone

class SensorsAbstraction:
    def getSensors(self, zone: Optional[str] = None) -> list:
        '''
        Return all sensors with their latest readings.
        '''
        temp_query = supabase.table("tempsensor").select("sensorid, zone, value, timestamp")
        humidity_query = supabase.table("humiditysensor").select("sensorid, zone, value, timestamp")
        oxygen_query = supabase.table("oxygensensor").select("sensorid, zone, value, timestamp")

        if zone:
            temp_query = temp_query.eq("zone", zone)
            humidity_query = humidity_query.eq("zone", zone)
            oxygen_query = oxygen_query.eq("zone", zone)

        temp_data = temp_query.order("timestamp", desc=True).execute().data
        humidity_data = humidity_query.order("timestamp", desc=True).execute().data
        oxygen_data = oxygen_query.order("timestamp", desc=True).execute().data

        # label each reading with its sensor type and return them all together
        result = []
        for row in temp_data:
            result.append({**row, "sensor_type": "temperature"})
        for row in humidity_data:
            result.append({**row, "sensor_type": "humidity"})
        for row in oxygen_data:
            result.append({**row, "sensor_type": "oxygen"})

        return result
    
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
            result = (
                supabase.table(table)
                .select("zone, value, timestamp")
                .eq("sensorid", sensorid)
                .order("timestamp", desc=True)
                .limit(1)
                .execute().data
            )
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
        temp = supabase.rpc("get_avg_latest_temp").execute().data
        humidity = supabase.rpc("get_avg_latest_humidity").execute().data
        oxygen = supabase.rpc("get_avg_latest_oxygen").execute().data

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
        temp = supabase.table("tempsensor").select("id", count="exact").gte("timestamp", cutoff).execute()
        humidity = supabase.table("humiditysensor").select("id", count="exact").gte("timestamp", cutoff).execute()
        oxygen = supabase.table("oxygensensor").select("id", count="exact").gte("timestamp", cutoff).execute()
        total = (temp.count or 0) + (humidity.count or 0) + (oxygen.count or 0)
        return {"count": total}