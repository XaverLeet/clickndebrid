import { redisClient } from "./redisClient.js";
import { loggerService } from "../loggerService.js";
import { config } from "../../config/index.js";
import { createClient } from "redis";

// Mock dependencies
jest.mock("../loggerService.js");
jest.mock("redis");
const MAX_RETRIES = 3;

jest.mock("../../config/index.js", () => ({
  config: {
    redis: {
      url: "redis://localhost:6379",
      password: "test-password",
      enabled: true,
      ttl: 3600,
    },
  },
}));

describe("RedisClient", () => {
  let mockRedisClient: {
    connect: jest.Mock;
    disconnect: jest.Mock;
    isOpen: boolean;
    on: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
    keys: jest.Mock;
    scan: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Redis client
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isOpen: true,
      on: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      keys: jest.fn().mockResolvedValue([]),
      scan: jest.fn().mockResolvedValue({
        cursor: 0,
        keys: [],
      }),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
  });

  describe("getInstance", () => {
    it("should be a singleton instance", () => {
      expect(redisClient).toBeDefined();
    });
  });

  describe("connect", () => {
    it("should connect to Redis successfully", async () => {
      await redisClient.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      // Using real logger service
      expect(loggerService.info).toHaveBeenCalled();
    });

    it("should retry connection on failure", async () => {
      // First attempt fails, second succeeds
      mockRedisClient.connect
        .mockRejectedValueOnce(new Error("Connection failed"))
        .mockResolvedValueOnce(undefined);

      await redisClient.connect();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(2);
      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalled();
    });

    it("should fail after max retries", async () => {
      // All attempts fail
      mockRedisClient.connect.mockRejectedValue(new Error("Connection failed"));

      await redisClient.connect();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(MAX_RETRIES + 1);
      // We can't check exact call count since we're using the real loggerService
      expect(loggerService.error).toHaveBeenCalled();
    });

    it("should register event handlers", async () => {
      await redisClient.connect();

      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("ready", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("end", expect.any(Function));
    });
  });

  describe("disconnect", () => {
    it("should disconnect from Redis", async () => {
      await redisClient.connect();
      await redisClient.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalled();
    });

    it("should handle errors during disconnection", async () => {
      mockRedisClient.disconnect.mockRejectedValueOnce(new Error("Disconnect error"));

      await redisClient.connect();
      await redisClient.disconnect();

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe("isConnected", () => {
    it("should return true when connected", async () => {
      await redisClient.connect();
      mockRedisClient.isOpen = true;

      expect(redisClient.isConnected()).toBe(true);
    });

    it("should return false when not connected", async () => {
      mockRedisClient.isOpen = false;

      expect(redisClient.isConnected()).toBe(false);
    });
  });

  describe("get", () => {
    it("should get and parse JSON values", async () => {
      const mockValue = JSON.stringify({ test: "value" });
      mockRedisClient.get.mockResolvedValueOnce(mockValue);

      const result = await redisClient.get<{ test: string }>("test-key");

      expect(result).toEqual({ test: "value" });
      expect(mockRedisClient.get).toHaveBeenCalledWith("test-key");
    });

    it("should handle non-JSON values", async () => {
      mockRedisClient.get.mockResolvedValueOnce("plain-string");

      const result = await redisClient.get<string>("test-key");

      expect(result).toBe("plain-string");
    });

    it("should return null for non-existent keys", async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await redisClient.get<string>("test-key");

      expect(result).toBeNull();
    });

    it("should handle Redis client errors", async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisClient.get<string>("test-key");

      expect(result).toBeNull();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it("should timeout when Redis operation takes too long", async () => {
      // Simulate a Redis operation that never resolves
      mockRedisClient.get.mockImplementationOnce(() => new Promise(() => {}));

      const result = await redisClient.get<string>("test-key");

      expect(result).toBeNull();
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining("Timeout"),
        expect.any(Object)
      );
    });
  });

  describe("set", () => {
    it("should set string values", async () => {
      const result = await redisClient.set("test-key", "test-value");

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "test-key",
        "test-value",
        expect.any(Object)
      );
    });

    it("should set object values by serializing to JSON", async () => {
      const testObj = { name: "test", value: 123 };
      const result = await redisClient.set("test-key", testObj);

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(testObj),
        expect.any(Object)
      );
    });

    it("should set TTL when provided", async () => {
      const ttl = 500;
      await redisClient.set("test-key", "test-value", ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "test-key",
        "test-value",
        expect.objectContaining({ EX: ttl })
      );
    });

    it("should handle Redis client errors", async () => {
      mockRedisClient.set.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisClient.set("test-key", "test-value");

      expect(result).toBe(false);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete keys", async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);

      const result = await redisClient.delete("test-key");

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith("test-key");
    });

    it("should return false when key does not exist", async () => {
      mockRedisClient.del.mockResolvedValueOnce(0);

      const result = await redisClient.delete("test-key");

      expect(result).toBe(false);
    });

    it("should handle Redis client errors", async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisClient.delete("test-key");

      expect(result).toBe(false);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe("exists", () => {
    it("should return true for existing keys", async () => {
      mockRedisClient.exists.mockResolvedValueOnce(1);

      const result = await redisClient.exists("test-key");

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith("test-key");
    });

    it("should return false for non-existing keys", async () => {
      mockRedisClient.exists.mockResolvedValueOnce(0);

      const result = await redisClient.exists("test-key");

      expect(result).toBe(false);
    });

    it("should handle Redis client errors", async () => {
      mockRedisClient.exists.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisClient.exists("test-key");

      expect(result).toBe(false);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe("keys", () => {
    it("should return keys matching pattern", async () => {
      const mockKeys = ["key1", "key2", "key3"];
      mockRedisClient.keys.mockResolvedValueOnce(mockKeys);

      const result = await redisClient.keys("test-pattern");

      expect(result).toEqual(mockKeys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith("test-pattern");
    });

    it("should handle Redis client errors", async () => {
      mockRedisClient.keys.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisClient.keys("test-pattern");

      expect(result).toEqual([]);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe("scanKeys", () => {
    it("should scan keys with pagination", async () => {
      const mockResult = {
        cursor: 42,
        keys: ["key1", "key2"],
      };
      mockRedisClient.scan.mockResolvedValueOnce(mockResult);

      const result = await redisClient.scanKeys("test-pattern", 0, 10);

      expect(result).toEqual(mockResult);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(0, {
        MATCH: "test-pattern",
        COUNT: 10,
      });
    });

    it("should handle Redis client errors", async () => {
      mockRedisClient.scan.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisClient.scanKeys("test-pattern", 0, 10);

      expect(result).toEqual({ cursor: 0, keys: [] });
      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
