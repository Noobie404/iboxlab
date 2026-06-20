import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FlightBookingValidator } from '@src/bookings/validators/flight-booking.validator';
import { FlightsService } from '@src/flights/flights.service';
import { UnifiedFlightDto } from '@src/flights/dto/unified-flight.dto';

describe('FlightBookingValidator', () => {
  let validator: FlightBookingValidator;
  let flightsService: { getFlightById: jest.Mock };

  const flight: UnifiedFlightDto = {
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

  const dto = {
    flightId: flight.flightId,
    flightSnapshot: {
      flightNo: flight.flightNo,
      carrier: flight.carrier,
      origin: flight.origin,
      destination: flight.destination,
      departAt: flight.departAt,
      arriveAt: flight.arriveAt,
      durationMinutes: flight.durationMinutes,
      stops: flight.stops,
      price: { ...flight.price },
    },
    passengers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        passport: 'A12345678',
        dateOfBirth: '1990-05-15',
      },
    ],
  };

  beforeEach(() => {
    flightsService = { getFlightById: jest.fn() };
    validator = new FlightBookingValidator(
      flightsService as unknown as FlightsService,
    );
  });

  it('returns flight when snapshot matches cached search result', async () => {
    flightsService.getFlightById.mockResolvedValue(flight);

    const result = await validator.validateAndResolve(dto);

    expect(result).toEqual(flight);
    expect(flightsService.getFlightById).toHaveBeenCalledWith(flight.flightId);
  });

  it('throws NotFoundException when flight is not in search cache', async () => {
    flightsService.getFlightById.mockResolvedValue(null);

    await expect(validator.validateAndResolve(dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns flight when flightSnapshot is omitted', async () => {
    flightsService.getFlightById.mockResolvedValue(flight);

    const result = await validator.validateAndResolve({
      flightId: flight.flightId,
      passengers: dto.passengers,
    });

    expect(result).toEqual(flight);
  });

  it('throws BadRequestException when snapshot does not match cached flight', async () => {
    flightsService.getFlightById.mockResolvedValue(flight);

    await expect(
      validator.validateAndResolve({
        ...dto,
        flightId: flight.flightId,
        flightSnapshot: {
          ...dto.flightSnapshot,
          flightNo: 'WRONG',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts snapshot departAt without Z suffix when flightId matches search', async () => {
    const aa101: UnifiedFlightDto = {
      flightId: 'AA101-2026-07-01T08:00:00.000Z',
      flightNo: 'AA101',
      carrier: 'AA',
      origin: 'DAC',
      destination: 'DXB',
      departAt: '2026-07-01T08:00:00.000Z',
      arriveAt: '2026-07-01T12:30:00.000Z',
      durationMinutes: 270,
      stops: 0,
      price: { amount: 320, currency: 'USD' },
      availableFromProviders: ['ProviderA'],
      cheapestProvider: 'ProviderA',
    };

    flightsService.getFlightById.mockResolvedValue(aa101);

    const result = await validator.validateAndResolve({
      flightId: aa101.flightId,
      flightSnapshot: {
        flightNo: aa101.flightNo,
        carrier: aa101.carrier,
        origin: aa101.origin,
        destination: aa101.destination,
        departAt: '2026-07-01T08:00:00',
        arriveAt: '2026-07-01T12:30:00',
        durationMinutes: aa101.durationMinutes,
        stops: aa101.stops,
        price: { ...aa101.price },
      },
      passengers: dto.passengers,
    });

    expect(result).toEqual(aa101);
  });

  it('throws BadRequestException when snapshot price is tampered', async () => {
    flightsService.getFlightById.mockResolvedValue(flight);

    await expect(
      validator.validateAndResolve({
        ...dto,
        flightSnapshot: {
          ...dto.flightSnapshot,
          price: { amount: 1, currency: 'USD' },
        },
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      validator.validateAndResolve({
        ...dto,
        flightSnapshot: {
          ...dto.flightSnapshot,
          price: { amount: 1, currency: 'USD' },
        },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        mismatches: expect.arrayContaining(['price']),
      }),
    });
  });
});
