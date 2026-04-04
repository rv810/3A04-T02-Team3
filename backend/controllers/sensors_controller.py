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
        return self.sensorsDB.calcualteCityAverages()
    
    def getHourlyAverages(self, from_time: str, to_time: str, zone: Optional[str] = None) -> list:
        return self.sensorsDB.calculateHourlyAverages(from_time, to_time, zone)