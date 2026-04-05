"""
Authentication and RBAC middleware — validates JWTs and enforces role-based access.

Subsystem: Account Management — middleware layer
PAC Layer: Control
Reqs:      SR-AC1 (authentication), SR-AC2 (RBAC), SR-AC3 (admin restriction)
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validates JWT and returns the authenticated user. Implements SR-AC1 (authentication required)."""
    token = credentials.credentials
    try:
        # Verify the JWT with Supabase Auth
        user_response = supabase.auth.get_user(token)
        user_id = str(user_response.user.id)

        # Fetch role from our accounts table
        result = (
            supabase.table("accounts")
            .select("userrole")
            .eq("id", user_id)
            .single()
            .execute()
        )

        return {
            "id": user_id,
            "role": result.data["userrole"],
            "token": token
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_operator(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforces operator-level access. Implements SR-AC2 (RBAC)."""
    # Why admin is allowed: admins inherit all operator permissions (hierarchical RBAC)
    if current_user["role"] not in ["operator", "admin"]:
        raise HTTPException(status_code=403, detail="Operator access required")
    return current_user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforces admin-only access. Implements SR-AC3 (admin functions restricted)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user