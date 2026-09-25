
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs, query,
  where, orderBy, serverTimestamp, Timestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Invoice, InvoiceItem, InvoiceStatus, InvoiceSupplierSnapshot,
  InvoiceHotelSnapshot, InvoicePaymentSnapshot, InvoiceTaxSnapshot, BillItem,
  CompanySettings, Hotel,
} from '../types';
import { getFiscalYear } from '../utils/date';
import { numberToIndianWords } from '../utils/currency';
import { paiseToRupees } from '../utils/calculations';
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

function mapInvoice(id: string, data: Record<string, unknown>): Invoice {
  const toDate = (v: unknown): Date =>
    v instanceof Timestamp ? v.toDate() : v ? new Date(v as string) : new Date();
  return {
    id,
    invoiceNumber: (data.invoiceNumber as string) || '',
    invoiceDate: toDate(data.invoiceDate),
    deliveryDate: toDate(data.deliveryDate),
    contractId: (data.contractId as string) || '',
    contractNumber: (data.contractNumber as string) || '',
    status: (data.status as InvoiceStatus) || 'draft',
    supplierSnapshot: (data.supplierSnapshot as InvoiceSupplierSnapshot) || {} as InvoiceSupplierSnapshot,
    hotelSnapshot: (data.hotelSnapshot as InvoiceHotelSnapshot) || {} as InvoiceHotelSnapshot,
    items: ((data.items as Record<string, unknown>[]) || []).map((item) => ({
      productId: (item.productId as string) || '',
      productNameSnapshot: (item.productNameSnapshot as string) || '',
      quantity: (item.quantity as number) || 0,
      quantityGrams: (item.quantityGrams as number) || 0,
      unit: item.unit as InvoiceItem['unit'],
      contractRate: (item.contractRate as number) || 0,
      finalBillingRate: (item.finalBillingRate as number) || 0,
      rateOverridden: (item.rateOverridden as boolean) || false,
      rateOverrideReason: (item.rateOverrideReason as string) || '',
      igstRate: (item.igstRate as number) || 0,
      igstAmount: (item.igstAmount as number) || 0,
      lineTotal: (item.lineTotal as number) || 0,
      deliveryDate: item.deliveryDate instanceof Timestamp ? item.deliveryDate.toDate() : item.deliveryDate ? new Date(item.deliveryDate as string) : new Date(),
      deliveryTime: (item.deliveryTime as string) || '',
    })),
    tax: (data.tax as InvoiceTaxSnapshot) || { taxType: 'IGST', taxRate: 0, taxableAmount: 0, taxAmount: 0 },
    payment: (data.payment as InvoicePaymentSnapshot) || { upiId: '', upiName: '', upiQrUrl: '' },
    subtotal: (data.subtotal as number) || 0,
    grandTotal: (data.grandTotal as number) || 0,
    totalInWords: (data.totalInWords as string) || '',
    termsAndConditions: (data.termsAndConditions as string) || '',
    pdfUrl: (data.pdfUrl as string) || '',
    createdBy: (data.createdBy as string) || '',
    createdByName: (data.createdByName as string) || '',
    createdAt: toDate(data.createdAt),
    cancellationReason: data.cancellationReason as string | undefined,
    cancelledBy: data.cancelledBy as string | undefined,
    cancelledAt: data.cancelledAt ? toDate(data.cancelledAt) : undefined,
    previousStatus: data.previousStatus as InvoiceStatus | undefined,
  };
}

