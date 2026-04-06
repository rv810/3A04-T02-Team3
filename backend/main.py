"""
Application entry point — configures CORS, registers all route modules.

Subsystem: System infrastructure — serves all three subsystems
PAC Layer: N/A
Pattern:   N/A
Reqs:      SR-AC1 (authentication infrastructure), SR-AC2 (RBAC route grouping)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

from routes.accounts import router as accounts_router
from routes.operator import router as operator_router
from routes.admin import router as admin_router
from routes.telemetry import router as telemetry_router
from routes.public import router as public_router

security = HTTPBearer()

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

app.include_router(accounts_router)
app.include_router(operator_router)
app.include_router(admin_router)
app.include_router(telemetry_router)
app.include_router(public_router)

@app.get("/")
async def health_check():
    return {"status": "SCEMAS Backend is awake and healthy!"}
