import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PassengerDto } from './passenger.dto';
import { FlightSnapshotDto } from './flight-snapshot.dto';

export class CreateBookingDto {
  @ApiProperty({ example: 'EK585-2026-07-01T03:45:00.000Z' })
  @IsString()
  @IsNotEmpty()
  flightId: string;

  @ApiPropertyOptional({
    type: FlightSnapshotDto,
    description:
      'Optional. If omitted, the snapshot is taken from your latest search result for this flightId.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlightSnapshotDto)
  flightSnapshot?: FlightSnapshotDto;

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiPropertyOptional({ example: 'client-generated-uuid-v4' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
