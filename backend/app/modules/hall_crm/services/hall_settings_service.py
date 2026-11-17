from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_availability_cache, venue_availability_prefix
from app.core.database.mixins import utcnow_naive
from app.core.exceptions import NotFoundError
from app.modules.hall_crm.repositories import HallSettingsRepository
from app.modules.hall_crm.schemas import (
    HallCateringSchema,
    HallSchema,
    HallSessionSchema,
    HallSettingsRead,
    HallSettingsWrite,
    HallTierSchema,
)
from app.modules.services.repositories import VenueServiceRepository
from app.modules.venues.models import Venue, VenueGuestTier
from app.modules.venues.repositories import VenueGuestTierRepository, VenueRepository

DEFAULT_CAPACITY = 300

# Where a band that bookings still point at is moved when the owner drops it: out
# of reach of any real guest count, so `get_for_guest_count` never picks it, while
# the bookings keep their foreign key.
PARKED_GUESTS = 1_000_000

DEFAULT_SESSIONS = (
    HallSessionSchema(key="kunduzgi", label="Kunduzi", starts_at="11:00", ends_at="16:00"),
    HallSessionSchema(key="kechki", label="Kechqurun", starts_at="18:00", ends_at="23:00"),
)


class HallSettingsService:
    """The settings document, plus the two places it has to agree with the
    customer app: the price bands and the deposit percentage."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = HallSettingsRepository(session)
        self.venues = VenueRepository(session)
        self.tiers = VenueGuestTierRepository(session)
        self.services = VenueServiceRepository(session)

    async def get(self, venue_id: int) -> HallSettingsRead:
        return await self.settings_in_transaction(venue_id)

    async def settings_in_transaction(self, venue_id: int) -> HallSettingsRead:
        """Saved settings, or defaults derived from the branch when there are none —
        never empty, because every price calculation needs a hall and a band."""
        venue = await self.require_venue(venue_id)
        row = await self.settings.get_for_venue(venue_id)
        if row is not None:
            return HallSettingsRead.model_validate(
                {**row.data, "venue_id": venue_id, "is_default": False}
            )
        return await self._defaults(venue)

    async def replace(self, venue_id: int, payload: HallSettingsWrite) -> HallSettingsRead:
        venue = await self.require_venue(venue_id)
        await self.settings.upsert(venue_id, payload.model_dump(mode="json"))
        await self._mirror_tiers(venue, payload.tiers)
        await self.venues.update_fields(
            venue_id,
            {"deposit_percent": Decimal(payload.deposit_percent), "updated_at": utcnow_naive()},
        )
        await self.session.commit()
        await get_availability_cache().invalidate(venue_availability_prefix(venue_id))
        return HallSettingsRead(**payload.model_dump(), venue_id=venue_id, is_default=False)

    async def require_venue(self, venue_id: int) -> Venue:
        venue = await self.venues.get_by_id(venue_id)
        if venue is None:
            raise NotFoundError("Muassasa topilmadi")
        return venue

    async def _defaults(self, venue: Venue) -> HallSettingsRead:
        capacity = venue.capacity_max or venue.total_seats or DEFAULT_CAPACITY
        tiers = [
            HallTierSchema(
                key=f"t{index + 1}",
                label=(
                    f"{band.min_guests} - {band.max_guests} kishi"
                    if band.max_guests is not None
                    else f"{band.min_guests}+ kishi"
                ),
                max_guests=band.max_guests or max(capacity, band.min_guests),
                price=band.base_price,
            )
            for index, band in enumerate(await self.tiers.list_for_venue(venue.id))
            if band.min_guests < PARKED_GUESTS
        ]
        if not tiers:
            tiers = [
                HallTierSchema(
                    key="t1",
                    label=f"{capacity} kishigacha",
                    max_guests=capacity,
                    price=venue.base_price or Decimal(0),
                )
            ]
        return HallSettingsRead(
            venue_id=venue.id,
            is_default=True,
            halls=[HallSchema(key="asosiy", name="Asosiy zal", capacity=capacity)],
            sessions=list(DEFAULT_SESSIONS),
            tiers=tiers,
            catering=await self._default_catering(venue),
            service_fee=Decimal(0),
            deposit_percent=int(venue.deposit_percent or 0),
            weekend_percent=0,
            due_days_before=7,
            table_size=10,
            tables_per_waiter=4,
        )

    async def _default_catering(self, venue: Venue) -> list[HallCateringSchema]:
        """The branch's dasturxon services, so the CRM starts from the prices the
        customer app already shows."""
        packages: list[HallCateringSchema] = []
        for row in await self.services.list_for_venue(venue.id, venue.venue_group_id):
            slug = row.catalog.slug
            if not slug.startswith("dasturxon"):
                continue
            items = await self.services.list_items(row.service.id)
            packages.append(
                HallCateringSchema(
                    key=slug[:40],
                    name=row.name,
                    price_per_guest=row.service.price,
                    items=", ".join(item.name for item in items)[:1000],
                )
            )
        return packages

    async def _mirror_tiers(self, venue: Venue, tiers: Sequence[HallTierSchema]) -> None:
        """Rewrite `venue_guest_tiers` from the CRM bands.

        Rows are updated in place rather than replaced: bookings reference them.
        The first band starts at the hall's minimum, each next one right after the
        previous maximum, and the last is open-ended — the CRM prices any larger
        party at its top band, and so does the customer app now.
        """
        # Two bands with one ceiling would make an empty range; the first one wins,
        # as it does in the CRM's own lookup.
        ordered: list[HallTierSchema] = []
        for tier in sorted(tiers, key=lambda tier: tier.max_guests):
            if not ordered or tier.max_guests > ordered[-1].max_guests:
                ordered.append(tier)
        existing = list(await self.tiers.list_for_venue(venue.id))
        floor = min(venue.capacity_min or 1, ordered[0].max_guests)
        for index, tier in enumerate(ordered):
            low = floor if index == 0 else ordered[index - 1].max_guests + 1
            high = None if index == len(ordered) - 1 else tier.max_guests
            if index < len(existing):
                await self.tiers.update_band(existing[index].id, low, high, tier.price, index)
            else:
                await self.tiers.create(
                    VenueGuestTier(
                        venue_id=venue.id,
                        min_guests=low,
                        max_guests=high,
                        base_price=tier.price,
                        sort_order=index,
                    )
                )
        for offset, band in enumerate(existing[len(ordered) :]):
            if await self.tiers.is_referenced(band.id):
                await self.tiers.update_band(
                    band.id, PARKED_GUESTS, PARKED_GUESTS, band.base_price, 1000 + offset
                )
            else:
                await self.tiers.delete(band.id)
