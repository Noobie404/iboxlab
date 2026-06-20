import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFlightProvider } from '../providers/flight-provider.interface';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly activeProviders: IFlightProvider[] = [];

  constructor(
    private readonly allProviders: IFlightProvider[],
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const providerConfigs =
      this.configService.get<AppConfig['providers']>('providers') ?? [];

    const enabledNames = new Set(
      providerConfigs.filter((c) => c.enabled).map((c) => c.name),
    );

    for (const provider of this.allProviders) {
      if (enabledNames.has(provider.providerName)) {
        this.activeProviders.push(provider);
        this.logger.log(`Registered provider: "${provider.providerName}"`);
      } else {
        this.logger.warn(
          `Provider "${provider.providerName}" exists but is not enabled in config — skipping`,
        );
      }
    }

    if (this.activeProviders.length === 0) {
      this.logger.warn('No active flight providers registered yet');
    }
  }

  getActiveProviders(): IFlightProvider[] {
    return this.activeProviders;
  }

  getAllProviderNames(): string[] {
    return this.allProviders.map((p) => p.providerName);
  }
}
