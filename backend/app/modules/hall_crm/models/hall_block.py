from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base
from app.core.database.mixins import IdIntPk, TimestampMixin

ALL_KEY = "all"


class HallBlock(IdIntPk, TimestampMixin, Base):
    """A slot the owner closed by hand — one hall and session, or `all` of either.

    Separate from `venue_blocked_slots`, which closes a time window for tables: a
    to'yxona closes a named hall for a named session, and the reason is free text.
    """

    __tablename__ = "hall_crm_blocks"
    __table_args__ = (
        UniqueConstraint("venue_id", "uid", name="uq_hall_crm_blocks_venue_uid"),
        Index("ix_hall_crm_blocks_venue_id_block_date", "venue_id", "block_date"),
    )

    venue_id: Mapped[int] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    uid: Mapped[str] = mapped_column(String(64), nullable=False)
    block_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    hall_key: Mapped[str] = mapped_column(String(40), nullable=False)
    session_key: Mapped[str] = mapped_column(String(40), nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
