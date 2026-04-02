from abstractions.oxygen_abstraction import OxygenAbstraction

class OxygenController:
    def __init__(self):
        self.oxygenAbstraction = None

    def validateOxygenData(self, value: float) -> bool:
        # Standard physiological atmospheric oxygen is ~20.9%
        # Giving it a safe buffer range for the sensors
        return 15.0 <= value <= 25.0 

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        value = data.get("value")

        if self.validateOxygenData(value):
            self.oxygenAbstraction = OxygenAbstraction(data)
            self.oxygenAbstraction.upload_to_supabase(supabase_client)
            await websocket_manager.broadcast(data)
            return True
            
        print(f"❌ Invalid Oxygen Data: {value}")
        return False