from models.alerts_info import AlertsInfo
from database import supabase
from typing import List

class OperatorAbstraction:
    def updateAlertStatus(self, alertID: int, newStatus: str):
        supabase.table("alerts").update({"status": newStatus}).eq("alertID", alertID).execute()

    def retrieveAcknowledgedAlerts(self, ):
        response = supabase.table("alerts").select("*").eq("status", "acknowledged").execute()
        return [AlertsInfo(**row) for row in response.data]
    
    def retrieveResolvedAlerts(self):
        response = supabase.table("alerts").select("*").eq("status", "resolved").execute()
        return [AlertsInfo(**row) for row in response.data]
    
    def retrieveAlerts(self) -> List[AlertsInfo]:
        response = supabase.table("activealerts").select("*").execute()
        return [AlertsInfo(**row) for row in response.data]

    
