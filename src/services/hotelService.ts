import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Hotel } from '../types';
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

function mapHotel(id: string, data: Record<string, unknown>): Hotel {
  return {
    id,
    hotelName: (data.hotelName as string) || '',
    logoUrl: (data.logoUrl as string) || '',
    address: (data.address as string) || '',
    city: (data.city as string) || '',
    state: (data.state as string) || '',
    pincode: (data.pincode as string) || '',
    country: (data.country as string) || 'India',
    gstin: (data.gstin as string) || '',
    pan: (data.pan as string) || '',
    fssai: (data.fssai as string) || '',
    contactPerson: (data.contactPerson as string) || '',
    phone: (data.phone as string) || '',
    email: (data.email as string) || '',
    active: data.active !== false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: (data.createdBy as string) || '',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export async function getHotels(activeOnly: boolean = false): Promise<Hotel[]> {
  const cached = getCachedData<Hotel[]>(CACHE_KEYS.HOTELS, []);

  try {
    let q;
    if (activeOnly) {
      q = query(collection(db, 'hotels'), where('active', '==', true), orderBy('hotelName', 'asc'));
    } else {
      q = query(collection(db, 'hotels'), orderBy('hotelName', 'asc'));
    }
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapHotel(d.id, d.data()));
      setCachedData(CACHE_KEYS.HOTELS, live);
      return activeOnly ? live.filter((h) => h.active) : live;
    }
  } catch {
    // Return cached immediately
  }

  return activeOnly ? cached.filter((h) => h.active) : cached;
}

export async function getHotel(id: string): Promise<Hotel | null> {
  const cached = getCachedData<Hotel[]>(CACHE_KEYS.HOTELS, []);
  const found = cached.find((h) => h.id === id);
  if (found) return found;

  try {
    const snap = await withTimeout(getDoc(doc(db, 'hotels', id)), 350);
    if (snap.exists()) return mapHotel(snap.id, snap.data());
  } catch {
    // Ignore timeout
  }
  return null;
}

export async function createHotel(
  data: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'logoUrl' | 'createdBy'>,
  createdBy: string,
  logoFile?: File
): Promise<string> {
  let logoUrl = '';
  const newId = `hotel_${Date.now()}`;

  const newHotel: Hotel = {
    ...data,
    id: newId,
    logoUrl,
    active: true,
    createdAt: new Date(),
    createdBy,
    updatedAt: new Date(),
  };

  // Instant local save
  const current = getCachedData<Hotel[]>(CACHE_KEYS.HOTELS, []);
  setCachedData(CACHE_KEYS.HOTELS, [newHotel, ...current]);

  // Sync to Firestore in background
  addDoc(collection(db, 'hotels'), {
    hotelName: data.hotelName.trim(),
    logoUrl,
    address: data.address.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode.trim(),
    country: data.country || 'India',
    gstin: data.gstin.trim().toUpperCase(),
    pan: data.pan.trim().toUpperCase(),
    fssai: data.fssai.trim(),
    contactPerson: data.contactPerson.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLowerCase(),
    active: true,
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
  }).then(async (docRef) => {
    if (logoFile) {
      try {
        const finalLogoUrl = await uploadHotelLogo(logoFile, docRef.id);
        await updateDoc(doc(db, 'hotels', docRef.id), { logoUrl: finalLogoUrl });
      } catch {}
    }
  }).catch(() => {});

  return newId;
}

export async function updateHotel(
  id: string,
  data: Partial<Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>>,
  logoFile?: File
): Promise<void> {
  const current = getCachedData<Hotel[]>(CACHE_KEYS.HOTELS, []);
  const updated = current.map((h) => (h.id === id ? { ...h, ...data, updatedAt: new Date() } : h));
  setCachedData(CACHE_KEYS.HOTELS, updated);

  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  if (data.hotelName) updates.hotelName = data.hotelName.trim();
  if (data.gstin) updates.gstin = data.gstin.trim().toUpperCase();
  if (data.pan) updates.pan = data.pan.trim().toUpperCase();

  updateDoc(doc(db, 'hotels', id), updates).then(async () => {
    if (logoFile) {
      const finalLogoUrl = await uploadHotelLogo(logoFile, id);
      await updateDoc(doc(db, 'hotels', id), { logoUrl: finalLogoUrl });
    }
  }).catch(() => {});
}

export async function toggleHotelActive(id: string, active: boolean): Promise<void> {
  return updateHotel(id, { active });
}

export async function uploadHotelLogo(file: File, hotelId: string): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'png';
    const storageRef = ref(storage, `hotels/${hotelId}/logo.${ext}`);
    const metadata = { contentType: file.type };
    await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(storageRef);
  } catch {
    return '';
  }
}

export function validateLogoFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Allowed: JPEG, PNG, WebP, SVG.';
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'File size exceeds 5MB limit.';
  }
  return null;
}
