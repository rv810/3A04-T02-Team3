from abstractions.humidity_abstraction import HumidityAbstraction
from controllers.alerts_controller import AlertsController

class HumidityController:
    def __init__(self):
        self.alertsController = AlertsController()

    def validateHumidityData(self, value: float) -> bool:
        return 0.0 <= value <= 100.0

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
        if self.validateHumidityData(val):
            # 3. Create abstraction as local variable (no shared mutable state)
            abstraction = HumidityAbstraction(
                sensorid=s_id,
                zone=z,
                value=val,
                unit=u,
                timestamp=ts
            )

            # 4. Save and capture DB-generated bigint PK
            try:
                db_response = abstraction.upload_to_supabase(supabase_client)
            except Exception as e:
                print(f"ERROR: Failed to upload humidity data to Supabase: {e}")
                return False
            data["db_sensor_id"] = db_response.data[0]["id"]
            self.alertsController.checkAlertRules(data)
            print("Humidity data validated and saved to Supabase!")
            await websocket_manager.broadcast({
                "event": "sensor_update",
                "data": data
            })
            return True

        print(f"SECURITY REJECT: Invalid Humidity Data ({val}%) from {z} zone!")
        return False


