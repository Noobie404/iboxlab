import { Injectable } from '@nestjs/common';
import { IFlightFilterStrategy } from './filter-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';
import { SearchQueryDto } from '../../dto/search-query.dto';

@Injectable()
export class CarrierFilterStrategy implements IFlightFilterStrategy {
  isApplicable(query: SearchQueryDto): boolean {
    return Boolean(query.carrier);
  }

  passes(flight: UnifiedFlightDto, query: SearchQueryDto): boolean {
    return flight.carrier === query.carrier!.toUpperCase();
  }
}
