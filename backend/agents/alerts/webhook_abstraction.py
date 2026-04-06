"""
CRUD operations for the webhook_subscribers table.

Subsystem: Alert Rules Management
PAC Layer: Abstraction
PAC Agent: Alert Rules Management
Reqs:      OE-IA2
"""
from database import supabase


class WebhookAbstraction:

    def get_active_subscribers(self) -> list[dict]:
        response = supabase.table("webhook_subscribers").select("*").eq("active", True).execute()
        return response.data

    def get_all_subscribers(self) -> list[dict]:
        response = supabase.table("webhook_subscribers").select("*").execute()
        return response.data

    def add_subscriber(self, url: str, description: str, created_by: str) -> dict:
        row = {"url": url, "description": description, "created_by": created_by}
        response = supabase.table("webhook_subscribers").insert(row).execute()
        return response.data[0]

    def remove_subscriber(self, subscriber_id: int) -> None:
        supabase.table("webhook_subscribers").delete().eq("id", subscriber_id).execute()

    def toggle_subscriber(self, subscriber_id: int) -> dict:
        current = supabase.table("webhook_subscribers").select("active").eq("id", subscriber_id).execute()
        if not current.data:
            raise ValueError(f"Subscriber {subscriber_id} not found")
        new_active = not current.data[0]["active"]
        response = supabase.table("webhook_subscribers").update({"active": new_active}).eq("id", subscriber_id).execute()
        return response.data[0]
