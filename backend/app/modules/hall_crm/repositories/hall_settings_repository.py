from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.mixins import utcnow_naive
from app.modules.hall_crm.models import HallSettings


class HallSettingsRepository:
    """One settings document per to'yxona."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_venue(self, venue_id: int) -> HallSettings | None:
        result = await self.session.execute(
            select(HallSettings).where(HallSettings.venue_id == venue_id)
        )
        return result.scalar_one_or_none()

    async def upsert(self, venue_id: int, data: dict[str, Any]) -> HallSettings:
        """Insert or replace in one statement, so two saves cannot race into two rows."""
        statement = (
            pg_insert(HallSettings)
            .values(venue_id=venue_id, data=data)
            .on_conflict_do_update(
                index_elements=[HallSettings.venue_id],
                set_={"data": data, "updated_at": utcnow_naive()},
            )
            .returning(HallSettings)
        )
        result = await self.session.execute(
            statement, execution_options={"populate_existing": True}
        )
        await self.session.flush()
        return result.scalar_one()
