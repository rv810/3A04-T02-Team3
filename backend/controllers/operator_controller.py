from fastapi import HTTPException
from abstractions.operator_abstraction import OperatorAbstraction

class OperatorController:
    def __init__(self):
        self.operatorAbstraction = OperatorAbstraction()

    def acknowledgeAlert(self, alertID: int, user_id: str):
        try:
            self.operatorAbstraction.acknowledgeAlert(alertID, user_id)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e))

    def resolveAlert(self, alertID: int, user_id: str, note: str = None):
        try:
            self.operatorAbstraction.resolveAlert(alertID, user_id, note=note)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e))

    def viewAlertsByStatus(self, statuses: list[str] = None, limit: int = 200, offset: int = 0):
        return self.operatorAbstraction.retrieveAlertsByStatus(statuses, limit=limit, offset=offset)

    def viewAlerts(self):
        return self.operatorAbstraction.retrieveActiveAlerts()

    def viewAcknowledgedAlerts(self):
        return self.operatorAbstraction.retrieveAcknowledgedAlerts()

    def viewResolvedAlerts(self):
        return self.operatorAbstraction.retrieveResolvedAlerts()

    def viewAuditLog(self, limit: int = 200, offset: int = 0):
        return self.operatorAbstraction.retrieveAuditLog(limit=limit, offset=offset)