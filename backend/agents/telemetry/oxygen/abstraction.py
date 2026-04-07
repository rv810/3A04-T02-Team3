"""
Data carrier and persistence for oxygen sensor readings.

PAC Layer: Abstraction
PAC Agent: Telemetry Data Management
Sub-agent: Oxygen
Pattern:   Pipe-and-Filter
Reqs:      PR-SL1
"""
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


class OxygenAbstraction:
    def __init__(self, sensorid: str, zone: str, value: float, unit: str, timestamp: str):
        # Explicit attributes mapped directly from your AWS payload
        self.sensorid = sensorid
        self.zone = zone
        self.value = value
        self.unit = unit
        self.timestamp = timestamp

    def upload_to_supabase(self, supabase_client):
        # Maps the specific object properties to the database columns
        payload = {
            "sensorid": self.sensorid,
            "zone": self.zone,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp
        }
        return _query_with_retry(lambda: supabase_client.table("oxygensensor").insert(payload).execute())
