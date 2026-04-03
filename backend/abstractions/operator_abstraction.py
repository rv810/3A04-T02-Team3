from models.alerts_info import AlertsInfo
from database import supabase
from typing import List

class OperatorAbstraction:
    def updateAlertStatus(self, alertID: int, newStatus: str):
        supabase.table("activealerts").update({"status": newStatus}).eq("alertid", alertID).execute()

    def retrieveAcknowledgedAlerts(self):
        response = supabase.table("activealerts").select("*").eq("status", "acknowledged").execute()
        return [AlertsInfo(**row) for row in response.data]

    def retrieveResolvedAlerts(self):
        response = supabase.table("activealerts").select("*").eq("status", "resolved").execute()
        return [AlertsInfo(**row) for row in response.data]

    def retrieveActiveAlerts(self) -> List[AlertsInfo]:          
        response = supabase.table("activealerts").select("*").execute()
        return [AlertsInfo(**row) for row in response.data]

    def resolveAlert(self, alertID: int) -> None:               
        self.updateAlertStatus(alertID, "resolved")

    def acknowledgeAlert(self, alertID: int) -> None:          
        self.updateAlertStatus(alertID, "acknowledged")
        
