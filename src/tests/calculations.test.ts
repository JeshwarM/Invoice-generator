import { describe, it, expect } from 'vitest';
import {
  toGrams,
  fromGrams,
  formatGrams,
  calculateLineTotal,
  calculateIgst,
  calculateSubtotal,
  calculateGrandTotal,
  paiseToRupees,
  rupeesToPaise,
  formatCurrency,
  isWeightUnit,
} from '../utils/calculations';
import { numberToIndianWords } from '../utils/currency';
import type { BillItem } from '../types';

describe('Financial & Quantity Calculations', () => {
  it('correctly classifies weight units vs count units', () => {
    expect(isWeightUnit('kg')).toBe(true);
    expect(isWeightUnit('g')).toBe(true);
    expect(isWeightUnit('box')).toBe(false);
    expect(isWeightUnit('piece')).toBe(false);
    expect(isWeightUnit('dozen')).toBe(false);
  });

  it('converts display quantity to canonical integer grams without floating point error', () => {
    expect(toGrams(1.5, 'kg')).toBe(1500);
    expect(toGrams(0.25, 'kg')).toBe(250);
    expect(toGrams(500, 'g')).toBe(500);
    expect(toGrams(10, 'box')).toBe(0);
  });

  it('converts grams to display quantity', () => {
    expect(fromGrams(1500, 'kg')).toBe(1.5);
    expect(fromGrams(500, 'g')).toBe(500);
  });

  it('formats grams for human readability', () => {
    expect(formatGrams(1500)).toBe('1 kg 500 g');
    expect(formatGrams(2000)).toBe('2 kg');
    expect(formatGrams(450)).toBe('450 g');
    expect(formatGrams(0)).toBe('0 g');
  });

  it('calculates weight line total accurately in integer paise using Decimal.js with ROUND_HALF_UP', () => {
    // 1.5 kg (1500g) at ₹65.50/kg (6550 paise)
    // 1500 / 1000 * 6550 = 9825 paise = ₹98.25
    const lineTotal = calculateLineTotal('kg', 1.5, 1500, 6550);
    expect(lineTotal).toBe(9825);
  });

  it('calculates count line total accurately in integer paise', () => {
    // 5 boxes at ₹120.00/box (12000 paise) = 60000 paise
    const lineTotal = calculateLineTotal('box', 5, 0, 12000);
    expect(lineTotal).toBe(60000);
  });

  it('calculates IGST with proper half-up rounding', () => {
    // ₹1000 (100000 paise) at 5% = 5000 paise
    expect(calculateIgst(100000, 5)).toBe(5000);
    // ₹155.33 (15533 paise) at 18% = 2795.94 -> 2796 paise
    expect(calculateIgst(15533, 18)).toBe(2796);
  });

  it('converts between paise and rupees accurately', () => {
    expect(paiseToRupees(1541850)).toBe(15418.5);
    expect(rupeesToPaise(15418.5)).toBe(1541850);
  });

  it('formats currency in Indian numbering format', () => {
    const formatted = formatCurrency(1541850);
    // Should contain 15,418.50 and Indian rupee symbol
    expect(formatted).toContain('15,418.50');
  });

  it('calculates subtotal and grand total across items', () => {
    const mockItems: BillItem[] = [
      {
        productId: 'p1',
        productName: 'Tomatoes',
        contractItemId: 'c1',
        quantity: 10,
        quantityGrams: 10000,
        unit: 'kg',
        contractRate: 5000,
        finalRate: 5000,
        rateOverridden: false,
        rateOverrideReason: '',
        rateOverriddenBy: '',
        rateOverriddenAt: null,
        igstRate: 5,
        igstAmount: 2500,
        lineTotal: 50000,
        deliveryDate: new Date(),
        deliveryTime: '08:00',
      },
      {
        productId: 'p2',
        productName: 'Apples',
        contractItemId: 'c2',
        quantity: 5,
        quantityGrams: 5000,
        unit: 'kg',
        contractRate: 10000,
        finalRate: 10000,
        rateOverridden: false,
        rateOverrideReason: '',
        rateOverriddenBy: '',
        rateOverriddenAt: null,
        igstRate: 5,
        igstAmount: 2500,
        lineTotal: 50000,
        deliveryDate: new Date(),
        deliveryTime: '08:00',
      },
    ];

    const subtotal = calculateSubtotal(mockItems);
    expect(subtotal).toBe(100000); // ₹1000.00
    const grandTotal = calculateGrandTotal(subtotal, 5000);
    expect(grandTotal).toBe(105000); // ₹1050.00
  });
});

describe('Indian Currency In Words', () => {
  it('converts simple amounts to English words', () => {
    expect(numberToIndianWords(100)).toBe('ONE HUNDRED RUPEES ONLY');
    expect(numberToIndianWords(0)).toBe('ZERO RUPEES ONLY');
  });

  it('converts lakhs and thousands correctly', () => {
    const result = numberToIndianWords(15418.5);
    expect(result).toBe('FIFTEEN THOUSAND FOUR HUNDRED AND EIGHTEEN RUPEES AND FIFTY PAISE ONLY');
  });

  it('handles crores correctly', () => {
    const result = numberToIndianWords(10000000);
    expect(result).toBe('ONE CRORE RUPEES ONLY');
  });
});
