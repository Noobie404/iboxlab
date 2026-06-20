import { UnifiedFlightDto } from '../../dto/unified-flight.dto';

export interface ISortStrategy {
  readonly sortKey: string;
  compare(a: UnifiedFlightDto, b: UnifiedFlightDto): number;
}

export const SORT_STRATEGIES_TOKEN = Symbol('SORT_STRATEGIES_TOKEN');
