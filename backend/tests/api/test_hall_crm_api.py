"""The to'yxona CRM: settings, pipeline cards, closed slots, tasks — and the two
places it meets the customer app, imported bookings and free days."""

from datetime import date, time, timedelta
from decimal import Decimal
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.mixins import utcnow_naive
from app.modules.bookings.models import Booking
from app.modules.venue_groups.models import VenueGroup
from app.modules.venues.enums import VenueTypeSlug
from app.modules.venues.models import Venue, VenueGuestTier
from tests.api.conftest import auth_header
from tests.repositories import factories

BASE = "/api/v1/venue/hall"


async def hall(session: AsyncSession) -> tuple[VenueGroup, Venue, dict[str, str]]:
    """A to'yxona with one price band and an owner who can run its CRM."""
    group = await factories.make_venue_group(session, venue_type=VenueTypeSlug.TOYXONA)
    venue = await factories.make_venue(session, group=group, venue_type=VenueTypeSlug.TOYXONA)
    await factories.make_working_hours(session, venue, time(9, 0), time(23, 59))
    venue.capacity_min = 100
    venue.capacity_max = 500
    session.add(VenueGuestTier(venue_id=venue.id, min_guests=100, max_guests=500, base_price=1000))
    owner = await factories.make_staff(session, venue, group, role_slug="owner")
    await factories.grant(session, "owner", "bookings.cancel", "branch.manage")
    await session.flush()
    return group, venue, auth_header(owner.user_id)


def settings_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "halls": [
            {"key": "katta", "name": "Katta zal", "capacity": 500},
            {"key": "kichik", "name": "Kichik zal", "capacity": 200},
        ],
        "sessions": [
            {"key": "kunduzgi", "label": "Kunduzi", "starts_at": "11:00", "ends_at": "16:00"},
            {"key": "kechki", "label": "Kechqurun", "starts_at": "18:00", "ends_at": "23:00"},
        ],
        "tiers": [
            {"key": "t150", "label": "100 - 150 kishi", "max_guests": 150, "price": "10000000"},
            {"key": "t300", "label": "150 - 300 kishi", "max_guests": 300, "price": "20000000"},
            {"key": "t500", "label": "300+ kishi", "max_guests": 1200, "price": "25000000"},
        ],
        "catering": [
            {
                "key": "standart",
                "name": "Standart",
                "price_per_guest": "95000",
                "items": "Osh, non, choy",
                "norms": [{"name": "Guruch", "unit": "kg", "qty": "0.12"}],
            }
        ],
        "service_fee": "1250000",
        "deposit_percent": 20,
        "weekend_percent": 10,
        "due_days_before": 7,
        "table_size": 10,
        "tables_per_waiter": 4,
    }
    body.update(overrides)
    return body


def event_body(day: date, **overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "stage": "new",
        "source": "phone",
        "contact_name": "Jasur Toshmatov",
        "contact_phone": "+998901234567",
        "event_type": "wedding",
        "event_date": day.isoformat(),
        "session_key": "kechki",
        "hall_key": "katta",
        "guests": 300,
        "catering_key": "standart",
        "extras": [{"name": "Gul bezak", "price": "2500000"}],
        "discount": "0",
        "due_date": (day - timedelta(days=7)).isoformat(),
        "notes": [{"at": "2026-11-17T10:00:00Z", "text": "Qo'ng'iroq qildi"}],
    }
    body.update(overrides)
    return body


def in_days(n: int) -> date:
    return utcnow_naive().date() + timedelta(days=n)


# --- settings --------------------------------------------------------------


