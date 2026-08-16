# bazmly — moved

This repository held both halves of the product while they were being wired
together. They now live on their own:

| | |
| --- | --- |
| Backend — FastAPI, PostGIS, Alembic | [Patriotic20/bazmly-backend](https://github.com/Patriotic20/bazmly-backend) |
| Frontend — Next.js 16 Telegram Mini App | [Patriotic20/bazmly-frontend](https://github.com/Patriotic20/bazmly-frontend) |

Both were split out with `git subtree split`, so the history of every file
followed it — `git log` and `git blame` still explain why each line is the way
it is.

Nothing here is maintained. Open pull requests against the repository that owns
the code.
