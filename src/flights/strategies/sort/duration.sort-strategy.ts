import { Injectable } from '@nestjs/common';
import { ISortStrategy } from './sort-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';

@Injectable()
export class DurationSortStrategy implements ISortStrategy {
  readonly sortKey = 'duration';

  compare(a: UnifiedFlightDto, b: UnifiedFlightDto): number {
    return a.durationMinutes - b.durationMinutes;
  }
}
