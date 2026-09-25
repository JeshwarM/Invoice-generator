const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];

const TENS = [
  '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
];

function convertTwoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const ten = TENS[Math.floor(n / 10)];
  const one = ONES[n % 10];
  return one ? `${ten} ${one}` : ten;
}

function convertThreeDigits(n: number): string {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];
  if (hundred > 0) {
    parts.push(`${ONES[hundred]} HUNDRED`);
  }
  if (remainder > 0) {
    parts.push(convertTwoDigits(remainder));
  }
  return parts.join(' ');
}

/**
 * Convert a number (in rupees, not paise) to Indian English words.
 * Supports up to 99,99,99,999 (99 crores).
 * 
 * Example:
 * 15418.50 -> "FIFTEEN THOUSAND FOUR HUNDRED AND EIGHTEEN RUPEES AND FIFTY PAISE ONLY"
 */
export function numberToIndianWords(amount: number): string {
  if (amount === 0) return 'ZERO RUPEES ONLY';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  const parts: string[] = [];

  if (rupees > 0) {
    // Indian numbering: crores, lakhs, thousands, hundreds
    let remaining = rupees;

    const crores = Math.floor(remaining / 10000000);
    remaining %= 10000000;

    const lakhs = Math.floor(remaining / 100000);
    remaining %= 100000;

    const thousands = Math.floor(remaining / 1000);
    remaining %= 1000;

    if (crores > 0) {
      parts.push(`${convertTwoDigits(crores)} CRORE`);
    }
    if (lakhs > 0) {
      parts.push(`${convertTwoDigits(lakhs)} LAKH`);
    }
    if (thousands > 0) {
      parts.push(`${convertTwoDigits(thousands)} THOUSAND`);
    }
    if (remaining > 0) {
      parts.push(convertThreeDigits(remaining));
    }

    parts.push('RUPEES');
  }

  if (paise > 0) {
    if (rupees > 0) {
      parts.push('AND');
    }
    parts.push(`${convertTwoDigits(paise)} PAISE`);
  }

  parts.push('ONLY');

  const prefix = isNegative ? 'MINUS ' : '';
  return prefix + parts.join(' ');
}
