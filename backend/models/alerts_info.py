from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime

class SensorType(str, Enum):
    temperature = "temperature"
    humidity = "humidity"
    oxygen = "oxygen"

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

class AlertRule(BaseModel):
    ruleID: Optional[int] = None     # optional because DB generates it
    createdby: str                   # references accounts.username
    lowerbound: float
    upperbound: float
    ruletype: SensorType

class AuditLog(BaseModel):
    id: Optional[int] = None
    timestamp: Optional[datetime] = None  
    eventtype: str
    description: str
    user_id: Optional[str] = None
    humidity_sensor_id: Optional[int] = None
    oxygen_sensor_id: Optional[int] = None
    temp_sensor_id: Optional[int] = None