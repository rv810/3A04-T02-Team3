"""
Read-only sensor data retrieval across all sensor types.

PAC Layer: Control
PAC Agent: Telemetry Data Management
Pattern:   Pipe-and-Filter
Reqs:      BE4
"""

from agents.telemetry.abstraction import SensorsAbstraction
from typing import Optional

class SensorsController:

    def __init__(self):
        self.sensorsDB = SensorsAbstraction()

    def getSensors(self, zone: Optional[str] = None, limit: int = 50, offset: int = 0) -> dict:
        return self.sensorsDB.getSensors(zone, limit=limit, offset=offset)

    def getSensor(self, sensorid: str):
        return self.sensorsDB.getSensor(sensorid)

    def getCityAverages(self):
        return self.sensorsDB.calculateCityAverages()

    def getReadingsToday(self):
        return self.sensorsDB.getReadingsToday()
