import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from '@src/bookings/bookings.service';
import { Booking } from '@src/schemas/booking.schema';
import { BookingStatus } from '@src/bookings/enums/booking-status.enum';
import { FlightBookingValidator } from '@src/bookings/validators/flight-booking.validator';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockFlight = {
    flightId: 'EK585-2026-07-01T03:45:00.000Z',
    flightNo: 'EK585',
    carrier: 'EK',
    origin: 'DAC',
    destination: 'DXB',
    departAt: '2026-07-01T03:45:00.000Z',
    arriveAt: '2026-07-01T06:50:00.000Z',
    durationMinutes: 185,
    stops: 0,
    price: { amount: 399, currency: 'USD' },
    availableFromProviders: ['ProviderB'],
    cheapestProvider: 'ProviderB',
  };

  const mockBooking = {
    reference: 'BK-ABCDEF0123456789',
    flightId: 'EK585-2026-07-01T03:45:00.000Z',
    flightSnapshot: {
      flightNo: 'EK585',
      carrier: 'EK',
      origin: 'DAC',
      destination: 'DXB',
      departAt: '2026-07-01T03:45:00.000Z',
      arriveAt: '2026-07-01T06:50:00.000Z',
      durationMinutes: 185,
      stops: 0,
      price: { amount: 399, currency: 'USD' },
    },
    passengers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        passport: 'A12345678',
        dateOfBirth: '1990-05-15',
      },
    ],
    totalPrice: 399,
    status: BookingStatus.CONFIRMED,
  };

  const createDto = {
    flightId: mockBooking.flightId,
    flightSnapshot: mockBooking.flightSnapshot,
    passengers: mockBooking.passengers,
  };

  const bookingModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const connection = {
    startSession: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'booking.referencePrefix') return 'BK';
      if (key === 'pagination.maxLimit') return 50;
      return undefined;
    }),
  };

  const flightBookingValidator = {
    validateAndResolve: jest.fn().mockResolvedValue(mockFlight),
    toSnapshot: jest.fn().mockReturnValue(mockBooking.flightSnapshot),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getModelToken(Booking.name), useValue: bookingModel },
        { provide: getConnectionToken(), useValue: connection },
        { provide: ConfigService, useValue: configService },
        { provide: FlightBookingValidator, useValue: flightBookingValidator },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  describe('create', () => {
    it('returns existing booking on idempotency key hit', async () => {
      bookingModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockBooking) }),
      });

      const result = await service.create({
        ...createDto,
        idempotencyKey: 'key-123',
      });

      expect(result.reference).toBe(mockBooking.reference);
      expect(connection.startSession).not.toHaveBeenCalled();
    });

    it('creates booking without transaction when replica set unavailable', async () => {
      bookingModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
        session: jest.fn().mockReturnThis(),
      });
      bookingModel.create.mockResolvedValue([mockBooking]);

      connection.startSession.mockResolvedValue({
        withTransaction: jest.fn().mockRejectedValue(
          new Error('Transaction numbers are only allowed on a replica set member'),
        ),
        endSession: jest.fn(),
      });

      const result = await service.create(createDto);

      expect(result.reference).toBe(mockBooking.reference);
      expect(bookingModel.create).toHaveBeenCalled();
    });

    it('throws ConflictException for duplicate passenger on same flight', async () => {
      bookingModel.findOne.mockReturnValue({
        lean: () => ({
          exec: () => Promise.resolve({ reference: 'BK-EXISTING' }),
        }),
        session: jest.fn().mockReturnThis(),
      });

      connection.startSession.mockResolvedValue({
        withTransaction: jest.fn().mockImplementation(async (fn) => fn()),
        endSession: jest.fn(),
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('persists server-side price times passenger count', async () => {
      bookingModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
        session: jest.fn().mockReturnThis(),
      });
      bookingModel.create.mockImplementation(async (docs) => docs);

      connection.startSession.mockResolvedValue({
        withTransaction: jest.fn().mockImplementation(async (fn) => fn()),
        endSession: jest.fn(),
      });

      await service.create({
        ...createDto,
        passengers: [
          createDto.passengers[0],
          { ...createDto.passengers[0], passport: 'E33333333', firstName: 'Jane' },
        ],
      });

      expect(bookingModel.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            totalPrice: 798,
            flightSnapshot: mockBooking.flightSnapshot,
          }),
        ],
        expect.any(Object),
      );
    });

    it('skips validator path when idempotency key already exists', async () => {
      bookingModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockBooking) }),
      });

      await service.create({ ...createDto, idempotencyKey: 'existing-key' });

      expect(flightBookingValidator.validateAndResolve).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated bookings without flightId filter', async () => {
      bookingModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockBooking]),
      });
      bookingModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(bookingModel.find).toHaveBeenCalledWith({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('filters by flightId when provided', async () => {
      bookingModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      bookingModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 }, mockFlight.flightId);

      expect(bookingModel.find).toHaveBeenCalledWith({
        flightId: mockFlight.flightId,
      });
    });

    it('ignores blank flightId filter', async () => {
      bookingModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      bookingModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 }, '   ');

      expect(bookingModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('findByReference', () => {
    it('throws NotFoundException for invalid reference format', async () => {
      await expect(service.findByReference('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns booking when found', async () => {
      bookingModel.findOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockBooking) }),
      });

      const result = await service.findByReference('BK-ABCDEF0123456789');
      expect(result.reference).toBe(mockBooking.reference);
    });
  });
});
