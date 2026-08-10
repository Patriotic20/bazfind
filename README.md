# baz

A FastAPI backend: async SQLAlchemy 2.x, Alembic, PostgreSQL, managed with uv.

Read [CONVENTIONS.md](CONVENTIONS.md) before writing code — the module layout and
the one-model-per-file / no-base-repository rules are not optional.

## Stack

| Concern       | Choice                                        |
| ------------- | --------------------------------------------- |
| Runtime       | Python 3.14                                   |
| Web           | FastAPI + uvicorn                             |
| ORM           | SQLAlchemy 2.x async, `Mapped`/`mapped_column` |
| Migrations    | Alembic (async `env.py`)                      |
| Settings      | Pydantic v2 + pydantic-settings               |
| Database      | PostgreSQL 17 + PostGIS + asyncpg             |
| Cache / locks | Redis                                         |
| Social login  | Google Sign-In, `id_token` verified against Google's JWKS |
| Packaging     | uv                                            |
| Lint / format | ruff                                          |
| Types         | mypy `--strict`                               |
| Tests         | pytest + pytest-asyncio                       |

## Quick start — Docker

```sh
cp .env.template .env      # then edit if you like
docker compose up -d
curl localhost:8000/api/health     # {"status": "ok"}
```

The backend's entrypoint runs `alembic upgrade head` before uvicorn starts, so
`docker compose up` on an empty volume produces a fully migrated database.

If 5432 or 8000 are already taken on your machine, override the published host
ports (container ports never change):

```sh
POSTGRES_PORT=5442 BACKEND_PORT=8010 docker compose up -d
```

## Quick start — local

```sh
uv sync
docker compose up -d postgres          # or point .env at your own Postgres
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Checks

```sh
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run pytest
```

## Configuration

Settings are nested and namespaced. Every variable is `APP_CONFIG__` prefixed and
nested with a double underscore:

```
APP_CONFIG__DATABASE__URL=postgresql+asyncpg://postgres:postgres@localhost:5432/baz
APP_CONFIG__RUN__PORT=8000
APP_CONFIG__LOGGING__LEVEL=INFO
APP_CONFIG__ENV=local
```

Signing in needs no third party. A customer sends a phone number, then a name and
an optional password, and the account exists — there is no verification code, no
SMS gateway and no email. `POST /api/v1/auth/social/google` is the one external
dependency, and it is optional: leave `APP_CONFIG__GOOGLE__CLIENT_IDS` empty and
that endpoint refuses while everything else works.

`APP_CONFIG__SECURITY__AUTH_MODE` is coupled to `ENV`. Setting it to
`disabled` — together with `APP_CONFIG__SECURITY__DEV_USER_ID`, a real `users.id`
— turns off authentication *and* authorization at every layer, so the API can be
driven from a browser before a login flow exists. It is refused outside
`ENV=local`: the process will not start. The default is `enforced`.

[`.env.template`](.env.template) is committed and holds safe defaults; `.env` is
git-ignored and overrides it. Both are loaded, in that order.

## Layout

```
app/
├── main.py                 # app wiring, middleware, lifespan
├── core/                   # config, routing, errors, pagination, logging, db
│   ├── database/           # Base, mixins, DatabaseHelper
│   └── middleware/         # request id, access logging
├── modules/                # feature modules — auth, organization_structure
└── alembic/                # migration environment
```

`course`, `quiz` and `psychology` come later and must use the identical module
skeleton — see [CONVENTIONS.md](CONVENTIONS.md).

## Migrations

```sh
uv run alembic revision --autogenerate -m "add users"
uv run alembic upgrade head
uv run alembic downgrade -1
```

New models must be imported in [`app/core/models_registry.py`](app/core/models_registry.py)
or autogenerate will not see them.

The database URL comes from `settings.database.url`, never from `alembic.ini`.

## API

| Route                  | Purpose                                |
| ---------------------- | -------------------------------------- |
| `GET /api/health`      | Liveness. Does not touch the database. |
| `/api/v1/<module>/...` | Versioned module endpoints.            |
| `/api/v2/<module>/...` | Reserved; no endpoints yet.            |
| `/api/docs`            | Swagger UI.                            |
| `/api/openapi.json`    | OpenAPI schema.                        |

The docs and schema sit under the API prefix so a reverse proxy can route one path
to this service.

Errors always come back in one envelope:

```json
{"code": "not_found", "message": "...", "details": {}, "request_id": "..."}
```

`message` is Uzbek and is for display only. Branch on `code` — it is English and
stable.

Every response carries an `X-Request-ID` header, echoed from the request when
supplied and generated otherwise.
