"""
Application entry point — initializes FastAPI and delegates to the
top-level PAC coordinator for agent mounting and event wiring.

Subsystem: System infrastructure
Reqs:      SR-AC1 (authentication infrastructure), SR-AC2 (RBAC route grouping)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from coordinator import initialize_agents, wire_event_subscriptions

app = FastAPI(
    title="SCEMAS API",
    swagger_ui_parameters={"persistAuthorization": True}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://3a04-t02-team3.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Coordinator initializes all PAC agents and wires inter-agent events
initialize_agents(app)
wire_event_subscriptions()

@app.get("/")
async def health_check():
    return {"status": "SCEMAS Backend is awake and healthy!"}
