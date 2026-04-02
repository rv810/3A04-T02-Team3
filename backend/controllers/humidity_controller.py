from abstractions.humidity_abstraction import HumidityAbstraction

class HumidityController:
    def __init__(self):
        self.humidityAbstraction = None

    def validateHumidityData(self, value: float) -> bool:
        # Ensures humidity is between 0 to 100 %RH
        return 0.0 <= value <= 100.0

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        value = data.get("value")

        if self.validateHumidityData(value):
            self.humidityAbstraction = HumidityAbstraction(data)
            self.humidityAbstraction.upload_to_supabase(supabase_client)
            await websocket_manager.broadcast(data)
            return True
            
        print(f"❌ Invalid Humidity Data: {value}")
        return False
