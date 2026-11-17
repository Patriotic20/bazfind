from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.schemas import Money, PhoneNumber, ReadSchema
from app.modules.hall_crm.enums import HallEventSource, HallEventStage, HallEventType
from app.modules.hall_crm.schemas.common import ClockTime, Key


class HallExtraSchema(BaseModel):
    """Qo'shimcha xizmat: nomi va narxi. Nomi yozilayotgan paytda bo'sh bo'lishi mumkin."""

    name: str = Field(max_length=200)
    price: Money = Field(ge=0)


class HallNoteSchema(BaseModel):
    """Izoh yoki tarixdagi yozuv."""

    at: datetime
    text: str = Field(min_length=1, max_length=2000)


class HallTimeItemSchema(BaseModel):
    """Tadbir kuni vaqt jadvalidagi qator. Yangi qator matnsiz qo'shiladi."""

    time: ClockTime
    text: str = Field(max_length=300)


class HallCheckSchema(BaseModel):
    """Tayyorgarlik ro'yxatidagi ish."""

    text: str = Field(min_length=1, max_length=300)
    done: bool = False


class HallEventWrite(BaseModel):
    """To'yxona broni (CRM kartasi). Har safar butunlay yuboriladi."""

    stage: HallEventStage
    source: HallEventSource
    contact_name: str = Field(min_length=1, max_length=200)
    contact_phone: PhoneNumber
    event_type: HallEventType
    event_date: date
    session_key: Key
    hall_key: Key
    guests: int = Field(ge=1, le=100_000)
    catering_key: Key | None = None
    extras: list[HallExtraSchema] = Field(default_factory=list, max_length=50)
    discount: Money = Field(default=Decimal(0), ge=0)
    due_date: date | None = None
    notes: list[HallNoteSchema] = Field(default_factory=list, max_length=500)
    staff: list[str] | None = Field(default=None, max_length=100)
    timeline: list[HallTimeItemSchema] | None = Field(default=None, max_length=100)
    checklist: list[HallCheckSchema] | None = Field(default=None, max_length=100)


class HallEventRead(ReadSchema):
    """`booking_id` — Bazmly orqali kelgan onlayn bron bo'lsa, o'sha bron."""

    uid: str
    booking_id: int | None
    stage: HallEventStage
    source: HallEventSource
    contact_name: str
    contact_phone: str
    event_type: HallEventType
    event_date: date
    session_key: str
    hall_key: str
    guests: int
    catering_key: str | None
    extras: list[HallExtraSchema]
    discount: Money
    due_date: date | None
    notes: list[HallNoteSchema]
    staff: list[str] | None
    timeline: list[HallTimeItemSchema] | None
    checklist: list[HallCheckSchema] | None
    created_at: datetime
    updated_at: datetime
