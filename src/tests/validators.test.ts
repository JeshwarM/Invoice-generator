import { describe, it, expect } from 'vitest';
import {
  isValidGSTIN,
  isValidPAN,
  isValidFSSAI,
  isValidPhone,
  isValidPincode,
  isValidEmail,
  validateHotel,
} from '../utils/validators';

describe('Indian Compliance & Identifier Validators', () => {
  it('validates GSTIN formats correctly', () => {
    expect(isValidGSTIN('33AAAAA0000A1Z5')).toBe(true);
    expect(isValidGSTIN('29ABCDE1234F1Z5')).toBe(true);
    expect(isValidGSTIN('INVALIDGSTIN')).toBe(false);
    expect(isValidGSTIN('33AAAAA0000A15')).toBe(false); // short
    expect(isValidGSTIN('')).toBe(true); // Optional field
  });

  it('validates PAN formats correctly', () => {
    expect(isValidPAN('ABCDE1234F')).toBe(true);
    expect(isValidPAN('AAAAA0000A')).toBe(true);
    expect(isValidPAN('12345ABCDE')).toBe(false);
    expect(isValidPAN('ABCDE123')).toBe(false);
    expect(isValidPAN('')).toBe(true); // Optional field
  });

  it('validates FSSAI 14-digit license numbers', () => {
    expect(isValidFSSAI('12345678901234')).toBe(true);
    expect(isValidFSSAI('12345')).toBe(false);
    expect(isValidFSSAI('123456789012345')).toBe(false); // 15 digits
    expect(isValidFSSAI('ABCDEFGHIJKLMN')).toBe(false);
    expect(isValidFSSAI('')).toBe(true); // Optional field
  });

  it('validates Indian 10-digit phone numbers', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('+919876543210')).toBe(true);
    expect(isValidPhone('919876543210')).toBe(true);
    expect(isValidPhone('1234567890')).toBe(false); // Doesn't start with 6-9
    expect(isValidPhone('98765')).toBe(false);
    expect(isValidPhone('')).toBe(true); // Optional field
  });

  it('validates Indian 6-digit postal pincodes', () => {
    expect(isValidPincode('600001')).toBe(true);
    expect(isValidPincode('560001')).toBe(true);
    expect(isValidPincode('012345')).toBe(false); // starts with 0
    expect(isValidPincode('60001')).toBe(false); // 5 digits
    expect(isValidPincode('6000001')).toBe(false); // 7 digits
    expect(isValidPincode('')).toBe(true); // Optional field
  });

  it('validates email addresses', () => {
    expect(isValidEmail('accounts@tajhotels.com')).toBe(true);
    expect(isValidEmail('admin@agrobill.in')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('admin@')).toBe(false);
    expect(isValidEmail('')).toBe(true); // Optional field
  });

  it('validates hotel profile completely', () => {
    const validHotel = {
      hotelName: 'Taj Coromandel',
      address: '37, Mahatma Gandhi Rd, Nungambakkam',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600034',
      gstin: '33AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      phone: '9876543210',
      email: 'accounts@tajhotels.com',
    };
    expect(validateHotel(validHotel)).toHaveLength(0);

    const invalidHotel = {
      hotelName: '', // Required
      address: '', // Required
      gstin: 'INVALID',
      phone: '123',
    };
    const errors = validateHotel(invalidHotel);
    expect(errors.some((e) => e.field === 'hotelName')).toBe(true);
    expect(errors.some((e) => e.field === 'address')).toBe(true);
    expect(errors.some((e) => e.field === 'gstin')).toBe(true);
    expect(errors.some((e) => e.field === 'phone')).toBe(true);
  });
});
