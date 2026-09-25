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
import { db } from '../config/firebase';
import type { AuditAction, AuditEntityType } from '../types';

export async function createAuditLog(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  performedBy: string,
  performedByName: string,
  metadata: Record<string, unknown> = {},
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'auditLogs'), {
    action,
    entityType,
    entityId,
    performedBy,
    performedByName,
    timestamp: serverTimestamp(),
    metadata,
    ...(oldValue && { oldValue }),
    ...(newValue && { newValue }),
  });
  return docRef.id;
}

export async function getAuditLogs(limitCount: number = 100): Promise<Array<Record<string, unknown>>> {
  const q = query(
    collection(db, 'auditLogs'),
    orderBy('timestamp', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limitCount).map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
    };
  });
}

export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string
): Promise<Array<Record<string, unknown>>> {
  const q = query(
    collection(db, 'auditLogs'),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
    };
  });
}
