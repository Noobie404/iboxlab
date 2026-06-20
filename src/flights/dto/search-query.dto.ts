import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUppercase,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'DAC' })
  @IsString()
  @IsUppercase()
  @Length(3, 3)
  from: string;

  @ApiPropertyOptional({ example: 'DXB' })
  @IsString()
  @IsUppercase()
  @Length(3, 3)
  to: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  passengers?: number = 1;

  @ApiPropertyOptional({ example: 'EK' })
  @IsOptional()
  @IsString()
  @IsUppercase()
  carrier?: string;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStops?: number;

  @ApiPropertyOptional({ example: 'price', default: 'price' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'price';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
