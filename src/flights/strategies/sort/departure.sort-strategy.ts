import { Injectable } from '@nestjs/common';
import { ISortStrategy } from './sort-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';

@Injectable()
export class DepartureSortStrategy implements ISortStrategy {
  readonly sortKey = 'departure';

  compare(a: UnifiedFlightDto, b: UnifiedFlightDto): number {
    return new Date(a.departAt).getTime() - new Date(b.departAt).getTime();
  }
}
