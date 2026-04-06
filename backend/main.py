"""
Application entry point — initializes FastAPI and delegates to the
top-level PAC coordinator for agent mounting and event wiring.

Subsystem: System infrastructure
Reqs:      SR-AC1 (authentication infrastructure), SR-AC2 (RBAC route grouping)
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from limiter import limiter 
from coordinator import initialize_agents, wire_event_subscriptions

app = FastAPI(title="SCEMAS API")

# Attach rate limiter to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app = FastAPI(
    title="SCEMAS API",
    swagger_ui_parameters={"persistAuthorization": True}
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://3a04-t02-team3.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Coordinator initializes all PAC agents and wires inter-agent events
initialize_agents(app)
wire_event_subscriptions()

@app.get("/")
@limiter.limit("10/minute")
async def health_check(request: Request):
    return {"status": "SCEMAS Backend is awake and healthy!"}