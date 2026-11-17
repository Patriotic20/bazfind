"""Staff routes for the to'yxona CRM — Kalendar, Bronlar, Eslatmalar, Sozlamalar.

Every write is a `PUT` by client id or an idempotent `DELETE`: the panel shows a
change before the server has answered, and a retried request must land once.
"""

from collections.abc import Sequence
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.core.dependencies import SessionDep, require_permission
from app.modules.auth.schemas import UserRead
from app.modules.hall_crm.schemas import (
    HallBlockRead,
    HallBlockWrite,
    HallEventRead,
    HallEventWrite,
    HallReminderDismiss,
    HallSettingsRead,
    HallSettingsWrite,
    HallTaskRead,
    HallTaskWrite,
)
from app.modules.hall_crm.services import (
    HallBlockService,
    HallEventService,
    HallReminderService,
    HallSettingsService,
    HallTaskService,
)

router = APIRouter(prefix="/v1/venue/hall", tags=["venue:hall"])

# Day-to-day CRM work is the managers' (owner, admin, manager); changing prices
# is branch management.
CRM = "bookings.cancel"
PRICES = "branch.manage"

VenueId = Annotated[int, Query(ge=1)]
UidPath = Annotated[str, Path(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")]


# --- settings --------------------------------------------------------------


@router.get(
    "/settings",
    response_model=HallSettingsRead,
    operation_id="venue_hall_settings_get",
    summary="To'yxona sozlamalari",
    description=(
        "Zallar, seanslar, narxlar, dasturxon paketlari va to'lov qoidalari. "
        "Hali saqlanmagan bo'lsa, filial ma'lumotidan standart qiymatlar qaytadi."
    ),
)
async def get_settings(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    venue_id: VenueId,
) -> HallSettingsRead:
    return await HallSettingsService(session).get(venue_id)


@router.put(
    "/settings",
    response_model=HallSettingsRead,
    operation_id="venue_hall_settings_replace",
    summary="To'yxona sozlamalarini saqlash",
    description=(
        "Butun hujjat qayta yoziladi. Narxlar mijoz ilovasidagi zal narxiga, "
        "depozit foizi filial sozlamasiga ham ko'chiriladi."
    ),
)
async def replace_settings(
    payload: HallSettingsWrite,
    user: Annotated[UserRead, require_permission(PRICES)],
    session: SessionDep,
    venue_id: VenueId,
) -> HallSettingsRead:
    return await HallSettingsService(session).replace(venue_id, payload)


# --- events ----------------------------------------------------------------


@router.get(
    "/events",
    response_model=list[HallEventRead],
    operation_id="venue_hall_events_list",
    summary="To'yxona bronlari",
    description=(
        "CRM kartalari. Bazmly orqali kelgan onlayn bronlar avtomatik qo'shiladi, "
        "ularning holati o'zgarsa karta bosqichi ham yangilanadi."
    ),
)
async def list_events(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    venue_id: VenueId,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> Sequence[HallEventRead]:
    return await HallEventService(session).list(venue_id, date_from, date_to)


@router.put(
    "/events/{uid}",
    response_model=HallEventRead,
    operation_id="venue_hall_events_put",
    summary="Bronni saqlash",
    description=(
        "Yaratadi yoki butunlay yangilaydi. Depozit bosqichidagi ikkinchi bron "
        "o'sha zal va seansga qo'yilmaydi. Onlayn bron kartasi depozitga o'tsa "
        "bron tasdiqlanadi, bekor qilinsa bron ham bekor bo'ladi."
    ),
)
async def put_event(
    payload: HallEventWrite,
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    uid: UidPath,
    venue_id: VenueId,
) -> HallEventRead:
    return await HallEventService(session).put(user.id, venue_id, uid, payload)


@router.delete(
    "/events/{uid}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    operation_id="venue_hall_events_delete",
    summary="Bronni o'chirish",
    description="Onlayn bron kartasi yashiriladi va bron bekor qilinadi.",
)
async def delete_event(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    uid: UidPath,
    venue_id: VenueId,
) -> None:
    await HallEventService(session).delete(user.id, venue_id, uid)


# --- blocks ----------------------------------------------------------------


@router.get(
    "/blocks",
    response_model=list[HallBlockRead],
    operation_id="venue_hall_blocks_list",
    summary="Yopiq joylar",
    description="Qo'lda yopilgan kun, zal va seanslar.",
)
async def list_blocks(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    venue_id: VenueId,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> Sequence[HallBlockRead]:
    return await HallBlockService(session).list(venue_id, date_from, date_to)


@router.put(
    "/blocks/{uid}",
    response_model=HallBlockRead,
    operation_id="venue_hall_blocks_put",
    summary="Joyni yopish",
    description="Barcha zal va seanslar yopilgan kun mijoz ilovasida band ko'rinadi.",
)
async def put_block(
    payload: HallBlockWrite,
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    uid: UidPath,
    venue_id: VenueId,
) -> HallBlockRead:
    return await HallBlockService(session).put(venue_id, uid, payload)


@router.delete(
    "/blocks/{uid}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    operation_id="venue_hall_blocks_delete",
    summary="Joyni qayta ochish",
    description="Yopiq joyni olib tashlaydi.",
)
async def delete_block(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    uid: UidPath,
    venue_id: VenueId,
) -> None:
    await HallBlockService(session).delete(venue_id, uid)


# --- tasks -----------------------------------------------------------------


@router.get(
    "/tasks",
    response_model=list[HallTaskRead],
    operation_id="venue_hall_tasks_list",
    summary="Vazifalar",
    description="Egasining o'zi yozgan vazifalari.",
)
async def list_tasks(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    venue_id: VenueId,
) -> Sequence[HallTaskRead]:
    return await HallTaskService(session).list(venue_id)


@router.put(
    "/tasks/{uid}",
    response_model=HallTaskRead,
    operation_id="venue_hall_tasks_put",
    summary="Vazifani saqlash",
    description="Yaratadi yoki yangilaydi (masalan, bajarildi deb belgilash).",
)
async def put_task(
    payload: HallTaskWrite,
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    uid: UidPath,
    venue_id: VenueId,
) -> HallTaskRead:
    return await HallTaskService(session).put(venue_id, uid, payload)


@router.delete(
    "/tasks/{uid}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    operation_id="venue_hall_tasks_delete",
    summary="Vazifani o'chirish",
    description="Vazifani olib tashlaydi.",
)
async def delete_task(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    uid: UidPath,
    venue_id: VenueId,
) -> None:
    await HallTaskService(session).delete(venue_id, uid)


# --- reminders -------------------------------------------------------------


@router.get(
    "/reminders/dismissed",
    response_model=list[str],
    operation_id="venue_hall_reminders_dismissed",
    summary="Yashirilgan eslatmalar",
    description="Eslatmalarning o'zi bronlardan hisoblanadi; bu yerda faqat yashirilganlari.",
)
async def list_dismissed(
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    venue_id: VenueId,
) -> Sequence[str]:
    return await HallReminderService(session).list(venue_id)


@router.post(
    "/reminders/dismissed",
    response_model=list[str],
    operation_id="venue_hall_reminders_dismiss",
    summary="Eslatmani yashirish",
    description="Vaziyat o'zgarsa (summa, bosqich), eslatma yangi kalit bilan qaytadi.",
)
async def dismiss_reminder(
    payload: HallReminderDismiss,
    user: Annotated[UserRead, require_permission(CRM)],
    session: SessionDep,
    venue_id: VenueId,
) -> Sequence[str]:
    return await HallReminderService(session).dismiss(venue_id, payload.key)
