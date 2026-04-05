"""
Public data access logic for environmental metrics (zone summaries, history).

Subsystem: Consumes Telemetry Data Management subsystem
PAC Layer: Control
Pattern:   N/A
Reqs:      BE5
"""
from abstractions.public_abstraction import PublicAbstraction


class PublicController:
    def __init__(self):
        self.publicAbstraction = PublicAbstraction()

    def getZoneSummary(self, zone: str) -> dict:
        return self.publicAbstraction.getZoneSummary(zone)

    def getAllZonesSummary(self) -> list:
        return self.publicAbstraction.getAllZonesSummary()

    def getPublicMetricsHistory(self) -> list:
        return self.publicAbstraction.getPublicMetricsHistory()
