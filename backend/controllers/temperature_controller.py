from abstractions.temperature_abstraction import TemperatureAbstraction

class TemperatureController:
    def __init__(self):
        self.temperatureAbstraction = None

    def validateTemperatureData(self, value: float) -> bool:
        # Ensures temp is between -25 to 100 degrees Celsius
        return -25.0 <= value <= 100.0

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        value = data.get("value")

        if self.validateTemperatureData(value):
            # 1. Instantiate the Abstraction
            self.temperatureAbstraction = TemperatureAbstraction(data)
            
            # 2. Tell the Abstraction to save itself to Supabase
            self.temperatureAbstraction.upload_to_supabase(supabase_client)
            
            # 3. Tell the Presentation layer (WebSockets) to broadcast
            await websocket_manager.broadcast(data)
            return True
        
        print(f"❌ Invalid Temperature Data: {value}")
        return False
