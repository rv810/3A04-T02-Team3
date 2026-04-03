from abstractions.humidity_abstraction import HumidityAbstraction

class HumidityController:
    def __init__(self):
        self.humidityAbstraction = None

    def validateHumidityData(self, value: float) -> bool:
        return 0.0 <= value <= 100.0

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        # 1. Extract specific fields from the AWS payload
        val = data.get("value")
        s_id = data.get("sensorid")
        z = data.get("zone")
        u = data.get("unit")
        ts = data.get("timestamp")

        # 2. Validate
        if self.validateHumidityData(val):
            # 3. Instantiate the strict specific Abstraction
            self.humidityAbstraction = HumidityAbstraction(
                sensorid=s_id, 
                zone=z, 
                value=val, 
                unit=u, 
                timestamp=ts
            )
            
            # 4. Save and Broadcast
            self.humidityAbstraction.upload_to_supabase(supabase_client)
            print("Humidity data validated and saved to Supabase!")
            await websocket_manager.broadcast(data)
            return True

        print(f"SECURITY REJECT: Invalid Humidity Data ({val}%) from {z} zone!")
        return False

