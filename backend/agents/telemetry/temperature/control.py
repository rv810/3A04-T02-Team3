"""
Validates and processes temperature telemetry through the pipe-and-filter chain.

PAC Layer: Control
PAC Agent: Telemetry Data Management
Sub-agent: Temperature
Pattern:   Pipe-and-Filter
Reqs:      SR-INT1, SR-INT2, PR-SL1, PR-SC1
"""

from agents.telemetry.temperature.abstraction import TemperatureAbstraction
from events.event_bus import event_bus

class TemperatureController:
    def __init__(self):
        pass

    def validateTemperatureData(self, value: float) -> bool:
        """Validates temperature readings against physically plausible range
        (-25 to 100 deg C). Implements SR-INT1 (telemetry validated),
        SR-INT2 (reject invalid)."""
        return -25.0 <= value <= 100.0

    async def handle_incoming_data(self, data: dict, supabase_client, websocket_manager):
        """Processes validated temperature data through the pipe:
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
        if self.validateTemperatureData(val):
            # 3. Why: abstraction created per-request as a local variable to
            # avoid shared mutable state between concurrent requests.
            abstraction = TemperatureAbstraction(
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
                print(f"ERROR: Failed to upload temperature data to Supabase: {e}")
                return False
            # Why: db_sensor_id (bigint FK from the sensor table) is used
            # instead of sensor_id (string UUID from AWS) because alert FKs
            # reference the database primary key.
            data["db_sensor_id"] = db_response.data[0]["id"]
            await event_bus.publish("sensor_data_validated", data)
            print("Temperature data validated and saved to Supabase!")
            await websocket_manager.broadcast({
                "event": "sensor_update",
                "data": data
            })
            return True

        print(f"SECURITY REJECT: Invalid Temperature Data ({val}%) from {z} zone!")
        return False
