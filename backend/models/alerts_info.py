from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime
from uuid import UUID

class SensorType(str, Enum):
    temperature = "temp"
    humidity = "humidity"
    oxygen = "ox"

class AlertStatus(str, Enum):
    active = "active"
    resolved = "resolved"
    acknowledged = "acknowledged"

class AlertsInfo(BaseModel):
    alertid: Optional[int] = None    # optional because DB generates it
    alerttype: SensorType
    status: AlertStatus
    ruleviolated: Optional[int] = None
    humidity_sensorid: Optional[int] = None
    oxygen_sensorid: Optional[int] = None
    temp_sensorid: Optional[int] = None

class AlertRule(BaseModel):
    ruleID: Optional[int] = None        # optional because DB generates it
    createdby: Optional[UUID] = None    # optional because DB generates it from JWT sub
    lowerbound: float
    upperbound: float
    ruletype: SensorType

class CreateAlertRuleRequest(BaseModel):
    lowerbound: float
    upperbound: float
    ruletype: SensorType

class UpdateAlertRuleRequest(BaseModel):
    lowerbound: Optional[float] = None
    upperbound: Optional[float] = None
    ruletype: Optional[SensorType] = None

class AuditLog(BaseModel):
    id: Optional[int] = None
    timestamp: Optional[datetime] = None  
    eventtype: str
    description: str
    user_id: Optional[str] = None
    humidity_sensorid: Optional[int] = None
    oxygen_sensorid: Optional[int] = None
    temp_sensorid: Optional[int] = None