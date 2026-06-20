import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../core/pagination/pagination.dto';

export class ListBookingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'AA101-2026-07-01T08:00:00.000Z',
    description: 'Filter bookings by flight. Omit to list all bookings.',
  })
  @IsOptional()
  @IsString()
  flightId?: string;
}
