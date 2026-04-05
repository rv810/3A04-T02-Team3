"""
Read-only sensor data retrieval across all sensor types.

Subsystem: Telemetry Data Management
PAC Layer: Control
Pattern:   Pipe-and-Filter
Reqs:      BE4
"""

from abstractions.sensors_abstraction import SensorsAbstraction
from typing import Optional

class SensorsController:
    
    def __init__(self):
        self.sensorsDB = SensorsAbstraction()

    def getSensors(self, zone: Optional[str] = None) -> list:
        return self.sensorsDB.getSensors(zone)
    
    def getSensor(self, sensorid: str):
        return self.sensorsDB.getSensor(sensorid)
    
    def getCityAverages(self):
        return self.sensorsDB.calculateCityAverages()

    def getReadingsToday(self):
        return self.sensorsDB.getReadingsToday()