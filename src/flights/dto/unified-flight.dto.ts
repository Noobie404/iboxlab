import { ApiProperty } from '@nestjs/swagger';

export class PriceDto {
  @ApiProperty({ example: 399 })
  amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;
}

export class UnifiedFlightDto {
  @ApiProperty({ example: 'EK585-2026-07-01T03:45:00.000Z' })
  flightId: string;

  @ApiProperty({ example: 'EK585' })
  flightNo: string;

  @ApiProperty({ example: 'EK' })
  carrier: string;

  @ApiProperty({ example: 'DAC' })
  origin: string;

  @ApiProperty({ example: 'DXB' })
  destination: string;

  @ApiProperty({ example: '2026-07-01T03:45:00.000Z' })
  departAt: string;

  @ApiProperty({ example: '2026-07-01T06:50:00.000Z' })
  arriveAt: string;

  @ApiProperty({ example: 185 })
  durationMinutes: number;

  @ApiProperty({ example: 0 })
  stops: number;

  @ApiProperty({ type: PriceDto })
  price: PriceDto;

  @ApiProperty({ example: ['ProviderA', 'ProviderB'] })
  availableFromProviders: string[];

  @ApiProperty({ example: 'ProviderB' })
  cheapestProvider: string;
}
