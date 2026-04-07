"""
CRUD operations for the webhook_subscribers table.

Subsystem: Alert Rules Management
PAC Layer: Abstraction
PAC Agent: Alert Rules Management
Reqs:      OE-IA2
"""
from database import supabase
import time


def _query_with_retry(query_fn, retries=2):
    """Retry transient Supabase connection errors (common on Render free tier)."""
    for attempt in range(retries + 1):
        try:
            return query_fn()
        except Exception:
            if attempt == retries:
                raise
            time.sleep(0.1)


class WebhookAbstraction:

    def get_active_subscribers(self) -> list[dict]:
        response = _query_with_retry(lambda: supabase.table("webhook_subscribers").select("*").eq("active", True).execute())
        return response.data

    def get_all_subscribers(self) -> list[dict]:
        response = _query_with_retry(lambda: supabase.table("webhook_subscribers").select("*").execute())
        return response.data

    def add_subscriber(self, url: str, description: str, created_by: str) -> dict:
        row = {"url": url, "description": description, "created_by": created_by}
        response = _query_with_retry(lambda: supabase.table("webhook_subscribers").insert(row).execute())
        return response.data[0]

    def remove_subscriber(self, subscriber_id: int) -> None:
        _query_with_retry(lambda: supabase.table("webhook_subscribers").delete().eq("id", subscriber_id).execute())

    def toggle_subscriber(self, subscriber_id: int) -> dict:
        current = _query_with_retry(lambda: supabase.table("webhook_subscribers").select("active").eq("id", subscriber_id).execute())
        if not current.data:
            raise ValueError(f"Subscriber {subscriber_id} not found")
        new_active = not current.data[0]["active"]
        response = _query_with_retry(lambda: supabase.table("webhook_subscribers").update({"active": new_active}).eq("id", subscriber_id).execute())
        return response.data[0]
