const API_CACHE_NAME = 'urwa-api-cache-v1';

interface CachedEnvelope<T> {
  cachedAt: number;
  data: T;
}

const memoryCache = new Map<string, CachedEnvelope<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Fetches JSON with in-memory + persistent Cache API caching and request deduplication.
 * Preserves exact upstream quality while eliminating redundant network calls.
 */
export async function fetchJsonWithCache<T>(
  url: string,
  options: { maxAgeMs?: number } = {}
): Promise<T> {
  const { maxAgeMs = 30 * 86_400_000 } = options;
  const now = Date.now();

  // 1. Instant in-memory hit
  const memHit = memoryCache.get(url) as CachedEnvelope<T> | undefined;
  if (memHit && now - memHit.cachedAt < maxAgeMs) {
    return memHit.data;
  }

  // 2. Deduplicate concurrent fetches for the same URL
  const pending = inFlightRequests.get(url) as Promise<T> | undefined;
  if (pending) return pending;

  const task = (async (): Promise<T> => {
    // 3. Persistent Cache API hit
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(API_CACHE_NAME);
        const cachedRes = await cache.match(url);
        if (cachedRes) {
          const envelope = (await cachedRes.json()) as CachedEnvelope<T>;
          if (envelope && typeof envelope.cachedAt === 'number' && now - envelope.cachedAt < maxAgeMs) {
            memoryCache.set(url, envelope);
            return envelope.data;
          }
        }
      } catch {
        // Ignore cache read failures and fall through to network
      }
    }

    // 4. Network fetch + persist
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while fetching ${url}`);
    }
    const data = (await res.json()) as T;
    const envelope: CachedEnvelope<T> = { cachedAt: Date.now(), data };
    memoryCache.set(url, envelope);

    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(API_CACHE_NAME);
        await cache.put(
          url,
          new Response(JSON.stringify(envelope), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      } catch {
        // Ignore quota or storage errors cleanly
      }
    }

    return data;
  })();

  inFlightRequests.set(url, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(url);
  }
}
