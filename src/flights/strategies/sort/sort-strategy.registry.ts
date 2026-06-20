import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ISortStrategy } from './sort-strategy.interface';
import { UnifiedFlightDto } from '../../dto/unified-flight.dto';

@Injectable()
export class SortStrategyRegistry {
  private readonly logger = new Logger(SortStrategyRegistry.name);
  private readonly strategies = new Map<string, ISortStrategy>();

  register(strategy: ISortStrategy): void {
    this.strategies.set(strategy.sortKey, strategy);
    this.logger.log(`Registered sort strategy: "${strategy.sortKey}"`);
  }

  sort(
    flights: UnifiedFlightDto[],
    sortKey: string,
    order: 'asc' | 'desc',
  ): UnifiedFlightDto[] {
    const strategy = this.strategies.get(sortKey);
    if (!strategy) {
      const available = [...this.strategies.keys()].join(', ');
      throw new BadRequestException(
        `Unknown sortBy value: "${sortKey}". Available: ${available}`,
      );
    }

    const direction = order === 'desc' ? -1 : 1;
    return [...flights].sort((a, b) => direction * strategy.compare(a, b));
  }

  getAvailableSortKeys(): string[] {
    return [...this.strategies.keys()];
  }
}
