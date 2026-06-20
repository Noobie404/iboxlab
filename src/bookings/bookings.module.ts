import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlightsModule } from '../flights/flights.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { FlightBookingValidator } from './validators/flight-booking.validator';
import { Booking, BookingSchema } from '../schemas/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    FlightsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, FlightBookingValidator],
  exports: [BookingsService],
})
export class BookingsModule {}
