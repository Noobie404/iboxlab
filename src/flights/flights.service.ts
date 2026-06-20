import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistry } from './registry/provider.registry';
import { SortStrategyRegistry } from './strategies/sort/sort-strategy.registry';
import { FilterPipelineService } from './strategies/filter/filter-pipeline.service';
import { FlightDeduplicator } from './deduplicator/flight.deduplicator';
import { SearchQueryDto } from './dto/search-query.dto';
import { UnifiedFlightDto } from './dto/unified-flight.dto';
import {
  SearchResponseDto,
  ProviderStatusDto,
} from './dto/search-response.dto';
import { AppConfig } from '../config/configuration';

@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);
  private readonly cacheKeyVersion: string;
  private readonly searchTtlMs: number;

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly sortRegistry: SortStrategyRegistry,
    private readonly filterPipeline: FilterPipelineService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    this.cacheKeyVersion = this.configService.get('cache.keyVersion', {
      infer: true,
    })!;
    const ttlSeconds = this.configService.get('cache.searchTtlSeconds', {
      infer: true,
    })!;
    this.searchTtlMs = ttlSeconds * 1000;
  }

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const cacheKey = this.buildCacheKey(query);
    const cached = await this.cache.get<UnifiedFlightDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return this.buildResponse(cached, query, true, [], 0);
    }

    const activeProviders = this.providerRegistry.getActiveProviders();
    const startTime = Date.now();

    const settled = await Promise.allSettled(
      activeProviders.map((p) =>
        p.fetchFlights(query).then((flights) => ({
          providerName: p.providerName,
          flights,
        })),
      ),
    );

    const fetchDurationMs = Date.now() - startTime;
    const allFlights: UnifiedFlightDto[] = [];
    const providerStatuses: ProviderStatusDto[] = [];

    settled.forEach((result, i) => {
      const providerName = activeProviders[i]?.providerName ?? 'unknown';
      if (result.status === 'fulfilled') {
        allFlights.push(...result.value.flights);
        providerStatuses.push({
          provider: providerName,
          status: 'ok',
          flightsReturned: result.value.flights.length,
        });
      } else {
        providerStatuses.push({
          provider: providerName,
          status: 'error',
          flightsReturned: 0,
          errorMessage: result.reason?.message ?? 'Unknown error',
        });
      }
    });

    const deduplicated = FlightDeduplicator.deduplicate(allFlights);
    const filtered = this.filterPipeline.apply(deduplicated, query);
    const sorted = this.sortRegistry.sort(
      filtered,
      query.sortBy ?? 'price',
      query.sortOrder ?? 'asc',
    );

    const ttlMs = this.searchTtlMs;
    await this.cache.set(cacheKey, sorted, ttlMs);
    await this.indexFlights(sorted, ttlMs);

    this.logger.log(
      `Search: ${sorted.length} results in ${fetchDurationMs}ms | ` +
        providerStatuses
          .map((s) => `${s.provider}:${s.status}(${s.flightsReturned})`)
          .join(' | '),
    );

    return this.buildResponse(
      sorted,
      query,
      false,
      providerStatuses,
      fetchDurationMs,
    );
  }

  async getFlightById(flightId: string): Promise<UnifiedFlightDto | null> {
    return (
      (await this.cache.get<UnifiedFlightDto>(
        this.buildFlightCacheKey(flightId),
      )) ?? null
    );
  }

  private async indexFlights(
    flights: UnifiedFlightDto[],
    ttlMs: number,
  ): Promise<void> {
    await Promise.all(
      flights.map((flight) =>
        this.cache.set(
          this.buildFlightCacheKey(flight.flightId),
          flight,
          ttlMs,
        ),
      ),
    );
  }

  private buildFlightCacheKey(flightId: string): string {
    return `${this.cacheKeyVersion}:flight:${flightId}`;
  }

  private buildCacheKey(query: SearchQueryDto): string {
    return [
      this.cacheKeyVersion,
      'flights',
      query.from.toUpperCase(),
      query.to.toUpperCase(),
      query.date,
      query.passengers ?? 1,
      query.sortBy ?? 'price',
      query.sortOrder ?? 'asc',
      query.carrier ?? '_',
      query.maxPrice ?? '_',
      query.maxStops ?? '_',
    ].join(':');
  }

  private buildResponse(
    flights: UnifiedFlightDto[],
    query: SearchQueryDto,
    isFromCache: boolean,
    providerStatuses: ProviderStatusDto[],
    fetchDurationMs: number,
  ): SearchResponseDto {
    return {
      meta: {
        total: flights.length,
        query: {
          from: query.from,
          to: query.to,
          date: query.date,
          passengers: query.passengers ?? 1,
        },
        appliedSort: {
          by: query.sortBy ?? 'price',
          order: query.sortOrder ?? 'asc',
        },
        appliedFilters: {
          ...(query.carrier && { carrier: query.carrier }),
          ...(query.maxPrice !== undefined && { maxPrice: query.maxPrice }),
          ...(query.maxStops !== undefined && { maxStops: query.maxStops }),
        },
        isFromCache,
        providers: providerStatuses,
        fetchDurationMs,
        generatedAt: new Date().toISOString(),
      },
      flights,
    };
  }
}
