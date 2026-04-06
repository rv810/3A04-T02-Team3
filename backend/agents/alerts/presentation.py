"""
Admin endpoints for managing webhook subscribers.

Subsystem: Alert Rules Management
PAC Layer: Presentation
PAC Agent: Alert Rules Management
Reqs:      OE-IA2, SR-AC3
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import require_admin
from agents.alerts.webhook_abstraction import WebhookAbstraction
from database import supabase

router = APIRouter(prefix="/admin/webhooks", tags=["webhooks"])
webhook_db = WebhookAbstraction()


class AddWebhookRequest(BaseModel):
    url: str
    description: str = ""


@router.get("")
async def list_webhooks(current_user: dict = Depends(require_admin)):
    return webhook_db.get_all_subscribers()


@router.post("", status_code=201)
async def add_webhook(body: AddWebhookRequest, current_user: dict = Depends(require_admin)):
    result = webhook_db.add_subscriber(body.url, body.description, current_user["id"])
    supabase.table("auditlog").insert({
        "eventtype": "webhook_subscribed",
        "description": f"Webhook subscriber added: {body.url}",
        "user_id": current_user["id"],
    }).execute()
    return result


@router.delete("/{subscriber_id}", status_code=204)
async def delete_webhook(subscriber_id: int, current_user: dict = Depends(require_admin)):
    webhook_db.remove_subscriber(subscriber_id)
    supabase.table("auditlog").insert({
        "eventtype": "webhook_removed",
        "description": f"Webhook subscriber {subscriber_id} removed",
        "user_id": current_user["id"],
    }).execute()


@router.patch("/{subscriber_id}/toggle")
async def toggle_webhook(subscriber_id: int, current_user: dict = Depends(require_admin)):
    try:
        result = webhook_db.toggle_subscriber(subscriber_id)
        supabase.table("auditlog").insert({
            "eventtype": "webhook_toggled",
            "description": f"Webhook subscriber {subscriber_id} toggled to {'active' if result.get('active') else 'inactive'}",
            "user_id": current_user["id"],
        }).execute()
        return result
    except ValueError:
        raise HTTPException(status_code=404, detail="Subscriber not found")