async def test_unsaved_settings_are_derived_from_the_branch(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)

    response = await api_client.get(f"{BASE}/settings?venue_id={venue.id}", headers=headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["is_default"] is True
    assert body["halls"][0]["capacity"] == 500
    assert [tier["max_guests"] for tier in body["tiers"]] == [500]
    assert len(body["sessions"]) == 2


async def test_saved_price_bands_become_the_customer_apps_bands(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)

    response = await api_client.put(
        f"{BASE}/settings?venue_id={venue.id}", json=settings_body(), headers=headers
    )

    assert response.status_code == 200, response.text
    assert response.json()["is_default"] is False
    bands = (
        await session.execute(
            select(VenueGuestTier)
            .where(VenueGuestTier.venue_id == venue.id)
            .order_by(VenueGuestTier.sort_order)
        )
    ).scalars()
    assert [(b.min_guests, b.max_guests, b.base_price) for b in bands] == [
        (100, 150, Decimal("10000000")),
        (151, 300, Decimal("20000000")),
        (301, None, Decimal("25000000")),
    ]
    await session.refresh(venue)
    assert venue.deposit_percent == Decimal(20)

    again = await api_client.get(f"{BASE}/settings?venue_id={venue.id}", headers=headers)
    assert again.json()["catering"][0]["norms"][0]["name"] == "Guruch"


async def test_duplicate_hall_keys_are_refused(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    halls = [{"key": "a", "name": "A", "capacity": 10}, {"key": "a", "name": "B", "capacity": 20}]

    response = await api_client.put(
        f"{BASE}/settings?venue_id={venue.id}", json=settings_body(halls=halls), headers=headers
    )

    assert response.status_code == 422


# --- events ----------------------------------------------------------------


async def test_a_card_is_created_updated_listed_and_deleted_by_its_client_id(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    day = in_days(30)
    url = f"{BASE}/events/h1700000000000?venue_id={venue.id}"

    created = await api_client.put(url, json=event_body(day), headers=headers)
    assert created.status_code == 200, created.text
    assert created.json()["uid"] == "h1700000000000"

    updated = await api_client.put(
        url, json=event_body(day, stage="contacted", guests=250), headers=headers
    )
    assert updated.status_code == 200, updated.text

    listed = await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=headers)
    assert [(e["uid"], e["stage"], e["guests"]) for e in listed.json()] == [
        ("h1700000000000", "contacted", 250)
    ]
    assert listed.json()[0]["extras"][0]["price"] == "2500000.00"

    assert (await api_client.delete(url, headers=headers)).status_code == 204
    assert (await api_client.delete(url, headers=headers)).status_code == 204
    listed = await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=headers)
    assert listed.json() == []


async def test_a_second_deposit_on_the_same_hall_and_session_is_refused(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    day = in_days(30)
    first = await api_client.put(
        f"{BASE}/events/a?venue_id={venue.id}",
        json=event_body(day, stage="deposit"),
        headers=headers,
    )
    assert first.status_code == 200, first.text

    second = await api_client.put(
        f"{BASE}/events/b?venue_id={venue.id}",
        json=event_body(day, stage="deposit"),
        headers=headers,
    )
    other_hall = await api_client.put(
        f"{BASE}/events/c?venue_id={venue.id}",
        json=event_body(day, stage="deposit", hall_key="kichik"),
        headers=headers,
    )

    assert second.status_code == 409
    assert other_hall.status_code == 200, other_hall.text


# --- online bookings -------------------------------------------------------


async def book_online(api_client: AsyncClient, session: AsyncSession, venue: Venue) -> int:
    guest = await factories.make_user(session)
    response = await api_client.post(
        "/api/v1/bookings/hall",
        json={
            "venue_id": venue.id,
            "booking_date": in_days(20).isoformat(),
            "start_time": "18:00:00",
            "end_time": "23:00:00",
            "guests_count": 300,
            "contact_name": "Onlayn Mijoz",
            "contact_phone": "+998901112233",
            "services": [],
        },
        headers=auth_header(guest.id),
    )
    assert response.status_code == 201, response.text
    booking_id: int = response.json()["booking"]["id"]
    return booking_id


async def test_an_online_booking_becomes_a_card_and_its_deposit_confirms_it(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    booking_id = await book_online(api_client, session, venue)

    listed = await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=headers)
    cards = listed.json()
    assert [(c["uid"], c["stage"], c["source"], c["session_key"]) for c in cards] == [
        (f"bazmly-{booking_id}", "new", "bazmly", "kechki")
    ]

    card = cards[0]
    moved = await api_client.put(
        f"{BASE}/events/{card['uid']}?venue_id={venue.id}",
        json={**{k: card[k] for k in event_body(in_days(20))}, "stage": "deposit"},
        headers=headers,
    )
    assert moved.status_code == 200, moved.text
    booking = (await session.execute(select(Booking).where(Booking.id == booking_id))).scalar_one()
    await session.refresh(booking)
    assert booking.status == "confirmed"

    # Listing again must not import the same booking twice.
    again = await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=headers)
    assert len(again.json()) == 1


async def test_deleting_an_online_card_cancels_the_booking_and_it_stays_gone(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    booking_id = await book_online(api_client, session, venue)
    await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=headers)

    deleted = await api_client.delete(
        f"{BASE}/events/bazmly-{booking_id}?venue_id={venue.id}", headers=headers
    )

    assert deleted.status_code == 204
    booking = (await session.execute(select(Booking).where(Booking.id == booking_id))).scalar_one()
    await session.refresh(booking)
    assert booking.status == "cancelled"
    listed = await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=headers)
    assert listed.json() == []


