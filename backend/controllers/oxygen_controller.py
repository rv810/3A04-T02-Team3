from abstractions.oxygen_abstraction import OxygenAbstraction
from controllers.alerts_controller import AlertsController

class OxygenController:
    def __init__(self):
        self.oxygenAbstraction = None
        self.alertsController = AlertsController()

    def validateOxygenData(self, value: float) -> bool:
        return 15.0 <= value <= 25.0 

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
            try:
                self.oxygenAbstraction.upload_to_supabase(supabase_client)
            except Exception as e:
                print(f"ERROR: Failed to upload oxygen data to Supabase: {e}")
                return False
            self.alertsController.checkAlertRules(data)
            print("Oxygen data validated and saved to Supabase!")
            await websocket_manager.broadcast({
                "event": "sensor_update",
                "data": data
            })
            return True
            
        print(f"SECURITY REJECT: Invalid Oxygen Data ({val}%) from {z} zone!")
        return False