export const SAMPLE_INVOICE: Invoice = {
  id: 'inv_iva_2627_2044',
  invoiceNumber: 'IVA_2627_2044',
  invoiceDate: new Date('2026-09-19'),
  deliveryDate: new Date('2026-09-19'),
  contractId: 'contract_taj_coromandel',
  contractNumber: 'CNT_2627_01',
  status: 'finalized',
  supplierSnapshot: {
    companyName: 'IRONVALLEY AGRONOMY PRIVATE LIMITED',
    companyLogo: '',
    address: 'Tamil Nadu, India',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    country: 'India',
    gstin: '33AAHCI7316M1ZC',
    pan: 'AAHCI7316M',
    fssai: '12424002002920',
    phone: '+91 96004 58450',
    email: 'info@ironvalleyagro.in',
  },
  hotelSnapshot: {
    hotelName: 'TAJ Coromandel Hotel',
    hotelLogo: '',
    address: '37,Uthamar gandhi road, near makkal tv office,tirumurthy nagar nungambakkam,',
    city: 'Chennai',
    state: '',
    pincode: '600034',
    country: 'India',
    gstin: '',
    pan: '',
    fssai: '',
    contactPerson: '',
    phone: '',
    email: '',
  },
  items: [
    { productId: 'prod_1', productNameSnapshot: 'EDIBLE FLOWER', quantity: 2, quantityGrams: 0, unit: 'box', contractRate: 45000, finalBillingRate: 45000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 90000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_2', productNameSnapshot: 'WHITE RADISH MICROGREENS', quantity: 1, quantityGrams: 0, unit: 'box', contractRate: 17000, finalBillingRate: 17000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 17000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_3', productNameSnapshot: 'YELLOW ZUCCINI', quantity: 15, quantityGrams: 15000, unit: 'kg', contractRate: 8000, finalBillingRate: 8000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 120000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_4', productNameSnapshot: 'GREEN ZUCCHINI', quantity: 14, quantityGrams: 14000, unit: 'kg', contractRate: 8000, finalBillingRate: 8000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 112000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_5', productNameSnapshot: 'BABY CORN', quantity: 32, quantityGrams: 32000, unit: 'kg', contractRate: 12000, finalBillingRate: 12000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 384000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_6', productNameSnapshot: 'PARSLEY', quantity: 0.5, quantityGrams: 500, unit: 'kg', contractRate: 12000, finalBillingRate: 12000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 6000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_7', productNameSnapshot: 'BROCOLLI', quantity: 14, quantityGrams: 14000, unit: 'kg', contractRate: 13500, finalBillingRate: 13500, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 189000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_8', productNameSnapshot: 'CELERY', quantity: 1, quantityGrams: 1000, unit: 'kg', contractRate: 9400, finalBillingRate: 9400, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 9400, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_9', productNameSnapshot: 'POKCHAI', quantity: 4, quantityGrams: 4000, unit: 'kg', contractRate: 8000, finalBillingRate: 8000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 32000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_10', productNameSnapshot: 'YELLOW CAPSICUM', quantity: 12, quantityGrams: 12000, unit: 'kg', contractRate: 12000, finalBillingRate: 12000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 144000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_11', productNameSnapshot: 'RED CAPSICUM', quantity: 12, quantityGrams: 12000, unit: 'kg', contractRate: 12000, finalBillingRate: 12000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 144000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_12', productNameSnapshot: 'RED CHERRY TOMATO', quantity: 3, quantityGrams: 3000, unit: 'kg', contractRate: 9900, finalBillingRate: 9900, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 29700, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_13', productNameSnapshot: 'THYME', quantity: 0.5, quantityGrams: 500, unit: 'kg', contractRate: 25500, finalBillingRate: 25500, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 12750, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_14', productNameSnapshot: 'BEANS SUGARSNAPS', quantity: 1, quantityGrams: 1000, unit: 'kg', contractRate: 240000, finalBillingRate: 240000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 240000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
    { productId: 'prod_15', productNameSnapshot: 'ROMAINE lettuce', quantity: 1, quantityGrams: 1000, unit: 'kg', contractRate: 12000, finalBillingRate: 12000, rateOverridden: false, rateOverrideReason: '', igstRate: 0, igstAmount: 0, lineTotal: 12000, deliveryDate: new Date('2026-09-19'), deliveryTime: '' },
  ],
  tax: { taxType: 'IGST', taxRate: 0, taxableAmount: 1541850, taxAmount: 0 },
  payment: {
    upiId: 'ironvalleyagronomy@idfcbank',
    upiName: 'IRONVALLEY AGRONOMY PRIVATE LIMITED',
    upiQrUrl: '',
  },
  subtotal: 1541850,
  grandTotal: 1541850,
  totalInWords: 'FIFTEEN THOUSAND FOUR HUNDRED EIGHTEEN RUPEES AND FIFTY PAISE ONLY',
  termsAndConditions: `1. Please pay within 2 days from the date of invoice\n2. Please use the UPI ID in the invoice to remit the amount\n3. In an highly unlikely case, if you're not satisfied with our product delivered to you and you don't want to pay, we respect it and we'd love to have your feedback @ +91 9600458450`,
  pdfUrl: '',
  createdBy: 'system',
  createdByName: 'System Controller',
  createdAt: new Date('2026-09-19T10:00:00Z'),
};

export async function getInvoices(filters?: {
  hotelName?: string;
  status?: InvoiceStatus;
}): Promise<Invoice[]> {
  const cached = getCachedData<Invoice[]>(CACHE_KEYS.INVOICES, [SAMPLE_INVOICE]);
  let filtered = cached;

  if (filters?.status) {
    filtered = filtered.filter((i) => i.status === filters.status);
  }
  if (filters?.hotelName) {
    const search = filters.hotelName.toLowerCase();
    filtered = filtered.filter((inv) =>
      inv.hotelSnapshot?.hotelName?.toLowerCase().includes(search) ||
      inv.invoiceNumber?.toLowerCase().includes(search)
    );
  }

  // Fast background check against Firestore
  try {
    let q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    if (filters?.status) {
      q = query(collection(db, 'invoices'), where('status', '==', filters.status), orderBy('createdAt', 'desc'));
    }
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapInvoice(d.id, d.data()));
      setCachedData(CACHE_KEYS.INVOICES, live);
      let result = live;
      if (filters?.hotelName) {
        const search = filters.hotelName.toLowerCase();
        result = result.filter((inv) =>
          inv.hotelSnapshot?.hotelName?.toLowerCase().includes(search) ||
          inv.invoiceNumber?.toLowerCase().includes(search)
        );
      }
      return result;
    }
  } catch {}

  return filtered;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const cached = getCachedData<Invoice[]>(CACHE_KEYS.INVOICES, []);
  const found = cached.find((i) => i.id === id);
  if (found) return found;

  try {
    const snap = await withTimeout(getDoc(doc(db, 'invoices', id)), 350);
    if (snap.exists()) return mapInvoice(snap.id, snap.data());
  } catch {}
  return null;
}

