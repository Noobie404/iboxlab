import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking confirmed' })
  @ApiResponse({
    status: 400,
    description: 'Missing, invalid, or mismatched flight snapshot',
  })
  @ApiResponse({ status: 404, description: 'Flight not found in search cache' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate booking or concurrent conflict',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all bookings with pagination',
    description: 'Returns paginated bookings. Optionally filter by `flightId`.',
  })
  async findAll(@Query() query: ListBookingsQueryDto) {
    const { flightId, ...pagination } = query;
    return this.bookingsService.findAll(pagination, flightId);
  }

  @Get(':reference')
  @ApiOperation({ summary: 'Retrieve a booking by reference' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('reference') reference: string) {
    return this.bookingsService.findByReference(reference);
  }
}
