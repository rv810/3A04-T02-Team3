from fastapi import APIRouter, Depends
from typing import List
from middleware.auth import require_admin
from controllers.admin_controller import AdminController
from models.alerts_info import AlertRule, CreateAlertRuleRequest, UpdateAlertRuleRequest, AuditLog

router = APIRouter(prefix="/admin", tags=["admin"])
controller = AdminController()

@router.get("/rules", response_model=List[AlertRule])
def get_alert_rules(current_user: dict = Depends(require_admin)):
    return controller.viewAlertRules()

@router.post("/rules", response_model=AlertRule)
def create_alert_rule(rule: CreateAlertRuleRequest, current_user: dict = Depends(require_admin)):
    return controller.createAlertRule(rule, current_user["id"])

@router.put("/rules/{rule_id}", response_model=AlertRule)
def update_alert_rule(rule_id: int, rule: UpdateAlertRuleRequest, current_user: dict = Depends(require_admin)):
    return controller.updateAlertRule(rule_id, rule)

@router.delete("/rules/{rule_id}", status_code=204)
def delete_alert_rule(rule_id: int, current_user: dict = Depends(require_admin)):
    controller.deleteAlertRule(rule_id)

@router.patch("/rules/{rule_id}/toggle", response_model=AlertRule)
def toggle_alert_rule(rule_id: int, current_user: dict = Depends(require_admin)):
    return controller.toggleAlertRule(rule_id)

@router.get("/audit-log", response_model=List[AuditLog])
def get_audit_log(current_user: dict = Depends(require_admin)):
    return controller.viewAuditLog()
