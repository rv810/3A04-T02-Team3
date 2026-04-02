class HumidityAbstraction:
    def __init__(self, data: dict):
        self.humiditySensorID = data.get("sensor_id")
        self.humidity = data.get("value")
        self.zone = data.get("zone")
        self.timestamp = data.get("timestamp")

    def upload_to_supabase(self, supabase_client):
        payload = {
            "sensor_id": self.humiditySensorID,
            "sensor_type": "humidity",
            "zone": self.zone,
            "value": self.humidity,
            "unit": "%RH",
            "timestamp": self.timestamp
        }
        return supabase_client.table("telemetry").insert(payload).execute()
