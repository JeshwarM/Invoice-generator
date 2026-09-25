// User & Auth
export type UserRole = 'controller' | 'employee' | 'admin' | 'billing_staff' | 'viewer';
export type UserStatus = 'pending' | 'active' | 'disabled' | 'rejected';
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  status: AccessRequestStatus;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason?: string;
}

// Hotel
export interface Hotel {
  id: string;
  hotelName: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  fssai: string;
  contactPerson: string;
  phone: string;
  email: string;
  active: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

// Product
export type ProductUnit = 'kg' | 'g' | 'box' | 'piece' | 'bundle' | 'packet' | 'dozen';
export type ProductCategory = 'vegetables' | 'fruits' | 'herbs' | 'spices' | 'dairy' | 'grocery' | 'other';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  active: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

// Contract
export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed';
export type ContractDuration = 6 | 12;

export interface Contract {
  id: string;
  hotelId: string;
  hotelName: string;
  contractNumber: string;
  startDate: Date;
  endDate: Date;
  duration: ContractDuration;
  status: ContractStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface ContractItem {
  id: string;
  contractId: string;
  productId: string;
  productName: string;
  unit: ProductUnit;
  rate: number; // in paise (1 INR = 100 paise)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Billing
export interface BillItem {
  productId: string;
  productName: string;
  contractItemId: string;
  quantity: number; // for count-based units
  quantityGrams: number; // for weight-based units (canonical)
  unit: ProductUnit;
  contractRate: number; // in paise
  finalRate: number; // in paise (after any override)
  rateOverridden: boolean;
  rateOverrideReason: string;
  rateOverriddenBy: string;
  rateOverriddenAt: Date | null;
  igstRate: number; // percentage e.g. 0, 5, 12, 18
  igstAmount: number; // in paise
  lineTotal: number; // in paise
  deliveryDate: Date;
  deliveryTime: string;
}

// Draft Bill
export type DraftStatus = 'draft' | 'continued';

export interface DraftBill {
  id: string;
  hotelId: string;
  hotelName: string;
  contractId: string;
  contractNumber: string;
  deliveryDate: Date;
  invoiceDate: Date;
  items: BillItem[];
  subtotal: number; // paise
  igstTotal: number; // paise
  grandTotal: number; // paise
  status: DraftStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Invoice
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled';

export interface InvoiceSupplierSnapshot {
  companyName: string;
  companyLogo: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  fssai: string;
  phone: string;
  email: string;
}

export interface InvoiceHotelSnapshot {
  hotelName: string;
  hotelLogo: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  fssai: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export interface InvoiceItem {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  quantityGrams: number;
  unit: ProductUnit;
  contractRate: number; // paise
  finalBillingRate: number; // paise
  rateOverridden: boolean;
  rateOverrideReason: string;
  igstRate: number;
  igstAmount: number; // paise
  lineTotal: number; // paise
  deliveryDate: Date;
  deliveryTime: string;
}

export interface InvoicePaymentSnapshot {
  upiId: string;
  upiName: string;
  upiQrUrl: string;
}

export interface InvoiceTaxSnapshot {
  taxType: string;
  taxRate: number;
  taxableAmount: number; // paise
  taxAmount: number; // paise
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  deliveryDate: Date;
  contractId: string;
  contractNumber: string;
  status: InvoiceStatus;
  supplierSnapshot: InvoiceSupplierSnapshot;
  hotelSnapshot: InvoiceHotelSnapshot;
  items: InvoiceItem[];
  tax: InvoiceTaxSnapshot;
  payment: InvoicePaymentSnapshot;
  subtotal: number; // paise
  grandTotal: number; // paise
  totalInWords: string;
  termsAndConditions: string;
  pdfUrl: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  // Cancellation fields
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  previousStatus?: InvoiceStatus;
}

// Audit
export type AuditAction = 
  | 'employee_approved' | 'employee_rejected' | 'employee_disabled' | 'employee_reactivated'
  | 'hotel_created' | 'hotel_edited'
  | 'product_created' | 'product_edited'
  | 'contract_created' | 'contract_edited' | 'contract_renewed'
  | 'rate_overridden'
  | 'draft_created' | 'draft_updated'
  | 'invoice_finalized' | 'invoice_cancelled'
  | 'settings_changed';

export type AuditEntityType = 'user' | 'hotel' | 'product' | 'contract' | 'invoice' | 'draft' | 'settings';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  performedBy: string;
  performedByName: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

// Company Settings
export interface CompanySettings {
  companyName: string;
  companyLogo: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  fssai: string;
  phone: string;
  email: string;
  // Invoice settings
  invoicePrefix: string;
  fiscalYearStart: number; // month 1-12
  defaultIgstRate: number; // percentage
  termsAndConditions: string;
  // Payment settings
  upiId: string;
  upiName: string;
  upiQrUrl: string;
  // Metadata
  updatedAt: Date;
  updatedBy: string;
}

// Invoice Counter
export interface InvoiceCounter {
  fiscalYear: string; // e.g. '2627'
  lastNumber: number;
  prefix: string;
  updatedAt: Date;
}

// Helper types for Firestore
export type FirestoreTimestamp = {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
};

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  lastDoc: unknown | null;
}
