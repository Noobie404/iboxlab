# Architecture

## Overview

NestJS 11 backend that aggregates flights from multiple providers into a unified search response and persists bookings in MongoDB. Search results and a per-flight catalog are cached in Redis.

```
Client
  │
  ├─ GET /api/flights/search ──► FlightsService
  │                                 ├─ Redis cache (search + flight catalog)
  │                                 ├─ ProviderRegistry
  │                                 │    ├─ ProviderAAdapter ──► /api/mock/provider-a
  │                                 │    ├─ ProviderBAdapter ──► /api/mock/provider-b
  │                                 │    └─ ProviderCAdapter ──► /api/mock/provider-c
  │                                 ├─ FlightDeduplicator
  │                                 ├─ FilterPipeline
  │                                 └─ SortStrategyRegistry
  │
  └─ POST/GET /api/bookings ─────► BookingsService
                                      ├─ FlightBookingValidator (search cache)
                                      └─ MongoDB (bookings collection)
```

## Provider registry

Each provider is a class implementing `IFlightProvider` with a `providerName` matching `FLIGHT_PROVIDERS[].name` in config.

`ProviderRegistry` filters enabled providers at startup. Adding Provider D requires:

- One adapter file
- One normalizer method
- One config entry
- One line in `flights.module.ts`

No changes to `FlightsService`.

## Adapter pattern (template method)

`BaseProviderAdapter` owns shared behavior:

- Per-provider `timeoutMs` from config
- HTTP error handling (returns `[]`, never throws)
- Response envelope unwrapping for internal mock calls

Subclasses only implement `extractFlights()`, `normalize()`, and `matchesQuery()`.

## Why `Promise.allSettled` (not `Promise.all`)

Providers run in parallel. If Provider B times out, Providers A and C still contribute results. `meta.providers[]` reports per-provider status so clients know the result set may be partial.

## Normalization

Each provider uses a different schema:

| Provider | Date format | Stops field |
|----------|-------------|-------------|
| A | ISO string (no timezone → treated as UTC) | `stops` |
| B | `"2026-07-01 09:15"` (non-ISO) | `segments` |
| C | Unix epoch seconds | `layovers` |

`FlightNormalizer` maps all three to `UnifiedFlightDto`. Provider A datetimes without a `Z` suffix are normalized to UTC so `flightId` stays consistent across machines and matches Providers B/C.

## Stable flight ID

```
flightId = {flightNo}-{departAt_ISO_UTC}
```

Example: `EK585-2026-07-01T03:45:00.000Z`

Same physical flight from different providers gets the same ID, enabling deduplication.

## Deduplication walkthrough (EK585)

EK585 appears in all three providers at different prices:

| Provider | Price |
|----------|-------|
| A | $410 |
| B | $399 |
| C | $405 |

After dedup:

- One EK585 row
- Price: **$399** (cheapest)
- `cheapestProvider`: ProviderB
- `availableFromProviders`: [ProviderA, ProviderB, ProviderC]

DAC→DXB on `2026-07-01` yields **6 unique flights** after dedup (10 raw rows across providers).

## Sort and filter (strategy pattern)

`FlightsService` has zero `switch`/`if` chains for sort or filter. Registries resolve strategies at runtime:

- Sort: `price`, `duration`, `departure`
- Filter: `carrier`, `maxPrice`, `maxStops`

New behavior = new strategy file + registration in `FlightsModule.onModuleInit`.

## Caching

**Search results** — versioned key (`CACHE_KEY_VERSION` env var, default `v1`):

```
{CACHE_KEY_VERSION}:flights:{from}:{to}:{date}:{passengers}:{sortBy}:{sortOrder}:{carrier}:{maxPrice}:{maxStops}
```

**Flight catalog** (for booking validation) — indexed on each search miss:

```
{CACHE_KEY_VERSION}:flight:{flightId}
```

Bumping `CACHE_KEY_VERSION` in `.env` invalidates all cached search and flight catalog entries without a code change.

Controller sets `X-Cache: HIT|MISS` and `X-Fetch-Duration-Ms` headers.

## Booking flow

1. Client searches → flights indexed in Redis by `flightId`
2. Client POSTs booking with `flightId` (+ optional `flightSnapshot`)
3. `FlightBookingValidator` loads flight from catalog cache
4. If not found → **404** (search first or cache expired)
5. If snapshot provided and fields differ → **400** with `mismatches[]`
6. Server stores authoritative snapshot and price from cache (not client tampering)

**Idempotency:** `idempotencyKey` on POST returns the same booking on retry.

**Duplicate guard:** Same lead passenger passport + same `flightId` + `CONFIRMED` → **409**.

**Transactions:** MongoDB transactions when a replica set is available; standalone MongoDB falls back to non-transactional create with the same business rules.

**Immutable snapshot:** `flightSnapshot` is frozen at booking time.

## Configuration

All environment variables are required — no silent defaults. Missing values fail fast at startup (`src/config/configuration.ts`).

## Persistence

Mongoose schemas live in `src/schemas/` (booking document with inline nested schemas for price, flight snapshot, and passengers). Domain entity classes remain in `src/bookings/entities/` for typing.

## Response envelope

Success:

```json
{ "success": true, "data": { ... }, "timestamp": "..." }
```

Errors:

```json
{ "success": false, "statusCode": 400, "message": "...", "path": "POST /api/bookings", "timestamp": "..." }
```

Paginated list endpoints return `data: { meta: { page, limit, total, totalPages }, data: [...] }` inside the envelope.

## Health

`GET /api/health` returns basic service status. Provider/dependency health is not yet exposed.

## What I would do next

1. **Circuit breaker** per provider (e.g. opossum) to stop calling failing providers
2. **Rate limiting** on search to protect provider cost
3. **Seat inventory** with atomic `$inc` in booking transaction
4. **Currency conversion** as a filter strategy
5. **Rich health endpoint** — provider registry + Redis/Mongo connectivity
6. **OpenTelemetry** distributed tracing across provider calls
7. **Opaque flight IDs** (hash/UUID v5) instead of datetime in the key
8. **API versioning** (`/api/v1/flights/search`)
