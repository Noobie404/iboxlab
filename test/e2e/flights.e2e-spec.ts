import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { bootstrapE2eApp } from '@test/utils/bootstrap-e2e-app';
import {
  EXPECTED_CHEAPEST_PRICES,
  EXPECTED_DEDUPED_COUNT,
  EXPECTED_FLIGHT_NOS,
  SEARCH_ROUTE,
} from '@test/fixtures/mock-providers.fixture';

type FlightRow = {
  flightNo: string;
  flightId: string;
  carrier: string;
  price: { amount: number; currency: string };
  stops: number;
  availableFromProviders: string[];
};

describe('Flights & Bookings (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: { launchTimeout: 60000 },
    });
    app = await bootstrapE2eApp(mongoServer.getUri());
  }, 180000);

  afterAll(async () => {
    await app?.close();
    await mongoServer?.stop();
  });

  function searchFlights(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .get('/api/flights/search')
      .query({ ...SEARCH_ROUTE, ...query });
  }

  describe('GET /api/flights/search', () => {
    it('returns enveloped deduplicated flights with provider completeness meta', async () => {
      const res = await searchFlights({ passengers: 2 }).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.timestamp).toBeDefined();

      const { meta, flights } = res.body.data;

      expect(meta.total).toBe(EXPECTED_DEDUPED_COUNT);
      expect(meta.query.passengers).toBe(2);
      expect(meta.query.from).toBe('DAC');
      expect(meta.query.to).toBe('DXB');
      expect(meta.appliedSort).toEqual({ by: 'price', order: 'asc' });
      expect(meta.providers).toHaveLength(3);
      expect(
        meta.providers.every(
          (p: { status: string; flightsReturned: number }) =>
            p.status === 'ok' && p.flightsReturned > 0,
        ),
      ).toBe(true);
      expect(meta.isFromCache).toBe(false);
      expect(typeof meta.fetchDurationMs).toBe('number');

      const flightNos = flights.map((f: FlightRow) => f.flightNo).sort();
      expect(flightNos).toEqual([...EXPECTED_FLIGHT_NOS].sort());

      for (const flightNo of EXPECTED_FLIGHT_NOS) {
        const row = flights.find((f: FlightRow) => f.flightNo === flightNo);
        expect(row.price.amount).toBe(EXPECTED_CHEAPEST_PRICES[flightNo]);
        expect(row.flightId).toMatch(
          new RegExp(`^${flightNo}-\\d{4}-\\d{2}-\\d{2}T`),
        );
      }

      const ek585 = flights.find((f: FlightRow) => f.flightNo === 'EK585');
      expect(ek585.price.amount).toBe(399);
      expect(ek585.availableFromProviders.sort()).toEqual(
        ['ProviderA', 'ProviderB', 'ProviderC'].sort(),
      );
    });

    it('sorts by price ascending with BS118 cheapest', async () => {
      const res = await searchFlights({
        sortBy: 'price',
        sortOrder: 'asc',
        passengers: 1,
      }).expect(200);

      const flights = res.body.data.flights as FlightRow[];
      expect(flights[0].flightNo).toBe('BS118');
      expect(flights[0].price.amount).toBe(265);
      expect(flights.at(-1)?.flightNo).toBe('EK585');
    });

    it('filters by maxStops=0', async () => {
      const res = await searchFlights({ maxStops: 0 }).expect(200);

      const flights = res.body.data.flights as FlightRow[];
      expect(flights.every((f) => f.stops === 0)).toBe(true);
      expect(flights.some((f) => f.flightNo === 'BS220')).toBe(false);
      expect(flights.some((f) => f.flightNo === 'BS118')).toBe(false);
    });

    it('filters by maxPrice=300', async () => {
      const res = await searchFlights({ maxPrice: 300 }).expect(200);

      const flights = res.body.data.flights as FlightRow[];
      expect(flights.every((f) => f.price.amount <= 300)).toBe(true);
      expect(flights.map((f) => f.flightNo).sort()).toEqual(
        ['AA205', 'BS118', 'BS220', 'CJ300'].sort(),
      );
    });

    it('filters by carrier=EK', async () => {
      const res = await searchFlights({ carrier: 'EK' }).expect(200);

      const flights = res.body.data.flights as FlightRow[];
      expect(flights).toHaveLength(1);
      expect(flights[0].flightNo).toBe('EK585');
      expect(flights[0].carrier).toBe('EK');
    });

    it('returns 400 for invalid airport code', async () => {
      const res = await searchFlights({ from: 'INVALID' }).expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
    });

    it('sets X-Cache and X-Fetch-Duration-Ms headers on repeat search', async () => {
      const query = {
        ...SEARCH_ROUTE,
        sortBy: 'duration',
        passengers: 1,
      };

      const first = await request(app.getHttpServer())
        .get('/api/flights/search')
        .query(query)
        .expect(200);

      expect(first.headers['x-cache']).toBe('MISS');
      expect(first.headers['x-fetch-duration-ms']).toBeDefined();

      const second = await request(app.getHttpServer())
        .get('/api/flights/search')
        .query(query)
        .expect(200);

      expect(second.headers['x-cache']).toBe('HIT');
      expect(second.body.data.meta.isFromCache).toBe(true);
      expect(second.body.data.meta.fetchDurationMs).toBe(0);
    });
  });

  describe('Bookings', () => {
    let flightId: string;
    let flightSnapshot: Record<string, unknown>;

    beforeAll(async () => {
      const search = await searchFlights().expect(200);
      const ek = search.body.data.flights.find(
        (f: FlightRow) => f.flightNo === 'EK585',
      );
      flightId = ek.flightId;
      flightSnapshot = {
        flightNo: ek.flightNo,
        carrier: ek.carrier,
        origin: ek.origin,
        destination: ek.destination,
        departAt: ek.departAt,
        arriveAt: ek.arriveAt,
        durationMinutes: ek.durationMinutes,
        stops: ek.stops,
        price: ek.price,
      };
    });

    it('POST /api/bookings returns 400 when flightSnapshot is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          flightId,
          passengers: [
            {
              firstName: 'NoSnap',
              lastName: 'User',
              passport: 'F44444444',
              dateOfBirth: '1991-01-01',
            },
          ],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('POST /api/bookings creates a booking with flightSnapshot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          flightId,
          flightSnapshot,
          passengers: [
            {
              firstName: 'John',
              lastName: 'Doe',
              passport: 'A12345678',
              dateOfBirth: '1990-05-15',
            },
          ],
          idempotencyKey: 'e2e-booking-key',
        })
        .expect(201);

      expect(res.body.data.reference).toMatch(/^BK-[A-Z0-9]{16}$/);
      expect(res.body.data.totalPrice).toBe(399);
      expect(res.body.data.status).toBe('confirmed');
    });

    it('GET /api/bookings/:reference returns the booking', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          flightId,
          flightSnapshot,
          passengers: [
            {
              firstName: 'Jane',
              lastName: 'Smith',
              passport: 'B98765432',
              dateOfBirth: '1992-03-20',
            },
          ],
          idempotencyKey: 'e2e-get-key',
        })
        .expect(201);

      const reference = created.body.data.reference;

      const res = await request(app.getHttpServer())
        .get(`/api/bookings/${reference}`)
        .expect(200);

      expect(res.body.data.reference).toBe(reference);
      expect(res.body.data.flightId).toBe(flightId);
    });

    it('GET /api/bookings lists with pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(res.body.data.meta).toMatchObject({
        page: 1,
        limit: 5,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('GET /api/bookings filters by flightId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings')
        .query({ page: 1, limit: 50, flightId })
        .expect(200);

      expect(
        res.body.data.data.every(
          (b: { flightId: string }) => b.flightId === flightId,
        ),
      ).toBe(true);
    });

    it('GET /api/bookings/:reference returns 404 for unknown reference', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bookings/BK-FFFFFFFFFFFFFFFF')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('POST /api/bookings returns 409 for duplicate passenger+flight', async () => {
      const payload = {
        flightId,
        flightSnapshot,
        passengers: [
          {
            firstName: 'Dup',
            lastName: 'User',
            passport: 'C11111111',
            dateOfBirth: '1988-01-01',
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/bookings')
        .send(payload)
        .expect(201);
      const dup = await request(app.getHttpServer())
        .post('/api/bookings')
        .send(payload)
        .expect(409);

      expect(dup.body.success).toBe(false);
    });

    it('POST /api/bookings returns 404 when flight was not searched', async () => {
      await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          flightId: 'ZZ999-2026-08-01T10:00:00.000Z',
          flightSnapshot: {
            flightNo: 'ZZ999',
            carrier: 'ZZ',
            origin: 'DAC',
            destination: 'DXB',
            departAt: '2026-08-01T10:00:00.000Z',
            arriveAt: '2026-08-01T14:00:00.000Z',
            durationMinutes: 240,
            stops: 0,
            price: { amount: 999, currency: 'USD' },
          },
          passengers: [
            {
              firstName: 'Ghost',
              lastName: 'User',
              passport: 'Z99999999',
              dateOfBirth: '1990-01-01',
            },
          ],
        })
        .expect(404);
    });

    it('POST /api/bookings returns 400 when snapshot price is tampered', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          flightId,
          flightSnapshot: {
            ...flightSnapshot,
            price: { amount: 1, currency: 'USD' },
          },
          passengers: [
            {
              firstName: 'Tamper',
              lastName: 'User',
              passport: 'Y88888888',
              dateOfBirth: '1990-01-01',
            },
          ],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('POST /api/bookings returns same reference for idempotency key', async () => {
      const payload = {
        flightId,
        flightSnapshot,
        passengers: [
          {
            firstName: 'Idem',
            lastName: 'User',
            passport: 'D22222222',
            dateOfBirth: '1985-06-15',
          },
        ],
        idempotencyKey: 'e2e-idem-key',
      };

      const first = await request(app.getHttpServer())
        .post('/api/bookings')
        .send(payload)
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/api/bookings')
        .send(payload)
        .expect(201);

      expect(second.body.data.reference).toBe(first.body.data.reference);
    });
  });
});
