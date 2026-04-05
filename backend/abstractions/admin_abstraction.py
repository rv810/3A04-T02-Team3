from database import supabase
from models.alerts_info import AlertRule, AuditLog, UpdateAlertRuleRequest
from typing import List
from datetime import datetime, timezone

class AdminAbstraction:
    def retrieveAlertRules(self) -> List[AlertRule]:
        response = supabase.table("alertrules").select("*").execute()
        return [AlertRule(**row) for row in response.data]

    def createAlertRule(self, rule: AlertRule, user_id: str = None) -> AlertRule:
        payload = rule.model_dump(exclude_none=True, mode="json")
        response = supabase.table("alertrules").insert(payload).execute()
        created = AlertRule(**response.data[0])
        supabase.table("auditlog").insert({
            "eventtype": "rule_created",
            "description": f"Alert rule '{rule.name}' created",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute()
        return created

    def updateAlertRule(self, rule_id: int, rule: UpdateAlertRuleRequest, user_id: str = None) -> AlertRule:
        payload = rule.model_dump(exclude_none=True, mode="json")
        response = (
            supabase.table("alertrules")
            .update(payload)
            .eq("ruleID", rule_id)
            .execute()
        )
        updated = AlertRule(**response.data[0])
        supabase.table("auditlog").insert({
            "eventtype": "rule_updated",
            "description": f"Alert rule {rule_id} updated",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute()
        return updated

    def deleteAlertRule(self, rule_id: int, user_id: str = None) -> None:
        response = (
            supabase.table("alertrules")
            .delete()
            .eq("ruleID", rule_id)
            .execute()
        )
        if not response.data:
            raise ValueError("Alert rule not found")
        supabase.table("auditlog").insert({
            "eventtype": "rule_deleted",
            "description": f"Alert rule {rule_id} deleted",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute()

    def toggleAlertRule(self, rule_id: int, user_id: str = None) -> AlertRule:
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
        toggled = AlertRule(**response.data[0])
        supabase.table("auditlog").insert({
            "eventtype": "rule_toggled",
            "description": f"Alert rule {rule_id} toggled to {'enabled' if new_enabled else 'disabled'}",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute()
        return toggled

    def ruleExists(self, ruletype, lowerbound, upperbound) -> bool:
        response = (
            supabase.table("alertrules")
            .select("ruleID")
            .eq("ruletype", ruletype.value if hasattr(ruletype, 'value') else ruletype)
            .eq("lowerbound", lowerbound)
            .eq("upperbound", upperbound)
            .execute()
        )
        return len(response.data) > 0

    def retrieveAuditLog(self, limit: int = 200, offset: int = 0) -> List[AuditLog]:
        response = (
            supabase.table("auditlog")
            .select("*")
            .order("timestamp", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )
        return [AuditLog(**row) for row in response.data]
