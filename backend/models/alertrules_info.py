from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class AlertsInfo(BaseModel):
    ruleID: UUID
    createdBy: UUID
    lowerBoundThreshold: float
    upperBoundThreshold: float
    ruleType: str