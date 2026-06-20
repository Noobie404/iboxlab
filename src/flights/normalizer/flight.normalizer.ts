import { UnifiedFlightDto } from '../dto/unified-flight.dto';

export class FlightNormalizer {
  static normalizeToUtcIso(dateTime: string): string {
    const hasTimezone =
      dateTime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTime);
    return new Date(hasTimezone ? dateTime : `${dateTime}Z`).toISOString();
  }

  static buildFlightId(flightNo: string, departAt: string): string {
    return `${flightNo.toUpperCase()}-${this.normalizeToUtcIso(departAt)}`;
  }

  static computeDurationMinutes(
    departAtIso: string,
    arriveAtIso: string,
  ): number {
    return Math.round(
      (new Date(arriveAtIso).getTime() - new Date(departAtIso).getTime()) /
        60_000,
    );
  }

  static fromProviderA(
    raw: {
      flight_no: string;
      carrier: string;
      from: string;
      to: string;
      depart: string;
      arrive: string;
      stops: number;
      fare_usd: number;
    },
    providerName: string,
  ): UnifiedFlightDto {
    const departAt = this.normalizeToUtcIso(raw.depart);
    const arriveAt = this.normalizeToUtcIso(raw.arrive);
    return {
      flightId: this.buildFlightId(raw.flight_no, departAt),
      flightNo: raw.flight_no,
      carrier: raw.carrier,
      origin: raw.from,
      destination: raw.to,
      departAt,
      arriveAt,
      durationMinutes: this.computeDurationMinutes(departAt, arriveAt),
      stops: raw.stops,
      price: { amount: raw.fare_usd, currency: 'USD' },
      availableFromProviders: [providerName],
      cheapestProvider: providerName,
    };
  }

  static fromProviderB(
    raw: {
      number: string;
      airline_code: string;
      origin: string;
      destination: string;
      departure_time: string;
      arrival_time: string;
      segments: number;
      price: { amount: number; currency: string };
    },
    providerName: string,
  ): UnifiedFlightDto {
    const toIso = (nonIso: string): string =>
      new Date(nonIso.replace(' ', 'T') + ':00Z').toISOString();

    const departAt = toIso(raw.departure_time);
    const arriveAt = toIso(raw.arrival_time);
    return {
      flightId: this.buildFlightId(raw.number, departAt),
      flightNo: raw.number,
      carrier: raw.airline_code,
      origin: raw.origin,
      destination: raw.destination,
      departAt,
      arriveAt,
      durationMinutes: this.computeDurationMinutes(departAt, arriveAt),
      stops: raw.segments,
      price: { amount: raw.price.amount, currency: raw.price.currency },
      availableFromProviders: [providerName],
      cheapestProvider: providerName,
    };
  }

  static fromProviderC(
    raw: {
      code: string;
      iata: string;
      route: { src: string; dst: string };
      times: { dep: number; arr: number };
      layovers: number;
      total_price: number;
      currency: string;
    },
    providerName: string,
  ): UnifiedFlightDto {
    const departAt = new Date(raw.times.dep * 1000).toISOString();
    const arriveAt = new Date(raw.times.arr * 1000).toISOString();
    return {
      flightId: this.buildFlightId(raw.code, departAt),
      flightNo: raw.code,
      carrier: raw.iata,
      origin: raw.route.src,
      destination: raw.route.dst,
      departAt,
      arriveAt,
      durationMinutes: this.computeDurationMinutes(departAt, arriveAt),
      stops: raw.layovers,
      price: { amount: raw.total_price, currency: raw.currency },
      availableFromProviders: [providerName],
      cheapestProvider: providerName,
    };
  }
}
