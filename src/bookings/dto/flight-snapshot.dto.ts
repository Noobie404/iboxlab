import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsNotEmpty,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PriceSnapshotDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;
}

export class FlightSnapshotDto {
  @ApiProperty({ example: 'EK585' })
  @IsString()
  @IsNotEmpty()
  flightNo: string;

  @ApiProperty({ example: 'EK' })
  @IsString()
  @IsNotEmpty()
  carrier: string;

  @ApiProperty({ example: 'DAC' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ example: 'DXB' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: '2026-07-01T03:45:00.000Z' })
  @IsString()
  departAt: string;

  @ApiProperty({ example: '2026-07-01T06:50:00.000Z' })
  @IsString()
  arriveAt: string;

  @ApiProperty({ example: 185 })
  @IsInt()
  @Min(0)
  durationMinutes: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  stops: number;

  @ApiProperty({ type: PriceSnapshotDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PriceSnapshotDto)
  price: PriceSnapshotDto;
}
