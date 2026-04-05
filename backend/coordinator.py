"""
Top-level PAC coordinator — mounts all sub-agent routers and wires
inter-agent communication through the event bus.

In PAC, the top-level agent owns the lifecycle of sub-agents and
coordinates their interactions. Sub-agents never import each other;
they communicate exclusively through events published to this
coordinator's event bus.

Subsystem: System infrastructure — top-level PAC agent
PAC Layer: Control (top-level)
Pattern:   PAC coordinator + Mediator 
"""

from fastapi import FastAPI
from events.event_bus import event_bus
from websocket_manager import ws_manager

# Import agent routers (Presentation layer of each agent)
from agents.account.presentation import router as account_router
from agents.account.admin.presentation import router as admin_router
from agents.account.operator.presentation import router as operator_router
from agents.account.public.presentation import router as public_router
from agents.telemetry.presentation import router as telemetry_router

# Import agent controllers that need event bus wiring
from agents.alerts.control import AlertsController


def initialize_agents(app: FastAPI) -> None:
    """Mount all agent presentation routers onto the FastAPI app."""
    app.include_router(account_router)
    app.include_router(admin_router)
    app.include_router(operator_router)
    app.include_router(public_router)
    app.include_router(telemetry_router)


def wire_event_subscriptions() -> None:
    """Connect inter-agent communication through the event bus. (Publisher-subscriber pattern)

    Telemetry agent emits 'sensor_data_validated' after storing a reading.
    Alerts agent subscribes and evaluates rules independently.
    Alerts agent emits 'alert_triggered' when a violation is detected.
    Coordinator handles WebSocket broadcast of triggered alerts.
    """
    alerts_controller = AlertsController()

    # Telemetry → Alerts: evaluate rules when new sensor data arrives
    event_bus.subscribe("sensor_data_validated", alerts_controller.checkAlertRules)

    # Alerts → WebSocket: broadcast triggered alerts to connected operators
    async def broadcast_alert(alert_data):
        await ws_manager.broadcast({
            "event": "alert_triggered",
            "data": alert_data
        })

    event_bus.subscribe("alert_triggered", broadcast_alert)
