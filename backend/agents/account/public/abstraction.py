"""
Database queries for public environmental data aggregation.

Subsystem: Consumes Telemetry Data Management subsystem
PAC Layer: Abstraction
PAC Agent: Account Management
Sub-agent: Public 
Reqs:      BE5
"""
from database import supabase, with_db_retry
from datetime import datetime, timezone, timedelta
import re


class PublicAbstraction:

    @with_db_retry
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

    @with_db_retry
    def getActiveAlertCount(self) -> int:
        """Returns the count of currently active (unresolved) alerts for the public chatbot."""
        response = (
            supabase.table("activealerts")
            .select("alertid", count="exact")
            .eq("status", "active")
            .execute()
        )
        return response.count or 0

    def chatQuery(self, message: str) -> str:
        """
        Processes a natural-language query from a public user and returns a
        data-backed response using live sensor readings and alert counts.
        """
        msg = message.lower().strip()

        # Greetings
        if re.match(r'^(hi|hello|hey)\b', msg):
            return (
                "Hi! I'm the SCEMAS environmental assistant. "
                "Ask me about temperature, humidity, oxygen levels, zone status, or active alerts."
            )

        # Fetch all zone data once — reused across query branches
        zones = self.getAllZonesSummary()

        def avg_metric(key: str):
            vals = [z[key]['value'] for z in zones if z.get(key) and z[key] is not None]
            return round(sum(vals) / len(vals), 1) if vals else None

        # Temperature
        if 'temp' in msg:
            avg = avg_metric('temperature')
            if avg is not None:
                status = 'Normal' if 15 <= avg <= 30 else 'Extreme'
                return (
                    f"The current city-wide average temperature is {avg}°C "
                    f"across {len(zones)} zone(s). Status: {status}."
                )
            return "Temperature data is not available right now."

        # Humidity
        if 'humid' in msg:
            avg = avg_metric('humidity')
            if avg is not None:
                status = 'Normal' if 30 <= avg <= 70 else 'Abnormal'
                return (
                    f"The current city-wide average humidity is {avg}% "
                    f"across {len(zones)} zone(s). Status: {status}."
                )
            return "Humidity data is not available right now."

        # Oxygen / air quality
        if 'oxygen' in msg or ' o2' in msg or ('air' in msg and 'quality' in msg):
            avg = avg_metric('oxygen')
            if avg is not None:
                status = 'Normal' if 19 <= avg <= 22 else 'Low'
                return (
                    f"The current city-wide average oxygen level is {avg}% "
                    f"across {len(zones)} zone(s). Status: {status}."
                )
            return "Oxygen data is not available right now."

        # Active alerts
        if any(kw in msg for kw in ('alert', 'warn', 'danger', 'issue', 'problem')):
            count = self.getActiveAlertCount()
            if count == 0:
                return (
                    "There are currently no active alerts in the system. "
                    "All monitored conditions appear normal."
                )
            if count == 1:
                return (
                    "There is currently 1 active alert in the system. "
                    "Operators are monitoring the situation."
                )
            return (
                f"There are currently {count} active alerts in the system. "
                "Operators are actively monitoring these conditions."
            )

        # Specific zone query — check if any known zone name appears in the message
        for z in zones:
            if z['zone'].lower() in msg:
                parts = []
                if z.get('temperature') and z['temperature']:
                    parts.append(f"Temperature: {z['temperature']['value']}°C")
                if z.get('humidity') and z['humidity']:
                    parts.append(f"Humidity: {z['humidity']['value']}%")
                if z.get('oxygen') and z['oxygen']:
                    parts.append(f"Oxygen: {z['oxygen']['value']}%")
                reading_str = ', '.join(parts) if parts else 'no sensor readings available'
                return f"Zone '{z['zone']}' is {z['status']}. Current readings — {reading_str}."

        # General zone overview
        if any(kw in msg for kw in ('zone', 'area', 'district', 'region', 'location')):
            if not zones:
                return "No zone data is available right now."
            online = [z for z in zones if z['status'] == 'online']
            zone_list = ', '.join(z['zone'] for z in zones)
            return (
                f"Monitoring {len(zones)} zone(s): {zone_list}. "
                f"{len(online)} of {len(zones)} currently online."
            )

        # Sensor overview
        if 'sensor' in msg:
            return f"Currently monitoring {len(zones)} zone(s) with real-time sensor data."

        # General status / overview / summary
        if any(kw in msg for kw in ('status', 'overview', 'summary', 'overall', 'how is', 'condition')):
            t = avg_metric('temperature')
            h = avg_metric('humidity')
            o = avg_metric('oxygen')
            count = self.getActiveAlertCount()
            parts = []
            if t is not None:
                parts.append(f"Temperature: {t}°C")
            if h is not None:
                parts.append(f"Humidity: {h}%")
            if o is not None:
                parts.append(f"Oxygen: {o}%")
            reading_str = ', '.join(parts) if parts else 'no data available'
            alert_str = f"{count} active alert(s)" if count > 0 else "no active alerts"
            return (
                f"City-wide averages — {reading_str}. "
                f"Monitoring {len(zones)} zone(s) with {alert_str}."
            )

        return (
            "I can help with: temperature, humidity, oxygen levels, "
            "zone status, and active alerts. What would you like to know?"
        )

    @with_db_retry
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

    @with_db_retry
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
                # Normalize Supabase ISO timestamps: replace Z and pad/truncate
                # fractional seconds to 6 digits so fromisoformat accepts them.
                ts_str = ts_str.replace("Z", "+00:00")
                ts_str = re.sub(r'(\.\d+)', lambda m: m.group(1).ljust(7, '0')[:7], ts_str)
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
