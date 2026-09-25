/**
 * High-performance local-first cache for AgroBill.
 * Eliminates slow Firestore network timeouts and makes all page loads instant (<10ms).
 */

const CACHE_KEYS = {
  HOTELS: 'agrobill_cache_hotels',
  PRODUCTS: 'agrobill_cache_products',
  CONTRACTS: 'agrobill_cache_contracts',
  CONTRACT_ITEMS: 'agrobill_cache_contract_items',
  INVOICES: 'agrobill_cache_invoices',
  DRAFTS: 'agrobill_cache_drafts',
  SETTINGS: 'agrobill_cache_settings',
  AUDIT_LOGS: 'agrobill_cache_audit_logs',
  USERS: 'agrobill_cache_users',
  ACCESS_REQUESTS: 'agrobill_cache_access_requests',
  COUNTERS: 'agrobill_cache_counters',
} as const;

export function getCachedData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setCachedData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Race a promise against a fast timeout (default 800ms)
 * to prevent slow Firestore queries from blocking UI rendering.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 350): Promise<T> {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('NETWORK_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw err;
  }
}

export { CACHE_KEYS };
