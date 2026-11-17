from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.mixins import IdIntPk, TimestampMixin


class HallEventStage(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    VIEWED = "viewed"
    DEPOSIT = "deposit"
    HELD = "held"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HallEventSource(StrEnum):
    BAZMLY = "bazmly"
    PHONE = "phone"
    INSTAGRAM = "instagram"
    WALK_IN = "walk_in"
    REFERRAL = "referral"


class HallEventType(StrEnum):
    WEDDING = "wedding"
    NAHOR = "nahor"
    FOTIHA = "fotiha"
    BIRTHDAY = "birthday"
    CORPORATE = "corporate"
    OTHER = "other"


class HallEvent(IdIntPk, TimestampMixin, Base):
    """A card in the to'yxona's pipeline — from the first call to the finished event.

    `uid` is chosen by the client, so a card created offline-first keeps the id it
    was shown under; an imported Bazmly booking gets `bazmly-<booking id>`.

    `booking_id` links the card to an online booking. `booking_status` is the
    booking status last seen, so an import only moves the stage when the booking
    itself moved. A linked card is soft-deleted (`deleted_at`), otherwise the
    next import would bring it straight back.

    Extras, notes, staff, timeline and checklist belong to this card alone and are
    always read and written with it, so they are JSONB rather than child tables.
    """

    __tablename__ = "hall_crm_events"
    __table_args__ = (
        UniqueConstraint("venue_id", "uid", name="uq_hall_crm_events_venue_uid"),
        Index("ix_hall_crm_events_venue_id_event_date", "venue_id", "event_date"),
        CheckConstraint(
            "stage IN ('new', 'contacted', 'viewed', 'deposit', 'held', 'completed', 'cancelled')",
            name="ck_hall_crm_events_stage",
        ),
        CheckConstraint(
            "source IN ('bazmly', 'phone', 'instagram', 'walk_in', 'referral')",
            name="ck_hall_crm_events_source",
        ),
        CheckConstraint(
            "event_type IN ('wedding', 'nahor', 'fotiha', 'birthday', 'corporate', 'other')",
            name="ck_hall_crm_events_event_type",
        ),
    )

    venue_id: Mapped[int] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    uid: Mapped[str] = mapped_column(String(64), nullable=False)
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    booking_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    event_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    session_key: Mapped[str] = mapped_column(String(40), nullable=False)
    hall_key: Mapped[str] = mapped_column(String(40), nullable=False)
    guests: Mapped[int] = mapped_column(Integer, nullable=False)
    catering_key: Mapped[str | None] = mapped_column(String(40), nullable=True)
    discount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    due_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    extras: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    notes: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    staff: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    timeline: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    checklist: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
