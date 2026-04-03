from abstractions.oxygen_abstraction import OxygenAbstraction

class OxygenController:
    def __init__(self):
        self.oxygenAbstraction = None

    def validateOxygenData(self, value: float) -> bool:
        return 15.0 <= value <= 25.0 

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        # 1. Extract specific fields from the AWS payload
        val = data.get("value")
        s_id = data.get("sensor_id")
        z = data.get("zone")
        u = data.get("unit")
        ts = data.get("timestamp")

        # 2. Validate
        if self.validateOxygenData(val):
            # 3. Instantiate the strict specific Abstraction
            self.oxygenAbstraction = OxygenAbstraction(
                sensorid=s_id, 
                zone=z, 
                value=val, 
                unit=u, 
                timestamp=ts
            )
            
            # 4. Save and Broadcast
            self.oxygenAbstraction.upload_to_supabase(supabase_client)
            print("Oxygen data validated and saved to Supabase!")
            await websocket_manager.broadcast(data)
            return True
            
        print(f"SECURITY REJECT: Invalid Oxygen Data ({val}%) from {z} zone!")
        return False
    
    async def get_public_summary(self, zone: str, supabase_client):
        """Fetches the latest read-only oxygen for public signage."""
        try:
            # Query Supabase for the single most recent reading in this zone
            response = supabase_client.table("oxygensensor").select("value, unit, timestamp").eq("zone", zone).order("timestamp", desc=True).limit(1).execute()

            if response.data:
                return {
                    "zone": zone.capitalize(),
                    "sensor_type": "Oxygen",
                    "oxygen": response.data[0]["value"],
                    "unit": response.data[0]["unit"],
                    "last_updated": response.data[0]["timestamp"],
                    "status": "Online"
                }
            else:
                return {
                    "zone": zone.capitalize(), 
                    "status": "Offline", 
                    "message": "No oxygen data available for this zone."
                }
        except Exception as e:
            return {"error": "Database connection failed", "details": str(e)}
