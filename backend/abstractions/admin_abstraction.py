from database import supabase
from models.alerts_info import AlertRule
from typing import List

class AdminAbstraction:
    def retrieveAlertRules(self) -> List[AlertRule]:
        response = supabase.table("alertrules").select("*").execute()
        return [AlertRule(**row) for row in response.data]
    
    def updateAlertRules(self, rule: AlertRule):
        supabase.table("alertrules").insert(rule.dict(exclude_none=True)).execute()