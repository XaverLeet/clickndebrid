import { RedisClientSingleton } from "../redis/redisClient.js";
import { CacheInterface } from "./cacheInterface.js";
import { loggerService } from "../loggerService.js";
import { config } from "../../config/index.js";

// Get Redis client instance
const redisClient = RedisClientSingleton.getInstance();

/**
 * Redis implementation of the cache interface
 */
export class RedisCache implements CacheInterface {
  /**
   * Store a value in Redis
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!config.redis.enabled) {
      loggerService.debug("Redis is not available, skipping set operation");
      return;
    }

    try {
      await redisClient.set(key, value, ttl);
      loggerService.debug("Stored value in Redis cache", { key });
    } catch (error) {
      loggerService.error("Failed to store value in Redis cache", {
        key,
        error,
      });
      // Don't throw the error to prevent application failures due to Redis issues
    }
  }

  /**
   * Retrieve a value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    if (!config.redis.enabled) {
      loggerService.debug("Redis is not available, returning null");
      return null;
    }

    try {
      const data = await redisClient.get<T>(key);

      if (data === null) {
        loggerService.debug("Cache miss in Redis", { key });
        return null;
      }

      loggerService.debug("Cache hit in Redis", { key });
      return data;
    } catch (error) {
      loggerService.error("Failed to retrieve value from Redis cache", {
        key,
        error,
      });
      return null;
    }
  }

  /**
   * Delete a value from Redis
   */
  async delete(key: string): Promise<void> {
    if (!config.redis.enabled) {
      loggerService.debug("Redis is not available, skipping delete operation");
      return;
    }

    try {
      await redisClient.delete(key);
      loggerService.debug("Deleted value from Redis cache", { key });
    } catch (error) {
      loggerService.error("Failed to delete value from Redis cache", {
        key,
        error,
      });
      // Don't throw the error to prevent application failures due to Redis issues
    }
  }

  /**
   * Check if a key exists in Redis
   * @param key Cache key
   */
  async exists(key: string): Promise<boolean> {
    if (!config.redis.enabled) {
      loggerService.debug("Redis is not available, checking memory cache");
      return false;
    }

    try {
      return await redisClient.exists(key);
    } catch (error) {
      loggerService.error("Error checking key existence in Redis", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern Pattern to match
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      loggerService.error("Failed to get keys from Redis cache", { pattern, error });
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
      return await redisClient.scanKeys(pattern, cursor, count);
    } catch (error) {
      loggerService.error("Failed to scan keys from Redis cache", {
        pattern,
        cursor,
        count,
        error,
      });
      return { cursor: 0, keys: [] };
    }
  }

  /**
   * Get multiple values from Redis
   * @param keys List of keys to get
   * @returns Map of key-value pairs
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    if (!config.redis.enabled) {
      loggerService.debug("Redis is not available, returning empty map");
      return new Map();
    }

    const result = new Map<string, T | null>();

    try {
      // Process each key individually since we don't have direct MGET support in our wrapper
      for (const key of keys) {
        const value = await redisClient.get<T>(key);
        result.set(key, value);
      }

      return result;
    } catch (error) {
      loggerService.error("Failed to retrieve multiple values from Redis cache", { keys, error });
      return result;
    }
  }

  /**
   * Set multiple values in Redis
   */
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    if (!config.redis.enabled) {
      loggerService.debug("Redis is not available, skipping setMultiple operation");
      return;
    }

    try {
      // Process each entry individually since we don't have direct MSET support in our wrapper
      for (const [key, value] of entries.entries()) {
        await redisClient.set(key, value, ttl);
      }

      loggerService.debug("Stored multiple values in Redis cache", {
        count: entries.size,
      });
    } catch (error) {
      loggerService.error("Failed to store multiple values in Redis cache", {
        error,
      });
      // Don't throw the error to prevent application failures due to Redis issues
    }
  }
}
