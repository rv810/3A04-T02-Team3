"""
Business logic for alert rule management (create, update, delete, toggle).

Subsystem: Alert Rules Management
PAC Layer: Control
PAC Agent: Account Management
Sub-agent: Admin
Pattern:   Blackboard
Reqs:      BE2, SR-AC3, SR-AU1
"""
from uuid import UUID
from fastapi import HTTPException
from agents.account.admin.abstraction import AdminAbstraction
from models.alerts_info import AlertRule, CreateAlertRuleRequest, UpdateAlertRuleRequest

class AdminController:
    def __init__(self):
        self.adminAbstraction = AdminAbstraction()

    def viewAlertRules(self):
        return self.adminAbstraction.retrieveAlertRules()

    def createAlertRule(self, rule: CreateAlertRuleRequest, created_by_id: str) -> AlertRule:
        """Creates a new threshold-based alert rule with duplicate detection. Implements BE2 (Create Alert Rule)."""
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
        """Modifies an existing alert rule's thresholds or parameters. Implements BE2."""
        # Edge case: when only one bound is provided, the other retains its DB value.
        # Validation only runs when both are present, so a partial update could
        # create equal bounds (lowerbound == upperbound), producing a rule that
        # triggers on every reading — technically valid but unusual.
        if rule.lowerbound is not None and rule.upperbound is not None and rule.lowerbound >= rule.upperbound:
            raise HTTPException(status_code=400, detail="Lower bound must be less than upper bound")
        return self.adminAbstraction.updateAlertRule(rule_id, rule, user_id=user_id)

    def deleteAlertRule(self, rule_id: int, user_id: str = None):
        """Removes an alert rule. Implements BE2."""
        try:
            self.adminAbstraction.deleteAlertRule(rule_id, user_id=user_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to delete alert rule")

    def toggleAlertRule(self, rule_id: int, user_id: str = None) -> AlertRule:
        """Enables or disables an alert rule without deleting it. Implements BE2."""
        try:
            return self.adminAbstraction.toggleAlertRule(rule_id, user_id=user_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Alert rule not found")

    def viewAuditLog(self, limit: int = 200, offset: int = 0):
        return self.adminAbstraction.retrieveAuditLog(limit=limit, offset=offset)
