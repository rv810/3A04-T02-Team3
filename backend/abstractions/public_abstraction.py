from models.alerts_info import AlertsInfo
from database import supabase
from typing import List

class PublicAbstraction:
    def retrieveAlerts(self) -> List[AlertsInfo]:
        response = supabase.table("activealerts").select("*").execute()
        return [AlertsInfo(**row) for row in response.data]