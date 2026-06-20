import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BaseProviderAdapter } from './base-provider.adapter';
import { FlightNormalizer } from '../normalizer/flight.normalizer';
import { SearchQueryDto } from '../dto/search-query.dto';

@Injectable()
export class ProviderBAdapter extends BaseProviderAdapter {
  readonly providerName = 'ProviderB';

  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  protected extractFlights(data: unknown): unknown[] {
    return (data as { data?: unknown[] })?.data ?? [];
  }

  protected normalize(raw: unknown) {
    return FlightNormalizer.fromProviderB(
      raw as Parameters<typeof FlightNormalizer.fromProviderB>[0],
      this.providerName,
    );
  }

  protected matchesQuery(raw: unknown, query: SearchQueryDto): boolean {
    const flight = raw as { origin: string; destination: string };
    return flight.origin === query.from && flight.destination === query.to;
  }
}
