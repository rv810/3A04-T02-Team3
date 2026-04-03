from database import supabase
from models.alerts_info import AlertRule
from typing import List

class AdminAbstraction:
    def retrieveAlertRules(self) -> List[AlertRule]:
        response = supabase.table("alertrules").select("*").execute()
        return [AlertRule(**row) for row in response.data]

    def createAlertRule(self, rule: AlertRule) -> AlertRule:
        payload = rule.model_dump(exclude_none=True)
        response = supabase.table("alertrules").insert(payload).execute()
        return AlertRule(**response.data[0])

    def updateAlertRule(self, rule_id: int, rule: AlertRule) -> AlertRule:
        payload = rule.model_dump(exclude={"ruleID", "createdby"}, exclude_none=True)
        response = (
            supabase.table("alertrules")
            .update(payload)
            .eq("ruleID", rule_id)
            .execute()
        )
        return AlertRule(**response.data[0])