"""
Direct Supabase database and auth operations for account data.

Subsystem: Account Management
PAC Layer: Abstraction
PAC Agent: Account Management
Pattern:   Repository
Reqs:      BE6, SR-AC1, SR-AU2, SR-P2
"""

from models.account import AccountInformation, CreateAccountRequest, EditAccountRequest, Role
from database import supabase_admin
from typing import Optional
from datetime import datetime, timezone
from supabase_auth.errors import AuthApiError
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


class AccountsAbstraction:
    def __init__(self, supabase_client):
        self.db = supabase_client

    def createAccount(self, request, userrole: Role = Role.public) -> AccountInformation:
        """Creates auth user and account record. Implements BE6."""
        # Register with Supabase Auth — handles password hashing
        try:
            auth_response = _query_with_retry(lambda: self.db.auth.sign_up({
                "email": request.email,
                "password": request.password
            }))
        except AuthApiError as e:
            # Clean error for duplicate email instead of raw exception
            if "already" in str(e).lower() or "duplicate" in str(e).lower():
                raise ValueError("An account with this email already exists")
            raise

        user_id = auth_response.user.id

        # Insert profile and role into accounts table
        payload = {
            "id": str(user_id),
            "username": request.username,
            "email": request.email,
            "phone_num": request.phone_num,
            "userrole": userrole.value if isinstance(userrole, Role) else userrole
        }

        # Why cleanup: if the accounts table insert fails after the auth user was
        # already created, delete the orphaned auth user to prevent ghost accounts
        # (auth entry with no matching profile row).
        try:
            result = _query_with_retry(lambda: self.db.table("accounts").insert(payload).execute())
        except Exception:
            _query_with_retry(lambda: supabase_admin.auth.admin.delete_user(str(user_id)))
            raise

        return AccountInformation(**result.data[0])

    def retrieveAccountInfo(self, user_id: str) -> AccountInformation:
        result = _query_with_retry(lambda: (
            self.db.table("accounts")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        ))
        return AccountInformation(**result.data)

    def updateAccountInfo(self, user_id: str, data: EditAccountRequest) -> AccountInformation:
        # Service role key required for auth admin operations
        if data.password:
            _query_with_retry(lambda: supabase_admin.auth.admin.update_user_by_id(
                user_id,
                {"password": data.password}
            ))

        # Update remaining fields in accounts table
        update_payload = {}
        if data.username is not None:
            update_payload["username"] = data.username
        if data.phone_num is not None:
            update_payload["phone_num"] = data.phone_num

        if update_payload:
            result = _query_with_retry(lambda: (
                self.db.table("accounts")
                .update(update_payload)
                .eq("id", user_id)
                .execute()
            ))
            return AccountInformation(**result.data[0])

        # Password-only update — password was already changed above,
        # return current account info to confirm the update completed
        return self.retrieveAccountInfo(user_id)

    def adminUpdateAccount(self, user_id: str, data) -> AccountInformation:
        update_payload = {}
        if data.username is not None:
            update_payload["username"] = data.username
        if data.phone_num is not None:
            update_payload["phone_num"] = data.phone_num
        if data.userrole is not None:
            update_payload["userrole"] = data.userrole.value if isinstance(data.userrole, Role) else data.userrole

        if not update_payload:
            return self.retrieveAccountInfo(user_id)

        result = _query_with_retry(lambda: (
            self.db.table("accounts")
            .update(update_payload)
            .eq("id", user_id)
            .execute()
        ))
        return AccountInformation(**result.data[0])

    def deleteAccount(self, user_id: str) -> None:
        # Service role key required — cascades to accounts table automatically
        _query_with_retry(lambda: supabase_admin.auth.admin.delete_user(user_id))

    # Failed login rate limiting and account lockout is handled natively
    # by Supabase GoTrue — satisfies SR-IM1
    def login(self, email: str, password: str) -> dict:
        """Authenticates via Supabase GoTrue and updates last_login timestamp. Implements SR-AC1."""
        response = _query_with_retry(lambda: self.db.auth.sign_in_with_password({
            "email": email,
            "password": password
        }))

        # Fetch role and profile from accounts table
        account = _query_with_retry(lambda: (
            self.db.table("accounts")
            .select("*")
            .eq("id", response.user.id)
            .single()
            .execute()
        ))

        # Why update last_login: tracks user activity for session management (LR-STD2)
        _query_with_retry(lambda: self.db.table("accounts").update({
            "last_login": datetime.now(timezone.utc).isoformat()
        }).eq("id", str(response.user.id)).execute())

        return {
            "access_token": response.session.access_token,
            "user": AccountInformation(**account.data),
            # Pass raw user_id string to avoid UUID serialization issues
            "user_id": str(response.user.id)
        }

    def logout(self, jwt: str) -> None:
        # Revoke the session server-side using the admin client
        _query_with_retry(lambda: supabase_admin.auth.admin.sign_out(jwt))

    def retrieveAllAccounts(self) -> list[AccountInformation]:
        response = _query_with_retry(lambda: (
            self.db.table("accounts")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        ))
        return [AccountInformation(**row) for row in response.data]

    def logAuthAttempt(
        self,
        event_type: str,
        description: str,
        user_id: Optional[str] = None
    ) -> None:
        """Records authentication attempt for audit trail. Implements SR-AU2.
        Takes optional user_id -- None for failed login attempts where the user doesn't exist."""
        # Logs to auditlog — user_id is None for failed attempts
        # Never log passwords or tokens here (LR-STD3)
        payload = {
            "eventtype": event_type,
            "description": description,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id
        }
        _query_with_retry(lambda: self.db.table("auditlog").insert(payload).execute())
