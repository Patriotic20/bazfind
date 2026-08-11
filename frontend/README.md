# bazmly — frontend

Next.js 16 App Router, Tailwind v4, Uzbek UI, mobile-first. One half of the
bazmly repository — the other is [`../backend`](../backend), a FastAPI service
this app consumes over HTTP and shares no code with.

Read [AGENTS.md](AGENTS.md) before writing code: this is Next 16, and the guides
that ship in `node_modules/next/dist/docs/` are the authority over anything
remembered from an older version.

## Quick start

```sh
npm install
cp .env.example .env.local        # then point it at your backend
npm run dev                       # http://localhost:3000
```

The backend has to be running, or every screen falls back to its error state.
See [../README.md](../README.md) for bringing up the whole stack.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build (`output: "standalone"`) |
| `npm run lint` | eslint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run gen:api` | regenerate `src/lib/api/schema.d.ts` from a **running** backend |

## Talking to the API

The browser calls the backend directly. There is no proxy and no rewrite, so two
values have to agree:

- `NEXT_PUBLIC_API_URL` here, and
- `APP_CONFIG__CORS__ORIGINS` in `../backend/.env`.

If the page loads but every request fails while `curl` works, those two have
drifted. `curl` is not subject to CORS.

`NEXT_PUBLIC_*` is inlined at **build** time, not read at runtime. A container
built against the wrong API URL cannot be fixed by restarting it with the right
one — it has to be rebuilt.

### `src/lib/api/`

```
schema.d.ts          generated from /api/openapi.json — do not edit
types.ts             ApiError, the code union, Page<T>, named domain types
client.ts            apiFetch — the only place a request leaves the app
auth-tokens.ts       session storage and single-flight refresh
config.ts            base URL, query-string building
money.ts             Decimal-as-string helpers
endpoints/*.ts       one file per backend module, plus its query keys
```

`schema.d.ts` is generated and committed, so a build never needs a live backend.
Regenerate it whenever the API changes and commit the result.

Four things about the API are **not** expressed in its schema and are handled by
hand — before changing anything in `src/lib/api/`, know why they are there:

1. **The error envelope is not in the schema.** Every failure returns
   `{code, message, details, request_id}`, including 422, and no 4xx/5xx is
   declared. `ApiError` in `types.ts` is written by hand for that reason. Branch
   on `code`; `message` is Uzbek display text with no contract.
2. **Refresh is single-flight.** The backend rotates refresh tokens and treats
   reuse of a rotated one as theft, revoking the user's whole token family — so
   two independent refreshes log the user out instead of renewing them.
   A failed refresh is **403, not 401**; retrying it loops.
3. **Some routes are secured in the schema but optional in fact.** Venue search
   and venue detail work signed-out. `auth: "optional"` sends a token when there
   is one and never withholds the request.
4. **Money and coordinates arrive as strings.** `Decimal` serialises to a string
   on purpose — a hall costs tens of millions of so'm and JSON numbers are
   doubles. Use `money.ts`; never `toFixed` a raw value.

## Still on mock data

Most screens are still the original static prototype. `/payment/*` and
`/tickets` have no backend at all — payments and promotions were dropped from
the schema — so they stay on fixtures until that is decided.
