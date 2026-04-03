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
                sensor_id=s_id, 
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
