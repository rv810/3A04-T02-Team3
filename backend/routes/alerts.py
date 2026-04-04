from fastapi import APIRouter, Depends
from controllers.alerts_controller import AlertsController
from models.alerts_info import AlertsInfo
from middleware.auth import require_operator
from typing import List

router = APIRouter(prefix="/alerts", tags=["alerts"])
controller = AlertsController()

@router.get("/", response_model=List[AlertsInfo])
def get_alerts(current_user: dict = Depends(require_operator)):
    return controller.retrieveAlerts()