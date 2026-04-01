from database import supabase
from models.alerts_info import AlertsInfo
from typing import List

class AlertsAbstraction:

    from database import supabase
from models.alerts_info import AlertsInfo, AlertRule
from typing import List

class AlertsAbstraction:

    def retrieveAlertRules(self) -> List[AlertRule]:
        response = supabase.table("alert_rules").select("*").execute()
        return [AlertRule(**row) for row in response.data]

    def addAlert(self, alert: AlertsInfo) -> None:
        supabase.table("alerts").insert(alert.dict()).execute()

    def auditLog(self, alert: AlertsInfo) -> None:
        supabase.table("alert_audit_log").insert(alert.dict()).execute()

    def retrieveAlerts(self) -> List[AlertsInfo]:
        response = supabase.table("alerts").select("*").execute()
        return [AlertsInfo(**row) for row in response.data]
    