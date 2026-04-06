"""
Public data access logic for environmental metrics (zone summaries, history).

Subsystem: Consumes Telemetry Data Management subsystem
PAC Layer: Control
PAC Agent: Account Management
Sub-agent: Public 
Reqs:      BE5
"""
from agents.account.public.abstraction import PublicAbstraction


class PublicController:
    def __init__(self):
        self.publicAbstraction = PublicAbstraction()

    def getZoneSummary(self, zone: str) -> dict:
        return self.publicAbstraction.getZoneSummary(zone)

    def getAllZonesSummary(self) -> list:
        return self.publicAbstraction.getAllZonesSummary()

    def getPublicMetricsHistory(self) -> list:
        return self.publicAbstraction.getPublicMetricsHistory()
