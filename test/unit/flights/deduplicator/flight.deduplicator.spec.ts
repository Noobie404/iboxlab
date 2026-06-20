import { FlightDeduplicator } from '@src/flights/deduplicator/flight.deduplicator';
import { UnifiedFlightDto } from '@src/flights/dto/unified-flight.dto';

const makeFlight = (
  overrides: Partial<UnifiedFlightDto> & {
    flightId: string;
    price: { amount: number; currency: string };
  },
): UnifiedFlightDto => ({
  flightNo: 'EK585',
  carrier: 'EK',
  origin: 'DAC',
  destination: 'DXB',
  departAt: '2026-07-01T03:45:00.000Z',
  arriveAt: '2026-07-01T06:50:00.000Z',
  durationMinutes: 185,
  stops: 0,
  availableFromProviders: ['ProviderA'],
  cheapestProvider: 'ProviderA',
  ...overrides,
});

describe('FlightDeduplicator', () => {
  it('merges EK585 from three providers keeping cheapest price', () => {
    const flightId = 'EK585-2026-07-01T03:45:00.000Z';
    const result = FlightDeduplicator.deduplicate([
      makeFlight({
        flightId,
        price: { amount: 410, currency: 'USD' },
        availableFromProviders: ['ProviderA'],
        cheapestProvider: 'ProviderA',
      }),
      makeFlight({
        flightId,
        price: { amount: 399, currency: 'USD' },
        availableFromProviders: ['ProviderB'],
        cheapestProvider: 'ProviderB',
      }),
      makeFlight({
        flightId,
        price: { amount: 405, currency: 'USD' },
        availableFromProviders: ['ProviderC'],
        cheapestProvider: 'ProviderC',
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].price.amount).toBe(399);
    expect(result[0].cheapestProvider).toBe('ProviderB');
    expect(result[0].availableFromProviders).toEqual([
      'ProviderA',
      'ProviderB',
      'ProviderC',
    ]);
  });

  it('merges BS220 from Provider A and B keeping cheapest price', () => {
    const flightId = 'BS220-2026-07-01T09:15:00.000Z';
    const result = FlightDeduplicator.deduplicate([
      makeFlight({
        flightId,
        flightNo: 'BS220',
        price: { amount: 310, currency: 'USD' },
        availableFromProviders: ['ProviderA'],
        cheapestProvider: 'ProviderA',
        stops: 1,
      }),
      makeFlight({
        flightId,
        flightNo: 'BS220',
        price: { amount: 295, currency: 'USD' },
        availableFromProviders: ['ProviderB'],
        cheapestProvider: 'ProviderB',
        stops: 1,
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].price.amount).toBe(295);
    expect(result[0].cheapestProvider).toBe('ProviderB');
    expect(result[0].availableFromProviders).toEqual(['ProviderA', 'ProviderB']);
  });

  it('merges AA101 from Provider A and C keeping cheapest price', () => {
    const flightId = 'AA101-2026-07-01T08:00:00.000Z';
    const result = FlightDeduplicator.deduplicate([
      makeFlight({
        flightId,
        flightNo: 'AA101',
        carrier: 'AA',
        price: { amount: 320, currency: 'USD' },
        availableFromProviders: ['ProviderA'],
        cheapestProvider: 'ProviderA',
      }),
      makeFlight({
        flightId,
        flightNo: 'AA101',
        carrier: 'AA',
        price: { amount: 335, currency: 'USD' },
        availableFromProviders: ['ProviderC'],
        cheapestProvider: 'ProviderC',
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].price.amount).toBe(320);
    expect(result[0].cheapestProvider).toBe('ProviderA');
  });

  it('preserves unique flights', () => {
    const result = FlightDeduplicator.deduplicate([
      makeFlight({
        flightId: 'AA205-2026-07-01T22:10:00.000Z',
        flightNo: 'AA205',
        price: { amount: 280, currency: 'USD' },
      }),
      makeFlight({
        flightId: 'BS118-2026-07-01T14:30:00.000Z',
        flightNo: 'BS118',
        price: { amount: 265, currency: 'USD' },
      }),
    ]);

    expect(result).toHaveLength(2);
  });
});
