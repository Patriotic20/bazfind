from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.mixins import IdIntPk, TimestampMixin


class HallReminderDismissal(IdIntPk, TimestampMixin, Base):
    """A reminder the owner swiped away.

    Reminders themselves are computed by the client from the event cards; only
    the dismissal is state. The key carries what made the reminder fire (a stage,
    an amount, a count), so a changed situation produces a new key and the
    reminder comes back on its own.
    """

    __tablename__ = "hall_crm_reminder_dismissals"
    __table_args__ = (
        UniqueConstraint("venue_id", "key", name="uq_hall_crm_reminder_dismissals_venue_key"),
    )

    venue_id: Mapped[int] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(200), nullable=False)
