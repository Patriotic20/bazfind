from collections.abc import Sequence
from datetime import date as date_type

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_availability_cache, venue_availability_prefix
from app.core.exceptions import NotFoundError
from app.modules.hall_crm.models import HallBlock
from app.modules.hall_crm.repositories import HallBlockRepository
from app.modules.hall_crm.schemas import HallBlockRead, HallBlockWrite
from app.modules.venues.repositories import VenueRepository


class HallBlockService:
    """Closing and reopening slots by hand. Writes are upserts by client id and
    deletes are idempotent, so a retried request lands once."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.blocks = HallBlockRepository(session)
        self.venues = VenueRepository(session)

    async def list(
        self, venue_id: int, date_from: date_type | None, date_to: date_type | None
    ) -> Sequence[HallBlockRead]:
        await self._require_venue(venue_id)
        rows = await self.blocks.list_for_venue(venue_id, date_from, date_to)
        return [HallBlockRead.model_validate(row) for row in rows]

    async def put(self, venue_id: int, uid: str, payload: HallBlockWrite) -> HallBlockRead:
        await self._require_venue(venue_id)
        block = await self.blocks.get_by_uid(venue_id, uid)
        if block is None:
            block = await self.blocks.create(
                HallBlock(venue_id=venue_id, uid=uid, **payload.model_dump())
            )
        else:
            for field, value in payload.model_dump().items():
                setattr(block, field, value)
            block = await self.blocks.save(block)
        await self.session.commit()
        await get_availability_cache().invalidate(venue_availability_prefix(venue_id))
        return HallBlockRead.model_validate(block)

    async def delete(self, venue_id: int, uid: str) -> None:
        await self._require_venue(venue_id)
        block = await self.blocks.get_by_uid(venue_id, uid)
        if block is None:
            return
        await self.blocks.delete(block.id)
        await self.session.commit()
        await get_availability_cache().invalidate(venue_availability_prefix(venue_id))

    async def _require_venue(self, venue_id: int) -> None:
        if await self.venues.get_by_id(venue_id) is None:
            raise NotFoundError("Muassasa topilmadi")
