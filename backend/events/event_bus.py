"""
Inter-agent event bus — publisher-subscriber pattern for PAC agent communication.

Agents publish events without knowing who consumes them.
Agents subscribe to events without knowing who produces them.
This enforces PAC's rule that agents communicate only through
their Control components via a shared publisher-subscriber, never by direct import.

Subsystem: System infrastructure — inter-agent coordination
Pattern:   Publisher-subscriber 
"""

from typing import Callable, Any
import asyncio


class EventBus:
    """Simple pub/sub event bus for decoupled inter-agent communication."""

    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = {}

    def subscribe(self, event_type: str, handler: Callable) -> None:
        """Register a handler for an event type. Called during agent initialization."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event_type: str, data: Any = None) -> None:
        """Publish an event to all subscribers. Handlers may be sync or async."""
        for handler in self._subscribers.get(event_type, []):
            if asyncio.iscoroutinefunction(handler):
                await handler(data)
            else:
                handler(data)


# Singleton instance — imported by coordinator and all agents
event_bus = EventBus()
