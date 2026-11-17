from collections.abc import Sequence
from datetime import date as date_type

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hall_crm.models import HallBlock


class HallBlockRepository:
    """Slots the owner closed by hand."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_venue(
        self,
        venue_id: int,
        date_from: date_type | None = None,
        date_to: date_type | None = None,
    ) -> Sequence[HallBlock]:
        statement = select(HallBlock).where(HallBlock.venue_id == venue_id)
        if date_from is not None:
            statement = statement.where(HallBlock.block_date >= date_from)
        if date_to is not None:
            statement = statement.where(HallBlock.block_date <= date_to)
        result = await self.session.execute(statement.order_by(HallBlock.block_date, HallBlock.id))
        return result.scalars().all()

    async def get_by_uid(self, venue_id: int, uid: str) -> HallBlock | None:
        result = await self.session.execute(
            select(HallBlock).where(HallBlock.venue_id == venue_id, HallBlock.uid == uid)
        )
        return result.scalar_one_or_none()

    async def create(self, block: HallBlock) -> HallBlock:
        self.session.add(block)
        await self.session.flush()
        return block

    async def save(self, block: HallBlock) -> HallBlock:
        await self.session.flush()
        await self.session.refresh(block)
        return block

    async def delete(self, block_id: int) -> None:
        await self.session.execute(delete(HallBlock).where(HallBlock.id == block_id))
        await self.session.flush()
