from models.alerts_info import AlertsInfo, AuditLog
from database import supabase
from typing import List

class OperatorAbstraction:
    def updateAlertStatus(self, alertID: int, newStatus: str):
        supabase.table("activealerts").update({"status": newStatus}).eq("alertid", alertID).execute()

    def retrieveAcknowledgedAlerts(self):
        response = supabase.table("activealerts").select("*").eq("status", "acknowledged").execute()
        return [AlertsInfo(**row) for row in response.data]

    def retrieveResolvedAlerts(self):
        response = supabase.table("activealerts").select("*").eq("status", "resolved").execute()
        return [AlertsInfo(**row) for row in response.data]

    def retrieveAlertsByStatus(self, statuses: list[str] = None, limit: int = 200, offset: int = 0) -> List[AlertsInfo]:
        if not statuses:
            statuses = ["active"]
        query = supabase.table("activealerts").select("*")
        if len(statuses) == 1:
            query = query.eq("status", statuses[0])
        else:
            query = query.in_("status", statuses)
        response = query.order("triggered_at", desc=True).limit(limit).offset(offset).execute()
        return [AlertsInfo(**row) for row in response.data]

    def retrieveActiveAlerts(self) -> List[AlertsInfo]:
        response = supabase.table("activealerts").select("*").eq("status", "active").execute()
        return [AlertsInfo(**row) for row in response.data]

    def resolveAlert(self, alertID: int, user_id: str, note: str = None) -> None:
        current = supabase.table("activealerts").select("status").eq("alertid", alertID).single().execute()
        if current.data["status"] == "resolved":
            raise ValueError("Alert is already resolved")
        update_data = {"status": "resolved"}
        if note:
            update_data["resolved_note"] = note
        supabase.table("activealerts").update(update_data).eq("alertid", alertID).execute()
        description = f"Alert {alertID} resolved by operator"
        if note:
            description += f" - Note: {note}"
        supabase.table("auditlog").insert({
            "eventtype": "alert_resolved",
            "description": description,
            "user_id": user_id
        }).execute()

    def retrieveAuditLog(self, limit: int = 200, offset: int = 0) -> list[AuditLog]:
        response = (
            supabase.table("auditlog")
            .select("*")
            .order("timestamp", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )
        return [AuditLog(**row) for row in response.data]

    def acknowledgeAlert(self, alertID: int, user_id: str) -> None:
        current = supabase.table("activealerts").select("status").eq("alertid", alertID).single().execute()
        status = current.data["status"]
        if status == "acknowledged":
            raise ValueError("Alert is already acknowledged")
        if status == "resolved":
            raise ValueError("Alert is already resolved")
        self.updateAlertStatus(alertID, "acknowledged")
        supabase.table("auditlog").insert({
            "eventtype": "alert_acknowledged",
            "description": f"Alert {alertID} acknowledged by operator",
            "user_id": user_id
        }).execute()
        
