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
        Returns a summary for every distinct zone found across all sensor tables.
        Used by the public dashboard zone status cards.
        """
        zones = set()
        for table in ("tempsensor", "humiditysensor", "oxygensensor"):
            response = supabase.table(table).select("zone").execute()
            for row in response.data:
                zones.add(row["zone"])

        return [self.getZoneSummary(zone) for zone in sorted(zones)]

    def getPublicMetricsHistory(self) -> list:
        """
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
