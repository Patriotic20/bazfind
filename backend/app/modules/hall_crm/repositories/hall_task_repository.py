from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hall_crm.models import HallTask


class HallTaskRepository:
    """The owner's own to-do list."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_venue(self, venue_id: int) -> Sequence[HallTask]:
        result = await self.session.execute(
            select(HallTask)
            .where(HallTask.venue_id == venue_id)
            .order_by(HallTask.created_at.desc(), HallTask.id.desc())
        )
        return result.scalars().all()

    async def get_by_uid(self, venue_id: int, uid: str) -> HallTask | None:
        result = await self.session.execute(
            select(HallTask).where(HallTask.venue_id == venue_id, HallTask.uid == uid)
        )
        return result.scalar_one_or_none()

    async def create(self, task: HallTask) -> HallTask:
        self.session.add(task)
        await self.session.flush()
        return task

    async def save(self, task: HallTask) -> HallTask:
        await self.session.flush()
        await self.session.refresh(task)
        return task

    async def delete(self, task_id: int) -> None:
        await self.session.execute(delete(HallTask).where(HallTask.id == task_id))
        await self.session.flush()
