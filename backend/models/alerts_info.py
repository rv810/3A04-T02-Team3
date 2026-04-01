from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class AlertsInfo(BaseModel):
    alertID: UUID
    alertType: str
    status: str
    ruleViolated: UUID
    humidity_sensorID: UUID
    temperature_sensorID: UUID
    oxygen_sensorID: UUID
    start: datetime