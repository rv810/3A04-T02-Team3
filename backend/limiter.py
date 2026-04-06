# limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

# This creates a single, global rate limiter for your whole app
limiter = Limiter(key_func=get_remote_address)