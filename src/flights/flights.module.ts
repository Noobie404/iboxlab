import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { ProviderRegistry } from './registry/provider.registry';
import { ALL_FLIGHT_PROVIDER_ADAPTERS } from './registry/provider.token';
import { IFlightProvider } from './providers/flight-provider.interface';
import { ProviderAAdapter } from './providers/provider-a.adapter';
import { ProviderBAdapter } from './providers/provider-b.adapter';
import { ProviderCAdapter } from './providers/provider-c.adapter';
import { SortStrategyRegistry } from './strategies/sort/sort-strategy.registry';
import { PriceSortStrategy } from './strategies/sort/price.sort-strategy';
import { DurationSortStrategy } from './strategies/sort/duration.sort-strategy';
import { DepartureSortStrategy } from './strategies/sort/departure.sort-strategy';
import { FilterPipelineService } from './strategies/filter/filter-pipeline.service';
import { CarrierFilterStrategy } from './strategies/filter/carrier.filter-strategy';
import { MaxPriceFilterStrategy } from './strategies/filter/max-price.filter-strategy';
import { MaxStopsFilterStrategy } from './strategies/filter/max-stops.filter-strategy';

const PROVIDER_ADAPTER_CLASSES = [
  ProviderAAdapter,
  ProviderBAdapter,
  ProviderCAdapter,
];

@Module({
  imports: [HttpModule],
  controllers: [FlightsController],
  providers: [
    FlightsService,
    SortStrategyRegistry,
    FilterPipelineService,
    ...PROVIDER_ADAPTER_CLASSES,
    PriceSortStrategy,
    DurationSortStrategy,
    DepartureSortStrategy,
    CarrierFilterStrategy,
    MaxPriceFilterStrategy,
    MaxStopsFilterStrategy,
    {
      provide: ALL_FLIGHT_PROVIDER_ADAPTERS,
      useFactory: (...adapters: IFlightProvider[]) => adapters,
      inject: PROVIDER_ADAPTER_CLASSES,
    },
    {
      provide: ProviderRegistry,
      useFactory: (adapters: IFlightProvider[], configService: ConfigService) =>
        new ProviderRegistry(adapters, configService),
      inject: [ALL_FLIGHT_PROVIDER_ADAPTERS, ConfigService],
    },
  ],
  exports: [FlightsService],
})
export class FlightsModule implements OnModuleInit {
  constructor(
    private readonly sortRegistry: SortStrategyRegistry,
    private readonly filterPipeline: FilterPipelineService,
    private readonly priceSortStrategy: PriceSortStrategy,
    private readonly durationSortStrategy: DurationSortStrategy,
    private readonly departureSortStrategy: DepartureSortStrategy,
    private readonly carrierFilter: CarrierFilterStrategy,
    private readonly maxPriceFilter: MaxPriceFilterStrategy,
    private readonly maxStopsFilter: MaxStopsFilterStrategy,
  ) {}

  onModuleInit(): void {
    [
      this.priceSortStrategy,
      this.durationSortStrategy,
      this.departureSortStrategy,
    ].forEach((strategy) => {
      this.sortRegistry.register(strategy);
    });

    [this.carrierFilter, this.maxPriceFilter, this.maxStopsFilter].forEach(
      (filter) => {
        this.filterPipeline.register(filter);
      },
    );
  }
}
