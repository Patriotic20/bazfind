from datetime import date as date_type

from sqlalchemy import Boolean, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.mixins import IdIntPk, TimestampMixin


class HallTask(IdIntPk, TimestampMixin, Base):
    """A to-do the owner wrote for themselves, optionally about one event card.

    `event_uid` is the card's client id, not a foreign key: a task outlives the
    card it was written about, and the card may not have reached the server yet.
    """

    __tablename__ = "hall_crm_tasks"
    __table_args__ = (UniqueConstraint("venue_id", "uid", name="uq_hall_crm_tasks_venue_uid"),)

    venue_id: Mapped[int] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uid: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    event_uid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
