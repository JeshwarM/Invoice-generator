import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuditAction, AuditEntityType } from '../types';
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

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
  const localId = `audit_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
  const entry: Record<string, unknown> = {
    id: localId,
    action,
    entityType,
    entityId,
    performedBy,
    performedByName,
    timestamp: new Date(),
    metadata,
    ...(oldValue && { oldValue }),
    ...(newValue && { newValue }),
  };

  // 1. Instant local store
  const cached = getCachedData<Array<Record<string, unknown>>>(CACHE_KEYS.AUDIT_LOGS, []);
  setCachedData(CACHE_KEYS.AUDIT_LOGS, [entry, ...cached].slice(0, 500));

  // 2. Background sync to Firestore without blocking UI
  addDoc(collection(db, 'auditLogs'), {
    action,
    entityType,
    entityId,
    performedBy,
    performedByName,
    timestamp: serverTimestamp(),
    metadata,
    ...(oldValue && { oldValue }),
    ...(newValue && { newValue }),
  }).catch(() => {});

  return localId;
}

export async function getAuditLogs(limitCount: number = 100): Promise<Array<Record<string, unknown>>> {
  const cached = getCachedData<Array<Record<string, unknown>>>(CACHE_KEYS.AUDIT_LOGS, []);
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
        };
      });
      setCachedData(CACHE_KEYS.AUDIT_LOGS, live.slice(0, 500));
      return live.slice(0, limitCount);
    }
  } catch {}

  return cached.slice(0, limitCount);
}

export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string
): Promise<Array<Record<string, unknown>>> {
  const cached = getCachedData<Array<Record<string, unknown>>>(CACHE_KEYS.AUDIT_LOGS, []);
  const filtered = cached.filter((l) => l.entityType === entityType && l.entityId === entityId);
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
        };
      });
    }
  } catch {}

  return filtered;
}
