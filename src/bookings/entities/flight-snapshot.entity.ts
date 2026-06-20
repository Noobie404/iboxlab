import { PriceSnapshot } from './price-snapshot.entity';

export class FlightSnapshot {
  flightNo: string;
  carrier: string;
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  durationMinutes: number;
  stops: number;
  price: PriceSnapshot;
}
