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
      deliveryDate: item.deliveryDate instanceof Timestamp ? item.deliveryDate.toDate() : new Date(),
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

export async function getInvoices(filters?: {
  hotelName?: string;
  status?: InvoiceStatus;
}): Promise<Invoice[]> {
  let q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  if (filters?.status) {
    q = query(collection(db, 'invoices'), where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  let invoices = snapshot.docs.map((d) => mapInvoice(d.id, d.data()));
  if (filters?.hotelName) {
    const search = filters.hotelName.toLowerCase();
    invoices = invoices.filter((inv) =>
      inv.hotelSnapshot.hotelName.toLowerCase().includes(search) ||
      inv.invoiceNumber.toLowerCase().includes(search)
    );
  }
  return invoices;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, 'invoices', id));
  if (!snap.exists()) return null;
  return mapInvoice(snap.id, snap.data());
}

export async function getInvoiceCountThisMonth(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const q = query(
    collection(db, 'invoices'),
    where('status', '==', 'finalized'),
    where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getTotalBillingThisMonth(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const q = query(
    collection(db, 'invoices'),
    where('status', '==', 'finalized'),
    where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.reduce((sum, d) => sum + ((d.data().grandTotal as number) || 0), 0);
}

/**
 * Finalize an invoice with atomic invoice number generation.
 * This creates the immutable snapshot and assigns the number in a single transaction.
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

  // Atomic transaction: increment counter and create invoice
  const result = await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'invoiceCounters', fiscalYear);
    const counterSnap = await transaction.get(counterRef);

    let nextNumber: number;
    if (counterSnap.exists()) {
      nextNumber = (counterSnap.data().lastNumber as number) + 1;
    } else {
      nextNumber = 2001; // Starting number
    }

    const invoiceNumber = `${prefix}_${fiscalYear}_${nextNumber}`;

    // Update counter
    transaction.set(counterRef, {
      fiscalYear,
      lastNumber: nextNumber,
      prefix,
      updatedAt: serverTimestamp(),
    });

    // Create invoice document
    const invoiceRef = doc(collection(db, 'invoices'));
    const invoiceData = {
      invoiceNumber,
      invoiceDate: Timestamp.fromDate(invoiceDate),
      deliveryDate: Timestamp.fromDate(deliveryDate),
      contractId,
      contractNumber,
      status: 'finalized' as InvoiceStatus,
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
    };

    transaction.set(invoiceRef, invoiceData);

    return { invoiceId: invoiceRef.id, invoiceNumber };
  });

  return result;
}

/**
 * Cancel a finalized invoice (controller only).
 */
export async function cancelInvoice(
  invoiceId: string,
  reason: string,
  cancelledBy: string
): Promise<void> {
  const invoiceRef = doc(db, 'invoices', invoiceId);
  const snap = await getDoc(invoiceRef);
  if (!snap.exists()) throw new Error('Invoice not found.');
  const data = snap.data();
  if (data.status !== 'finalized') throw new Error('Only finalized invoices can be cancelled.');

  await updateDoc(invoiceRef, {
    status: 'cancelled',
    cancellationReason: reason,
    cancelledBy,
    cancelledAt: serverTimestamp(),
    previousStatus: data.status,
  });
}
