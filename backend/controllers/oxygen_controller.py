"""
Validates and processes oxygen telemetry through the pipe-and-filter chain.

Subsystem: Telemetry Data Management
PAC Layer: Control
Pattern:   Pipe-and-Filter
Reqs:      SR-INT1, SR-INT2, PR-SL1, PR-SC1
"""

from abstractions.oxygen_abstraction import OxygenAbstraction
from controllers.alerts_controller import AlertsController

class OxygenController:
    def __init__(self):
        self.alertsController = AlertsController()

    def validateOxygenData(self, value: float) -> bool:
        """Validates oxygen readings against physically plausible range
        (15 to 25%). Implements SR-INT1 (telemetry validated),
        SR-INT2 (reject invalid)."""
        return 15.0 <= value <= 25.0

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        """Processes validated oxygen data through the pipe:
        validate -> store -> check alerts. Implements PR-SL1 (process
        within 5s)."""
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
            # 3. Why: abstraction created per-request as a local variable to
            # avoid shared mutable state between concurrent requests.
            abstraction = OxygenAbstraction(
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
                print(f"ERROR: Failed to upload oxygen data to Supabase: {e}")
                return False
            # Why: db_sensor_id (bigint FK from the sensor table) is used
            # instead of sensor_id (string UUID from AWS) because alert FKs
            # reference the database primary key.
            data["db_sensor_id"] = db_response.data[0]["id"]
            self.alertsController.checkAlertRules(data)
            print("Oxygen data validated and saved to Supabase!")
            await websocket_manager.broadcast({
                "event": "sensor_update",
                "data": data
            })
            return True
            
        print(f"SECURITY REJECT: Invalid Oxygen Data ({val}%) from {z} zone!")
        return False
