import { CacheInterface } from "./cacheInterface.js";
import { loggerService } from "../loggerService.js";

/**
 * In-memory implementation of the cache interface
 */
export class MemoryCache implements CacheInterface {
  private cache: Map<string, { value: unknown; expires?: number }> = new Map();

  /**
   * Store a value in memory cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time-to-live in seconds (optional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const item = {
        value,
        expires: ttl ? Date.now() + ttl * 1000 : undefined,
      };

      this.cache.set(key, item);
      loggerService.debug(`Stored value in memory cache: ${key}`);
    } catch (error) {
      loggerService.error("Failed to store value in memory cache", { key, error });
      throw error;
    }
  }

  /**
   * Retrieve a value from memory cache
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);

      if (!item) {
        return null;
      }

      // Check if the item has expired
      if (item.expires && item.expires < Date.now()) {
        this.cache.delete(key);
        return null;
      }

      return item.value as T;
    } catch (error) {
      loggerService.error("Failed to retrieve value from memory cache", { key, error });
      return null;
    }
  }

  /**
   * Delete a value from memory cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      loggerService.debug(`Deleted value from memory cache: ${key}`);
    } catch (error) {
      loggerService.error("Failed to delete value from memory cache", { key, error });
      throw error;
    }
  }

  /**
   * Check if a key exists in memory cache
   * @param key Cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const item = this.cache.get(key);

      if (!item) {
        return false;
      }

      // Check if the item has expired
      if (item.expires && item.expires < Date.now()) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      loggerService.error("Failed to check if key exists in memory cache", { key, error });
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern Pattern to match (uses simplified wildcard matching)
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      // Simple pattern matching for memory cache
      const regex = this.patternToRegex(pattern);

      // Filter keys and check expiration
      const currentTime = Date.now();
      const matchingKeys: string[] = [];

      for (const [key, item] of this.cache.entries()) {
        // Skip expired items
        if (item.expires && item.expires < currentTime) {
          this.cache.delete(key);
          continue;
        }

        // Check if key matches pattern
        if (regex.test(key)) {
          matchingKeys.push(key);
        }
      }

      return matchingKeys;
    } catch (error) {
      loggerService.error("Failed to get keys from memory cache", { pattern, error });
      return [];
    }
  }

  /**
   * Scan keys matching a pattern with pagination
   * @param pattern Pattern to match keys against
   * @param cursor Cursor for pagination (start with 0)
   * @param count Number of keys to return per page
   * @returns Object containing next cursor and matched keys
   */
  async scanKeys(
    pattern: string,
    cursor: number = 0,
    count: number = 10
  ): Promise<{ cursor: number; keys: string[] }> {
    try {
      // Get all matching keys first
      const allKeys = await this.keys(pattern);

      // Calculate pagination
      const startIndex = cursor;
      const endIndex = Math.min(startIndex + count, allKeys.length);

      // Get the keys for this page
      const keys = allKeys.slice(startIndex, endIndex);

      // Calculate the next cursor
      const nextCursor = endIndex >= allKeys.length ? 0 : endIndex;

      return {
        cursor: nextCursor,
        keys: keys,
      };
    } catch (error) {
      loggerService.error("Failed to scan keys from memory cache", {
        pattern,
        cursor,
        count,
        error,
      });
      return { cursor: 0, keys: [] };
    }
  }

  /**
   * Convert Redis-style pattern to RegExp
   * @private
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * which we'll handle separately
    let regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

    // Replace Redis * wildcard with regex .*
    regexPattern = regexPattern.replace(/\*/g, ".*");

    // Replace Redis ? wildcard with regex .
    regexPattern = regexPattern.replace(/\?/g, ".");

    return new RegExp(`^${regexPattern}$`);
  }
}
