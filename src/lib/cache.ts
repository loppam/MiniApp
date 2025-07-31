// Cache utility for Firebase data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class FirebaseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  private readonly INITIAL_PERIOD = 4 * 60 * 60 * 1000; // 4 hours for initial period

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

  // Check if user profile is in initial period (first 4 hours)
  shouldSkipCache(profile: { createdAt?: unknown }): boolean {
    if (!profile?.createdAt) return false;

    try {
      let createdAt: Date;

      // Handle Firestore Timestamp
      if (
        profile.createdAt &&
        typeof profile.createdAt === "object" &&
        "toDate" in profile.createdAt
      ) {
        createdAt = (profile.createdAt as { toDate: () => Date }).toDate();
      } else {
        // Handle string or Date
        createdAt = new Date(profile.createdAt as string);
      }

      const now = new Date();
      const timeSinceCreation = now.getTime() - createdAt.getTime();

      // Skip cache if profile was created within the last 4 hours
      return timeSinceCreation < this.INITIAL_PERIOD;
    } catch {
      // If we can't parse the date, don't skip cache
      return false;
    }
  }
}

// Global cache instance
export const firebaseCache = new FirebaseCache();
