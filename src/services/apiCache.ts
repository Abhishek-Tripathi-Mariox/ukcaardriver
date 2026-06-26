// Lightweight in-memory cache + in-flight dedupe for driver-app reads.
//
// The driver app refetches the same endpoints from every screen it lands on
// (Dashboard, Earnings, Profile, History, etc.). Without coordination, a
// driver who taps around for 15 minutes can easily make 200+ requests for
// the same data, tripping the backend rate limiter ("Too many requests").
//
// This module gives each cacheable endpoint:
//   - getOrFetch(key, fetcher, ttlMs): returns the cached value if fresh,
//     otherwise fires `fetcher()` and stores the result. Concurrent callers
//     during a single in-flight request share the same Promise (dedupe).
//   - set(key, value): hot-write a value (after a successful mutation so
//     the next reader sees the new state without a round-trip).
//   - invalidate(key): drop a single entry (next read fetches fresh).
//   - invalidatePrefix(prefix): drop every entry whose key starts with the
//     prefix. Use for grouped invalidations like `dashboard:*`.
//
// Everything is in-memory only — cleared on app cold start. We deliberately
// don't persist; stale data on launch is a bigger UX risk than an extra
// network call when the app opens.

type Entry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();

export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  // Dedupe: if a request for this key is already in flight, await it.
  // Prevents two screens mounting simultaneously from firing two copies of
  // the same GET.
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidate(key: string): void {
  store.delete(key);
}

export function invalidatePrefix(prefix: string): void {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function clearAllCache(): void {
  store.clear();
  inflight.clear();
}

// Stable keys for the endpoints we cache. Keeping them as constants prevents
// typos that would silently bypass the cache.
export const CACHE_KEYS = {
  CURRENT_USER: 'auth:me',
  DASHBOARD: 'driver:dashboard',
  EARNINGS: 'driver:earnings',
  UNREAD_NOTIF_COUNT: 'notif:unread-count',
  WALLET: 'wallet:balance',
} as const;

// TTLs — tuned for how stale each field is allowed to be before the user
// notices something feels wrong.
export const CACHE_TTL = {
  // Profile data rarely changes. 5 min is plenty; mutations invalidate it.
  CURRENT_USER: 5 * 60 * 1000,
  // Dashboard shows online status + today's stats. Cheap to refresh on
  // explicit pull-to-refresh; otherwise a 60s window is fine.
  DASHBOARD: 60 * 1000,
  // Earnings update only when a ride completes — that completion triggers an
  // invalidation, so the cache itself can be longer.
  EARNINGS: 5 * 60 * 1000,
  // Notification unread count: short TTL so the badge feels live, but long
  // enough that screen-flicking doesn't pound the endpoint. FCM/socket
  // push events also call invalidate() so a real new notification is
  // reflected instantly.
  UNREAD_NOTIF_COUNT: 30 * 1000,
  // Wallet balance — recharge / cashout flows invalidate explicitly.
  WALLET: 2 * 60 * 1000,
} as const;
