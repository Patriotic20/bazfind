from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import delete, exists, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.mixins import utcnow_naive
from app.modules.bookings.models import Booking
from app.modules.venues.models import VenueGuestTier


class VenueGuestTierRepository:
    """To'yxona pricing bands: 100-150 / 150-200 / 200-300 / 300+."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, tier_id: int) -> VenueGuestTier | None:
        result = await self.session.execute(
            select(VenueGuestTier).where(VenueGuestTier.id == tier_id)
        )
        return result.scalar_one_or_none()

    async def list_for_venue(self, venue_id: int) -> Sequence[VenueGuestTier]:
        result = await self.session.execute(
            select(VenueGuestTier)
            .where(VenueGuestTier.venue_id == venue_id)
            .order_by(VenueGuestTier.sort_order, VenueGuestTier.min_guests)
        )
        return result.scalars().all()

    async def get_for_guest_count(self, venue_id: int, guests: int) -> VenueGuestTier | None:
        """The band containing `guests`. A null `max_guests` is the open-ended top
        band ("300+"), so it matches anything at or above its minimum."""
        result = await self.session.execute(
            select(VenueGuestTier)
            .where(
                VenueGuestTier.venue_id == venue_id,
                VenueGuestTier.min_guests <= guests,
                (VenueGuestTier.max_guests.is_(None)) | (VenueGuestTier.max_guests >= guests),
            )
            .order_by(VenueGuestTier.min_guests.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, tier: VenueGuestTier) -> VenueGuestTier:
        self.session.add(tier)
        await self.session.flush()
        return tier

    async def update_band(
        self,
        tier_id: int,
        min_guests: int,
        max_guests: int | None,
        base_price: Decimal,
        sort_order: int,
    ) -> None:
        # `updated_at` by hand: a raw UPDATE skips `onupdate`. See CONVENTIONS.md 11.
        await self.session.execute(
            update(VenueGuestTier)
            .where(VenueGuestTier.id == tier_id)
            .values(
                min_guests=min_guests,
                max_guests=max_guests,
                base_price=base_price,
                sort_order=sort_order,
                updated_at=utcnow_naive(),
            )
        )
        await self.session.flush()

    async def is_referenced(self, tier_id: int) -> bool:
        """Whether a booking was priced from this band — such a band cannot go."""
        result = await self.session.execute(
            select(exists().where(Booking.guest_tier_id == tier_id))
        )
        return bool(result.scalar())

    async def delete(self, tier_id: int) -> None:
        await self.session.execute(delete(VenueGuestTier).where(VenueGuestTier.id == tier_id))
        await self.session.flush()
