from fastapi import APIRouter
from controllers.public_controller import PublicController

router = APIRouter(prefix="/public", tags=["public"])
controller = PublicController()


@router.get("/summary/{zone}")
def get_zone_summary(zone: str):
    return controller.getZoneSummary(zone)


@router.get("/zones")
def get_all_zones():
    return controller.getAllZonesSummary()


@router.get("/metrics/history")
def get_metrics_history():
    return controller.getPublicMetricsHistory()
