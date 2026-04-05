"""
Public environmental data API endpoints (zone summaries, metrics history).

Subsystem: Consumes Telemetry Data Management subsystem
PAC Layer: Presentation
Pattern:   N/A
Reqs:      BE5
"""
import os
from fastapi import APIRouter, Depends, Header, HTTPException
from typing import Optional
from controllers.public_controller import PublicController

router = APIRouter(prefix="/public", tags=["public"])
controller = PublicController()

PUBLIC_API_KEY = os.environ.get("PUBLIC_API_KEY")


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """If PUBLIC_API_KEY is set, require matching x-api-key header."""
    # Why conditional: when PUBLIC_API_KEY env var is unset, all public
    # endpoints are completely open — intentional for development.
    # Edge case: if PUBLIC_API_KEY is never set in production, ALL public
    # endpoints are completely open with no authentication whatsoever.
    if PUBLIC_API_KEY is None:
        return  # Dev mode — no key required
    if x_api_key != PUBLIC_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@router.get("/summary/{zone}")
def get_zone_summary(zone: str, _: None = Depends(verify_api_key)):
    return controller.getZoneSummary(zone)


@router.get("/zones")
def get_all_zones(_: None = Depends(verify_api_key)):
    return controller.getAllZonesSummary()


@router.get("/metrics/history")
def get_metrics_history(_: None = Depends(verify_api_key)):
    return controller.getPublicMetricsHistory()
