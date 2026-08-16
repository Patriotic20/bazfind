# Running as a Telegram Mini App

The app is built to work in two places at once: inside Telegram, where the user
is already identified, and in an ordinary browser, where they sign in with a
phone number and a password. Neither path is a special case of the other, and
breaking the browser path to serve Telegram would take the staff console down
with it.

## What happens inside Telegram

Telegram opens the app with a signed string called `initData`, describing the
current user. The frontend forwards it verbatim to `POST /api/v1/auth/telegram`;
the backend verifies the signature with the bot token and returns the same
`TokenPair` every other sign-in returns. First arrival creates the account.

The signature is the entire trust boundary. Without the bot token there is no
way to distinguish Telegram's payload from a hand-typed one, which is why an
unconfigured token switches the route off rather than letting it through.

## Setting up the bot

Nothing below can be done from code — it all happens in a chat with
[@BotFather](https://t.me/BotFather).

1. **Create the bot.** Send `/newbot`, give it a display name and a username
   ending in `bot`. BotFather replies with a token like
   `7123456789:AAH...`. Treat it as a password: it can both verify sign-ins and
   post as the bot.

2. **Put the token in `backend/.env`:**

   ```
   APP_CONFIG__TELEGRAM__BOT_TOKEN=7123456789:AAH...
   ```

   Restart the backend. `backend/.env` is git-ignored; the token must never be
   committed.

3. **Give the bot a Mini App URL.** Send `/newapp` (or `/myapps` for an existing
   one), pick the bot, and supply the **https** URL where the frontend is
   served. Telegram refuses `http://` and refuses `localhost` — see below.

4. **Optional: put it on the menu button.** `/mybots` → your bot → *Bot
   Settings* → *Menu Button* → the same URL. That is the button beside the
   message field.

## Testing before deployment

Telegram will not open an `http://localhost` URL, so a public HTTPS address is
required even for a first look. A tunnel is the usual answer:

```sh
cloudflared tunnel --url http://localhost:3000
```

It prints a `https://<random>.trycloudflare.com` address. Two things must then
line up, or every request from the page fails while `curl` keeps working:

- give that address to BotFather as the Mini App URL;
- add it to `APP_CONFIG__CORS__ORIGINS` in `backend/.env`, as JSON:
  `["http://localhost:3000", "https://<random>.trycloudflare.com"]`.

The frontend also needs `NEXT_PUBLIC_API_URL` pointing at a backend the phone
can reach — a tunnel address too, not `localhost:8010`. It is inlined at build
time, so changing it means rebuilding the frontend image, not restarting it.

## What the app does with Telegram

| Behaviour | Where |
| --- | --- |
| Signs in automatically, no login screen | `src/components/telegram-provider.tsx` |
| Follows Telegram's light/dark scheme | `src/components/theme-provider.tsx` |
| Calls `ready()` and `expand()` on open | `src/lib/telegram/webapp.ts` |
| Verifies the signature, creates the account | `backend/app/modules/auth/telegram.py` |

Outside Telegram every one of these is inert: `isInsideTelegram()` is false, the
provider renders its children untouched, and the theme falls back to the saved
preference.

## Accounts created from Telegram

Such a user has **no phone number**. `users.ck_users_phone_or_email` was widened
to accept a Telegram id as a third form of identity — see migration
`5ce814a7d7a3`. A booking asks for a contact number in its own payload, so this
does not block one, but any flow that assumes `user.phone` is present will need
to ask for it.

Staff still sign in with an issued login and password. Telegram identifies
customers; it says nothing about who works at a venue.
