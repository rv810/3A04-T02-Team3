
# main.py
from fastapi import FastAPI, Request, WebSocket, HTTPException
from supabase import create_client, Client
from controllers.humidity_controller import HumidityController
from controllers.temperature_controller import TemperatureController
from controllers.oxygen_controller import OxygenController
from typing import List
import os
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Simple WebSocket Manager (Your "Presentation" Coordinator)
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

ws_manager = ConnectionManager()

# Instantiate your Controllers
temp_controller = TemperatureController()
humidity_controller = HumidityController()
oxygen_controller = OxygenController()

@app.post("/api/telemetry")
async def aws_iot_webhook(request: Request):
    data = await request.json()
    sensor_type = data.get("sensor_type")

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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep the connection open to push data to the dashboard
            await websocket.receive_text()
    except:
        ws_manager.active_connections.remove(websocket)