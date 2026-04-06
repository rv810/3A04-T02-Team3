"""
Database queries for public environmental data aggregation.

Subsystem: Consumes Telemetry Data Management subsystem
PAC Layer: Abstraction
PAC Agent: Account Management
Sub-agent: Public 
Reqs:      BE5
"""
from database import supabase
from datetime import datetime, timezone, timedelta


class PublicAbstraction:

    def getZoneSummary(self, zone: str) -> dict:
        """
        Returns the latest temperature, humidity, and oxygen reading
        for the given zone. Used by the public zone detail view.
        """
        result = {"zone": zone}

        sensor_tables = {
            "temperature": "tempsensor",
            "humidity": "humiditysensor",
            "oxygen": "oxygensensor",
        }

        has_data = False
        for metric, table in sensor_tables.items():
            response = (
                supabase.table(table)
                .select("value, unit, timestamp")
                .eq("zone", zone)
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )
            if response.data:
                row = response.data[0]
                result[metric] = {
                    "value": row["value"],
                    "unit": row["unit"],
                    "last_updated": row["timestamp"],
                }
                has_data = True
            else:
                result[metric] = None

        result["status"] = "online" if has_data else "offline"
        return result

    def getAllZonesSummary(self) -> list:
        """
        Returns a summary for every distinct active zone.
        OPTIMIZED: Uses only 3 database queries total and avoids downloading the whole DB.
        """
        sensor_tables = {
            "temperature": "tempsensor",
            "humidity": "humiditysensor",
            "oxygen": "oxygensensor",
        }
        
        zone_summaries = {}

        # Query each table exactly once, grabbing only the most recent data
        for metric, table in sensor_tables.items():
            
            # .limit(10) ensures we catch all active zones without downloading the whole DB
            response = (
                supabase.table(table)
                .select("zone, value, unit, timestamp")
                .order("timestamp", desc=True)
                .limit(10) 
                .execute()
            )
            
            for row in response.data:
                zone = row["zone"]
                
                # Initialize the zone in our dictionary if we haven't seen it yet
                if zone not in zone_summaries:
                    zone_summaries[zone] = {
                        "zone": zone,
                        "temperature": None,
                        "humidity": None,
                        "oxygen": None,
                        "status": "online"
                    }
                
                # Because we ordered by descending timestamp, the FIRST row we hit 
                # for a zone is guaranteed to be its absolute latest reading!
                if zone_summaries[zone][metric] is None:
                    zone_summaries[zone][metric] = {
                        "value": row["value"],
                        "unit": row["unit"],
                        "last_updated": row["timestamp"],
                    }

        # Return a sorted list of the zone dictionaries
        return sorted(list(zone_summaries.values()), key=lambda x: x["zone"])

    def getPublicMetricsHistory(self) -> list:
        """
        Retrieves hourly-bucketed sensor history for public display.
        Implements BE5 (Public Environmental Data API).

        Returns the last 24 hours of sensor readings bucketed into hourly averages.
        Used by the public dashboard 24-hour trend chart.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=24)
        cutoff_iso = cutoff.isoformat()

        sensor_tables = {
            "temperature": "tempsensor",
            "humidity": "humiditysensor",
            "oxygen": "oxygensensor",
        }

        # Pre-fill all 24 hourly buckets so the chart has a continuous timeline
        buckets = {}
        for i in range(25):
            hour_dt = cutoff + timedelta(hours=i)
            hour_key = f"{hour_dt.year}-{hour_dt.month:02d}-{hour_dt.day:02d} {hour_dt.hour:02d}:00"
            buckets[hour_key] = {"temperature": [], "humidity": [], "oxygen": []}

        for metric, table in sensor_tables.items():
            response = (
                supabase.table(table)
                .select("value, timestamp")
                .gte("timestamp", cutoff_iso)
                .execute()
            )
            for row in response.data:
                ts_str = row["timestamp"]
                ts_str = ts_str.replace("Z", "+00:00")
                ts = datetime.fromisoformat(ts_str)
                hour_key = f"{ts.year}-{ts.month:02d}-{ts.day:02d} {ts.hour:02d}:00"

                if hour_key in buckets:
                    buckets[hour_key][metric].append(row["value"])

        # Build sorted result with rounded values
        result = []
        for hour_key in sorted(buckets.keys()):
            entry = {"time": hour_key[-5:]}  # Display hour only, e.g. "14:00"
            for metric in ("temperature", "humidity", "oxygen"):
                values = buckets[hour_key][metric]
                entry[metric] = round(sum(values) / len(values), 2) if values else None
            result.append(entry)

        return result
    
    def getHourlyMaximum(self) -> list:
        """
        Retrieves the maximum sensor readings for all zones in the current hour.
        Used for zone status cards to show peak values.
        """
        now = datetime.now(timezone.utc)
        hour_start = now.replace(minute=0, second=0, microsecond=0)
        hour_end = hour_start + timedelta(hours=1)
        
        hour_start_iso = hour_start.isoformat()
        hour_end_iso = hour_end.isoformat()

        sensor_tables = {
            "temperature": "tempsensor",
            "humidity": "humiditysensor",
            "oxygen": "oxygensensor",
        }

        # Get all zones
        zones = set()
        for table in ("tempsensor", "humiditysensor", "oxygensensor"):
            response = supabase.table(table).select("zone").execute()
            for row in response.data:
                zones.add(row["zone"])

        # Get max values for each zone
        result = []
        for zone in sorted(zones):
            zone_max = {"zone": zone}
            for metric, table in sensor_tables.items():
                response = (
                    supabase.table(table)
                    .select("value")
                    .eq("zone", zone)
                    .gte("timestamp", hour_start_iso)
                    .lt("timestamp", hour_end_iso)
                    .order("value", desc=True)
                    .limit(1)
                    .execute()
                )
                if response.data:
                    zone_max[metric] = round(response.data[0]["value"], 1)
                else:
                    zone_max[metric] = None
            result.append(zone_max)

        return result

    def getFiveMinAvgByZone(self) -> dict:
        """
        Computes 5-minute rolling averages per zone and city-wide.
        Returns { "city": { metric: avg }, "zones": [{ zone, metric: avg }] }.
        """
        now = datetime.now(timezone.utc)
        cutoff_iso = (now - timedelta(minutes=5)).isoformat()

        sensor_tables = {
            "temperature": "tempsensor",
            "humidity": "humiditysensor",
            "oxygen": "oxygensensor",
        }

        zone_data = {}  # zone -> metric -> [values]
        city_values = {"temperature": [], "humidity": [], "oxygen": []}

        for metric, table in sensor_tables.items():
            response = (
                supabase.table(table)
                .select("zone, value")
                .gte("timestamp", cutoff_iso)
                .execute()
            )
            for row in response.data:
                zone = row["zone"]
                if zone not in zone_data:
                    zone_data[zone] = {"temperature": [], "humidity": [], "oxygen": []}
                zone_data[zone][metric].append(row["value"])
                city_values[metric].append(row["value"])

        # Build city averages
        city = {}
        for metric in ("temperature", "humidity", "oxygen"):
            vals = city_values[metric]
            city[metric] = round(sum(vals) / len(vals), 1) if vals else None

        # Build per-zone averages
        zones = []
        for zone in sorted(zone_data.keys()):
            entry = {"zone": zone}
            for metric in ("temperature", "humidity", "oxygen"):
                vals = zone_data[zone][metric]
                entry[metric] = round(sum(vals) / len(vals), 1) if vals else None
            zones.append(entry)

        return {"city": city, "zones": zones}