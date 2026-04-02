class TemperatureAbstraction:
    def __init__(self, data: dict):
        self.temperatureSensorID = data.get("sensor_id")
        self.temperature = data.get("value")
        self.zone = data.get("zone")
        self.timestamp = data.get("timestamp")

    def upload_to_supabase(self, supabase_client):
        # The Abstraction handles its own data persistence
        payload = {
            "sensor_id": self.temperatureSensorID,
            "sensor_type": "temp",
            "zone": self.zone,
            "value": self.temperature,
            "unit": "°C",
            "timestamp": self.timestamp
        }
        # Assuming you are using the supabase-py client
        return supabase_client.table("telemetry").insert(payload).execute()
