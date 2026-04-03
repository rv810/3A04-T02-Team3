import uuid
class TemperatureAbstraction:
    def __init__(self, sensorid: str, zone: str, value: float, unit: str, timestamp: str):
        self.sensorid = sensorid
        self.zone = zone
        self.value = value
        self.unit = unit
        self.timestamp = timestamp
        self.id = str(uuid.uuid4())

    def upload_to_supabase(self, supabase_client):
        payload = {
            "sensorid": self.sensorid,
            "zone": self.zone,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp,
            "id": self.id
        }
        return supabase_client.table("tempsensor").insert(payload).execute()
