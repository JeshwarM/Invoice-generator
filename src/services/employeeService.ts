import {
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, AccessRequest, UserStatus, AccessRequestStatus } from '../types';

function mapUser(id: string, data: Record<string, unknown>): User {
  return {
    uid: id,
    name: (data.name as string) || '',
    email: (data.email as string) || '',
    role: (data.role as User['role']) || 'employee',
    status: (data.status as UserStatus) || 'pending',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : null,
  };
}

function mapAccessRequest(id: string, data: Record<string, unknown>): AccessRequest {
  return {
    id,
    name: (data.name as string) || '',
    email: (data.email as string) || '',
    status: (data.status as AccessRequestStatus) || 'pending',
    requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(),
    reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : null,
    reviewedBy: (data.reviewedBy as string) || null,
    rejectionReason: (data.rejectionReason as string) || undefined,
  };
}

export async function getAccessRequests(status?: AccessRequestStatus): Promise<AccessRequest[]> {
  let q;
  if (status) {
    q = query(
      collection(db, 'accessRequests'),
      where('status', '==', status),
      orderBy('requestedAt', 'desc')
    );
  } else {
    q = query(collection(db, 'accessRequests'), orderBy('requestedAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapAccessRequest(d.id, d.data()));
}

export async function getPendingRequestCount(): Promise<number> {
  const q = query(collection(db, 'accessRequests'), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function approveAccessRequest(
  requestId: string,
  reviewerUid: string
): Promise<void> {
  // Update the access request status
  await updateDoc(doc(db, 'accessRequests', requestId), {
    status: 'approved' as AccessRequestStatus,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
  });
  // Note: In production, a Cloud Function would create the Firebase Auth user
  // and send the invitation email. For now, the controller manually creates
  // the user via Firebase Console or a Cloud Function trigger.
}

export async function rejectAccessRequest(
  requestId: string,
  reviewerUid: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, 'accessRequests', requestId), {
    status: 'rejected' as AccessRequestStatus,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
    rejectionReason: reason,
  });
}

export async function getUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapUser(d.id, d.data()));
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status,
    updatedAt: serverTimestamp(),
  });
}
