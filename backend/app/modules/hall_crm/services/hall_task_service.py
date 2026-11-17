from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.hall_crm.models import HallTask
from app.modules.hall_crm.repositories import HallTaskRepository
from app.modules.hall_crm.schemas import HallTaskRead, HallTaskWrite
from app.modules.venues.repositories import VenueRepository


class HallTaskService:
    """The owner's to-do list: upserts by client id, idempotent deletes."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tasks = HallTaskRepository(session)
        self.venues = VenueRepository(session)

    async def list(self, venue_id: int) -> Sequence[HallTaskRead]:
        await self._require_venue(venue_id)
        rows = await self.tasks.list_for_venue(venue_id)
        return [HallTaskRead.model_validate(row) for row in rows]

    async def put(self, venue_id: int, uid: str, payload: HallTaskWrite) -> HallTaskRead:
        await self._require_venue(venue_id)
        task = await self.tasks.get_by_uid(venue_id, uid)
        if task is None:
            task = await self.tasks.create(
                HallTask(venue_id=venue_id, uid=uid, **payload.model_dump())
            )
        else:
            for field, value in payload.model_dump().items():
                setattr(task, field, value)
            task = await self.tasks.save(task)
        await self.session.commit()
        return HallTaskRead.model_validate(task)

    async def delete(self, venue_id: int, uid: str) -> None:
        await self._require_venue(venue_id)
        task = await self.tasks.get_by_uid(venue_id, uid)
        if task is None:
            return
        await self.tasks.delete(task.id)
        await self.session.commit()

    async def _require_venue(self, venue_id: int) -> None:
        if await self.venues.get_by_id(venue_id) is None:
            raise NotFoundError("Muassasa topilmadi")
