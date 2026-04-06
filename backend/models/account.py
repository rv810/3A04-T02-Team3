"""
Account data models — Pydantic schemas for user account operations.

Subsystem: Account Management
PAC Layer: Model
Pattern:   Repository
Reqs:      BE6 (account CRUD), SR-P2 (data integrity via validation)
"""

from pydantic import BaseModel, EmailStr
from enum import Enum
from typing import Optional
from uuid import UUID
from datetime import datetime


class Role(str, Enum):
    admin = "admin"
    operator = "operator"
    public = "public"


# Matches the accounts table schema
class AccountInformation(BaseModel):
    id: Optional[UUID] = None
    username: str
    email: EmailStr
    phone_num: Optional[str] = None
    userrole: Role
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


# Used by public /auth/register — no role selection
class CreateAccountRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone_num: Optional[str] = None


# Used by admin /accounts/create-user — role selection allowed
class AdminCreateAccountRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone_num: Optional[str] = None
    userrole: Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EditAccountRequest(BaseModel):
    username: Optional[str] = None
    phone_num: Optional[str] = None
    password: Optional[str] = None


class AdminEditAccountRequest(BaseModel):
    username: Optional[str] = None
    phone_num: Optional[str] = None
    userrole: Optional[Role] = None


# Returned to the client after a successful login
class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AccountInformation


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str