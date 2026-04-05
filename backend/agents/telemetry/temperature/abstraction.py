"""
Data carrier and persistence for temperature sensor readings.

PAC Layer: Abstraction
PAC Agent: Telemetry Data Management
Sub-agent: Temperature
Pattern:   Pipe-and-Filter
Reqs:      PR-SL1
"""


class TemperatureAbstraction:
    def __init__(self, sensorid: str, zone: str, value: float, unit: str, timestamp: str):
        self.sensorid = sensorid
        self.zone = zone
        self.value = value
        self.unit = unit
        self.timestamp = timestamp

    def upload_to_supabase(self, supabase_client):
        payload = {
            "sensorid": self.sensorid,
            "zone": self.zone,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp
        }
        return supabase_client.table("tempsensor").insert(payload).execute()
