"""Enum values for the `hall_crm` module.

Re-exported from the model file that declares them, so models and schemas share
one object per enum — the same arrangement as `app.modules.bookings.enums`.
"""

from app.modules.hall_crm.models.hall_event import (
    HallEventSource,
    HallEventStage,
    HallEventType,
)

# A slot counts as taken once the deposit is in; earlier stages only hold it.
BOOKED_STAGES = frozenset({HallEventStage.DEPOSIT, HallEventStage.HELD, HallEventStage.COMPLETED})

__all__ = [
    "BOOKED_STAGES",
    "HallEventSource",
    "HallEventStage",
    "HallEventType",
]
