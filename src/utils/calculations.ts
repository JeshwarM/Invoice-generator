import Decimal from 'decimal.js';
import { ProductUnit, BillItem } from '../types';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Weight-based units that use grams as canonical
export const WEIGHT_UNITS: ProductUnit[] = ['kg', 'g'];
export const COUNT_UNITS: ProductUnit[] = ['box', 'piece', 'bundle', 'packet', 'dozen'];

export function isWeightUnit(unit: ProductUnit): boolean {
  return WEIGHT_UNITS.includes(unit);
}

/**
 * Convert a display quantity + unit to canonical grams.
 * e.g., 1.5 kg = 1500 grams, 500 g = 500 grams
 */
export function toGrams(value: number, unit: ProductUnit): number {
  if (unit === 'kg') {
    return new Decimal(value).times(1000).toNumber();
  }
  if (unit === 'g') {
    return Math.round(value);
  }
  return 0; // Not a weight unit
}

/**
 * Convert grams back to display value in the given unit.
 */
export function fromGrams(grams: number, unit: ProductUnit): number {
  if (unit === 'kg') {
    return new Decimal(grams).dividedBy(1000).toNumber();
  }
  if (unit === 'g') {
    return grams;
  }
  return 0;
}

/**
 * Format grams as a display string. E.g., 1500 -> "1 kg 500 g" or "1.5 kg"
 */
export function formatGrams(grams: number): string {
  if (grams === 0) return '0 g';
  const kg = Math.floor(grams / 1000);
  const g = grams % 1000;
  if (g === 0) return `${kg} kg`;
  if (kg === 0) return `${g} g`;
  return `${kg} kg ${g} g`;
}

/**
 * Calculate line total in paise.
 * For weight items: (grams / 1000) * ratePerKgInPaise
 * For count items: quantity * ratePerUnitInPaise
 */
export function calculateLineTotal(
  unit: ProductUnit,
  quantity: number,
  quantityGrams: number,
  rateInPaise: number
): number {
  if (isWeightUnit(unit)) {
    // rateInPaise is per kg
    const total = new Decimal(quantityGrams)
      .dividedBy(1000)
      .times(rateInPaise)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    return total;
  } else {
    const total = new Decimal(quantity)
      .times(rateInPaise)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    return total;
  }
}

/**
 * Calculate IGST amount in paise.
 */
export function calculateIgst(amountInPaise: number, igstRate: number): number {
  return new Decimal(amountInPaise)
    .times(igstRate)
    .dividedBy(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Calculate subtotal from bill items (sum of line totals).
 */
export function calculateSubtotal(items: BillItem[]): number {
  return items.reduce((sum, item) => {
    return new Decimal(sum).plus(item.lineTotal).toNumber();
  }, 0);
}

/**
 * Calculate grand total = subtotal + total IGST.
 */
export function calculateGrandTotal(subtotal: number, igstTotal: number): number {
  return new Decimal(subtotal).plus(igstTotal).toNumber();
}

/**
 * Calculate total IGST from all items.
 */
export function calculateTotalIgst(items: BillItem[]): number {
  return items.reduce((sum, item) => {
    return new Decimal(sum).plus(item.igstAmount).toNumber();
  }, 0);
}

/**
 * Convert paise to rupees for display.
 */
export function paiseToRupees(paise: number): number {
  return new Decimal(paise).dividedBy(100).toNumber();
}

/**
 * Convert rupees to paise for storage.
 */
export function rupeesToPaise(rupees: number): number {
  return new Decimal(rupees).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Format paise as Indian Rupee string.
 * e.g., 1541850 paise -> "₹15,418.50"
 */
export function formatCurrency(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
