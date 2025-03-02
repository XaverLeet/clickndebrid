import { RedisCache } from "./redisCache";
import { RedisClient } from "../redis/redisClient";
import { LoggerService } from "../loggerService";
import * as config from "../../config";

// Mock dependencies
jest.mock("../redis/redisClient");
jest.mock("../loggerService");
jest.mock("../../config", () => ({
  redis: {
    enabled: true,
    ttl: 3600,
  },
}));

describe("RedisCache", () => {
  let redisCache: RedisCache;
  let mockRedisClient: jest.Mocked<RedisClient>;
  let mockLoggerService: jest.Mocked<LoggerService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockRedisClient = RedisClient.getInstance() as jest.Mocked<RedisClient>;
    mockLoggerService = LoggerService.getInstance() as jest.Mocked<LoggerService>;

    // Default implementations for Redis client methods
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue(true);
    mockRedisClient.delete.mockResolvedValue(true);
    mockRedisClient.exists.mockResolvedValue(false);
    mockRedisClient.keys.mockResolvedValue([]);
    mockRedisClient.scanKeys.mockResolvedValue({ cursor: 0, keys: [] });
    mockRedisClient.isConnected.mockReturnValue(true);

    // Create fresh instance for each test
    redisCache = new RedisCache();
  });

  describe("when Redis is enabled", () => {
    beforeEach(() => {
      (config.redis.enabled as boolean) = true;
    });

    describe("set", () => {
      it("should store string values", async () => {
        await redisCache.set("test-key", "test-value");

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          "test-key",
          "test-value",
          config.redis.ttl
        );
        expect(mockLoggerService.debug).toHaveBeenCalled();
      });

      it("should store object values", async () => {
        const testObj = { name: "test", value: 123 };
        await redisCache.set("test-obj", testObj);

        expect(mockRedisClient.set).toHaveBeenCalledWith("test-obj", testObj, config.redis.ttl);
      });

      it("should use custom TTL when provided", async () => {
        const customTtl = 500;
        await redisCache.set("ttl-key", "ttl-value", customTtl);

        expect(mockRedisClient.set).toHaveBeenCalledWith("ttl-key", "ttl-value", customTtl);
      });

      it("should handle Redis client errors", async () => {
        mockRedisClient.set.mockRejectedValueOnce(new Error("Redis error"));

        await redisCache.set("error-key", "value");

        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("get", () => {
      it("should retrieve values from Redis", async () => {
        const mockValue = "redis-value";
        mockRedisClient.get.mockResolvedValueOnce(mockValue);

        const value = await redisCache.get<string>("test-key");

        expect(value).toBe(mockValue);
        expect(mockRedisClient.get).toHaveBeenCalledWith("test-key");
      });

      it("should handle null values", async () => {
        mockRedisClient.get.mockResolvedValueOnce(null);

        const value = await redisCache.get<string>("null-key");

        expect(value).toBeNull();
      });

      it("should handle Redis client errors", async () => {
        mockRedisClient.get.mockRejectedValueOnce(new Error("Redis error"));

        const value = await redisCache.get<string>("error-key");

        expect(value).toBeNull();
        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("delete", () => {
      it("should delete keys from Redis", async () => {
        await redisCache.delete("delete-key");

        expect(mockRedisClient.delete).toHaveBeenCalledWith("delete-key");
        expect(mockLoggerService.debug).toHaveBeenCalled();
      });

      it("should handle Redis client errors", async () => {
        mockRedisClient.delete.mockRejectedValueOnce(new Error("Redis error"));

        await redisCache.delete("error-key");

        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("exists", () => {
      it("should check if key exists in Redis", async () => {
        mockRedisClient.exists.mockResolvedValueOnce(true);

        const exists = await redisCache.exists("exists-key");

        expect(exists).toBe(true);
        expect(mockRedisClient.exists).toHaveBeenCalledWith("exists-key");
      });

      it("should handle Redis client errors", async () => {
        mockRedisClient.exists.mockRejectedValueOnce(new Error("Redis error"));

        const exists = await redisCache.exists("error-key");

        expect(exists).toBe(false);
        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("keys", () => {
      it("should get keys matching pattern from Redis", async () => {
        const mockKeys = ["key1", "key2", "key3"];
        mockRedisClient.keys.mockResolvedValueOnce(mockKeys);

        const keys = await redisCache.keys("test-pattern");

        expect(keys).toEqual(mockKeys);
        expect(mockRedisClient.keys).toHaveBeenCalledWith("test-pattern");
      });

      it("should handle Redis client errors", async () => {
        mockRedisClient.keys.mockRejectedValueOnce(new Error("Redis error"));

        const keys = await redisCache.keys("error-pattern");

        expect(keys).toEqual([]);
        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("scanKeys", () => {
      it("should scan keys with pagination from Redis", async () => {
        const mockResult = { cursor: 42, keys: ["key1", "key2"] };
        mockRedisClient.scanKeys.mockResolvedValueOnce(mockResult);

        const result = await redisCache.scanKeys("test-pattern", 0, 10);

        expect(result).toEqual(mockResult);
        expect(mockRedisClient.scanKeys).toHaveBeenCalledWith("test-pattern", 0, 10);
      });

      it("should handle Redis client errors", async () => {
        mockRedisClient.scanKeys.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCache.scanKeys("error-pattern", 0, 10);

        expect(result).toEqual({ cursor: 0, keys: [] });
        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("getMultiple", () => {
      it("should get multiple keys from Redis", async () => {
        mockRedisClient.get
          .mockResolvedValueOnce("value1")
          .mockResolvedValueOnce("value2")
          .mockResolvedValueOnce(null);

        const values = await redisCache.getMultiple<string>(["key1", "key2", "key3"]);

        expect(values).toEqual({
          key1: "value1",
          key2: "value2",
          key3: null,
        });
        expect(mockRedisClient.get).toHaveBeenCalledTimes(3);
      });

      it("should handle Redis client errors for individual keys", async () => {
        mockRedisClient.get
          .mockResolvedValueOnce("value1")
          .mockRejectedValueOnce(new Error("Redis error"))
          .mockResolvedValueOnce("value3");

        const values = await redisCache.getMultiple<string>(["key1", "key2", "key3"]);

        expect(values).toEqual({
          key1: "value1",
          key2: null,
          key3: "value3",
        });
        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });

    describe("setMultiple", () => {
      it("should set multiple keys in Redis", async () => {
        const entries = {
          key1: "value1",
          key2: { name: "test" },
          key3: 42,
        };

        await redisCache.setMultiple(entries);

        expect(mockRedisClient.set).toHaveBeenCalledTimes(3);
        expect(mockRedisClient.set).toHaveBeenCalledWith("key1", "value1", config.redis.ttl);
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          "key2",
          { name: "test" },
          config.redis.ttl
        );
        expect(mockRedisClient.set).toHaveBeenCalledWith("key3", 42, config.redis.ttl);
      });

      it("should use custom TTL when provided", async () => {
        const entries = {
          key1: "value1",
          key2: "value2",
        };
        const customTtl = 500;

        await redisCache.setMultiple(entries, customTtl);

        expect(mockRedisClient.set).toHaveBeenCalledWith("key1", "value1", customTtl);
        expect(mockRedisClient.set).toHaveBeenCalledWith("key2", "value2", customTtl);
      });

      it("should handle Redis client errors for individual keys", async () => {
        mockRedisClient.set
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error("Redis error"));

        const entries = {
          key1: "value1",
          key2: "value2",
        };

        await redisCache.setMultiple(entries);

        expect(mockLoggerService.error).toHaveBeenCalled();
      });
    });
  });

  describe("when Redis is disabled", () => {
    beforeEach(() => {
      (config.redis.enabled as boolean) = false;
    });

    it("should not call Redis client methods", async () => {
      await redisCache.set("key", "value");
      await redisCache.get("key");
      await redisCache.delete("key");
      await redisCache.exists("key");
      await redisCache.keys("pattern");
      await redisCache.scanKeys("pattern", 0, 10);
      await redisCache.getMultiple(["key1", "key2"]);
      await redisCache.setMultiple({ key1: "value1", key2: "value2" });

      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
      expect(mockRedisClient.delete).not.toHaveBeenCalled();
      expect(mockRedisClient.exists).not.toHaveBeenCalled();
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
      expect(mockRedisClient.scanKeys).not.toHaveBeenCalled();
    });
  });
});
