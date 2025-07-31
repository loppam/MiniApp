// Cache utility for Firebase data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class FirebaseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

  set<T>(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }
}

// Global cache instance
export const firebaseCache = new FirebaseCache();
