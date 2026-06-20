import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  BookingStatus,
  BOOKING_STATUS_VALUES,
} from '../bookings/enums/booking-status.enum';
import { FlightSnapshot } from '../bookings/entities/flight-snapshot.entity';
import { Passenger } from '../bookings/entities/passenger.entity';

const PriceSnapshotSchema = new MongooseSchema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
  },
  { _id: false },
);

const FlightSnapshotSchema = new MongooseSchema(
  {
    flightNo: { type: String, required: true },
    carrier: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    departAt: { type: String, required: true },
    arriveAt: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    stops: { type: Number, required: true },
    price: { type: PriceSnapshotSchema, required: true },
  },
  { _id: false },
);

const PassengerSchema = new MongooseSchema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    passport: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
  },
  { _id: false },
);

export type BookingDocument = Booking & Document;

@Schema({
  timestamps: true,
  optimisticConcurrency: true,
  collection: 'bookings',
})
export class Booking {
  @Prop({ required: true, unique: true, index: true })
  reference: string;

  @Prop({ required: true, index: true })
  flightId: string;

  @Prop({ type: FlightSnapshotSchema, required: true })
  flightSnapshot: FlightSnapshot;

  @Prop({ type: [PassengerSchema], required: true })
  passengers: Passenger[];

  @Prop({ required: true })
  totalPrice: number;

  @Prop({
    type: String,
    default: BookingStatus.CONFIRMED,
    enum: BOOKING_STATUS_VALUES,
    index: true,
  })
  status: BookingStatus;

  @Prop({ unique: true, sparse: true, index: true })
  idempotencyKey?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ flightId: 1, status: 1 });
BookingSchema.index({ 'passengers.passport': 1, flightId: 1 });
BookingSchema.index({ createdAt: -1 });
