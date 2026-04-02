from fastapi import APIRouter
from controllers.alerts_controller import AlertsController
from models.alerts_info import AlertsInfo
from typing import List

router = APIRouter(prefix="/alerts", tags=["alerts"])
controller = AlertsController()

@router.get("/", response_model=List[AlertsInfo])
def get_alerts():
    return controller.retrieveAlerts()

@router.post("/audit")
def audit_log(alert: AlertsInfo):
    controller.auditLog(alert)
    return {"message": "Alert logged successfully"}