import { Injectable, Logger } from '@nestjs/common';
import { IFlightFilterStrategy } from './filter-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';
import { SearchQueryDto } from '../../dto/search-query.dto';

@Injectable()
export class FilterPipelineService {
  private readonly logger = new Logger(FilterPipelineService.name);
  private readonly filters: IFlightFilterStrategy[] = [];

  register(filter: IFlightFilterStrategy): void {
    this.filters.push(filter);
    this.logger.log(`Registered filter: "${filter.constructor.name}"`);
  }

  apply(
    flights: UnifiedFlightDto[],
    query: SearchQueryDto,
  ): UnifiedFlightDto[] {
    const applicableFilters = this.filters.filter((f) => f.isApplicable(query));

    if (applicableFilters.length === 0) return flights;

    return flights.filter((flight) =>
      applicableFilters.every((filter) => filter.passes(flight, query)),
    );
  }
}
