"""
Database operations for alert persistence and audit logging.

Subsystem: Alert Rules Management
PAC Layer: Abstraction
PAC Agent: Alert Rules Management
Pattern:   Blackboard
Reqs:      PR-SC1, SR-AU1
"""
from database import supabase
from models.alerts_info import AlertsInfo, AlertRule, AuditLog
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

class AlertsAbstraction:

    def retrieveAlertRules(self) -> List[AlertRule]:
        response = _query_with_retry(lambda: supabase.table("alertrules").select("*").execute())
        return [AlertRule(**row) for row in response.data]

    def addAlert(self, alert: AlertsInfo) -> None:
        _query_with_retry(lambda: supabase.table("activealerts").insert(alert.model_dump(exclude_none=True, mode="json")).execute())

    def auditLog(self, event_type: str, description: str, sensorid: int, alert_type: str) -> None:
        log = AuditLog(
            eventtype=event_type,
            description=description,
            humidity_sensor_id=sensorid if alert_type == "humidity" else None,
            oxygen_sensor_id=sensorid if alert_type == "ox" else None,
            temp_sensor_id=sensorid if alert_type == "temp" else None,
        )
        _query_with_retry(lambda: supabase.table("auditlog").insert(log.model_dump(exclude_none=True, mode="json")).execute())
