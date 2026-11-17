"""Pure helpers for halls and sessions — no database, no session."""

from collections.abc import Iterable
from datetime import time

from app.modules.hall_crm.models import ALL_KEY, HallBlock, HallEvent
from app.modules.hall_crm.schemas import HallSettingsRead

Slot = tuple[str, str]


def _minutes(clock: str | time) -> int:
    if isinstance(clock, time):
        return clock.hour * 60 + clock.minute
    hours, minutes = clock.split(":")
    return int(hours) * 60 + int(minutes)


def session_for(settings: HallSettingsRead, start: time) -> str:
    """The session a start time falls in, or the one starting nearest to it."""
    at = _minutes(start)
    for session in settings.sessions:
        if _minutes(session.starts_at) <= at < _minutes(session.ends_at):
            return session.key
    return min(settings.sessions, key=lambda s: abs(_minutes(s.starts_at) - at)).key


def taken_slots(
    settings: HallSettingsRead, events: Iterable[HallEvent], blocks: Iterable[HallBlock]
) -> set[Slot]:
    """Slots owned by a booked card or closed by hand, for one day."""
    taken: set[Slot] = {(event.hall_key, event.session_key) for event in events}
    halls = [hall.key for hall in settings.halls]
    sessions = [session.key for session in settings.sessions]
    for block in blocks:
        for hall in halls if block.hall_key == ALL_KEY else [block.hall_key]:
            for session in sessions if block.session_key == ALL_KEY else [block.session_key]:
                taken.add((hall, session))
    return taken


def all_slots(settings: HallSettingsRead) -> set[Slot]:
    return {(hall.key, session.key) for hall in settings.halls for session in settings.sessions}
