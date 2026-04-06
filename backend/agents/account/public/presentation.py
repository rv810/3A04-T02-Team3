"""
Public environmental data API endpoints (zone summaries, metrics history).

Subsystem: Consumes Telemetry Data Management subsystem
PAC Layer: Presentation
PAC Agent: Account Management
Sub-agent: Public 
Reqs:      BE5
"""
import os
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from typing import Optional
from agents.account.public.control import PublicController
from limiter import limiter

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
@limiter.limit("30/minute")
def get_zone_summary(request: Request, zone: str, _: None = Depends(verify_api_key)):
    return controller.getZoneSummary(zone)


@router.get("/zones")
@limiter.limit("30/minute")
def get_all_zones(request: Request, _: None = Depends(verify_api_key)):
    return controller.getAllZonesSummary()


@router.get("/metrics/history")
@limiter.limit("30/minute")
def get_metrics_history(request: Request, _: None = Depends(verify_api_key)):
    return controller.getPublicMetricsHistory()


@router.get("/zones/hourly-max")
@limiter.limit("30/minute")
def get_zones_hourly_maximum(request: Request, _: None = Depends(verify_api_key)):
    return controller.getHourlyMaximum()


@router.get("/five-min-avg")
@limiter.limit("30/minute")
def get_five_min_avg(request: Request, _: None = Depends(verify_api_key)):
    return controller.getFiveMinAvgByZone()
