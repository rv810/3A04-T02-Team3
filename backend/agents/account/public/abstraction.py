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
            
            # .limit(100) ensures we catch all active zones without downloading the whole DB
            response = (
                supabase.table(table)
                .select("zone, value, unit, timestamp")
                .order("timestamp", desc=True)
                .limit(100) 
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
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        cutoff_iso = cutoff.isoformat()

        sensor_tables = {
            "temperature": "tempsensor",
            "humidity": "humiditysensor",
            "oxygen": "oxygensensor",
        }

        # Collect readings per hour per metric
        buckets = {}  # hour_key -> {metric: [values]}

        for metric, table in sensor_tables.items():
            response = (
                supabase.table(table)
                .select("value, timestamp")
                .gte("timestamp", cutoff_iso)
                .execute()
            )
            for row in response.data:
                ts_str = row["timestamp"]
                # Handle Supabase ISO timestamps
                ts_str = ts_str.replace("Z", "+00:00")
                ts = datetime.fromisoformat(ts_str)
                # Why hour_key includes date: prevents cross-day bucket merging —
                # without the date component, 2pm Monday and 2pm Tuesday readings
                # would merge into one bucket.
                hour_key = f"{ts.year}-{ts.month:02d}-{ts.day:02d} {ts.hour:02d}:00"

                if hour_key not in buckets:
                    buckets[hour_key] = {"temperature": [], "humidity": [], "oxygen": []}
                buckets[hour_key][metric].append(row["value"])

        # Build sorted result (sorted chronologically by full datetime key)
        result = []
        for hour_key in sorted(buckets.keys()):
            entry = {"time": hour_key[-5:]}  # Display hour only, e.g. "14:00"
            for metric in ("temperature", "humidity", "oxygen"):
                values = buckets[hour_key][metric]
                entry[metric] = sum(values) / len(values) if values else None
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
                    zone_max[metric] = response.data[0]["value"]
                else:
                    zone_max[metric] = None
            result.append(zone_max)

        return result