# --- free days -------------------------------------------------------------


async def test_a_fully_closed_day_is_taken_for_the_customer_app(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    day = in_days(25)
    closed = await api_client.put(
        f"{BASE}/blocks/b1?venue_id={venue.id}",
        json={
            "block_date": day.isoformat(),
            "hall_key": "all",
            "session_key": "all",
            "reason": "Ta'mir",
        },
        headers=headers,
    )
    assert closed.status_code == 200, closed.text

    availability = await api_client.get(
        f"/api/v1/venues/{venue.id}/availability",
        params={"date_from": day.isoformat(), "date_to": day.isoformat()},
    )
    assert availability.json()["dates"] == [day.isoformat()]

    guest = await factories.make_user(session)
    refused = await api_client.post(
        "/api/v1/bookings/hall",
        json={
            "venue_id": venue.id,
            "booking_date": day.isoformat(),
            "start_time": "18:00:00",
            "end_time": "23:00:00",
            "guests_count": 300,
            "contact_name": "Mijoz",
            "contact_phone": "+998901112233",
            "services": [],
        },
        headers=auth_header(guest.id),
    )
    assert refused.status_code == 409

    assert (
        await api_client.delete(f"{BASE}/blocks/b1?venue_id={venue.id}", headers=headers)
    ).status_code == 204
    reopened = await api_client.get(
        f"/api/v1/venues/{venue.id}/availability",
        params={"date_from": day.isoformat(), "date_to": day.isoformat()},
    )
    assert reopened.json()["dates"] == []


async def test_one_deposited_hall_of_two_leaves_the_day_open(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    await api_client.put(
        f"{BASE}/settings?venue_id={venue.id}", json=settings_body(), headers=headers
    )
    day = in_days(26)
    await api_client.put(
        f"{BASE}/events/x?venue_id={venue.id}",
        json=event_body(day, stage="deposit"),
        headers=headers,
    )

    availability = await api_client.get(
        f"/api/v1/venues/{venue.id}/availability",
        params={"date_from": day.isoformat(), "date_to": day.isoformat()},
    )

    assert availability.json()["dates"] == []


# --- tasks and reminders ---------------------------------------------------


async def test_tasks_and_dismissed_reminders_round_trip(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    _group, venue, headers = await hall(session)
    task = {"text": "Zalni ko'rsatish", "due_date": in_days(2).isoformat(), "done": False}

    put = await api_client.put(f"{BASE}/tasks/t1?venue_id={venue.id}", json=task, headers=headers)
    done = await api_client.put(
        f"{BASE}/tasks/t1?venue_id={venue.id}", json={**task, "done": True}, headers=headers
    )
    listed = await api_client.get(f"{BASE}/tasks?venue_id={venue.id}", headers=headers)

    assert put.status_code == 200, put.text
    assert done.json()["done"] is True
    assert [(t["uid"], t["done"]) for t in listed.json()] == [("t1", True)]

    for _ in range(2):
        dismissed = await api_client.post(
            f"{BASE}/reminders/dismissed?venue_id={venue.id}",
            json={"key": "javob:h1"},
            headers=headers,
        )
    assert dismissed.json() == ["javob:h1"]


# --- access ----------------------------------------------------------------


async def test_a_waiter_and_another_chains_owner_are_refused(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    group, venue, _headers = await hall(session)
    waiter = await factories.make_staff(session, venue, group, role_slug="waiter")
    _other_group, _other_venue, outsider = await hall(session)

    as_waiter = await api_client.get(
        f"{BASE}/events?venue_id={venue.id}", headers=auth_header(waiter.user_id)
    )
    as_outsider = await api_client.get(f"{BASE}/events?venue_id={venue.id}", headers=outsider)

    assert as_waiter.status_code == 403
    assert as_outsider.status_code == 403
