from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from datetime import date as date_type
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_availability_cache, venue_availability_prefix
from app.core.database.mixins import utcnow_naive
from app.core.exceptions import VenueAlreadyBookedError
from app.modules.bookings.enums import BookingStatus
from app.modules.bookings.models import Booking
from app.modules.bookings.repositories import BookingRepository
from app.modules.hall_crm.enums import (
    BOOKED_STAGES,
    HallEventSource,
    HallEventStage,
    HallEventType,
)
from app.modules.hall_crm.models import HallEvent
from app.modules.hall_crm.repositories import HallEventRepository
from app.modules.hall_crm.schemas import HallEventRead, HallEventWrite, HallSettingsRead
from app.modules.hall_crm.services.hall_settings_service import HallSettingsService
from app.modules.hall_crm.services.slots import session_for

# Where an online booking's status puts its card in the pipeline.
STAGE_FOR_BOOKING: dict[str, HallEventStage] = {
    BookingStatus.PENDING: HallEventStage.NEW,
    BookingStatus.CONFIRMED: HallEventStage.DEPOSIT,
    BookingStatus.CHECKED_IN: HallEventStage.HELD,
    BookingStatus.COMPLETED: HallEventStage.COMPLETED,
    BookingStatus.CANCELLED: HallEventStage.CANCELLED,
    BookingStatus.NO_SHOW: HallEventStage.CANCELLED,
    BookingStatus.EXPIRED: HallEventStage.CANCELLED,
}

BOOKING_NOTE: dict[str, str] = {
    BookingStatus.PENDING: "Bazmly: yangi onlayn bron",
    BookingStatus.CONFIRMED: "Bazmly: bron tasdiqlandi",
    BookingStatus.CHECKED_IN: "Bazmly: mijoz keldi",
    BookingStatus.COMPLETED: "Bazmly: tadbir yakunlandi",
    BookingStatus.CANCELLED: "Bazmly: bron bekor qilindi",
    BookingStatus.NO_SHOW: "Bazmly: mijoz kelmadi",
    BookingStatus.EXPIRED: "Bazmly: bron muddati o'tdi",
}

CANCELLABLE = (BookingStatus.PENDING, BookingStatus.CONFIRMED)

