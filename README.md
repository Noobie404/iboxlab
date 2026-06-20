# Flight Search Aggregator

Backend service for the iBox Lab take-home exercise. Aggregates flight data from three mock providers, deduplicates results, supports sort/filter, and persists bookings.

**Stack:** NestJS 11 · MongoDB (Mongoose) · Redis (search cache) · Swagger

## Quick start

**Prerequisites:** MongoDB and Redis running on your machine. The API does not start without a complete `.env` (see below).

### Option A — Docker (app only)

```bash
cp .env.example .env
npm run start:docker    # builds & starts the API container
npm run docker:logs     # optional — follow logs
```

Stop: `npm run docker:down`

Docker runs **only the NestJS app**. MongoDB and Redis must already be running on the host (`host.docker.internal` in `.env`).

### Option B — Local development

```bash
cp .env.example .env
npm install
npm run start:dev
```

- Health: http://localhost:3000/api/health
- Swagger: http://localhost:3000/docs

## API examples

All successful responses are wrapped: `{ "success": true, "data": { ... }, "timestamp": "..." }`.

### Search flights

```bash
curl "http://localhost:3000/api/flights/search?from=DAC&to=DXB&date=2026-07-01&passengers=2"
```

With filters and sort:

```bash
curl "http://localhost:3000/api/flights/search?from=DAC&to=DXB&date=2026-07-01&maxStops=0&sortBy=price&sortOrder=asc"
curl "http://localhost:3000/api/flights/search?from=DAC&to=DXB&date=2026-07-01&carrier=EK"
```

Response headers: `X-Cache: HIT|MISS`, `X-Fetch-Duration-Ms`.

For DAC→DXB on `2026-07-01`, expect **6 deduplicated flights** (e.g. EK585 at **$399** after merge).

### Create booking

**Search first** — bookings validate against the search cache. If results expire, search again.

Minimal payload (`flightSnapshot` optional — taken from cache):

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": "AA101-2026-07-01T08:00:00.000Z",
    "passengers": [{
      "firstName": "John",
      "lastName": "Doe",
      "passport": "A12345678",
      "dateOfBirth": "1990-05-15"
    }]
  }'
```

With explicit snapshot (must match the same search result — copy from `flights[]`, not Swagger placeholders):

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": "EK585-2026-07-01T03:45:00.000Z",
    "flightSnapshot": {
      "flightNo": "EK585",
      "carrier": "EK",
      "origin": "DAC",
      "destination": "DXB",
      "departAt": "2026-07-01T03:45:00.000Z",
      "arriveAt": "2026-07-01T06:50:00.000Z",
      "durationMinutes": 185,
      "stops": 0,
      "price": { "amount": 399, "currency": "USD" }
    },
    "passengers": [{
      "firstName": "John",
      "lastName": "Doe",
      "passport": "A12345678",
      "dateOfBirth": "1990-05-15"
    }]
  }'
```

### Get booking by reference

```bash
curl http://localhost:3000/api/bookings/BK-XXXXXXXXXXXXXXXX
```

### List bookings

```bash
# All bookings (paginated)
curl "http://localhost:3000/api/bookings?page=1&limit=10"

# Optional filter by flightId
curl "http://localhost:3000/api/bookings?page=1&limit=10&flightId=AA101-2026-07-01T08:00:00.000Z"
```

## Environment variables

All variables are **required**. The app throws at startup if any are missing.

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `APP_PREFIX` | `api` | Global route prefix |
| `MONGODB_URI` | `mongodb://host.docker.internal:27017/flight-aggregator` | MongoDB connection |
| `MONGODB_MAX_POOL_SIZE` | `10` | MongoDB connection pool size |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000` | MongoDB server selection timeout |
| `MONGODB_SOCKET_TIMEOUT_MS` | `45000` | MongoDB socket timeout |
| `REDIS_URL` | `redis://host.docker.internal:6379` | Redis for search cache |
| `SEARCH_CACHE_TTL_SECONDS` | `300` | Search + flight catalog TTL |
| `CACHE_KEY_VERSION` | `v1` | Cache key prefix — bump to invalidate all cached search/flight data |
| `DEFAULT_PAGE_LIMIT` | `10` | Default pagination limit |
| `MAX_PAGE_LIMIT` | `50` | Max pagination limit |
| `BOOKING_REFERENCE_PREFIX` | `BK` | Booking reference prefix |
| `FLIGHT_PROVIDERS` | JSON array | Provider adapter config |

### Provider config shape

```json
{
  "name": "ProviderA",
  "url": "http://localhost:3000/api/mock/provider-a",
  "enabled": true,
  "timeoutMs": 5000
}
```

`host.docker.internal` lets one `.env` work for local dev and Docker (Mongo/Redis on the host).

## Extensibility

### Add a new provider

1. Create `src/flights/providers/provider-d.adapter.ts`
2. Add a normalizer method in `flight.normalizer.ts`
3. Register the adapter in `flights.module.ts`
4. Add an entry to `FLIGHT_PROVIDERS` in `.env`

### Add a new sort option

1. Create `src/flights/strategies/sort/stops.sort-strategy.ts`
2. Register in `FlightsModule.onModuleInit`

### Add a new filter

1. Create `src/flights/strategies/filter/alliance.filter-strategy.ts`
2. Register in `FlightsModule.onModuleInit`
3. Add query param to `SearchQueryDto`

## Tests

All tests live under `test/`:

```
test/
├── unit/       # Unit tests (mirror src/ layout)
├── e2e/        # Integration tests (in-memory MongoDB)
├── fixtures/   # Shared mock provider data
└── utils/      # E2E bootstrap helpers
```

```bash
npm test          # 50 unit tests
npm run test:e2e  # 17 integration tests (in-memory MongoDB)
npm run build
```

## Project structure

```
src/
├── config/             # Typed configuration (strict env validation)
├── core/               # Response envelope, exception filter, pagination
├── flights/            # Search, adapters, dedup, sort/filter strategies
├── bookings/           # Booking API, validation, entities/DTOs
├── schemas/            # Mongoose schemas (booking + nested snapshots)
└── mock-providers/     # Mock provider A/B/C endpoints

test/
├── unit/               # Unit tests
├── e2e/                # End-to-end tests
├── fixtures/           # Test fixtures
└── utils/              # Test helpers
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions.
