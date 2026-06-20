import {
  Controller,
  Get,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FlightsService } from './flights.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search flights across all active providers' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated, deduplicated flight results',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid sort key',
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )
  async search(
    @Query() query: SearchQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.flightsService.search(query);
    res.setHeader('X-Cache', result.meta.isFromCache ? 'HIT' : 'MISS');
    res.setHeader('X-Fetch-Duration-Ms', String(result.meta.fetchDurationMs));
    return result;
  }
}
