# Development Setup

Step-by-step guide to run this project locally. For API usage and architecture, see [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Matches `Dockerfile` |
| npm | 9+ | Comes with Node |
| MongoDB | 7+ | Standalone is fine; replica set enables booking transactions |
| Redis | 7+ | Required for search cache |
| Docker | optional | Runs the app container only |

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file (all variables are required)
cp .env.example .env

# 3. Start MongoDB and Redis on your machine
#    Ensure URIs in .env match your local setup

# 4. Start the API
npm run start:dev
```

Verify:

- Health: http://localhost:3000/api/health
- Swagger: http://localhost:3000/docs
- Search: http://localhost:3000/api/flights/search?from=DAC&to=DXB&date=2026-07-01

## Environment (`.env`)

Copy from `.env.example`. **Every variable is required** — the app throws at startup if any are missing.

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default example: `3000`) |
| `APP_PREFIX` | Route prefix (`api`) |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_MAX_POOL_SIZE` | MongoDB connection pool size |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | MongoDB server selection timeout |
| `MONGODB_SOCKET_TIMEOUT_MS` | MongoDB socket timeout |
| `REDIS_URL` | Redis connection string |
| `SEARCH_CACHE_TTL_SECONDS` | Search + flight catalog cache TTL |
| `CACHE_KEY_VERSION` | Cache key prefix — bump to invalidate all cached data |
| `DEFAULT_PAGE_LIMIT` / `MAX_PAGE_LIMIT` | Pagination bounds |
| `BOOKING_REFERENCE_PREFIX` | Booking reference prefix (`BK`) |
| `FLIGHT_PROVIDERS` | JSON array of provider adapter config |

`host.docker.internal` in `.env.example` works for both local dev and Docker on Windows/macOS when Mongo/Redis run on the host.

**Provider URLs** must point at this API (`http://localhost:{PORT}/api/mock/provider-{a,b,c}`) so adapters can call the mock endpoints.

## Run with Docker (app only)

Docker does **not** start MongoDB or Redis — only the NestJS app.

```bash
cp .env.example .env
npm run start:docker   # or: npm run docker:up
npm run docker:logs
npm run docker:down    # stop
```

## Tests

```bash
npm test           # 50 unit tests
npm run test:e2e   # 17 integration tests (in-memory MongoDB)
npm run build      # compile check
```

## Project layout

```
src/
├── config/             # Strict env configuration
├── core/               # Envelope interceptor, exception filter, pagination
├── flights/            # Search pipeline, adapters, dedup, strategies
├── bookings/           # Booking API, validation, DTOs, entities
├── schemas/            # Mongoose schemas (booking + nested snapshots)
└── mock-providers/     # Mock provider A/B/C HTTP endpoints
```

## Implemented endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health |
| GET | `/api/flights/search` | Aggregate, dedup, sort, filter, cache |
| POST | `/api/bookings` | Create booking (search cache validation) |
| GET | `/api/bookings` | List bookings (optional `flightId` filter) |
| GET | `/api/bookings/:reference` | Get booking by reference |
| GET | `/api/mock/provider-{a,b,c}` | Mock provider data |

## Common issues

**App won't start — missing env variable**  
Ensure `.env` exists and every key from `.env.example` is set.

**`ECONNREFUSED` MongoDB / Redis**  
Start both services and check `MONGODB_URI` / `REDIS_URL`.

**Booking returns 404**  
Search first so the flight is in cache. Re-search if cache TTL expired.

**Booking returns 400 on snapshot**  
Copy `flightId` and `flightSnapshot` from the same search result, or omit `flightSnapshot` entirely.

**Port 3000 already in use**  
Stop Docker or another `start:dev` instance, or change `PORT` in `.env` and update `FLIGHT_PROVIDERS` URLs.

**E2E tests slow or fail on MongoMemoryServer**  
First run downloads MongoDB binaries. Re-run if download timed out.

## Related docs

- [README.md](./README.md) — quick start, curl examples, extensibility
- [ARCHITECTURE.md](./ARCHITECTURE.md) — design decisions and patterns
