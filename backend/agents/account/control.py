"""
Business logic for user registration, authentication, profile management,
and admin user operations.

Subsystem: Account Management
PAC Layer: Control
PAC Agent: Account Management
Pattern:   Repository
Reqs:      BE6, SR-AC1, SR-AC2, SR-AC3, SR-AU2
"""

from agents.account.abstraction import AccountsAbstraction
from models.account import (
    AccountInformation,
    CreateAccountRequest,
    AdminCreateAccountRequest,
    AdminEditAccountRequest,
    EditAccountRequest,
    LoginRequest,
    LoginResponse,
    Role
)
from fastapi import HTTPException
from supabase_auth.errors import AuthApiError


class AccountsController:
    def __init__(self, supabase_client):
        self.accountDB = AccountsAbstraction(supabase_client)

    def createAccount(
        self,
        request: CreateAccountRequest | AdminCreateAccountRequest,
        requesting_role: str = Role.public
    ) -> AccountInformation:
        """Creates a new user account. Implements BE6 (Manage Users & Roles)."""
        # Determine role — public registration always gets public
        userrole = getattr(request, "userrole", Role.public)

        # Only admins can create operator or admin accounts
        if userrole in [Role.admin, Role.operator]:
            if requesting_role != Role.admin:
                raise HTTPException(
                    status_code=403,
                    detail="Only admins can assign operator or admin roles"
                )
        try:
            account = self.accountDB.createAccount(request, userrole)
            self.accountDB.logAuthAttempt(
                event_type="account_created",
                description=f"Account created for {request.email}",
                user_id=str(account.id)
            )
            return account
        except ValueError as e:
            # Why 409: only raised for ValueError containing "already exists" —
            # other ValueErrors fall through to the 400 below.
            if "already exists" in str(e).lower():
                raise HTTPException(status_code=409, detail=str(e))
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def login(self, request: LoginRequest) -> LoginResponse:
        """Authenticates user credentials and returns session token. Implements SR-AC1 (authentication), SR-AU2 (auth logging)."""
        try:
            result = self.accountDB.login(request.email, request.password)

            self.accountDB.logAuthAttempt(
                event_type="login_success",
                description=f"Successful login for {request.email}",
                user_id=result["user_id"]
            )

            return LoginResponse(
                access_token=result["access_token"],
                user=result["user"]
            )
        except HTTPException:
            raise  # re-raise our own HTTPExceptions as-is (e.g. 403 from role checks)
        except AuthApiError:
            # Supabase auth failures — invalid credentials, user not found, etc.
            self.accountDB.logAuthAttempt(
                event_type="login_failed",
                description=f"Failed login attempt for {request.email}"
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
        except Exception:
            # Genuine server errors — don't leak internal details
            self.accountDB.logAuthAttempt(
                event_type="login_failed",
                description=f"Failed login attempt for {request.email}"
            )
            raise HTTPException(status_code=500, detail="An unexpected error occurred")

    def logout(self, jwt: str, user_id: str) -> None:
        """Ends user session. Implements LR-STD2 (session management)."""
        try:
            self.accountDB.logout(jwt)
            self.accountDB.logAuthAttempt(
                event_type="logout",
                description="User logged out",
                user_id=user_id
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def viewAccount(self, user_id: str) -> AccountInformation:
        try:
            return self.accountDB.retrieveAccountInfo(user_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Account not found")

    def editAccount(self, user_id: str, data: EditAccountRequest) -> AccountInformation:
        try:
            result = self.accountDB.updateAccountInfo(user_id, data)
            self.accountDB.logAuthAttempt(
                event_type="account_edited",
                description=f"Account edited for user {user_id}",
                user_id=user_id
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def adminEditAccount(self, user_id: str, data, admin_id: str) -> AccountInformation:
        """Admin-only account modification. Implements BE6, SR-AC3 (admin restricted)."""
        try:
            result = self.accountDB.adminUpdateAccount(user_id, data)
            self.accountDB.logAuthAttempt(
                event_type="account_edited",
                description=f"Admin {admin_id} edited account {user_id}",
                user_id=admin_id
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def adminDeleteAccount(self, user_id: str, admin_id: str) -> None:
        """Admin-only account deletion. Implements BE6, SR-AC3."""
        try:
            self.accountDB.logAuthAttempt(
                event_type="account_deleted",
                description=f"Admin {admin_id} deleted account {user_id}",
                user_id=admin_id
            )
            self.accountDB.deleteAccount(user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def listAllAccounts(self) -> list:
        try:
            return self.accountDB.retrieveAllAccounts()
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to retrieve accounts")

    def deleteAccount(self, user_id: str) -> None:
        """Deletes the authenticated user's own account. Implements SR-P2 (users can delete data)."""
        try:
            # Why log BEFORE delete: the user FK becomes invalid after Supabase
            # auth deletion, so the audit log insert would fail with a dangling reference.
            self.accountDB.logAuthAttempt(
                event_type="account_deleted",
                description=f"Account deleted for user {user_id}",
                user_id=user_id
            )
            self.accountDB.deleteAccount(user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
