import { Injectable } from '@nestjs/common';
import { ISortStrategy } from './sort-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';

@Injectable()
export class PriceSortStrategy implements ISortStrategy {
  readonly sortKey = 'price';

  compare(a: UnifiedFlightDto, b: UnifiedFlightDto): number {
    return a.price.amount - b.price.amount;
  }
}