export async function getInvoiceCountThisMonth(): Promise<number> {
  const invoices = await getInvoices();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return invoices.filter((i) => i.status === 'finalized' && new Date(i.createdAt) >= startOfMonth).length;
}

export async function getTotalBillingThisMonth(): Promise<number> {
  const invoices = await getInvoices();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return invoices
    .filter((i) => i.status === 'finalized' && new Date(i.createdAt) >= startOfMonth)
    .reduce((sum, i) => sum + (i.grandTotal || 0), 0);
}

/**
 * Finalize an invoice with atomic local counter + Firestore sync.
 * Creates immutable snapshot and generates invoice immediately.
 */
export async function finalizeInvoice(params: {
  billItems: BillItem[];
  hotel: Hotel;
  companySettings: CompanySettings;
  contractId: string;
  contractNumber: string;
  invoiceDate: Date;
  deliveryDate: Date;
  igstRate: number;
  subtotal: number;
  igstTotal: number;
  grandTotal: number;
  createdBy: string;
  createdByName: string;
}): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const {
    billItems, hotel, companySettings, contractId, contractNumber,
    invoiceDate, deliveryDate, igstRate, subtotal, igstTotal, grandTotal,
    createdBy, createdByName,
  } = params;

  const fiscalYear = getFiscalYear(invoiceDate, companySettings.fiscalYearStart || 4);
  const prefix = companySettings.invoicePrefix || 'IVA';

  // Determine sequential number
  const counters = getCachedData<Record<string, number>>(CACHE_KEYS.COUNTERS, {});
  const lastNumber = counters[fiscalYear] || 2000;
  const nextNumber = lastNumber + 1;
  counters[fiscalYear] = nextNumber;
  setCachedData(CACHE_KEYS.COUNTERS, counters);

  const invoiceNumber = `${prefix}_${fiscalYear}_${nextNumber}`;
  const invoiceId = `inv_${Date.now()}`;

  // Build snapshots
  const supplierSnapshot: InvoiceSupplierSnapshot = {
    companyName: companySettings.companyName,
    companyLogo: companySettings.companyLogo,
    address: companySettings.address,
    city: companySettings.city,
    state: companySettings.state,
    pincode: companySettings.pincode,
    country: companySettings.country || 'India',
    gstin: companySettings.gstin,
    pan: companySettings.pan,
    fssai: companySettings.fssai,
    phone: companySettings.phone,
    email: companySettings.email,
  };

  const hotelSnapshot: InvoiceHotelSnapshot = {
    hotelName: hotel.hotelName,
    hotelLogo: hotel.logoUrl,
    address: hotel.address,
    city: hotel.city,
    state: hotel.state,
    pincode: hotel.pincode,
    country: hotel.country || 'India',
    gstin: hotel.gstin,
    pan: hotel.pan,
    fssai: hotel.fssai,
    contactPerson: hotel.contactPerson,
    phone: hotel.phone,
    email: hotel.email,
  };

  const items: InvoiceItem[] = billItems.map((item) => ({
    productId: item.productId,
    productNameSnapshot: item.productName,
    quantity: item.quantity,
    quantityGrams: item.quantityGrams,
    unit: item.unit,
    contractRate: item.contractRate,
    finalBillingRate: item.finalRate,
    rateOverridden: item.rateOverridden,
    rateOverrideReason: item.rateOverrideReason,
    igstRate: item.igstRate,
    igstAmount: item.igstAmount,
    lineTotal: item.lineTotal,
    deliveryDate: item.deliveryDate,
    deliveryTime: item.deliveryTime,
  }));

  const tax: InvoiceTaxSnapshot = {
    taxType: 'IGST',
    taxRate: igstRate,
    taxableAmount: subtotal,
    taxAmount: igstTotal,
  };

  const payment: InvoicePaymentSnapshot = {
    upiId: companySettings.upiId,
    upiName: companySettings.upiName,
    upiQrUrl: companySettings.upiQrUrl,
  };

  const totalInWords = numberToIndianWords(paiseToRupees(grandTotal));

  const newInvoice: Invoice = {
    id: invoiceId,
    invoiceNumber,
    invoiceDate,
    deliveryDate,
    contractId,
    contractNumber,
    status: 'finalized',
    supplierSnapshot,
    hotelSnapshot,
    items,
    tax,
    payment,
    subtotal,
    grandTotal,
    totalInWords,
    termsAndConditions: companySettings.termsAndConditions,
    pdfUrl: '',
    createdBy,
    createdByName,
    createdAt: new Date(),
  };

  // 1. Instant local store
  const cachedInvoices = getCachedData<Invoice[]>(CACHE_KEYS.INVOICES, []);
  setCachedData(CACHE_KEYS.INVOICES, [newInvoice, ...cachedInvoices]);

  // 2. Sync in background to Firestore without blocking the UI
  runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'invoiceCounters', fiscalYear);
    const counterSnap = await transaction.get(counterRef);
    let fsNextNumber = nextNumber;
    if (counterSnap.exists()) {
      fsNextNumber = Math.max(nextNumber, (counterSnap.data().lastNumber as number) + 1);
    }
    transaction.set(counterRef, {
      fiscalYear,
      lastNumber: fsNextNumber,
      prefix,
      updatedAt: serverTimestamp(),
    });

    const invoiceRef = doc(db, 'invoices', invoiceId);
    transaction.set(invoiceRef, {
      invoiceNumber,
      invoiceDate: Timestamp.fromDate(invoiceDate),
      deliveryDate: Timestamp.fromDate(deliveryDate),
      contractId,
      contractNumber,
      status: 'finalized',
      supplierSnapshot,
      hotelSnapshot,
      items: items.map((item) => ({
        ...item,
        deliveryDate: Timestamp.fromDate(item.deliveryDate),
      })),
      tax,
      payment,
      subtotal,
      grandTotal,
      totalInWords,
      termsAndConditions: companySettings.termsAndConditions,
      pdfUrl: '',
      createdBy,
      createdByName,
      createdAt: serverTimestamp(),
    });
  }).catch(() => {});

  return { invoiceId, invoiceNumber };
}

/**
 * Cancel a finalized invoice (controller only).
 */
export async function cancelInvoice(
  invoiceId: string,
  reason: string,
  cancelledBy: string
): Promise<void> {
  const cached = getCachedData<Invoice[]>(CACHE_KEYS.INVOICES, []);
  const updated = cached.map((inv) =>
    inv.id === invoiceId
      ? {
          ...inv,
          status: 'cancelled' as InvoiceStatus,
          cancellationReason: reason,
          cancelledBy,
          cancelledAt: new Date(),
          previousStatus: inv.status,
        }
      : inv
  );
  setCachedData(CACHE_KEYS.INVOICES, updated);

  updateDoc(doc(db, 'invoices', invoiceId), {
    status: 'cancelled',
    cancellationReason: reason,
    cancelledBy,
    cancelledAt: serverTimestamp(),
  }).catch(() => {});
}
