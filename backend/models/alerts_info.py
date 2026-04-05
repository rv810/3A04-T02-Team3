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
    humidity_sensor_id: Optional[int] = None
    oxygen_sensor_id: Optional[int] = None
    temp_sensor_id: Optional[int] = None
    zone: Optional[str] = None
    message: Optional[str] = None
    severity: Optional[str] = None
    triggered_at: Optional[datetime] = None
    resolved_note: Optional[str] = None

class AlertRule(BaseModel):
    ruleID: Optional[int] = None        # optional because DB generates it
    createdby: Optional[UUID] = None    # optional because DB generates it from JWT sub
    lowerbound: float
    upperbound: float
    ruletype: SensorType
    severity: Optional[str] = None
    name: Optional[str] = None
    enabled: Optional[bool] = True

class CreateAlertRuleRequest(BaseModel):
    lowerbound: float
    upperbound: float
    ruletype: SensorType
    severity: Optional[str] = None
    name: Optional[str] = None

class UpdateAlertRuleRequest(BaseModel):
    lowerbound: Optional[float] = None
    upperbound: Optional[float] = None
    ruletype: Optional[SensorType] = None
    severity: Optional[str] = None
    name: Optional[str] = None
    enabled: Optional[bool] = None

class AuditLog(BaseModel):
    id: Optional[int] = None
    timestamp: Optional[datetime] = None
    eventtype: str
    description: str
    user_id: Optional[str] = None
    humidity_sensor_id: Optional[int] = None
    oxygen_sensor_id: Optional[int] = None
    temp_sensor_id: Optional[int] = None

class ResolveAlertRequest(BaseModel):
    note: Optional[str] = None
