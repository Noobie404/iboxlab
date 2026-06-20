import { UnifiedFlightDto } from '../dto/unified-flight.dto';

export class FlightDeduplicator {
  static deduplicate(flights: UnifiedFlightDto[]): UnifiedFlightDto[] {
    const map = new Map<string, UnifiedFlightDto>();

    for (const flight of flights) {
      const existing = map.get(flight.flightId);

      if (!existing) {
        map.set(flight.flightId, { ...flight });
      } else {
        existing.availableFromProviders = [
          ...new Set([
            ...existing.availableFromProviders,
            ...flight.availableFromProviders,
          ]),
        ].sort();

        if (flight.price.amount < existing.price.amount) {
          existing.price = { ...flight.price };
          existing.cheapestProvider = flight.availableFromProviders[0];
        }
      }
    }

    return Array.from(map.values());
  }
}
