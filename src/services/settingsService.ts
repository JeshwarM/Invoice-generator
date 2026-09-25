import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CompanySettings } from '../types';

const SETTINGS_DOC = 'main';

const defaultSettings: Omit<CompanySettings, 'updatedAt' | 'updatedBy'> = {
  companyName: '',
  companyLogo: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  gstin: '',
  pan: '',
  fssai: '',
  phone: '',
  email: '',
  invoicePrefix: 'IVA',
  fiscalYearStart: 4, // April
  defaultIgstRate: 0,
  termsAndConditions: `1. Payment is due within 15 days from the date of invoice.\n2. Goods once delivered are not returnable.\n3. Subject to local jurisdiction.\n4. E&OE (Errors and Omissions Excepted).`,
  upiId: '',
  upiName: '',
  upiQrUrl: '',
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const docRef = doc(db, 'companySettings', SETTINGS_DOC);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      ...defaultSettings,
      ...data,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      updatedBy: data.updatedBy || '',
    } as CompanySettings;
  }
  return {
    ...defaultSettings,
    updatedAt: new Date(),
    updatedBy: '',
  } as CompanySettings;
}

export async function updateCompanySettings(
  settings: Partial<CompanySettings>,
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, 'companySettings', SETTINGS_DOC);
  await setDoc(
    docRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
}
