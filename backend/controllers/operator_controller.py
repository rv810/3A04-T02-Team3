from abstractions.operator_abstraction import OperatorAbstraction

class OperatorController:
    def __init__(self):
        self.operatorAbstraction = OperatorAbstraction()

    def acknowledgeAlert(self, alertID: int, user_id: str):
        self.operatorAbstraction.acknowledgeAlert(alertID, user_id)

    def resolveAlert(self, alertID: int, user_id: str):
        self.operatorAbstraction.resolveAlert(alertID, user_id)

    def viewAlerts(self):
        return self.operatorAbstraction.retrieveActiveAlerts()

    def viewAcknowledgedAlerts(self):
        return self.operatorAbstraction.retrieveAcknowledgedAlerts()

    def viewResolvedAlerts(self):
        return self.operatorAbstraction.retrieveResolvedAlerts()

    def viewAuditLog(self):
        return self.operatorAbstraction.retrieveAuditLog()