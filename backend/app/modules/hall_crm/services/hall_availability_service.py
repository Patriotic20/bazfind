from collections import defaultdict
from collections.abc import Sequence
from datetime import date as date_type
from datetime import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import VenueAlreadyBookedError
from app.modules.hall_crm.models import HallBlock, HallEvent
from app.modules.hall_crm.repositories import HallBlockRepository, HallEventRepository
from app.modules.hall_crm.services.hall_settings_service import HallSettingsService
from app.modules.hall_crm.services.slots import all_slots, session_for, taken_slots


class HallAvailabilityService:
    """What the CRM tells the customer app about free days.

    A day is closed to online booking when every hall in every session is owned
    by a deposited card or closed by hand; a booking is refused when every hall
    is taken in the session its start time falls in. Holds — cards before the
    deposit — never close anything: the first deposit wins the slot.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.events = HallEventRepository(session)
        self.blocks = HallBlockRepository(session)
        self.settings = HallSettingsService(session)

    async def closed_dates(
        self, venue_id: int, date_from: date_type, date_to: date_type
    ) -> Sequence[date_type]:
        events = await self.events.list_booked(venue_id, date_from, date_to)
        blocks = await self.blocks.list_for_venue(venue_id, date_from, date_to)
        # The common case — a hall that does not use the CRM — costs two empty
        # queries and never builds the settings.
        if not events and not blocks:
            return []
        settings = await self.settings.settings_in_transaction(venue_id)
        every = all_slots(settings)
        by_day_events: dict[date_type, list[HallEvent]] = defaultdict(list)
        by_day_blocks: dict[date_type, list[HallBlock]] = defaultdict(list)
        for event in events:
            by_day_events[event.event_date].append(event)
        for block in blocks:
            by_day_blocks[block.block_date].append(block)
        days = set(by_day_events) | set(by_day_blocks)
        return sorted(
            day
            for day in days
            if every <= taken_slots(settings, by_day_events[day], by_day_blocks[day])
        )

    async def require_free(self, venue_id: int, day: date_type, start: time) -> None:
        events = await self.events.list_booked(venue_id, day, day)
        blocks = await self.blocks.list_for_venue(venue_id, day, day)
        if not events and not blocks:
            return
        settings = await self.settings.settings_in_transaction(venue_id)
        session_key = session_for(settings, start)
        taken = taken_slots(settings, events, blocks)
        if all((hall.key, session_key) in taken for hall in settings.halls):
            raise VenueAlreadyBookedError()
