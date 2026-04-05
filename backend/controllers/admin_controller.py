from uuid import UUID
from fastapi import HTTPException
from abstractions.admin_abstraction import AdminAbstraction
from models.alerts_info import AlertRule, CreateAlertRuleRequest, UpdateAlertRuleRequest

class AdminController:
    def __init__(self):
        self.adminAbstraction = AdminAbstraction()

    def viewAlertRules(self):
        return self.adminAbstraction.retrieveAlertRules()

    def createAlertRule(self, rule: CreateAlertRuleRequest, created_by_id: str) -> AlertRule:
        full_rule = AlertRule(
            lowerbound=rule.lowerbound,
            upperbound=rule.upperbound,
            ruletype=rule.ruletype,
            createdby=UUID(created_by_id),
            severity=rule.severity,
            name=rule.name,
        )
        if rule.lowerbound >= rule.upperbound:
            raise HTTPException(status_code=400, detail="Lower bound must be less than upper bound")
        if self.adminAbstraction.ruleExists(full_rule.ruletype, full_rule.lowerbound, full_rule.upperbound):
            raise HTTPException(status_code=409, detail="An identical alert rule already exists")
        return self.adminAbstraction.createAlertRule(full_rule, user_id=created_by_id)

    def updateAlertRule(self, rule_id: int, rule: UpdateAlertRuleRequest, user_id: str = None):
        if rule.lowerbound is not None and rule.upperbound is not None and rule.lowerbound >= rule.upperbound:
            raise HTTPException(status_code=400, detail="Lower bound must be less than upper bound")
        return self.adminAbstraction.updateAlertRule(rule_id, rule, user_id=user_id)

    def deleteAlertRule(self, rule_id: int, user_id: str = None):
        try:
            self.adminAbstraction.deleteAlertRule(rule_id, user_id=user_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to delete alert rule")

    def toggleAlertRule(self, rule_id: int, user_id: str = None) -> AlertRule:
        try:
            return self.adminAbstraction.toggleAlertRule(rule_id, user_id=user_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Alert rule not found")

    def viewAuditLog(self, limit: int = 200, offset: int = 0):
        return self.adminAbstraction.retrieveAuditLog(limit=limit, offset=offset)
