"""
Alert rule evaluation engine -- checks sensor readings against all enabled rules.

Subsystem: Alert Rules Management
PAC Layer: Control
PAC Agent: Alert Rules Management
Pattern:   Blackboard
Reqs:      PR-SC1, SR-AU1
"""
from agents.alerts.abstraction import AlertsAbstraction
from agents.alerts.webhook_abstraction import WebhookAbstraction
from models.alerts_info import AlertsInfo, AlertRule
from typing import List
from events.event_bus import event_bus
import asyncio
import httpx

class AlertsController:
    def __init__(self):
        self.alertsDB = AlertsAbstraction()
        self.webhookDB = WebhookAbstraction()

    async def checkAlertRules(self, data) -> None:
        """Evaluates a sensor reading against all enabled alert rules and triggers alerts for violations. Implements PR-SC1 (alert triggered within 10s)."""
        # get all rules matching the incoming data type
        # Why "is not False": handles None — rules with no explicit enabled field
        # are treated as enabled (backwards-compatible default).
        type_rules = [rule for rule in self.alertsDB.retrieveAlertRules() if rule.ruletype == data.get("sensor_type") and rule.enabled is not False]

        for rule in type_rules:
            if data.get("value") <= rule.lowerbound or data.get("value") >= rule.upperbound:
                triggered_alert = AlertsInfo(
                    alerttype=data.get("sensor_type"),
                    status="active",
                    ruleviolated=rule.ruleID,
                    # Why db_sensor_id: uses the database bigint FK (db_sensor_id) not the
                    # AWS string UUID (sensor_id) because alert table FKs reference the
                    # sensor table PK.
                    humidity_sensor_id=data.get("db_sensor_id") if data.get("sensor_type") == "humidity" else None,
                    temp_sensor_id=data.get("db_sensor_id") if data.get("sensor_type") == "temp" else None,
                    oxygen_sensor_id=data.get("db_sensor_id") if data.get("sensor_type") == "ox" else None,
                    zone=data.get("zone"),
                    message=f"{data.get('sensor_type').upper()} value {data.get('value')} {data.get('unit', '')} violated rule {rule.ruleID} (acceptable range: {rule.lowerbound}\u2013{rule.upperbound})",
                    severity=rule.severity if rule.severity else "high",
                )

                # save to alerts table and audit log
                self.alertsDB.addAlert(triggered_alert)
                self.alertsDB.auditLog(
                    event_type="alert_triggered",
                    description=f"{data.get('sensor_type')} value of {data.get('value')} violated rule {rule.ruleID}",
                    sensorid=data.get("db_sensor_id"),
                    alert_type=data.get("sensor_type")
                )

                # send notification
                await self.makeAlertNotifs(triggered_alert)
                await event_bus.publish("alert_triggered", {
                    "alerttype": str(triggered_alert.alerttype),
                    "zone": triggered_alert.zone,
                    "message": triggered_alert.message,
                    "severity": triggered_alert.severity,
                })

    async def makeAlertNotifs(self, alert: AlertsInfo) -> None:
        """POST alert payload to all active webhook subscribers. Failures are logged but never block alert processing."""
        subscribers = self.webhookDB.get_active_subscribers()
        if not subscribers:
            return

        payload = {
            "alerttype": str(alert.alerttype.value) if hasattr(alert.alerttype, "value") else str(alert.alerttype),
            "zone": alert.zone,
            "message": alert.message,
            "severity": alert.severity,
            "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
            "ruleviolated": alert.ruleviolated,
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            for sub in subscribers:
                try:
                    await client.post(sub["url"], json=payload)
                except Exception as e:
                    print(f"Webhook delivery failed for {sub['url']}: {e}")
