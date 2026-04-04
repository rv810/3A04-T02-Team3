from database import supabase
from models.alerts_info import AlertsInfo, AlertRule, AuditLog
from typing import List

class AlertsAbstraction:

    def retrieveAlertRules(self) -> List[AlertRule]:
        response = supabase.table("alertrules").select("*").execute()
        return [AlertRule(**row) for row in response.data]

    def addAlert(self, alert: AlertsInfo) -> None:
        supabase.table("activealerts").insert(alert.model_dump(exclude_none=True)).execute()

    def retrieveAlerts(self) -> List[AlertsInfo]:
        response = supabase.table("activealerts").select("*").execute()
        return [AlertsInfo(**row) for row in response.data]

    def auditLog(self, event_type: str, description: str, sensorid: int, alert_type: str) -> None:
        log = AuditLog(
            eventtype=event_type,
            description=description,
            humidity_sensorid=sensorid if alert_type == "humidity" else None,
            oxygen_sensorid=sensorid if alert_type == "ox" else None,
            temp_sensorid=sensorid if alert_type == "temp" else None,
        )
        supabase.table("auditlog").insert(log.model_dump(exclude_none=True)).execute()