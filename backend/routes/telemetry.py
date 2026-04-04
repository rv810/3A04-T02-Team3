from fastapi import APIRouter, Request, WebSocket, HTTPException, Query
from typing import Optional
from database import supabase
from websocket_manager import ws_manager
from controllers.temperature_controller import TemperatureController
from controllers.humidity_controller import HumidityController
from controllers.oxygen_controller import OxygenController

router = APIRouter()

temp_controller = TemperatureController()
humidity_controller = HumidityController()
oxygen_controller = OxygenController()

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

