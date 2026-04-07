"""
Database operations for alert status management and triage.

Subsystem: Alert Rules Management
PAC Layer: Abstraction
PAC Agent: Account Management
Sub-agent: Operator
Pattern:   Blackboard
Reqs:      BE1, BE3, SR-AU1
"""
from models.alerts_info import AlertsInfo, AuditLog
from database import supabase
from typing import List
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


class OperatorAbstraction:
    def updateAlertStatus(self, alertID: int, newStatus: str):
        _query_with_retry(lambda: supabase.table("activealerts").update({"status": newStatus}).eq("alertid", alertID).execute())

    def retrieveAcknowledgedAlerts(self):
        response = _query_with_retry(lambda: supabase.table("activealerts").select("*").eq("status", "acknowledged").execute())
        return [AlertsInfo(**row) for row in response.data]

    def retrieveResolvedAlerts(self):
        response = _query_with_retry(lambda: supabase.table("activealerts").select("*").eq("status", "resolved").execute())
        return [AlertsInfo(**row) for row in response.data]

    def retrieveAlertsByStatus(self, statuses: list[str] = None, limit: int = 200, offset: int = 0) -> List[AlertsInfo]:
        if not statuses:
            statuses = ["active"]
        query = supabase.table("activealerts").select("*")
        if len(statuses) == 1:
            query = query.eq("status", statuses[0])
        else:
            query = query.in_("status", statuses)
        response = _query_with_retry(lambda: query.order("triggered_at", desc=True).limit(limit).offset(offset).execute())
        return [AlertsInfo(**row) for row in response.data]

    def retrieveActiveAlerts(self) -> List[AlertsInfo]:
        response = _query_with_retry(lambda: supabase.table("activealerts").select("*").eq("status", "active").execute())
        return [AlertsInfo(**row) for row in response.data]

    def resolveAlert(self, alertID: int, user_id: str, note: str = None) -> None:
        """Updates alert status to resolved with conflict detection. Implements BE3, SR-AU1."""
        # Why status check before update: prevents invalid state transitions —
        # checks current status to detect if another operator already acted
        # (conflict detection, BE3).
        current = _query_with_retry(lambda: supabase.table("activealerts").select("status").eq("alertid", alertID).single().execute())
        if current.data["status"] == "resolved":
            raise ValueError("Alert is already resolved")
        update_data = {"status": "resolved"}
        if note:
            update_data["resolved_note"] = note
        _query_with_retry(lambda: supabase.table("activealerts").update(update_data).eq("alertid", alertID).execute())
        description = f"Alert {alertID} resolved by operator"
        if note:
            description += f" - Note: {note}"
        _query_with_retry(lambda: supabase.table("auditlog").insert({
            "eventtype": "alert_resolved",
            "description": description,
            "user_id": user_id
        }).execute())

    def retrieveAuditLog(self, limit: int = 200, offset: int = 0) -> list[AuditLog]:
        response = _query_with_retry(lambda: (
            supabase.table("auditlog")
            .select("*")
            .order("timestamp", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        ))
        return [AuditLog(**row) for row in response.data]

    def acknowledgeAlert(self, alertID: int, user_id: str) -> None:
        """Updates alert status to acknowledged with conflict detection. Implements BE3."""
        # Why status check before update: prevents invalid state transitions —
        # checks current status to detect if another operator already acted
        # (conflict detection, BE3).
        current = _query_with_retry(lambda: supabase.table("activealerts").select("status").eq("alertid", alertID).single().execute())
        status = current.data["status"]
        if status == "acknowledged":
            raise ValueError("Alert is already acknowledged")
        if status == "resolved":
            raise ValueError("Alert is already resolved")
        self.updateAlertStatus(alertID, "acknowledged")
        _query_with_retry(lambda: supabase.table("auditlog").insert({
            "eventtype": "alert_acknowledged",
            "description": f"Alert {alertID} acknowledged by operator",
            "user_id": user_id
        }).execute())
