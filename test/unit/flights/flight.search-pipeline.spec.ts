import { FlightNormalizer } from '@src/flights/normalizer/flight.normalizer';
import { FlightDeduplicator } from '@src/flights/deduplicator/flight.deduplicator';
import { PriceSortStrategy } from '@src/flights/strategies/sort/price.sort-strategy';
import { SortStrategyRegistry } from '@src/flights/strategies/sort/sort-strategy.registry';
import { FilterPipelineService } from '@src/flights/strategies/filter/filter-pipeline.service';
import { CarrierFilterStrategy } from '@src/flights/strategies/filter/carrier.filter-strategy';
import { MaxPriceFilterStrategy } from '@src/flights/strategies/filter/max-price.filter-strategy';
import { MaxStopsFilterStrategy } from '@src/flights/strategies/filter/max-stops.filter-strategy';
import { SearchQueryDto } from '@src/flights/dto/search-query.dto';
import {
  EXPECTED_CHEAPEST_PRICES,
  EXPECTED_DEDUP_PROVIDERS,
  EXPECTED_DEDUPED_COUNT,
  EXPECTED_FLIGHT_NOS,
  PROVIDER_A_FLIGHTS,
  PROVIDER_B_FLIGHTS,
  PROVIDER_C_FLIGHTS,
  SEARCH_ROUTE,
} from '@test/fixtures/mock-providers.fixture';

function normalizeAllProviders() {
  return [
    ...PROVIDER_A_FLIGHTS.map((raw) =>
      FlightNormalizer.fromProviderA(raw, 'ProviderA'),
    ),
    ...PROVIDER_B_FLIGHTS.map((raw) =>
      FlightNormalizer.fromProviderB(raw, 'ProviderB'),
    ),
    ...PROVIDER_C_FLIGHTS.map((raw) =>
      FlightNormalizer.fromProviderC(raw, 'ProviderC'),
    ),
  ];
}

function buildPipeline() {
  const sortRegistry = new SortStrategyRegistry();
  sortRegistry.register(new PriceSortStrategy());

  const filterPipeline = new FilterPipelineService();
  filterPipeline.register(new CarrierFilterStrategy());
  filterPipeline.register(new MaxPriceFilterStrategy());
  filterPipeline.register(new MaxStopsFilterStrategy());

  return { sortRegistry, filterPipeline };
}

describe('Flight search pipeline (functional)', () => {
  it('normalizes all providers to 10 raw flights', () => {
    expect(normalizeAllProviders()).toHaveLength(10);
  });

  it('deduplicates DAC→DXB to 6 flights with assignment proof prices', () => {
    const deduped = FlightDeduplicator.deduplicate(normalizeAllProviders());

    expect(deduped).toHaveLength(EXPECTED_DEDUPED_COUNT);

    const flightNos = deduped.map((f) => f.flightNo).sort();
    expect(flightNos).toEqual([...EXPECTED_FLIGHT_NOS].sort());

    for (const flightNo of EXPECTED_FLIGHT_NOS) {
      const flight = deduped.find((f) => f.flightNo === flightNo);
      expect(flight).toBeDefined();
      expect(flight!.price.amount).toBe(EXPECTED_CHEAPEST_PRICES[flightNo]);
      expect(flight!.availableFromProviders.sort()).toEqual(
        [...EXPECTED_DEDUP_PROVIDERS[flightNo]].sort(),
      );
    }
  });

  it('aligns AA101 and EK585 flightIds across providers', () => {
    const flights = normalizeAllProviders();
    const aa101 = flights.filter((f) => f.flightNo === 'AA101');
    const ek585 = flights.filter((f) => f.flightNo === 'EK585');

    expect(aa101).toHaveLength(2);
    expect(ek585).toHaveLength(3);
    expect(new Set(aa101.map((f) => f.flightId)).size).toBe(1);
    expect(new Set(ek585.map((f) => f.flightId)).size).toBe(1);
    expect(aa101[0].flightId).toBe('AA101-2026-07-01T08:00:00.000Z');
    expect(ek585[0].flightId).toBe('EK585-2026-07-01T03:45:00.000Z');
  });

  it('sorts by price ascending with BS118 cheapest', () => {
    const { sortRegistry } = buildPipeline();
    const deduped = FlightDeduplicator.deduplicate(normalizeAllProviders());
    const sorted = sortRegistry.sort(deduped, 'price', 'asc');

    expect(sorted[0].flightNo).toBe('BS118');
    expect(sorted[0].price.amount).toBe(265);
    expect(sorted.at(-1)?.flightNo).toBe('EK585');
  });

  it('filters by maxStops=0 excluding BS220 and BS118', () => {
    const { filterPipeline } = buildPipeline();
    const deduped = FlightDeduplicator.deduplicate(normalizeAllProviders());
    const query = {
      ...SEARCH_ROUTE,
      maxStops: 0,
    } as SearchQueryDto;

    const filtered = filterPipeline.apply(deduped, query);

    expect(filtered.every((f) => f.stops === 0)).toBe(true);
    expect(filtered.map((f) => f.flightNo).sort()).toEqual(
      ['AA101', 'AA205', 'EK585'].sort(),
    );
  });

  it('filters by maxPrice=300', () => {
    const { filterPipeline } = buildPipeline();
    const deduped = FlightDeduplicator.deduplicate(normalizeAllProviders());
    const query = {
      ...SEARCH_ROUTE,
      maxPrice: 300,
    } as SearchQueryDto;

    const filtered = filterPipeline.apply(deduped, query);

    expect(filtered.every((f) => f.price.amount <= 300)).toBe(true);
    expect(filtered.map((f) => f.flightNo).sort()).toEqual(
      ['AA205', 'BS118', 'BS220', 'CJ300'].sort(),
    );
  });
});
