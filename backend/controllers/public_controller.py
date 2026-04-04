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
