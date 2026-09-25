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
  invoicePrefix: 'IVA',
  fiscalYearStart: 4, // April
  defaultIgstRate: 0, // Manual entry only, default 0%
  termsAndConditions: `1. Please pay within 2 days from the date of invoice\n2. Please use the UPI ID in the invoice to remit the amount\n3. In an highly unlikely case, if you're not satisfied with our product delivered to you and you don't want to pay, we respect it and we'd love to have your feedback @ +91 9600458450`,
  upiId: 'ironvalleyagronomy@idfcbank',
  upiName: 'IRONVALLEY AGRONOMY PRIVATE LIMITED',
  upiQrUrl: '',
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const cached = getCachedData<CompanySettings | null>(CACHE_KEYS.SETTINGS, null);
  if (cached && cached.companyName && !cached.companyName.includes('AgroBill Produce')) {
    return cached;
  }

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
