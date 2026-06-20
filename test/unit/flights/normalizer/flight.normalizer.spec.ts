import { FlightNormalizer } from '@src/flights/normalizer/flight.normalizer';

describe('FlightNormalizer', () => {
  describe('buildFlightId', () => {
    it('is deterministic for the same input', () => {
      const id = FlightNormalizer.buildFlightId(
        'EK585',
        '2026-07-01T03:45:00.000Z',
      );
      expect(id).toBe('EK585-2026-07-01T03:45:00.000Z');
    });

    it('treats datetimes without timezone as UTC', () => {
      const withZ = FlightNormalizer.buildFlightId(
        'AA101',
        '2026-07-01T08:00:00.000Z',
      );
      const withoutZ = FlightNormalizer.buildFlightId(
        'AA101',
        '2026-07-01T08:00:00',
      );
      expect(withoutZ).toBe(withZ);
    });

    it('uppercases flight number in id', () => {
      expect(
        FlightNormalizer.buildFlightId('aa101', '2026-07-01T08:00:00.000Z'),
      ).toBe('AA101-2026-07-01T08:00:00.000Z');
    });
  });

  describe('fromProviderA', () => {
    it('maps Provider A fields', () => {
      const result = FlightNormalizer.fromProviderA(
        {
          carrier: 'AA',
          from: 'DAC',
          to: 'DXB',
          depart: '2026-07-01T08:00:00',
          arrive: '2026-07-01T12:30:00',
          stops: 0,
          fare_usd: 320,
          flight_no: 'AA101',
        },
        'ProviderA',
      );

      expect(result.origin).toBe('DAC');
      expect(result.departAt).toBe('2026-07-01T08:00:00.000Z');
      expect(result.flightId).toBe('AA101-2026-07-01T08:00:00.000Z');
      expect(result.price.amount).toBe(320);
      expect(result.durationMinutes).toBe(270);
    });
  });

  describe('fromProviderB', () => {
    it('parses non-ISO date format', () => {
      const result = FlightNormalizer.fromProviderB(
        {
          airline_code: 'BS',
          origin: 'DAC',
          destination: 'DXB',
          departure_time: '2026-07-01 09:15',
          arrival_time: '2026-07-01 15:00',
          segments: 1,
          price: { amount: 295, currency: 'USD' },
          number: 'BS220',
        },
        'ProviderB',
      );

      expect(result.departAt).toBe('2026-07-01T09:15:00.000Z');
      expect(result.flightId).toBe('BS220-2026-07-01T09:15:00.000Z');
      expect(result.stops).toBe(1);
    });
  });

  describe('fromProviderC', () => {
    it('converts Unix epoch seconds', () => {
      const result = FlightNormalizer.fromProviderC(
        {
          iata: 'EK',
          route: { src: 'DAC', dst: 'DXB' },
          times: { dep: 1782877500, arr: 1782888600 },
          layovers: 0,
          total_price: 405,
          currency: 'USD',
          code: 'EK585',
        },
        'ProviderC',
      );

      expect(result.departAt).toBe('2026-07-01T03:45:00.000Z');
      expect(result.flightId).toBe('EK585-2026-07-01T03:45:00.000Z');
      expect(result.price.amount).toBe(405);
    });
  });

  describe('computeDurationMinutes', () => {
    it('handles overnight flights', () => {
      const minutes = FlightNormalizer.computeDurationMinutes(
        '2026-07-01T22:10:00.000Z',
        '2026-07-02T02:40:00.000Z',
      );
      expect(minutes).toBe(270);
    });
  });
});
