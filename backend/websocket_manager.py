"""
Real-time event broadcasting — manages WebSocket connections for live updates.

Subsystem: Telemetry Data Management — real-time broadcast
PAC Layer: Presentation
Pattern:   N/A
Reqs:      BE4 (real-time data streaming), PR-SL1 (service-level responsiveness)
"""

from typing import List
from fastapi import WebSocket

# Simple WebSocket Manager ("Presentation" Coordinator)
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.active_connections.remove(connection)

ws_manager = ConnectionManager()
