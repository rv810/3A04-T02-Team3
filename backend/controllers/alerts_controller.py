from abstractions.alerts_abstraction import AlertsAbstraction
from models.alerts_info import AlertsInfo, AlertRule
from typing import List

class AlertsController:
    def __init__(self):
        self.alertsDB = AlertsAbstraction()

    def checkAlertRules(self, data) -> None:
        # get all rules matching the incoming data type
        type_rules = [rule for rule in self.alertsDB.retrieveAlertRules() if rule.ruletype == data.get("sensor_type")]

        for rule in type_rules:
            if data.get("value") <= rule.lowerbound or data.get("value") >= rule.upperbound:
                triggered_alert = AlertsInfo(
                    alerttype=data.get("sensor_type"),
                    status="active",
                    ruleviolated=rule.ruleID,
                    humidity_sensorid=data.get("sensor_id") if data.get("sensor_type") == "humidity" else None,
                    temp_sensorid=data.get("sensor_id") if data.get("sensor_type") == "temp" else None,
                    oxygen_sensorid=data.get("sensor_id") if data.get("sensor_type") == "ox" else None,
                    zone=data.get("zone"),
                    message=f"{data.get('sensor_type').upper()} value {data.get('value')} {data.get('unit', '')} violated rule {rule.ruleID} (acceptable range: {rule.lowerbound}\u2013{rule.upperbound})",
                    severity=rule.severity if rule.severity else "high",
                )

                # save to alerts table and audit log
                self.alertsDB.addAlert(triggered_alert)
                self.alertsDB.auditLog(
                    event_type="alert_triggered",
                    description=f"{data.get('sensor_type')} value of {data.get('value')} violated rule {rule.ruleID}",
                    sensorid=data.get("sensor_id"),
                    alert_type=data.get("sensor_type")
                )

                # send notification
                self.makeAlertNotifs(triggered_alert)

    def makeAlertNotifs(self, alert: AlertsInfo) -> None:
        # notification logic here
        print(f"Alert triggered: {alert.alerttype} violated rule {alert.ruleviolated}")

    def retrieveAlerts(self) -> List[AlertsInfo]:
        return self.alertsDB.retrieveAlerts()
