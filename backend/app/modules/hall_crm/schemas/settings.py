from collections.abc import Sequence
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, Field, model_validator

from app.core.schemas import Money
from app.modules.hall_crm.schemas.common import ClockTime, Key


class HallSchema(BaseModel):
    """Zal: nomi va sig'imi."""

    key: Key
    name: str = Field(min_length=1, max_length=120)
    capacity: int = Field(ge=1, le=100_000)


class HallSessionSchema(BaseModel):
    """Seans: kunduzi yoki kechqurun, boshlanish va tugash vaqti."""

    key: Key
    label: str = Field(min_length=1, max_length=60)
    starts_at: ClockTime
    ends_at: ClockTime


class HallTierSchema(BaseModel):
    """Zal narxi mehmonlar soni bo'yicha: shu songacha — shu narx."""

    key: Key
    label: str = Field(min_length=1, max_length=120)
    max_guests: int = Field(ge=1, le=100_000)
    price: Money = Field(ge=0)


class HallNormSchema(BaseModel):
    """Oshxona me'yori: bitta mehmon uchun mahsulot miqdori."""

    name: str = Field(min_length=1, max_length=120)
    unit: str = Field(min_length=1, max_length=20)
    qty: Decimal = Field(ge=0, le=1_000_000)


class HallCateringSchema(BaseModel):
    """Dasturxon paketi: bir kishilik narx, tarkibi va oshxona me'yorlari."""

    key: Key
    name: str = Field(min_length=1, max_length=120)
    price_per_guest: Money = Field(ge=0)
    items: str = Field(default="", max_length=1000)
    norms: list[HallNormSchema] = Field(default_factory=list, max_length=100)


def _unique_keys(
    rows: Sequence[HallSchema | HallSessionSchema | HallTierSchema | HallCateringSchema], what: str
) -> None:
    keys = [row.key for row in rows]
    if len(keys) != len(set(keys)):
        raise ValueError(f"{what} kalitlari takrorlanmasligi kerak")


class HallSettingsWrite(BaseModel):
    """To'yxona sozlamalari: zallar, seanslar, narxlar, dasturxon paketlari va
    to'lov qoidalari. Har safar butunlay yuboriladi."""

    halls: list[HallSchema] = Field(min_length=1, max_length=20)
    sessions: list[HallSessionSchema] = Field(min_length=1, max_length=6)
    tiers: list[HallTierSchema] = Field(min_length=1, max_length=20)
    catering: list[HallCateringSchema] = Field(default_factory=list, max_length=20)
    service_fee: Money = Field(ge=0)
    deposit_percent: int = Field(ge=0, le=100)
    weekend_percent: int = Field(ge=0, le=100)
    due_days_before: int = Field(ge=0, le=365)
    table_size: int = Field(ge=1, le=50)
    tables_per_waiter: int = Field(ge=1, le=50)

    @model_validator(mode="after")
    def _keys_are_unique(self) -> Self:
        _unique_keys(self.halls, "Zal")
        _unique_keys(self.sessions, "Seans")
        _unique_keys(self.tiers, "Narx")
        _unique_keys(self.catering, "Paket")
        return self


class HallSettingsRead(HallSettingsWrite):
    """`is_default` — egasi hali saqlamagan, qiymatlar filial ma'lumotidan olingan."""

    venue_id: int
    is_default: bool
