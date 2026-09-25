/**
 * Validate GSTIN format: 2-digit state code + PAN + 1 entity + Z + 1 check digit
 * Pattern: 00AAAAA0000A0Z0 (15 characters)
 */
export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return true; // Optional field
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  return pattern.test(gstin.toUpperCase());
}

/**
 * Validate PAN format: AAAAA0000A (10 characters)
 */
export function isValidPAN(pan: string): boolean {
  if (!pan) return true; // Optional field
  const pattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return pattern.test(pan.toUpperCase());
}

/**
 * Validate FSSAI license number: 14 digits
 */
export function isValidFSSAI(fssai: string): boolean {
  if (!fssai) return true; // Optional field
  const pattern = /^[0-9]{14}$/;
  return pattern.test(fssai);
}

/**
 * Validate Indian phone number (10 digits, optional +91 prefix)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Optional field
  const cleaned = phone.replace(/[\s\-+]/g, '');
  // Allow 10 digits or 91 + 10 digits
  return /^(91)?[6-9][0-9]{9}$/.test(cleaned);
}

/**
 * Validate Indian pincode: 6 digits
 */
export function isValidPincode(pincode: string): boolean {
  if (!pincode) return true; // Optional field
  return /^[1-9][0-9]{5}$/.test(pincode);
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  if (!email) return true; // Optional field
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

/**
 * Validate required string field
 */
export function isRequired(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/**
 * Validate rate (must be >= 0)
 */
export function isValidRate(rate: number): boolean {
  return typeof rate === 'number' && rate >= 0 && isFinite(rate);
}

/**
 * Validate quantity (must be > 0)
 */
export function isValidQuantity(quantity: number): boolean {
  return typeof quantity === 'number' && quantity > 0 && isFinite(quantity);
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateHotel(hotel: Partial<Record<string, string>>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isRequired(hotel.hotelName)) errors.push({ field: 'hotelName', message: 'Hotel name is required' });
  if (!isRequired(hotel.address)) errors.push({ field: 'address', message: 'Address is required' });
  if (hotel.email && !isValidEmail(hotel.email)) errors.push({ field: 'email', message: 'Invalid email format' });
  if (hotel.phone && !isValidPhone(hotel.phone)) errors.push({ field: 'phone', message: 'Invalid phone number' });
  if (hotel.gstin && !isValidGSTIN(hotel.gstin)) errors.push({ field: 'gstin', message: 'Invalid GSTIN format' });
  if (hotel.pan && !isValidPAN(hotel.pan)) errors.push({ field: 'pan', message: 'Invalid PAN format' });
  if (hotel.fssai && !isValidFSSAI(hotel.fssai)) errors.push({ field: 'fssai', message: 'Invalid FSSAI format' });
  if (hotel.pincode && !isValidPincode(hotel.pincode)) errors.push({ field: 'pincode', message: 'Invalid pincode' });
  return errors;
}
