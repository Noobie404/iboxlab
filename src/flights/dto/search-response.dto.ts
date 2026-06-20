import { ApiProperty } from '@nestjs/swagger';
import { UnifiedFlightDto } from './unified-flight.dto';

export class ProviderStatusDto {
  @ApiProperty()
  provider: string;

  @ApiProperty({ enum: ['ok', 'error', 'disabled'] })
  status: 'ok' | 'error' | 'disabled';

  @ApiProperty()
  flightsReturned: number;

  @ApiProperty({ required: false })
  errorMessage?: string;
}

export class SearchMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  query: Record<string, unknown>;

  @ApiProperty()
  appliedSort: { by: string; order: string };

  @ApiProperty()
  appliedFilters: Record<string, unknown>;

  @ApiProperty()
  isFromCache: boolean;

  @ApiProperty({ type: [ProviderStatusDto] })
  providers: ProviderStatusDto[];

  @ApiProperty()
  fetchDurationMs: number;

  @ApiProperty()
  generatedAt: string;
}

export class SearchResponseDto {
  @ApiProperty({ type: SearchMetaDto })
  meta: SearchMetaDto;

  @ApiProperty({ type: [UnifiedFlightDto] })
  flights: UnifiedFlightDto[];
}
