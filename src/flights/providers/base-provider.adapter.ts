import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { IFlightProvider } from './flight-provider.interface';
import { SearchQueryDto } from '../dto/search-query.dto';
import { UnifiedFlightDto } from '../dto/unified-flight.dto';
import { ProviderConfig } from '../../config/providers.config';
import { AppConfig } from '../../config/configuration';

export abstract class BaseProviderAdapter implements IFlightProvider {
  abstract readonly providerName: string;
  protected readonly logger: Logger;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected abstract extractFlights(responseData: unknown): unknown[];

  protected abstract normalize(rawFlight: unknown): UnifiedFlightDto;

  protected getProviderConfig(): ProviderConfig {
    const providers =
      this.configService.get<AppConfig['providers']>('providers') ?? [];
    const config = providers.find((p) => p.name === this.providerName);
    if (!config) {
      throw new Error(
        `Provider "${this.providerName}" is registered but missing from FLIGHT_PROVIDERS config`,
      );
    }
    return config;
  }

  async fetchFlights(query: SearchQueryDto): Promise<UnifiedFlightDto[]> {
    const config = this.getProviderConfig();

    if (!config.enabled) {
      this.logger.debug(`Provider "${this.providerName}" is disabled — skipping`);
      return [];
    }

    const requestConfig: AxiosRequestConfig = {
      params: { from: query.from, to: query.to, date: query.date },
    };

    try {
      const response = await firstValueFrom(
        this.httpService
          .get(config.url, requestConfig)
          .pipe(timeout(config.timeoutMs)),
      );

      const payload = this.unwrapResponse(response.data);
      const rawFlights = this.extractFlights(payload);
      return rawFlights
        .filter((f) => this.matchesQuery(f, query))
        .map((f) => this.normalize(f));
    } catch (err: unknown) {
      const errorType = err instanceof TimeoutError ? 'TIMEOUT' : 'ERROR';
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Provider "${this.providerName}" [${errorType}]: ${message} ` +
          `(url: ${config.url}, timeout: ${config.timeoutMs}ms)`,
      );
      return [];
    }
  }

  protected unwrapResponse(data: unknown): unknown {
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      (data as { success: boolean }).success === true &&
      'data' in data
    ) {
      return (data as { data: unknown }).data;
    }
    return data;
  }

  protected matchesQuery(_rawFlight: unknown, _query: SearchQueryDto): boolean {
    return true;
  }
}
