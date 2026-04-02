from abstractions.admin_abstraction import AdminAbstraction
from models.alerts_info import AlertRule

class AdminController:
    def __init__(self):
        self.adminAbstraction = AdminAbstraction()

    def makeAlertRule(self, rule: AlertRule):
        self.adminAbstraction.updateAlertRule(rule)

    def viewAlerts(self):
        return self.adminAbstraction.retrieveAlertRules()
