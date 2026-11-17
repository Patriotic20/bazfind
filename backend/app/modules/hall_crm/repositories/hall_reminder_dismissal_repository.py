from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hall_crm.models import HallReminderDismissal


class HallReminderDismissalRepository:
    """Keys of reminders the owner swiped away."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_keys(self, venue_id: int) -> Sequence[str]:
        result = await self.session.execute(
            select(HallReminderDismissal.key)
            .where(HallReminderDismissal.venue_id == venue_id)
            .order_by(HallReminderDismissal.id)
        )
        return result.scalars().all()

    async def add(self, venue_id: int, key: str) -> None:
        """Idempotent: dismissing twice is still one dismissal."""
        await self.session.execute(
            pg_insert(HallReminderDismissal)
            .values(venue_id=venue_id, key=key)
            .on_conflict_do_nothing(constraint="uq_hall_crm_reminder_dismissals_venue_key")
        )
        await self.session.flush()
