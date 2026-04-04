from fastapi import APIRouter, Depends, Body, Query
from typing import List, Optional
from middleware.auth import require_operator
from controllers.operator_controller import OperatorController
from models.alerts_info import AlertsInfo, AuditLog, ResolveAlertRequest

router = APIRouter(prefix="/operator", tags=["operator"])
controller = OperatorController()

@router.get("/alerts", response_model=List[AlertsInfo])
def get_alerts(
    status: Optional[str] = Query(default=None, description="Comma-separated statuses: active,acknowledged,resolved"),
    current_user: dict = Depends(require_operator)
):
    statuses = [s.strip() for s in status.split(",")] if status else None
    return controller.viewAlertsByStatus(statuses)

@router.get("/alerts/acknowledged", response_model=List[AlertsInfo])
def get_acknowledged_alerts(current_user: dict = Depends(require_operator)):
    return controller.viewAcknowledgedAlerts()

@router.get("/alerts/resolved", response_model=List[AlertsInfo])
def get_resolved_alerts(current_user: dict = Depends(require_operator)):
    return controller.viewResolvedAlerts()

@router.get("/audit-log", response_model=List[AuditLog])
def get_audit_log(current_user: dict = Depends(require_operator)):
    return controller.viewAuditLog()

@router.put("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, current_user: dict = Depends(require_operator)):
    controller.acknowledgeAlert(alert_id, current_user["id"])
    return {"message": "Alert acknowledged"}

@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, body: Optional[ResolveAlertRequest] = Body(None), current_user: dict = Depends(require_operator)):
    note = body.note if body else None
    controller.resolveAlert(alert_id, current_user["id"], note=note)
    return {"message": "Alert resolved", "note": note}
