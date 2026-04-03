import uuid
class HumidityAbstraction:
    def __init__(self, sensor_id: str, zone: str, value: float, unit: str, timestamp: str):
        self.sensor_id = sensor_id
        self.zone = zone
        self.value = value
        self.unit = unit
        self.timestamp = timestamp
        self.id = str(uuid.uuid4())

    def upload_to_supabase(self, supabase_client):
        payload = {
            "sensor_id": self.sensor_id,
            "sensor_type": "humidity",
            "zone": self.zone,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp,
            "id": self.id
        }
        return supabase_client.table("humiditysensor").insert(payload).execute()