import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BaseProviderAdapter } from './base-provider.adapter';
import { FlightNormalizer } from '../normalizer/flight.normalizer';
import { SearchQueryDto } from '../dto/search-query.dto';

@Injectable()
export class ProviderAAdapter extends BaseProviderAdapter {
  readonly providerName = 'ProviderA';

  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  protected extractFlights(data: unknown): unknown[] {
    return (data as { flights?: unknown[] })?.flights ?? [];
  }

  protected normalize(raw: unknown) {
    return FlightNormalizer.fromProviderA(
      raw as Parameters<typeof FlightNormalizer.fromProviderA>[0],
      this.providerName,
    );
  }

  protected matchesQuery(raw: unknown, query: SearchQueryDto): boolean {
    const flight = raw as { from: string; to: string };
    return flight.from === query.from && flight.to === query.to;
  }
}
