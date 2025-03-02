import { CacheInterface } from './cacheInterface';
import { RedisCache } from './redisCache';
import { MemoryCache } from './memoryCache';
import { config } from '../../config';
import { loggerService } from '../loggerService';

/**
 * Cache factory to create the appropriate cache provider
 */
class CacheFactory {
  private static instance: CacheFactory;
  private cacheProvider: CacheInterface | null = null;

  private constructor() {
    // Don't initialize the cache provider in the constructor
    // It will be initialized lazily when needed
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheFactory {
    if (!CacheFactory.instance) {
      CacheFactory.instance = new CacheFactory();
    }
    return CacheFactory.instance;
  }

  /**
   * Get the cache provider
   */
  public getProvider(): CacheInterface {
    // Lazy initialization of the cache provider
    if (!this.cacheProvider) {
      if (config.redis.enabled) {
        loggerService.info('Using Redis cache provider');
        this.cacheProvider = new RedisCache();
      } else {
        loggerService.info('Using memory cache provider');
        this.cacheProvider = new MemoryCache();
      }
    }
    return this.cacheProvider;
  }
}

// Export singleton cache factory
// Note: This doesn't immediately initialize the cache provider
const cacheFactory = CacheFactory.getInstance();

// Export a function to get the cache provider
// This will initialize the provider only when it's first called
export const getCacheService = (): CacheInterface => {
  return cacheFactory.getProvider();
};
