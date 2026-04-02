from abstractions.public_abstraction import PublicAbstraction

class PublicController:
    def __init__(self):
        self.publicAbstraction = PublicAbstraction()

    def viewAlerts(self):
        return self.publicAbstraction.retrieveAlerts()