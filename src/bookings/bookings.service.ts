import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Booking, BookingDocument } from '../schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from './enums/booking-status.enum';
import { BookingReference } from './value-objects/booking-reference.vo';
import { PaginationDto } from '../core/pagination/pagination.dto';
import { PaginatedResult } from '../core/pagination/paginated-result';
import { AppConfig } from '../config/configuration';
import { FlightBookingValidator } from './validators/flight-booking.validator';
import { UnifiedFlightDto } from '../flights/dto/unified-flight.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService<AppConfig>,
    private readonly flightBookingValidator: FlightBookingValidator,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingDocument> {
    if (dto.idempotencyKey) {
      const existing = await this.bookingModel
        .findOne({ idempotencyKey: dto.idempotencyKey })
        .lean()
        .exec();
      if (existing) {
        this.logger.log(
          `Idempotency HIT: ${dto.idempotencyKey} → ${existing.reference}`,
        );
        return existing as BookingDocument;
      }
    }

    const flight = await this.flightBookingValidator.validateAndResolve(dto);

    try {
      return await this.createWithTransaction(dto, flight);
    } catch (err: unknown) {
      if (this.isTransactionNotSupported(err)) {
        this.logger.warn(
          'MongoDB replica set unavailable — creating booking without transaction',
        );
        return this.createWithoutTransaction(dto, flight);
      }
      throw err;
    }
  }

  async findByReference(reference: string): Promise<BookingDocument> {
    const prefix = this.configService.get('booking.referencePrefix', {
      infer: true,
    })!;

    if (!BookingReference.isValid(reference, prefix)) {
      throw new NotFoundException(`Booking "${reference}" not found`);
    }

    const booking = await this.bookingModel
      .findOne({ reference })
      .lean()
      .exec();

    if (!booking) {
      throw new NotFoundException(`Booking "${reference}" not found`);
    }

    return booking as BookingDocument;
  }

  async findAll(
    pagination: PaginationDto,
    flightId?: string,
  ): Promise<PaginatedResult<BookingDocument>> {
    const maxLimit = this.configService.get('pagination.maxLimit', {
      infer: true,
    })!;
    const defaultLimit = this.configService.get('pagination.defaultLimit', {
      infer: true,
    })!;
    const limit = Math.min(pagination.limit ?? defaultLimit, maxLimit);
    const page = pagination.page ?? 1;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    const trimmedFlightId = flightId?.trim();
    if (trimmedFlightId) filter.flightId = trimmedFlightId;

    const [data, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.bookingModel.countDocuments(filter),
    ]);

    return PaginatedResult.of(data as BookingDocument[], total, page, limit);
  }

  private async createWithTransaction(
    dto: CreateBookingDto,
    flight: UnifiedFlightDto,
  ): Promise<BookingDocument> {
    const session = await this.connection.startSession();

    try {
      let booking!: BookingDocument;

      await session.withTransaction(async () => {
        booking = await this.persistBooking(dto, flight, session);
      });

      return booking;
    } catch (err: unknown) {
      if (this.isTransactionNotSupported(err)) throw err;
      this.handleCreateError(err);
    } finally {
      await session.endSession();
    }
  }

  private async createWithoutTransaction(
    dto: CreateBookingDto,
    flight: UnifiedFlightDto,
  ): Promise<BookingDocument> {
    try {
      return await this.persistBooking(dto, flight);
    } catch (err: unknown) {
      this.handleCreateError(err);
    }
  }

  private async persistBooking(
    dto: CreateBookingDto,
    flight: UnifiedFlightDto,
    session?: ClientSession,
  ): Promise<BookingDocument> {
    const leadPassport = dto.passengers[0].passport;

    const duplicateQuery = this.bookingModel.findOne({
      flightId: dto.flightId,
      'passengers.passport': leadPassport,
      status: BookingStatus.CONFIRMED,
    });

    if (session) duplicateQuery.session(session);

    const duplicate = await duplicateQuery.lean().exec();

    if (duplicate) {
      throw new ConflictException(
        `Passenger ${leadPassport} already has booking ${duplicate.reference} on flight ${dto.flightId}`,
      );
    }

    const referencePrefix = this.configService.get('booking.referencePrefix', {
      infer: true,
    })!;
    const reference = BookingReference.generate(referencePrefix).toString();
    const totalPrice = flight.price.amount * dto.passengers.length;
    const flightSnapshot = this.flightBookingValidator.toSnapshot(flight);

    const [booking] = await this.bookingModel.create(
      [
        {
          reference,
          flightId: dto.flightId,
          flightSnapshot,
          passengers: dto.passengers,
          totalPrice,
          status: BookingStatus.CONFIRMED,
          idempotencyKey: dto.idempotencyKey,
        },
      ],
      session ? { session } : {},
    );

    this.logger.log(`Booking created: ${reference}`);
    return booking;
  }

  private handleCreateError(err: unknown): never {
    if (err instanceof HttpException) throw err;

    if (err instanceof Error && err.name === 'VersionError') {
      throw new ConflictException(
        'Concurrent modification detected. Please retry.',
      );
    }

    if (this.isDuplicateKeyError(err)) {
      throw new ConflictException(
        'A booking with this idempotency key already exists.',
      );
    }

    this.logger.error(
      'Booking failed',
      err instanceof Error ? err.stack : String(err),
    );
    throw new InternalServerErrorException('Booking failed. Please try again.');
  }

  private isTransactionNotSupported(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const message = err.message.toLowerCase();
    return (
      message.includes('replica set') ||
      message.includes('transaction numbers are only allowed')
    );
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000
    );
  }
}
