from fastapi import FastAPI
from fastapi.security import HTTPBearer

from routes.alerts import router as alerts_router
from routes.accounts import router as accounts_router
from routes.operator import router as operator_router
from routes.admin import router as admin_router
from routes.telemetry import router as telemetry_router

security = HTTPBearer()

app = FastAPI(
    title="SCEMAS API",
    swagger_ui_parameters={"persistAuthorization": True}
)

app.include_router(alerts_router)
app.include_router(accounts_router)
app.include_router(operator_router)
app.include_router(admin_router)
app.include_router(telemetry_router)

@app.get("/")
async def health_check():
    return {"status": "SCEMAS Backend is awake and healthy!"}
