"""What a `/start` reply actually carries.

The webhook tests cover delivery; these cover the message itself. A person
meeting the bot for the first time sees the logo, the text under it and one
button — and if the picture cannot be sent, they must still see the text rather
than silence.
"""

import json

import httpx
import pytest

from app.modules.telegram import service as bot_service
from app.modules.telegram.service import BANNER, BotService

TOKEN = "test-token"
APP_URL = "https://app.example/uz"


@pytest.fixture(autouse=True)
def clean_banner_cache() -> None:
    """The `file_id` cache lives on the module, so one test must not leak into another."""
    bot_service._banner_ids.clear()


def recording_client(*responses: httpx.Response) -> tuple[httpx.AsyncClient, list[httpx.Request]]:
    seen: list[httpx.Request] = []
    queue = list(responses)

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return queue.pop(0) if queue else httpx.Response(200, json={"ok": True})

    return httpx.AsyncClient(transport=httpx.MockTransport(handler)), seen


def photo_ok(file_id: str = "cached-id") -> httpx.Response:
    return httpx.Response(200, json={"ok": True, "result": {"photo": [{"file_id": file_id}]}})


def bot() -> BotService:
    return BotService(app_url=APP_URL, bot_token=TOKEN)


def test_the_banner_ships_with_the_backend() -> None:
    """Sending it must not depend on the frontend being reachable."""
    assert BANNER.is_file()


async def test_the_reply_sends_the_logo_with_the_text_as_its_caption() -> None:
    client, seen = recording_client(photo_ok())

    async with client:
        sent = await bot()._send_banner(client, chat_id=42, caption="Salom")

    assert sent
    request = seen[0]
    assert request.url.path.endswith("/sendPhoto")
    body = request.content.decode("utf-8", "replace")
    assert "Salom" in body
    assert BANNER.name in body  # the bytes themselves, not a URL Telegram must fetch


async def test_the_button_opens_the_mini_app_not_a_browser() -> None:
    """A plain URL button lands in a browser, where there is no `initData`."""
    client, seen = recording_client(photo_ok())

    async with client:
        await bot()._send_banner(client, chat_id=42, caption="Salom")

    body = seen[0].content.decode("utf-8", "replace")
    assert '"web_app"' in body
    assert APP_URL in body


async def test_the_second_reply_reuses_the_stored_file_id() -> None:
    """Telegram stores the upload; re-sending the bytes every time is wasted work."""
    client, seen = recording_client(photo_ok("stored-id"), photo_ok("stored-id"))

    async with client:
        await bot()._send_banner(client, chat_id=42, caption="Salom")
        await bot()._send_banner(client, chat_id=43, caption="Salom")

    second = seen[1].content.decode("utf-8", "replace")
    assert "stored-id" in second
    assert BANNER.name not in second


async def test_a_refused_photo_drops_the_cached_id() -> None:
    """A stale id would otherwise fail on every reply from then on."""
    client, _ = recording_client(photo_ok("stored-id"), httpx.Response(400, json={"ok": False}))

    async with client:
        await bot()._send_banner(client, chat_id=42, caption="Salom")
        sent = await bot()._send_banner(client, chat_id=43, caption="Salom")

    assert not sent
    assert bot_service._banner_ids == {}


async def test_the_text_still_arrives_when_the_photo_is_refused(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The picture is decoration; the button is the point of the message."""
    client, seen = recording_client(httpx.Response(400, json={"ok": False}))
    # `_send` opens its own client — hand it the recording one instead of the network.
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: client)

    await bot()._send(chat_id=42, text="Salom")

    assert seen[0].url.path.endswith("/sendPhoto")
    fallback = json.loads(seen[1].content)
    assert fallback["text"] == "Salom"
    assert fallback["reply_markup"]["inline_keyboard"][0][0]["web_app"]["url"] == APP_URL
