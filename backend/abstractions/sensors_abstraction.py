from database import supabase
from typing import Optional

class SensorsAbstraction:
    def getSensors(self, zone: Optional[str] = None) -> list:
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
        sensor_types = {
            "tempsensor": "temperature",
            "humiditysensor": "humidity",
            "oxygensensor": "oxygen"
        }
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
    
    def calcualteCityAverages(self):
        temp = supabase.rpc("get_avg_latest_temp").execute().data
        humidity = supabase.rpc("get_avg_latest_humidity").execute().data
        oxygen = supabase.rpc("get_avg_latest_oxygen").execute().data

        return {
            "aqi": oxygen,
            "temperature": temp,
            "humidity": humidity
        }
    
    def calculateHourlyAverages(self, from_time: str, to_time: str, zone: Optional[str] = None) -> list:
        temp = supabase.rpc("get_hourly_avg_temp", {
            "from_time": from_time,
            "to_time": to_time,
            "zone_filter": zone
        }).execute().data

        humidity = supabase.rpc("get_hourly_avg_humidity", {
            "from_time": from_time,
            "to_time": to_time,
            "zone_filter": zone
        }).execute().data

        oxygen = supabase.rpc("get_hourly_avg_oxygen", {
            "from_time": from_time,
            "to_time": to_time,
            "zone_filter": zone
        }).execute().data

        # merged into one list keyed by hour
        merged = {}
        for row in temp:
            merged[row["hour"]] = {"time": row["hour"], "temperature": row["avg_value"]}
        for row in humidity:
            merged[row["hour"]]["humidity"] = row["avg_value"]
        for row in oxygen:
            merged[row["hour"]]["aqi"] = row["avg_value"]

        return list(merged.values())