from abstractions.alerts_abstraction import AlertsAbstraction
from models.alerts_info import AlertsInfo, AlertRule
from typing import List
from uuid import uuid4
from datetime import datetime

class AlertsController:
    def __init__(self):
        self.alertsDB = AlertsAbstraction()

    def checkAlertRules(self, data) -> None:
        # get all rules matching the incoming data type
        type_rules = [rule for rule in self.alertsDB.retrieveAlertRules() if rule.ruleType == data.type]

        for rule in type_rules:
            if data.value <= rule.lowerBoundThreshold or data.value >= rule.upperBoundThreshold:
                triggered_alert = AlertsInfo(
                    alertID=uuid4(),
                    alertType=data.type,
                    status="active",
                    ruleViolated=rule.ruleID,
                    humidity_sensorID=data.sensorID if data.type == "humidity" else None,
                    temperature_sensorID=data.sensorID if data.type == "temperature" else None,
                    oxygen_sensorID=data.sensorID if data.type == "oxygen" else None,
                    start=datetime.now()
                )

                # save to alerts table and audit log
                self.alertsDB.addAlert(triggered_alert)
                self.alertsDB.auditLog(triggered_alert)

                # send notification
                self.makeAlertNotifs(triggered_alert)

    def makeAlertNotifs(self, alert: AlertsInfo) -> None:
        # your notification logic here
        print(f"Alert triggered: {alert.alertType} violated rule {alert.ruleViolated}")

    def retrieveAlerts(self) -> List[AlertsInfo]:
        return self.alertsDB.retrieveAlerts()