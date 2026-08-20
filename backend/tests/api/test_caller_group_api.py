"""`group_id` is derived from the token, not demanded from the client.

The chain a partner request concerns is a fact about the caller — their
`venue_staff` row — so the parameter is optional everywhere. When it *is* sent
it must name a chain the caller works in: before that check, any signed-in user
could read another chain's staff list by picking its id off a URL.
"""

from datetime import time

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.enums import UserRole
from tests.api.conftest import auth_header
from tests.repositories import factories


async def make_chain(session: AsyncSession):
    group = await factories.make_venue_group(session)
    venue = await factories.make_venue(session, group=group)
    await factories.make_working_hours(session, venue, time(8, 0), time(22, 0))
    return group, venue


async def test_staff_list_needs_no_group_id(api_client: AsyncClient, session: AsyncSession) -> None:
    group, venue = await make_chain(session)
    member = await factories.make_staff(session, venue, group)

    response = await api_client.get("/api/v1/venue/staff", headers=auth_header(member.user_id))

    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [member.id]


async def test_a_foreign_group_id_is_refused(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """The explicit parameter is an override, not a free pass into other chains."""
    group, venue = await make_chain(session)
    member = await factories.make_staff(session, venue, group)
    other_group, _ = await make_chain(session)

    response = await api_client.get(
        "/api/v1/venue/staff",
        params={"group_id": other_group.id},
        headers=auth_header(member.user_id),
    )

    assert response.status_code == 403


async def test_the_explicit_own_group_id_still_works(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """The deployed client sends it — the old shape must keep answering."""
    group, venue = await make_chain(session)
    member = await factories.make_staff(session, venue, group)

    response = await api_client.get(
        "/api/v1/venue/staff",
        params={"group_id": group.id},
        headers=auth_header(member.user_id),
    )

    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [member.id]


async def test_a_customer_has_no_chain_to_default_to(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    customer = await factories.make_user(session, role=UserRole.CUSTOMER)

    response = await api_client.get("/api/v1/venue/staff", headers=auth_header(customer.id))

    assert response.status_code == 403


async def test_counts_need_no_group_id(api_client: AsyncClient, session: AsyncSession) -> None:
    group, venue = await make_chain(session)
    member = await factories.make_staff(session, venue, group)

    response = await api_client.get(
        "/api/v1/venue/staff/counts", headers=auth_header(member.user_id)
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1


async def test_an_invitation_needs_no_query_params_at_all(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """The guard resolves the caller's chain too — group-scoped, since an
    invitation belongs to the chain and its branch is an optional assignment."""
    group, venue = await make_chain(session)
    manager = await factories.make_staff(session, venue, group, role_slug="manager")
    await factories.grant(session, "manager", "staff.manage")

    response = await api_client.post(
        "/api/v1/venue/staff/invitations",
        # `venue_id` in the body is the branch assignment a venue-scoped role
        # requires — a different thing from the query param this test omits.
        json={
            "full_name": "Yangi Ofitsiant",
            "phone": "+998901234567",
            "staff_role_id": 4,
            "venue_id": venue.id,
        },
        headers=auth_header(manager.user_id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["venue_group_id"] == group.id
    assert body["login"] and body["temporary_password"]


async def test_dashboard_needs_only_a_venue_id(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    group, venue = await make_chain(session)
    manager = await factories.make_staff(session, venue, group, role_slug="manager")
    await factories.grant(session, "manager", "reports.view")

    response = await api_client.get(
        "/api/v1/venue/analytics/dashboard",
        params={"venue_id": venue.id},
        headers=auth_header(manager.user_id),
    )

    assert response.status_code == 200
    assert response.json()["group_id"] == group.id


async def test_my_branches_answers_from_the_token(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    group, venue = await make_chain(session)

    response = await api_client.get(
        "/api/v1/venue/groups/me/branches", headers=auth_header(group.owner_id)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["group"]["id"] == group.id
    assert [branch["id"] for branch in body["branches"]] == [venue.id]
