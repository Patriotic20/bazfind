from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.hall_crm.repositories import HallReminderDismissalRepository
from app.modules.venues.repositories import VenueRepository


class HallReminderService:
    """Dismissed reminder keys. The reminders themselves are computed by the
    client from the cards, so this is the only state they have."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.dismissals = HallReminderDismissalRepository(session)
        self.venues = VenueRepository(session)

    async def list(self, venue_id: int) -> Sequence[str]:
        await self._require_venue(venue_id)
        return await self.dismissals.list_keys(venue_id)

    async def dismiss(self, venue_id: int, key: str) -> Sequence[str]:
        await self._require_venue(venue_id)
        await self.dismissals.add(venue_id, key)
        await self.session.commit()
        return await self.dismissals.list_keys(venue_id)

    async def _require_venue(self, venue_id: int) -> None:
        if await self.venues.get_by_id(venue_id) is None:
            raise NotFoundError("Muassasa topilmadi")
