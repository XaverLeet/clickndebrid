/**
 * Generic cache interface for different storage backends
 */
export interface CacheInterface {
  /**
   * Store a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time-to-live in seconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  /**
   * Retrieve a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  delete(key: string): Promise<void>;
  
  /**
   * Check if a key exists in the cache
   * @param key Cache key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get all keys matching a pattern
   * @param pattern Pattern to match
   */
  keys(pattern: string): Promise<string[]>;
  
  /**
   * Scan keys matching a pattern with pagination
   * @param pattern Pattern to match keys against
   * @param cursor Cursor for pagination (start with 0)
   * @param count Number of keys to return per page
   * @returns Object containing next cursor and matched keys
   */
  scanKeys(
    pattern: string, 
    cursor?: number, 
    count?: number
  ): Promise<{ cursor: number; keys: string[] }>;
}
