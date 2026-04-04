from abstractions.operator_abstraction import OperatorAbstraction

class OperatorController:
    def __init__(self):
        self.operatorAbstraction = OperatorAbstraction()

    def acknowledgeAlert(self, alertID: int, user_id: str):
        self.operatorAbstraction.acknowledgeAlert(alertID, user_id)

    def resolveAlert(self, alertID: int, user_id: str, note: str = None):
        self.operatorAbstraction.resolveAlert(alertID, user_id, note=note)

    def viewAlertsByStatus(self, statuses: list[str] = None):
        return self.operatorAbstraction.retrieveAlertsByStatus(statuses)

    def viewAlerts(self):
        return self.operatorAbstraction.retrieveActiveAlerts()

    def viewAcknowledgedAlerts(self):
        return self.operatorAbstraction.retrieveAcknowledgedAlerts()

    def viewResolvedAlerts(self):
        return self.operatorAbstraction.retrieveResolvedAlerts()

    def viewAuditLog(self):
        return self.operatorAbstraction.retrieveAuditLog()