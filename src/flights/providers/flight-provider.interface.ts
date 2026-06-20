import { SearchQueryDto } from '../dto/search-query.dto';
import { UnifiedFlightDto } from '../dto/unified-flight.dto';

export interface IFlightProvider {
  readonly providerName: string;
  fetchFlights(query: SearchQueryDto): Promise<UnifiedFlightDto[]>;
}

export const FLIGHT_PROVIDERS_TOKEN = Symbol('FLIGHT_PROVIDERS_TOKEN');
