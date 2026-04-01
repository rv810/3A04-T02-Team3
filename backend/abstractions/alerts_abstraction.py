from abstractions.alerts_abstraction import AlertsAbstraction
from models.alerts_info import AlertsInfo, AlertRule
from typing import List

class AlertsController:
    def __init__(self):
        self.alertsDB = AlertsAbstraction()

    def checkAlertRules(self, data) -> None:
        type_rules = [rule for rule in self.alertsDB.retrieveAlertRules() if rule.ruletype == data.type]

        for rule in type_rules:
            if data.value <= rule.lowerbound or data.value >= rule.upperbound:
                triggered_alert = AlertsInfo(
                    alerttype=data.type,
                    status="active",
                    ruleviolated=rule.ruleID,
                    humidity_sensor_id=data.sensorID if data.type == "humidity" else None,
                    oxygen_sensor_id=data.sensorID if data.type == "oxygen" else None,
                    temp_sensor_id=data.sensorID if data.type == "temperature" else None,
                )

                self.alertsDB.addAlert(triggered_alert)
                self.alertsDB.auditLog(
                    event_type="alert_triggered",
                    description=f"{data.type} sensor out of bounds: {data.value}",
                    sensor_id=data.sensorID,
                    alert_type=data.type
                )
                self.makeAlertNotifs(triggered_alert)

    def makeAlertNotifs(self, alert: AlertsInfo) -> None:
        print(f"Alert triggered: {alert.alerttype} violated rule {alert.ruleviolated}")

    def retrieveAlerts(self) -> List[AlertsInfo]:
        return self.alertsDB.retrieveAlerts()