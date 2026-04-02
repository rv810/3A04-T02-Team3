import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load variables from .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_key: str = os.environ.get("SUPABASE_SERVICE_KEY")

# Standard client — used for all regular operations
supabase: Client = create_client(url, key)

# Admin client — used only for auth admin operations (delete user, update password)
supabase_admin: Client = create_client(url, service_key)
