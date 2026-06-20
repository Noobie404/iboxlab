import { BookingReference } from '@src/bookings/value-objects/booking-reference.vo';

describe('BookingReference', () => {
  it('generates a reference with prefix and 16-char suffix', () => {
    const ref = BookingReference.generate('BK');

    expect(ref.toString()).toMatch(/^BK-[A-Z0-9]{16}$/);
  });

  it('validates correct reference format', () => {
    expect(BookingReference.isValid('BK-ABCDEF0123456789', 'BK')).toBe(true);
  });

  it('rejects invalid reference format', () => {
    expect(BookingReference.isValid('INVALID', 'BK')).toBe(false);
    expect(BookingReference.isValid('BK-short', 'BK')).toBe(false);
    expect(BookingReference.isValid('XX-ABCDEF0123456789', 'BK')).toBe(false);
  });
});
