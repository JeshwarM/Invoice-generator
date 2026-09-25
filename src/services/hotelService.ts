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
    active: data.active as boolean,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: (data.createdBy as string) || '',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export async function getHotels(activeOnly: boolean = false): Promise<Hotel[]> {
  let q;
  if (activeOnly) {
    q = query(collection(db, 'hotels'), where('active', '==', true), orderBy('hotelName', 'asc'));
  } else {
    q = query(collection(db, 'hotels'), orderBy('hotelName', 'asc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapHotel(d.id, d.data()));
}

export async function getHotel(id: string): Promise<Hotel | null> {
  const snap = await getDoc(doc(db, 'hotels', id));
  if (!snap.exists()) return null;
  return mapHotel(snap.id, snap.data());
}

export async function createHotel(
  data: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'logoUrl' | 'createdBy'>,
  createdBy: string,
  logoFile?: File
): Promise<string> {
  let logoUrl = '';
  if (logoFile) {
    logoUrl = await uploadHotelLogo(logoFile, `hotel_${Date.now()}`);
  }
  const docRef = await addDoc(collection(db, 'hotels'), {
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
  });
  // Update logo path with actual hotel ID
  if (logoFile) {
    const finalLogoUrl = await uploadHotelLogo(logoFile, docRef.id);
    await updateDoc(doc(db, 'hotels', docRef.id), { logoUrl: finalLogoUrl });
  }
  return docRef.id;
}

export async function updateHotel(
  id: string,
  data: Partial<Hotel>,
  logoFile?: File
): Promise<void> {
  const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (logoFile) {
    updateData.logoUrl = await uploadHotelLogo(logoFile, id);
  }
  delete updateData.id;
  delete updateData.createdAt;
  delete updateData.createdBy;
  await updateDoc(doc(db, 'hotels', id), updateData);
}

export async function toggleHotelActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'hotels', id), { active, updatedAt: serverTimestamp() });
}

async function uploadHotelLogo(file: File, hotelId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const storageRef = ref(storage, `hotels/${hotelId}/logo.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export function validateLogoFile(file: File): string | null {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Logo must be JPEG, PNG, WebP, or SVG format.';
  }
  if (file.size > MAX_SIZE) {
    return 'Logo must be smaller than 5MB.';
  }
  return null;
}
