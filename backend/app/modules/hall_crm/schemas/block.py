from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.core.schemas import ReadSchema

# A hall or session key, or `all`.
KeyOrAll = Annotated[str, Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")]


class HallBlockWrite(BaseModel):
    """Yopiq joy: kun, zal va seans (`all` — hammasi) hamda sababi."""

    block_date: date
    hall_key: KeyOrAll
    session_key: KeyOrAll
    reason: str = Field(default="", max_length=500)


class HallBlockRead(ReadSchema):
    """Qo'lda yopilgan joy."""

    uid: str
    block_date: date
    hall_key: str
    session_key: str
    reason: str
    created_at: datetime
