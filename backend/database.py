"""
Database connectivity — initializes Supabase clients for application use.

Subsystem: System infrastructure — serves all three subsystems
PAC Layer: Abstraction 
Reqs:      SR-AC1 (authenticated data access), SR-P1 (persistent storage)
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load variables from .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_key: str = os.environ.get("SUPABASE_SERVICE_KEY")

# Why two clients: `supabase` uses the anon key for user-scoped operations
# (respects RLS policies). `supabase_admin` uses the service role key for
# admin operations like password resets and user deletion that require
# elevated Supabase privileges (bypasses RLS).
supabase: Client = create_client(url, key)
supabase_admin: Client = create_client(url, service_key)
