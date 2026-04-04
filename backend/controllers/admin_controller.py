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
            createdby=UUID(created_by_id)
        )
        if self.adminAbstraction.ruleExists(full_rule.ruletype, full_rule.lowerbound, full_rule.upperbound):
            raise HTTPException(status_code=409, detail="An identical alert rule already exists")
        return self.adminAbstraction.createAlertRule(full_rule)

    def updateAlertRule(self, rule_id: int, rule: UpdateAlertRuleRequest):
        return self.adminAbstraction.updateAlertRule(rule_id, rule)

    def deleteAlertRule(self, rule_id: int):
        try:
            self.adminAbstraction.deleteAlertRule(rule_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to delete alert rule")

    def viewAuditLog(self):
        return self.adminAbstraction.retrieveAuditLog()
