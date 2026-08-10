# bazmly

Bron qilish platformasi — a booking platform for Uzbek restaurants and wedding
halls. Two halves, one repository.

```
backend/    FastAPI + async SQLAlchemy + PostGIS. 109 endpoints under /api/v1.
frontend/   Next.js 16 App Router, Tailwind v4. Uzbek UI, mobile-first.
```

Each half has its own README, its own toolchain and its own commands. Nothing in
`frontend/` imports from `backend/`; they meet over HTTP and nowhere else.

## Quick start — Docker

```sh
cp .env.template .env              # host ports; see "Configuration" below
cp backend/.env.template backend/.env
docker compose up -d
curl localhost:8000/api/health     # {"status": "ok", ...}
```

`backend/docker/entrypoint.sh` runs `alembic upgrade head` before uvicorn starts,
so an empty volume comes up as a fully migrated database with every reference
list already seeded — languages, staff roles, permissions, the service
catalogue, amenities, and all 14 regions and 209 districts of Uzbekistan.

## Quick start — local

Two terminals. Backend commands run from `backend/`, frontend commands from
`frontend/`.

```sh
# backend
cd backend
uv sync
docker compose -f ../docker-compose.yml up -d postgres redis
uv run alembic upgrade head
uv run python -m scripts.seed_demo      # optional: demo venues, menus, bookings
uv run uvicorn app.main:app --reload
```

```sh
# frontend
cd frontend
npm install
cp .env.example .env.local              # points at the backend's published port
npm run dev                             # http://localhost:3000
```

## How the two connect

The browser calls the API directly. There is no proxy and no shared code — the
contract is the OpenAPI schema at `/api/openapi.json`, from which the frontend
generates its types (`npm run gen:api` in `frontend/`).

That makes two settings load-bearing, and they have to agree:

| Setting | Where | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | where the browser sends requests |
| `APP_CONFIG__CORS__ORIGINS` | `backend/.env` | which origin the API answers |

If the frontend loads but every request fails in the browser while `curl` works,
these two have drifted apart. `curl` is not subject to CORS.

## Configuration

Three env files, because three different things read them and only one of them
resolves paths the way you would expect.

| File | Read by | Holds |
| --- | --- | --- |
| `.env` | docker compose, for `${VAR}` substitution | host ports only |
| `backend/.env` | pydantic-settings, and compose as `env_file` | `APP_CONFIG__*` |
| `frontend/.env.local` | Next.js at build and dev time | `NEXT_PUBLIC_*` |

Compose substitutes `${POSTGRES_PORT}` and friends from the `.env` sitting next
to `docker-compose.yml` and from nowhere else — not from `env_file`, not from
`backend/.env`. Without the root `.env`, the ports silently fall back to the
defaults written into `docker-compose.yml`.

Container ports never change; the published host ports do. Override them when
something else on the machine already holds one:

```sh
# .env
POSTGRES_PORT=5442
BACKEND_PORT=8010
FRONTEND_PORT=3000
```

Each `*.template` / `*.example` file is committed and holds safe defaults. The
real files are git-ignored.

## Checks

```sh
cd backend  && uv run ruff check . && uv run mypy app && uv run pytest
cd frontend && npm run lint && npm run typecheck && npm run build
```
