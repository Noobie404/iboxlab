import { Injectable } from '@nestjs/common';
import { IFlightFilterStrategy } from './filter-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';
import { SearchQueryDto } from '../../dto/search-query.dto';

@Injectable()
export class MaxPriceFilterStrategy implements IFlightFilterStrategy {
  isApplicable(query: SearchQueryDto): boolean {
    return query.maxPrice !== undefined;
  }

  passes(flight: UnifiedFlightDto, query: SearchQueryDto): boolean {
    return flight.price.amount <= query.maxPrice!;
  }
}
