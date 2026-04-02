from abstractions.operator_abstraction import OperatorAbstraction

class OperatorController:
    def __init__(self):
        self.operatorAbstraction = OperatorAbstraction()

    def acknowledgeAlert(self, alertID: int):
        self.operatorAbstraction.updateAlertStatus(alertID, "acknowledged")

    def viewAlerts(self):
        return self.operatorAbstraction.retrieveActiveAlerts()
    
    def viewAcknowledgedAlerts(self):
        return self.operatorAbstraction.retrieveAcknowledgedAlerts()
    
    def viewResolvedAlerts(self):
        return self.operatorAbstraction.retrieveResolvedAlerts()