from abstractions.accounts_abstraction import AccountsAbstraction
from models.account import (
    AccountInformation,
    CreateAccountRequest,
    AdminCreateAccountRequest,
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
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def login(self, request: LoginRequest) -> LoginResponse:
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

    def listAllAccounts(self) -> list:
        try:
            return self.accountDB.retrieveAllAccounts()
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to retrieve accounts")

    def deleteAccount(self, user_id: str) -> None:
        # SR-P2: users can request deletion of their own data
        try:
            # Log before delete — user_id FK becomes invalid after deletion
            self.accountDB.logAuthAttempt(
                event_type="account_deleted",
                description=f"Account deleted for user {user_id}",
                user_id=user_id
            )
            self.accountDB.deleteAccount(user_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))