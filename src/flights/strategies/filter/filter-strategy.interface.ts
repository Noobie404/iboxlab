import { UnifiedFlightDto } from '../../dto/unified-flight.dto';
import { SearchQueryDto } from '../../dto/search-query.dto';

export interface IFlightFilterStrategy {
  isApplicable(query: SearchQueryDto): boolean;
  passes(flight: UnifiedFlightDto, query: SearchQueryDto): boolean;
}
