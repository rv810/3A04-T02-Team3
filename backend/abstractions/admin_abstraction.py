from database import supabase
from models.alerts_info import AlertRule, AuditLog, UpdateAlertRuleRequest
from typing import List

class AdminAbstraction:
    def retrieveAlertRules(self) -> List[AlertRule]:
        response = supabase.table("alertrules").select("*").execute()
        return [AlertRule(**row) for row in response.data]

    def createAlertRule(self, rule: AlertRule) -> AlertRule:
        payload = rule.model_dump(exclude_none=True, mode="json")
        response = supabase.table("alertrules").insert(payload).execute()
        return AlertRule(**response.data[0])

    def updateAlertRule(self, rule_id: int, rule: UpdateAlertRuleRequest) -> AlertRule:
        payload = rule.model_dump(exclude_none=True, mode="json")
        response = (
            supabase.table("alertrules")
            .update(payload)
            .eq("ruleID", rule_id)
            .execute()
        )
        return AlertRule(**response.data[0])

    def deleteAlertRule(self, rule_id: int) -> None:
        response = (
            supabase.table("alertrules")
            .delete()
            .eq("ruleID", rule_id)
            .execute()
        )
        if not response.data:
            raise ValueError("Alert rule not found")

    def toggleAlertRule(self, rule_id: int) -> AlertRule:
        current = (
            supabase.table("alertrules")
            .select("*")
            .eq("ruleID", rule_id)
            .single()
            .execute()
        )
        new_enabled = not current.data["enabled"]
        response = (
            supabase.table("alertrules")
            .update({"enabled": new_enabled})
            .eq("ruleID", rule_id)
            .execute()
        )
        return AlertRule(**response.data[0])

    def ruleExists(self, ruletype, lowerbound, upperbound) -> bool:
        response = (
            supabase.table("alertrules")
            .select("ruleID")
            .eq("ruletype", ruletype)
            .eq("lowerbound", lowerbound)
            .eq("upperbound", upperbound)
            .execute()
        )
        return len(response.data) > 0

    def retrieveAuditLog(self) -> List[AuditLog]:
        response = (
            supabase.table("auditlog")
            .select("*")
            .order("timestamp", desc=True)
            .execute()
        )
        return [AuditLog(**row) for row in response.data]
