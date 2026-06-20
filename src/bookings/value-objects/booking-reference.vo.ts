import { v4 as uuidv4 } from 'uuid';

export class BookingReference {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static generate(prefix: string): BookingReference {
    const uniquePart = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    return new BookingReference(`${prefix}-${uniquePart}`);
  }

  static isValid(reference: string, prefix: string): boolean {
    const pattern = new RegExp(`^${prefix}-[A-Z0-9]{16}$`);
    return pattern.test(reference);
  }

  toString(): string {
    return this.value;
  }
}
