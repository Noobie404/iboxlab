import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BaseProviderAdapter } from './base-provider.adapter';
import { FlightNormalizer } from '../normalizer/flight.normalizer';
import { SearchQueryDto } from '../dto/search-query.dto';

@Injectable()
export class ProviderCAdapter extends BaseProviderAdapter {
  readonly providerName = 'ProviderC';

  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  protected extractFlights(data: unknown): unknown[] {
    return (data as { results?: unknown[] })?.results ?? [];
  }

  protected normalize(raw: unknown) {
    return FlightNormalizer.fromProviderC(
      raw as Parameters<typeof FlightNormalizer.fromProviderC>[0],
      this.providerName,
    );
  }

  protected matchesQuery(raw: unknown, query: SearchQueryDto): boolean {
    const flight = raw as { route?: { src: string; dst: string } };
    return flight.route?.src === query.from && flight.route?.dst === query.to;
  }
}
