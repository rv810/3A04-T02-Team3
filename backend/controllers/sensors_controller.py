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