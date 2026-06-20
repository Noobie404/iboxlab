import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlightsService } from '../../flights/flights.service';
import { FlightNormalizer } from '../../flights/normalizer/flight.normalizer';
import { UnifiedFlightDto } from '../../flights/dto/unified-flight.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { FlightSnapshotDto } from '../dto/flight-snapshot.dto';

@Injectable()
export class FlightBookingValidator {
  constructor(private readonly flightsService: FlightsService) {}

  async validateAndResolve(dto: CreateBookingDto): Promise<UnifiedFlightDto> {
    const flight = await this.flightsService.getFlightById(dto.flightId);

    if (!flight) {
      throw new NotFoundException(
        'Flight not found or search results expired. Search again before booking.',
      );
    }

    const mismatches = dto.flightSnapshot
      ? this.findMismatches(dto.flightSnapshot, flight)
      : [];

    if (mismatches.length > 0) {
      throw new BadRequestException({
        message:
          'Flight snapshot does not match search result. Copy flightId and flightSnapshot from the same flight in your search response, or omit flightSnapshot to use the cached search result.',
        mismatches,
        expectedFlightId: flight.flightId,
      });
    }

    return flight;
  }

  toSnapshot(flight: UnifiedFlightDto): FlightSnapshotDto {
    return {
      flightNo: flight.flightNo,
      carrier: flight.carrier,
      origin: flight.origin,
      destination: flight.destination,
      departAt: flight.departAt,
      arriveAt: flight.arriveAt,
      durationMinutes: flight.durationMinutes,
      stops: flight.stops,
      price: { ...flight.price },
    };
  }

  private findMismatches(
    snapshot: FlightSnapshotDto,
    flight: UnifiedFlightDto,
  ): string[] {
    const mismatches: string[] = [];

    const scalarFields = [
      'flightNo',
      'carrier',
      'origin',
      'destination',
      'departAt',
      'arriveAt',
      'durationMinutes',
      'stops',
    ] as const;

    for (const field of scalarFields) {
      if (field === 'departAt' || field === 'arriveAt') {
        if (
          FlightNormalizer.normalizeToUtcIso(snapshot[field]) !==
          FlightNormalizer.normalizeToUtcIso(flight[field])
        ) {
          mismatches.push(field);
        }
        continue;
      }

      if (snapshot[field] !== flight[field]) {
        mismatches.push(field);
      }
    }

    if (
      snapshot.price.amount !== flight.price.amount ||
      snapshot.price.currency !== flight.price.currency
    ) {
      mismatches.push('price');
    }

    return mismatches;
  }
}
