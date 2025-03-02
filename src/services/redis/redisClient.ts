import { createClient, RedisClientType } from "redis";
import { loggerService } from "../loggerService.js";
import { config } from "../../config/index.js";

// Maximum number of connection attempts before giving up
const MAX_CONNECTION_ATTEMPTS = 3;

/**
 * Timeout wrapper for Redis operations
 * @param promise The promise to wrap with a timeout
 * @param ms Timeout in milliseconds
 * @param errorMessage Error message to use when timeout occurs
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 3000,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

/**
 * Singleton Redis client implementation
 */
class RedisClient {
  private static instance: RedisClient | null = null;
  private client: RedisClientType | null = null;
  private connected = false;
  private connectionAttempts = 0;
  private connectionPromise: Promise<void> | null = null;
  private hasLoggedFailure = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Handle Redis connection failure
   * @private
   */
  private handleConnectionFailure(error?: string): void {
    // Only log and handle the failure once when we reach max attempts
    if (
      this.connectionAttempts >= MAX_CONNECTION_ATTEMPTS &&
      this.connected !== false &&
      !this.hasLoggedFailure
    ) {
      loggerService.error(
        `Failed to connect to Redis after ${MAX_CONNECTION_ATTEMPTS} attempts, falling back to memory cache`
      );
      if (error) {
        loggerService.error("Redis connection error", { error });
      }
      this.connected = false;
      config.redis.enabled = false; // Disable Redis for this session
      this.hasLoggedFailure = true;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Connect to Redis
   */
  public connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      try {
        if (!config.redis.enabled) {
          // The log message about using memory cache is already handled in cacheFactory.ts
          resolve();
          return;
        }

        // Initialize Redis client
        loggerService.info(`Attempting to connect to Redis at ${config.redis.url}`);

        this.client = createClient({
          url: config.redis.url,
          username: config.redis.username || undefined,
          password: config.redis.password || undefined,
          socket: {
            reconnectStrategy: (retries) => {
              // Increment connection attempts counter
              this.connectionAttempts++;

              // Check if we've exceeded the maximum number of attempts
              if (this.connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
                this.handleConnectionFailure();
                resolve(); // Resolve the promise to prevent blocking app startup
                return false; // Return false to stop reconnection attempts
              }

              // Exponential backoff with a maximum delay
              const delay = Math.min(100 * Math.pow(2, retries), 3000);
              loggerService.info(
                `Redis reconnecting in ${delay}ms (attempt ${this.connectionAttempts} of ${MAX_CONNECTION_ATTEMPTS})`
              );
              return delay;
            },
          },
        });

        // Set up event listeners
        this.client.on("connect", () => {
          loggerService.info("Redis client connected");
          this.connected = true;
          resolve();
        });

        this.client.on("ready", () => {
          loggerService.info("Redis client ready");
          this.connected = true;
          this.connectionAttempts = 0; // Reset connection attempts on success
        });

        this.client.on("error", (err) => {
          loggerService.error("Redis client error", { error: err.message });

          if (this.connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
            this.handleConnectionFailure(err.message);
            resolve(); // Resolve the promise to prevent blocking app startup
          }
        });

        this.client.on("end", () => {
          loggerService.info("Redis client disconnected");
          this.connected = false;
        });

        // Connect to Redis
        this.client.connect().catch((err) => {
          loggerService.error("Redis connection error", { error: err.message });

          if (this.connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
            this.handleConnectionFailure(err.message);
            resolve(); // Resolve anyway to prevent blocking app startup
          } else {
            reject(err);
          }
        });
      } catch (error) {
        loggerService.error("Error initializing Redis client", {
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      await this.client.disconnect();
      this.connected = false;
      loggerService.info("Redis client disconnected");
    } catch (error) {
      loggerService.error("Error disconnecting from Redis", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if Redis is connected
   */
  public isConnected(): boolean {
    return (
      this.client !== null &&
      this.client !== undefined &&
      this.connected === true &&
      config.redis.enabled
    );
  }

  /**
   * Get a value from Redis
   * @param key Key to get
   * @returns Value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      if (!this.client) {
        return null;
      }
      const value = await withTimeout(this.client.get(key));
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      loggerService.error("Error getting value from Redis", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return null;
    }
  }

  /**
   * Set a value in Redis
   * @param key Key to set
   * @param value Value to store
   * @param ttl Time-to-live in seconds (optional)
   * @returns True if successful, false otherwise
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      if (!this.client) {
        return false;
      }
      const ttlToUse = ttl !== undefined ? ttl : config.redis.ttl;
      await withTimeout(this.client.set(key, JSON.stringify(value), { EX: ttlToUse }));
      return true;
    } catch (error) {
      loggerService.error("Error setting value in Redis", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return false;
    }
  }

  /**
   * Delete a value from Redis
   * @param key Key to delete
   * @returns True if successful, false otherwise
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      if (!this.client) {
        return false;
      }
      await withTimeout(this.client.del(key));
      return true;
    } catch (error) {
      loggerService.error("Error deleting value from Redis", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern Pattern to match keys against
   * @returns Array of keys
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      if (!this.client) {
        return [];
      }
      return await withTimeout(this.client.keys(pattern));
    } catch (error) {
      loggerService.error("Error getting keys from Redis", {
        error: error instanceof Error ? error.message : String(error),
        pattern,
      });
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
    if (!this.isConnected()) {
      return { cursor: 0, keys: [] };
    }

    try {
      if (!this.client) {
        return { cursor: 0, keys: [] };
      }

      // Redis scan expects cursor as string
      const scanCursor = cursor.toString();

      // Perform the scan operation
      const scanResult = await withTimeout(
        this.client.sendCommand(["SCAN", scanCursor, "MATCH", pattern, "COUNT", count.toString()])
      );

      // Parse the result
      if (Array.isArray(scanResult) && scanResult.length === 2) {
        const nextCursor = parseInt(scanResult[0] as string);
        const keys = scanResult[1] as string[];

        return {
          cursor: nextCursor,
          keys: keys,
        };
      }

      // Fallback if the result format is unexpected
      return { cursor: 0, keys: [] };
    } catch (error) {
      loggerService.error("Error scanning keys from Redis", {
        error: error instanceof Error ? error.message : String(error),
        pattern,
        cursor,
        count,
      });
      return { cursor: 0, keys: [] };
    }
  }

  /**
   * Check if a key exists
   * @param key Key to check
   * @returns True if key exists, false otherwise
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      if (!this.client) {
        return false;
      }
      const result = await withTimeout(this.client.exists(key));
      return result === 1;
    } catch (error) {
      loggerService.error("Error checking if key exists in Redis", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return false;
    }
  }
}

// Set up graceful shutdown
process.on("SIGINT", async () => {
  loggerService.info("SIGINT received, disconnecting from Redis");
  if (config.redis.enabled) {
    await RedisClient.getInstance().disconnect();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  loggerService.info("SIGTERM received, disconnecting from Redis");
  if (config.redis.enabled) {
    await RedisClient.getInstance().disconnect();
  }
  process.exit(0);
});

// Export Redis client class but don't initialize it yet
export const RedisClientSingleton = RedisClient;

// For backwards compatibility, but this doesn't initialize the client
export const redisClient = RedisClient.getInstance();
