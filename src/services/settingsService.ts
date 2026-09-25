import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CompanySettings } from '../types';
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

const SETTINGS_DOC = 'main';

const defaultSettings: Omit<CompanySettings, 'updatedAt' | 'updatedBy'> = {
  companyName: 'AgroBill Produce Suppliers',
  companyLogo: '',
  address: '123 Wholesale Market Yard',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  country: 'India',
  gstin: '33ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  fssai: '12345678901234',
  phone: '9876543210',
  email: 'accounts@agrobill.in',
  invoicePrefix: 'IVA',
  fiscalYearStart: 4, // April
  defaultIgstRate: 5,
  termsAndConditions: `1. Payment is due within 15 days from the date of invoice.\n2. Goods once delivered are not returnable.\n3. Subject to local jurisdiction.\n4. E&OE (Errors and Omissions Excepted).`,
  upiId: 'agrobill@upi',
  upiName: 'AgroBill Produce',
  upiQrUrl: '',
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const cached = getCachedData<CompanySettings | null>(CACHE_KEYS.SETTINGS, null);
  if (cached) return cached;

  const initial: CompanySettings = {
    ...defaultSettings,
    updatedAt: new Date(),
    updatedBy: 'system',
  };

  try {
    const docRef = doc(db, 'companySettings', SETTINGS_DOC);
    const snap = await withTimeout(getDoc(docRef), 350);
    if (snap.exists()) {
      const data = snap.data();
      const live = {
        ...defaultSettings,
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        updatedBy: data.updatedBy || '',
      } as CompanySettings;
      setCachedData(CACHE_KEYS.SETTINGS, live);
      return live;
    }
  } catch {}

  setCachedData(CACHE_KEYS.SETTINGS, initial);
  return initial;
}

export async function updateCompanySettings(
  settings: Partial<CompanySettings>,
  updatedBy: string
): Promise<void> {
  const current = await getCompanySettings();
  const updated: CompanySettings = {
    ...current,
    ...settings,
    updatedAt: new Date(),
    updatedBy,
  };
  setCachedData(CACHE_KEYS.SETTINGS, updated);

  const docRef = doc(db, 'companySettings', SETTINGS_DOC);
  setDoc(
    docRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  ).catch(() => {});
}
