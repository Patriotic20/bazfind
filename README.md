# bazmly

Restoran va to'yxonalarni bron qilish ilovasi — both halves in one place:

| | |
| --- | --- |
| `backend/` | FastAPI, PostGIS, Alembic |
| `frontend/` | Next.js 16 Telegram Mini App |

Railway deploys build from the split mirrors —
[bazmly-backend](https://github.com/Patriotic20/bazmly-backend) and
[bazmly-frontend](https://github.com/Patriotic20/bazmly-frontend) — but local
work happens here.

## Run locally with Docker

```sh
cp .env.template .env   # host ports; edit if another stack holds them
docker compose up --build
```

That brings up four services: PostGIS, Redis, the backend (migrations run
before uvicorn binds) and the frontend. With the defaults from `.env.template`:

- frontend — http://localhost:3000
- API — http://localhost:8000/api
- Swagger — http://localhost:8000/api/docs, split per audience at
  `/api/docs/admin` (boshqaruv paneli) and `/api/docs/app` (mijoz ilovasi)

Plain `postgres` images will not work: the first migration creates the
`postgis`, `btree_gist` and `pg_trgm` extensions, which is why the compose file
pins a PostGIS build.

Application settings (tokens, auth mode, CORS) live in `backend/.env` — copy
`backend/.env.template` to start. The compose file overrides the database and
Redis URLs with the in-network service names, so the same `backend/.env` works
for a bare `uvicorn` run against the published ports.
