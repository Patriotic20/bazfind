from typing import Any

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.mixins import IdIntPk, TimestampMixin


class HallSettings(IdIntPk, TimestampMixin, Base):
    """One row per to'yxona: halls, sessions, price bands, dasturxon packages and
    payment rules, as the owner edits them on one screen.

    Kept as one validated document rather than five tables: the screen saves it
    whole, nothing queries inside it, and `HallSettingsWrite` is the schema. The
    price bands are also mirrored onto `venue_guest_tiers`, which is what the
    customer app prices a booking from.
    """

    __tablename__ = "hall_crm_settings"

    venue_id: Mapped[int] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
