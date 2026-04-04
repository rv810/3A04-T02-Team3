from abstractions.temperature_abstraction import TemperatureAbstraction
from controllers.alerts_controller import AlertsController

class TemperatureController:
    def __init__(self):
        self.temperatureAbstraction = None
        self.alertsController = AlertsController()

    def validateTemperatureData(self, value: float) -> bool:
        return -25.0 <= value <= 100.0

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        # 1. Extract specific fields from the AWS payload
        val = data.get("value")
        if val is None:
            print("REJECT: Missing value in payload")
            return False
        s_id = data.get("sensor_id")
        z = data.get("zone")
        u = data.get("unit")
        ts = data.get("timestamp")

        # 2. Validate
        if self.validateTemperatureData(val):
            # 3. Instantiate the strict specific Abstraction
            self.temperatureAbstraction = TemperatureAbstraction(
                sensorid=s_id, 
                zone=z, 
                value=val, 
                unit=u, 
                timestamp=ts
            )
            
            # 4. Save and Broadcast
            try:
                self.temperatureAbstraction.upload_to_supabase(supabase_client)
            except Exception as e:
                print(f"ERROR: Failed to upload temperature data to Supabase: {e}")
                return False
            self.alertsController.checkAlertRules(data)
            print("Temperature data validated and saved to Supabase!")
            await websocket_manager.broadcast(data)
            return True

        print(f"SECURITY REJECT: Invalid Temperature Data ({val}%) from {z} zone!")
        return False
