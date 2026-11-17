from datetime import date, datetime

from pydantic import BaseModel, Field

from app.core.schemas import ReadSchema
from app.modules.hall_crm.schemas.common import Uid


class HallTaskWrite(BaseModel):
    """Vazifa: matni, bajarilish kuni va (ixtiyoriy) bog'liq bron."""

    text: str = Field(min_length=1, max_length=500)
    due_date: date
    event_uid: Uid | None = None
    done: bool = False


class HallTaskRead(ReadSchema):
    """Egasining o'zi yozgan vazifasi."""

    uid: str
    text: str
    due_date: date
    event_uid: str | None
    done: bool
    created_at: datetime
