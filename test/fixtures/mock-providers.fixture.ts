/** Raw mock provider payloads — mirrors `MockProvidersService` assignment data. */

export const PROVIDER_A_FLIGHTS = [
  {
    carrier: 'AA',
    from: 'DAC',
    to: 'DXB',
    depart: '2026-07-01T08:00:00',
    arrive: '2026-07-01T12:30:00',
    stops: 0,
    fare_usd: 320.0,
    flight_no: 'AA101',
  },
  {
    carrier: 'AA',
    from: 'DAC',
    to: 'DXB',
    depart: '2026-07-01T22:10:00',
    arrive: '2026-07-02T02:40:00',
    stops: 0,
    fare_usd: 280.0,
    flight_no: 'AA205',
  },
  {
    carrier: 'BS',
    from: 'DAC',
    to: 'DXB',
    depart: '2026-07-01T09:15:00',
    arrive: '2026-07-01T15:00:00',
    stops: 1,
    fare_usd: 310.0,
    flight_no: 'BS220',
  },
  {
    carrier: 'EK',
    from: 'DAC',
    to: 'DXB',
    depart: '2026-07-01T03:45:00',
    arrive: '2026-07-01T06:50:00',
    stops: 0,
    fare_usd: 410.0,
    flight_no: 'EK585',
  },
] as const;

export const PROVIDER_B_FLIGHTS = [
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
  {
    airline_code: 'BS',
    origin: 'DAC',
    destination: 'DXB',
    departure_time: '2026-07-01 14:30',
    arrival_time: '2026-07-01 19:20',
    segments: 1,
    price: { amount: 265, currency: 'USD' },
    number: 'BS118',
  },
  {
    airline_code: 'EK',
    origin: 'DAC',
    destination: 'DXB',
    departure_time: '2026-07-01 03:45',
    arrival_time: '2026-07-01 06:50',
    segments: 0,
    price: { amount: 399, currency: 'USD' },
    number: 'EK585',
  },
] as const;

export const PROVIDER_C_FLIGHTS = [
  {
    iata: 'AA',
    route: { src: 'DAC', dst: 'DXB' },
    times: { dep: 1782892800, arr: 1782909000 },
    layovers: 0,
    total_price: 335,
    currency: 'USD',
    code: 'AA101',
  },
  {
    iata: 'CJ',
    route: { src: 'DAC', dst: 'DXB' },
    times: { dep: 1782885600, arr: 1782903600 },
    layovers: 2,
    total_price: 270,
    currency: 'USD',
    code: 'CJ300',
  },
  {
    iata: 'EK',
    route: { src: 'DAC', dst: 'DXB' },
    times: { dep: 1782877500, arr: 1782888600 },
    layovers: 0,
    total_price: 405,
    currency: 'USD',
    code: 'EK585',
  },
] as const;

/** Expected after normalize + dedup for DAC→DXB 2026-07-01 */
export const EXPECTED_DEDUPED_COUNT = 6;

export const EXPECTED_FLIGHT_NOS = [
  'AA101',
  'AA205',
  'BS118',
  'BS220',
  'CJ300',
  'EK585',
] as const;

export const EXPECTED_CHEAPEST_PRICES: Record<string, number> = {
  AA101: 320,
  AA205: 280,
  BS118: 265,
  BS220: 295,
  CJ300: 270,
  EK585: 399,
};

export const EXPECTED_DEDUP_PROVIDERS: Record<string, string[]> = {
  AA101: ['ProviderA', 'ProviderC'],
  AA205: ['ProviderA'],
  BS118: ['ProviderB'],
  BS220: ['ProviderA', 'ProviderB'],
  CJ300: ['ProviderC'],
  EK585: ['ProviderA', 'ProviderB', 'ProviderC'],
};

export const SEARCH_ROUTE = {
  from: 'DAC',
  to: 'DXB',
  date: '2026-07-01',
} as const;
