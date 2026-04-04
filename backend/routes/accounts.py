from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import ValidationError
from controllers.accounts_controller import AccountsController
from models.account import (
    CreateAccountRequest,
    AdminCreateAccountRequest,
    LoginRequest,
    EditAccountRequest,
    AccountInformation,
    LoginResponse
)
from middleware.auth import get_current_user, require_admin
from database import supabase

router = APIRouter(tags=["auth & accounts"])
controller = AccountsController(supabase)


# --- Public routes (no auth required) ---

@router.post("/auth/register", response_model=AccountInformation)
def register(request: CreateAccountRequest):
    # Role is always public for self-registration
    try:
        return controller.createAccount(request)
    except (ValidationError, ValueError) as e:
        # Clean 400 for invalid role strings or validation errors
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login", response_model=LoginResponse)
def login(request: LoginRequest):
    return controller.login(request)


# --- Authenticated routes ---

@router.post("/auth/logout")
def logout(current_user: dict = Depends(get_current_user)):
    controller.logout(current_user["token"], current_user["id"])
    return {"message": "Logged out successfully"}


@router.get("/accounts/me", response_model=AccountInformation)
def view_account(current_user: dict = Depends(get_current_user)):
    return controller.viewAccount(current_user["id"])


@router.put("/accounts/me", response_model=AccountInformation)
def edit_account(
    data: EditAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    return controller.editAccount(current_user["id"], data)


@router.delete("/accounts/me")
def delete_account(current_user: dict = Depends(get_current_user)):
    # SR-P2: users can request deletion of their own data
    controller.deleteAccount(current_user["id"])
    return {"message": "Account deleted successfully"}


# --- Admin only routes ---

@router.post("/accounts/create-user", response_model=AccountInformation)
def create_user(
    request: AdminCreateAccountRequest,
    current_user: dict = Depends(require_admin)
):
    # BE6: admins can create operator or admin accounts
    return controller.createAccount(request, requesting_role=current_user["role"])


@router.get("/accounts/users", response_model=List[AccountInformation])
def list_users(current_user: dict = Depends(require_admin)):
    return controller.listAllAccounts()