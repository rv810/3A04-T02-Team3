"""
Database operations for alert rule CRUD with audit logging.

Subsystem: Alert Rules Management
PAC Layer: Abstraction
PAC Agent: Account Management
Sub-agent: Admin
Pattern:   Blackboard
Reqs:      BE2, SR-AU1
"""
from database import supabase
from models.alerts_info import AlertRule, AuditLog, UpdateAlertRuleRequest
from typing import List
from datetime import datetime, timezone
import time


def _query_with_retry(query_fn, retries=2):
    """Retry transient Supabase connection errors (common on Render free tier)."""
    for attempt in range(retries + 1):
        try:
            return query_fn()
        except Exception:
            if attempt == retries:
                raise
            time.sleep(0.1)


class AdminAbstraction:
    def retrieveAlertRules(self) -> List[AlertRule]:
        response = _query_with_retry(lambda: supabase.table("alertrules").select("*").execute())
        return [AlertRule(**row) for row in response.data]

    def createAlertRule(self, rule: AlertRule, user_id: str = None) -> AlertRule:
        # Why mode="json": required for proper enum and UUID serialization —
        # without it, PostgREST receives Python enum repr instead of the string value.
        payload = rule.model_dump(exclude_none=True, mode="json")
        response = _query_with_retry(lambda: supabase.table("alertrules").insert(payload).execute())
        created = AlertRule(**response.data[0])
        _query_with_retry(lambda: supabase.table("auditlog").insert({
            "eventtype": "rule_created",
            "description": f"Alert rule '{rule.name}' created",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute())
        return created

    def updateAlertRule(self, rule_id: int, rule: UpdateAlertRuleRequest, user_id: str = None) -> AlertRule:
        payload = rule.model_dump(exclude_none=True, mode="json")
        response = _query_with_retry(lambda: (
            supabase.table("alertrules")
            .update(payload)
            .eq("ruleID", rule_id)
            .execute()
        ))
        updated = AlertRule(**response.data[0])
        _query_with_retry(lambda: supabase.table("auditlog").insert({
            "eventtype": "rule_updated",
            "description": f"Alert rule {rule_id} updated",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute())
        return updated

    def deleteAlertRule(self, rule_id: int, user_id: str = None) -> None:
        response = _query_with_retry(lambda: (
            supabase.table("alertrules")
            .delete()
            .eq("ruleID", rule_id)
            .execute()
        ))
        if not response.data:
            raise ValueError("Alert rule not found")
        _query_with_retry(lambda: supabase.table("auditlog").insert({
            "eventtype": "rule_deleted",
            "description": f"Alert rule {rule_id} deleted",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute())

    def toggleAlertRule(self, rule_id: int, user_id: str = None) -> AlertRule:
        """Toggles rule enabled state and logs the change to audit trail. Implements SR-AU1 (alert history logged)."""
        current = _query_with_retry(lambda: (
            supabase.table("alertrules")
            .select("*")
            .eq("ruleID", rule_id)
            .single()
            .execute()
        ))
        new_enabled = not current.data["enabled"]
        response = _query_with_retry(lambda: (
            supabase.table("alertrules")
            .update({"enabled": new_enabled})
            .eq("ruleID", rule_id)
            .execute()
        ))
        toggled = AlertRule(**response.data[0])
        _query_with_retry(lambda: supabase.table("auditlog").insert({
            "eventtype": "rule_toggled",
            "description": f"Alert rule {rule_id} toggled to {'enabled' if new_enabled else 'disabled'}",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute())
        return toggled

    def ruleExists(self, ruletype, lowerbound, upperbound) -> bool:
        response = _query_with_retry(lambda: (
            supabase.table("alertrules")
            .select("ruleID")
            # Why .value: PostgREST sends enum repr (e.g. <SensorType.temp: 'temp'>)
            # instead of the string value without .value.
            .eq("ruletype", ruletype.value if hasattr(ruletype, 'value') else ruletype)
            .eq("lowerbound", lowerbound)
            .eq("upperbound", upperbound)
            .execute()
        ))
        return len(response.data) > 0

    def retrieveAuditLog(self, limit: int = 200, offset: int = 0) -> List[AuditLog]:
        response = _query_with_retry(lambda: (
            supabase.table("auditlog")
            .select("*")
            .order("timestamp", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        ))
        return [AuditLog(**row) for row in response.data]
