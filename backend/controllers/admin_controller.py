from abstractions.admin_abstraction import AdminAbstraction
from models.alerts_info import AlertRule

class AdminController:
    def __init__(self):
        self.alerts = AdminAbstraction()

    def makeAlertRule(self, rule: AlertRule):
        self.alerts.updateAlertRule(rule)

    def viewAlerts(self):
        return self.alerts.retrieveAlertRules()