# The card's own JSONB columns, written as JSON-ready values.
JSON_FIELDS = {"extras", "notes", "staff", "timeline", "checklist"}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class HallEventService:
    """The pipeline, and the bridge between it and online bookings.

    Online to'yxona bookings are imported as cards on read, and their later status
    changes move the card. Moving a linked card the other way — to a deposit, or
    to cancelled — confirms or cancels the booking, so the customer sees what the
    owner decided.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.events = HallEventRepository(session)
        self.bookings = BookingRepository(session)
        self.settings = HallSettingsService(session)

    async def list(
        self, venue_id: int, date_from: date_type | None, date_to: date_type | None
    ) -> Sequence[HallEventRead]:
        settings = await self.settings.settings_in_transaction(venue_id)
        if await self._import_bookings(venue_id, settings):
            await self.session.commit()
        rows = await self.events.list_for_venue(venue_id, date_from, date_to)
        return [HallEventRead.model_validate(row) for row in rows]

    async def put(
        self, user_id: int, venue_id: int, uid: str, payload: HallEventWrite
    ) -> HallEventRead:
        await self.settings.require_venue(venue_id)
        if payload.stage in BOOKED_STAGES:
            await self._guard_slot(venue_id, uid, payload)

        values = self._values(payload)
        event = await self.events.get_by_uid(venue_id, uid)
        if event is None:
            event = await self.events.create(HallEvent(venue_id=venue_id, uid=uid, **values))
        else:
            previous_stage = event.stage
            for field, value in values.items():
                setattr(event, field, value)
            event.deleted_at = None
            if event.booking_id is not None and previous_stage != event.stage:
                await self._push_stage(event, user_id)
            event = await self.events.save(event)

        await self.session.commit()
        await get_availability_cache().invalidate(venue_availability_prefix(venue_id))
        return HallEventRead.model_validate(event)

    async def delete(self, user_id: int, venue_id: int, uid: str) -> None:
        """Idempotent. A card tied to an online booking is hidden rather than
        removed — the next import would otherwise bring it back — and its booking,
        if still open, is cancelled."""
        await self.settings.require_venue(venue_id)
        event = await self.events.get_by_uid(venue_id, uid)
        if event is None:
            return
        if event.booking_id is None:
            await self.events.delete(event.id)
        else:
            event.deleted_at = utcnow_naive()
            if event.stage != HallEventStage.CANCELLED:
                event.stage = HallEventStage.CANCELLED
                await self._push_stage(event, user_id)
            await self.events.save(event)
        await self.session.commit()
        await get_availability_cache().invalidate(venue_availability_prefix(venue_id))

    @staticmethod
    def _values(payload: HallEventWrite) -> dict[str, Any]:
        values = payload.model_dump(exclude=JSON_FIELDS)
        values.update(payload.model_dump(mode="json", include=JSON_FIELDS))
        return values

    async def _guard_slot(self, venue_id: int, uid: str, payload: HallEventWrite) -> None:
        """One deposited card per hall and session — the second deposit is refused."""
        rivals = await self.events.list_booked(venue_id, payload.event_date, payload.event_date)
        for rival in rivals:
            if (
                rival.uid != uid
                and rival.hall_key == payload.hall_key
                and rival.session_key == payload.session_key
            ):
                raise VenueAlreadyBookedError(
                    "Bu kun va seansda zal band",
                    details={"uid": rival.uid},
                )

    async def _push_stage(self, event: HallEvent, user_id: int) -> None:
        if event.booking_id is None:
            return
        booking = await self.bookings.get_by_id(event.booking_id)
        if booking is None:
            return
        previous = booking.status
        target: str | None = None
        reason: str | None = None
        if event.stage in BOOKED_STAGES and previous == BookingStatus.PENDING:
            target = BookingStatus.CONFIRMED
        elif event.stage == HallEventStage.CANCELLED and previous in CANCELLABLE:
            target = BookingStatus.CANCELLED
            reason = "To'yxona tomonidan bekor qilindi"
        if target is None:
            return
        await self.bookings.set_status(booking.id, target, utcnow_naive(), reason)
        await self.bookings.record_status_change(
            booking.id, previous, target, user_id, "To'yxona CRM"
        )
        event.booking_status = target

    async def _import_bookings(self, venue_id: int, settings: HallSettingsRead) -> bool:
        """Bring new online bookings in, and move cards whose booking moved.
        Returns whether anything was written."""
        bookings = await self.bookings.list_hall_events_for_venue(venue_id)
        if not bookings:
            return False
        linked = {event.booking_id: event for event in await self.events.list_linked(venue_id)}
        changed = False
        for booking in bookings:
            event = linked.get(booking.id)
            if event is None:
                created = await self.events.create_if_absent(
                    await self._card_for(venue_id, booking, settings)
                )
                changed = changed or created
            elif event.booking_status != booking.status:
                event.booking_status = booking.status
                stage = STAGE_FOR_BOOKING[booking.status]
                if event.deleted_at is None and event.stage != stage:
                    event.stage = stage
                    event.notes = [
                        {"at": _now_iso(), "text": BOOKING_NOTE[booking.status]},
                        *event.notes,
                    ]
                await self.events.save(event)
                changed = True
        return changed

    async def _card_for(
        self, venue_id: int, booking: Booking, settings: HallSettingsRead
    ) -> HallEvent:
        session_key = session_for(settings, booking.start_time)
        booked = await self.events.list_booked(venue_id, booking.booking_date, booking.booking_date)
        taken = {event.hall_key for event in booked if event.session_key == session_key}
        roomy = [hall for hall in settings.halls if hall.capacity >= booking.guests_count]
        free = [hall for hall in roomy or settings.halls if hall.key not in taken]
        hall = (free or roomy or settings.halls)[0]

        created_at = booking.created_at.replace(tzinfo=UTC).isoformat()
        notes: list[dict[str, Any]] = []
        if booking.note:
            notes.append({"at": created_at, "text": f"Mijoz izohi: {booking.note}"[:2000]})
        notes.append({"at": created_at, "text": "Bazmly orqali onlayn bron qilindi"})
        return HallEvent(
            venue_id=venue_id,
            uid=f"bazmly-{booking.id}",
            booking_id=booking.id,
            booking_status=booking.status,
            stage=STAGE_FOR_BOOKING[booking.status],
            source=HallEventSource.BAZMLY,
            contact_name=booking.contact_name,
            contact_phone=booking.contact_phone,
            event_type=HallEventType.WEDDING,
            event_date=booking.booking_date,
            session_key=session_key,
            hall_key=hall.key,
            guests=booking.guests_count,
            catering_key=None,
            discount=0,
            due_date=booking.booking_date - timedelta(days=settings.due_days_before),
            extras=[],
            notes=notes,
            staff=None,
            timeline=None,
            checklist=None,
        )
