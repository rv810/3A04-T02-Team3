import uuid
class OxygenAbstraction:
    def __init__(self, sensorid: str, zone: str, value: float, unit: str, timestamp: str):
        # Explicit attributes mapped directly from your AWS payload
        self.sensorid = sensorid
        self.zone = zone
        self.value = value
        self.unit = unit
        self.timestamp = timestamp
        self.id = str(uuid.uuid4())

    def upload_to_supabase(self, supabase_client):
        # Maps the specific object properties to the database columns
        payload = {
            "sensorid": self.sensorid,
            "zone": self.zone,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp,
            "id": self.id
        }
        return supabase_client.table("oxygensensor").insert(payload).execute()