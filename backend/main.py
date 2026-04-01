from fastapi import FastAPI
from routes.alerts import router as alerts_router

app = FastAPI()
app.include_router(alerts_router)