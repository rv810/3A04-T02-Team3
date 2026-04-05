"""
Ingestion endpoint for AWS IoT telemetry and WebSocket real-time feed.

PAC Layer: Presentation
PAC Agent: Telemetry Data Management
Pattern:   Pipe-and-Filter
Reqs:      SR-INT1, SR-INT2, PR-SL1, PR-RFT1, BE4
"""

from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query, Request, WebSocket, HTTPException, Depends
from middleware.auth import require_operator
from database import supabase
from websocket_manager import ws_manager
from agents.telemetry.temperature.control import TemperatureController
from agents.telemetry.humidity.control import HumidityController
from agents.telemetry.oxygen.control import OxygenController
from agents.telemetry.control import SensorsController

router = APIRouter()

temp_controller = TemperatureController()
humidity_controller = HumidityController()
oxygen_controller = OxygenController()
sensors_controller = SensorsController()

@router.post("/api/telemetry")
async def aws_iot_webhook(request: Request):
    data = await request.json()

    # THE AWS CONFIRMATION HANDSHAKE TRAP
    if "confirmationToken" in data:
        the_token = data["confirmationToken"]
        print("\n" + "*"*50)
        print(f"COPY THIS TOKEN TO AWS: {the_token}")
        print("*"*50 + "\n")
        return {"confirmationToken": the_token}

    # If it's not a handshake, proceed as normal...
    sensor_type = data.get("sensor_type")

    # Safety check just in case the JSON is missing the sensor_type
    if not sensor_type:
        print(f"ERROR: Missing sensor_type in payload: {data}")
        raise HTTPException(status_code=400, detail="Missing sensor type")

    print("\n" + "="*50)
    print(f"[AWS IOT TRIGGER] Webhook hit at {data.get('timestamp')}")
    print(f"Sensor Type : {sensor_type.upper()}")
    print(f"Zone        : {data.get('zone')}")
    print(f"Value       : {data.get('value')} {data.get('unit')}")
    print("="*50 + "\n")

    success = False

    # Route to your specific PAC Controllers
    if sensor_type == "temp":
        success = await temp_controller.handle_incoming_data(data, supabase, ws_manager)
    elif sensor_type == "humidity":
        success = await humidity_controller.handle_incoming_data(data, supabase, ws_manager)
    elif sensor_type == "ox":
        success = await oxygen_controller.handle_incoming_data(data, supabase, ws_manager)
    else:
        print("ERROR: Unknown Sensor Type Rejected")
        raise HTTPException(status_code=400, detail="Unknown sensor type")

    if not success:
        raise HTTPException(status_code=422, detail="Data validation failed")

    return {"status": "success", "message": "Validated, stored, and broadcasted"}


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None)
):
    if not token:
        await websocket.close(code=1008)
        return

    try:
        user_response = supabase.auth.get_user(token)
        user_id = str(user_response.user.id)
        result = (
            supabase.table("accounts")
            .select("userrole")
            .eq("id", user_id)
            .single()
            .execute()
        )
        role = result.data["userrole"]
        if role not in ["operator", "admin"]:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        if websocket in ws_manager.active_connections:
            ws_manager.active_connections.remove(websocket)

@router.get("/sensors")
async def get_sensors(
    zone: Optional[str] = Query(None, description="Filter by zone name"),
    current_user: dict = Depends(require_operator)
):
    return sensors_controller.getSensors(zone)

# Why: city-averages must be defined before the /{id} route to avoid path
# conflict (FastAPI matches routes top-down; "city-averages" would otherwise
# be captured as an {id} parameter).
@router.get("/sensors/city-averages")
async def get_city_averages(current_user: dict = Depends(require_operator)):
    return sensors_controller.getCityAverages()

@router.get("/sensors/readings-today")
async def get_readings_today(current_user: dict = Depends(require_operator)):
    return sensors_controller.getReadingsToday()

@router.get("/sensors/{id}")
async def get_sensor(id: str, current_user: dict = Depends(require_operator)):
    sensor = sensors_controller.getSensor(id)
    if not sensor:
        raise HTTPException(status_code=404, detail="sensor not found")
    return sensor
