class OxygenAbstraction:
    def __init__(self, data: dict):
        self.oxygenSensorID = data.get("sensor_id")
        self.oxygenLevel = data.get("value")
        self.zone = data.get("zone")
        self.timestamp = data.get("timestamp")

    def upload_to_supabase(self, supabase_client):
        payload = {
            "sensor_id": self.oxygenSensorID,
            "sensor_type": "ox",
            "zone": self.zone,
            "value": self.oxygenLevel,
            "unit": "% vol",
            "timestamp": self.timestamp
        }
        return supabase_client.table("telemetry").insert(payload).execute()