import { RedisCache } from "./redisCache.js";
import { loggerService } from "../loggerService.js";

// Mock the singleton instance
const redisClient = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  scanKeys: jest.fn(),
  isConnected: jest.fn(),
};

// Mock config object for tests
const config = {
  redis: {
    enabled: true,
    ttl: 3600,
  },
};

// Mock dependencies
jest.mock("../redis/redisClient.js", () => ({
  RedisClientSingleton: {
    getInstance: jest.fn(() => redisClient),
  },
}));
jest.mock("../loggerService.js");
jest.mock("../../config/index.js", () => ({
  config: {
    redis: {
      enabled: true,
      ttl: 3600,
    },
  },
}));

describe("RedisCache", () => {
  let redisCache: RedisCache;

  beforeEach(() => {
    jest.clearAllMocks();

    // Jest automatically spies on redisClient
    jest.spyOn(redisClient, "get").mockResolvedValue(null);
    jest.spyOn(redisClient, "set").mockResolvedValue(true);
    jest.spyOn(redisClient, "delete").mockResolvedValue(true);
    jest.spyOn(redisClient, "exists").mockResolvedValue(false);
    jest.spyOn(redisClient, "keys").mockResolvedValue([]);
    jest.spyOn(redisClient, "scanKeys").mockResolvedValue({ cursor: 0, keys: [] });
    jest.spyOn(redisClient, "isConnected").mockReturnValue(true);

    // Create fresh instance for each test
    redisCache = new RedisCache();
  });

  describe("when Redis is enabled", () => {
    beforeEach(() => {
      // Config is already set in the mock
    });

    describe("set", () => {
      it("should store string values", async () => {
        await redisCache.set("test-key", "test-value");

        expect(redisClient.set).toHaveBeenCalledWith("test-key", "test-value", config.redis.ttl);
        expect(loggerService.debug).toHaveBeenCalled();
      });

      it("should store object values", async () => {
        const testObj = { name: "test", value: 123 };
        await redisCache.set("test-obj", testObj);

        expect(redisClient.set).toHaveBeenCalledWith("test-obj", testObj, config.redis.ttl);
      });

      it("should use custom TTL when provided", async () => {
        const customTtl = 500;
        await redisCache.set("ttl-key", "ttl-value", customTtl);

        expect(redisClient.set).toHaveBeenCalledWith("ttl-key", "ttl-value", customTtl);
      });

      it("should handle Redis client errors", async () => {
        (redisClient.set as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

        await redisCache.set("error-key", "value");

        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe("get", () => {
      it("should retrieve values from Redis", async () => {
        const mockValue = "redis-value";
        (redisClient.get as jest.Mock).mockResolvedValueOnce(mockValue);

        const value = await redisCache.get<string>("test-key");

        expect(value).toBe(mockValue);
        expect(redisClient.get).toHaveBeenCalledWith("test-key");
      });

      it("should handle null values", async () => {
        (redisClient.get as jest.Mock).mockResolvedValueOnce(null);

        const value = await redisCache.get<string>("null-key");

        expect(value).toBeNull();
      });

      it("should handle Redis client errors", async () => {
        (redisClient.get as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

        const value = await redisCache.get<string>("error-key");

        expect(value).toBeNull();
        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe("delete", () => {
      it("should delete keys from Redis", async () => {
        await redisCache.delete("delete-key");

        expect(redisClient.delete).toHaveBeenCalledWith("delete-key");
        expect(loggerService.debug).toHaveBeenCalled();
      });

      it("should handle Redis client errors", async () => {
        (redisClient.delete as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

        await redisCache.delete("error-key");

        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe("exists", () => {
      it("should check if key exists in Redis", async () => {
        (redisClient.exists as jest.Mock).mockResolvedValueOnce(true);

        const exists = await redisCache.exists("exists-key");

        expect(exists).toBe(true);
        expect(redisClient.exists).toHaveBeenCalledWith("exists-key");
      });

      it("should handle Redis client errors", async () => {
        (redisClient.exists as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

        const exists = await redisCache.exists("error-key");

        expect(exists).toBe(false);
        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe("keys", () => {
      it("should get keys matching pattern from Redis", async () => {
        const mockKeys = ["key1", "key2", "key3"];
        (redisClient.keys as jest.Mock).mockResolvedValueOnce(mockKeys);

        const keys = await redisCache.keys("test-pattern");

        expect(keys).toEqual(mockKeys);
        expect(redisClient.keys).toHaveBeenCalledWith("test-pattern");
      });

      it("should handle Redis client errors", async () => {
        (redisClient.keys as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

        const keys = await redisCache.keys("error-pattern");

        expect(keys).toEqual([]);
        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe("scanKeys", () => {
      it("should scan keys with pagination from Redis", async () => {
        const mockResult = { cursor: 42, keys: ["key1", "key2"] };
        (redisClient.scanKeys as jest.Mock).mockResolvedValueOnce(mockResult);

        const result = await redisCache.scanKeys("test-pattern", 0, 10);

        expect(result).toEqual(mockResult);
        expect(redisClient.scanKeys).toHaveBeenCalledWith("test-pattern", 0, 10);
      });

      it("should handle Redis client errors", async () => {
        (redisClient.scanKeys as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCache.scanKeys("error-pattern", 0, 10);

        expect(result).toEqual({ cursor: 0, keys: [] });
        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe("getMultiple", () => {
      it("should get multiple keys from Redis", async () => {
        (redisClient.get as jest.Mock)
          .mockResolvedValueOnce("value1")
          .mockResolvedValueOnce("value2")
          .mockResolvedValueOnce(null);

        const values = await redisCache.getMultiple<string>(["key1", "key2", "key3"]);

        expect(values).toEqual({
          key1: "value1",
          key2: "value2",
          key3: null,
        });
        expect(redisClient.get).toHaveBeenCalledTimes(3);
      });

      it("should handle Redis client errors for individual keys", async () => {
        (redisClient.get as jest.Mock)
          .mockResolvedValueOnce("value1")
          .mockRejectedValueOnce(new Error("Redis error"))
          .mockResolvedValueOnce("value3");

        const values = await redisCache.getMultiple<string>(["key1", "key2", "key3"]);

        expect(values).toEqual({
          key1: "value1",
          key2: null,
          key3: "value3",
        });
        expect(loggerService.error).toHaveBeenCalled();
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

        expect(redisClient.set).toHaveBeenCalledTimes(3);
        expect(redisClient.set).toHaveBeenCalledWith("key1", "value1", config.redis.ttl);
        expect(redisClient.set).toHaveBeenCalledWith("key2", { name: "test" }, config.redis.ttl);
        expect(redisClient.set).toHaveBeenCalledWith("key3", 42, config.redis.ttl);
      });

      it("should use custom TTL when provided", async () => {
        const entries = {
          key1: "value1",
          key2: "value2",
        };
        const customTtl = 500;

        await redisCache.setMultiple(entries, customTtl);

        expect(redisClient.set).toHaveBeenCalledWith("key1", "value1", customTtl);
        expect(redisClient.set).toHaveBeenCalledWith("key2", "value2", customTtl);
      });

      it("should handle Redis client errors for individual keys", async () => {
        (redisClient.set as jest.Mock)
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error("Redis error"));

        const entries = {
          key1: "value1",
          key2: "value2",
        };

        await redisCache.setMultiple(entries);

        expect(loggerService.error).toHaveBeenCalled();
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

      expect(redisClient.set).not.toHaveBeenCalled();
      expect(redisClient.get).not.toHaveBeenCalled();
      expect(redisClient.delete).not.toHaveBeenCalled();
      expect(redisClient.exists).not.toHaveBeenCalled();
      expect(redisClient.keys).not.toHaveBeenCalled();
      expect(redisClient.scanKeys).not.toHaveBeenCalled();
    });
  });
});
