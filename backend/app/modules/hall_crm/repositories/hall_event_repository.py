from collections.abc import Sequence
from datetime import date as date_type

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hall_crm.enums import BOOKED_STAGES
from app.modules.hall_crm.models import HallEvent


class HallEventRepository:
    """Pipeline cards. Soft-deleted cards are hidden from every list."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_venue(
        self,
        venue_id: int,
        date_from: date_type | None = None,
        date_to: date_type | None = None,
    ) -> Sequence[HallEvent]:
        statement = select(HallEvent).where(
            HallEvent.venue_id == venue_id, HallEvent.deleted_at.is_(None)
        )
        if date_from is not None:
            statement = statement.where(HallEvent.event_date >= date_from)
        if date_to is not None:
            statement = statement.where(HallEvent.event_date <= date_to)
        result = await self.session.execute(statement.order_by(HallEvent.event_date, HallEvent.id))
        return result.scalars().all()

    async def list_linked(self, venue_id: int) -> Sequence[HallEvent]:
        """Every card tied to an online booking, deleted ones included — the import
        must know which bookings it has already brought in."""
        result = await self.session.execute(
            select(HallEvent).where(
                HallEvent.venue_id == venue_id, HallEvent.booking_id.is_not(None)
            )
        )
        return result.scalars().all()

    async def list_booked(
        self, venue_id: int, date_from: date_type, date_to: date_type
    ) -> Sequence[HallEvent]:
        """Cards that own their slot: the deposit is in."""
        result = await self.session.execute(
            select(HallEvent).where(
                HallEvent.venue_id == venue_id,
                HallEvent.deleted_at.is_(None),
                HallEvent.stage.in_(BOOKED_STAGES),
                HallEvent.event_date >= date_from,
                HallEvent.event_date <= date_to,
            )
        )
        return result.scalars().all()

    async def get_by_uid(self, venue_id: int, uid: str) -> HallEvent | None:
        result = await self.session.execute(
            select(HallEvent).where(HallEvent.venue_id == venue_id, HallEvent.uid == uid)
        )
        return result.scalar_one_or_none()

    async def create(self, event: HallEvent) -> HallEvent:
        self.session.add(event)
        await self.session.flush()
        return event

    async def create_if_absent(self, event: HallEvent) -> bool:
        """Insert an imported card unless a concurrent import got there first.

        Two staff screens can list the pipeline at the same moment; the unique
        `booking_id` lets one insert win and the other quietly step aside, inside
        a savepoint so the surrounding transaction survives.
        """
        try:
            async with self.session.begin_nested():
                self.session.add(event)
                await self.session.flush()
        except IntegrityError:
            return False
        return True

    async def save(self, event: HallEvent) -> HallEvent:
        """Flush changes made to a loaded card."""
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def delete(self, event_id: int) -> None:
        await self.session.execute(delete(HallEvent).where(HallEvent.id == event_id))
        await self.session.flush()
