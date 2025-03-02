import { MemoryCache } from "./memoryCache.js";
import { loggerService } from "../loggerService.js";

// Mock dependencies
jest.mock("../loggerService.js");

describe("MemoryCache", () => {
  let memoryCache: MemoryCache;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh instance for each test
    memoryCache = new MemoryCache();

    // Mock Date.now for TTL testing
    jest.spyOn(Date, "now").mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("set", () => {
    it("should store string values", async () => {
      await memoryCache.set("test-key", "test-value");

      const value = await memoryCache.get<string>("test-key");
      expect(value).toBe("test-value");
      expect(loggerService.debug).toHaveBeenCalled();
    });

    it("should store object values", async () => {
      const testObj = { name: "test", value: 123 };
      await memoryCache.set("test-obj", testObj);

      const value = await memoryCache.get<typeof testObj>("test-obj");
      expect(value).toEqual(testObj);
    });

    it("should handle TTL correctly", async () => {
      await memoryCache.set("ttl-key", "ttl-value", 500);

      // Value should exist initially
      expect(await memoryCache.exists("ttl-key")).toBe(true);

      // Advance time beyond TTL
      jest.spyOn(Date, "now").mockReturnValue(2000);

      // Value should be expired
      expect(await memoryCache.get<string>("ttl-key")).toBeNull();
      expect(await memoryCache.exists("ttl-key")).toBe(false);
    });
  });

  describe("get", () => {
    it("should return null for non-existent keys", async () => {
      const value = await memoryCache.get<string>("not-exists");
      expect(value).toBeNull();
    });

    it("should return null for expired keys", async () => {
      await memoryCache.set("expired-key", "value", 500);

      // Advance time beyond TTL
      jest.spyOn(Date, "now").mockReturnValue(2000);

      const value = await memoryCache.get<string>("expired-key");
      expect(value).toBeNull();
    });
  });

  describe("delete", () => {
    it("should remove keys", async () => {
      await memoryCache.set("delete-key", "value");
      expect(await memoryCache.exists("delete-key")).toBe(true);

      await memoryCache.delete("delete-key");
      expect(await memoryCache.exists("delete-key")).toBe(false);
      expect(loggerService.debug).toHaveBeenCalled();
    });

    it("should handle non-existent keys", async () => {
      await memoryCache.delete("not-exists");
      expect(loggerService.debug).toHaveBeenCalled();
    });
  });

  describe("exists", () => {
    it("should return true for existing keys", async () => {
      await memoryCache.set("exists-key", "value");
      expect(await memoryCache.exists("exists-key")).toBe(true);
    });

    it("should return false for non-existent keys", async () => {
      expect(await memoryCache.exists("not-exists")).toBe(false);
    });

    it("should return false for expired keys", async () => {
      await memoryCache.set("expired-exists", "value", 500);

      // Advance time beyond TTL
      jest.spyOn(Date, "now").mockReturnValue(2000);

      expect(await memoryCache.exists("expired-exists")).toBe(false);
    });
  });

  describe("keys", () => {
    beforeEach(async () => {
      await memoryCache.set("user:1:profile", "profile1");
      await memoryCache.set("user:2:profile", "profile2");
      await memoryCache.set("user:3:profile", "profile3");
      await memoryCache.set("post:1", "post1");
      await memoryCache.set("post:2", "post2");
    });

    it("should find all keys with exact pattern", async () => {
      const keys = await memoryCache.keys("user:2:profile");
      expect(keys).toEqual(["user:2:profile"]);
    });

    it("should find all keys matching wildcard pattern", async () => {
      const keys = await memoryCache.keys("user:*:profile");
      expect(keys.sort()).toEqual(["user:1:profile", "user:2:profile", "user:3:profile"].sort());
    });

    it("should find all keys matching prefix", async () => {
      const keys = await memoryCache.keys("post:*");
      expect(keys.sort()).toEqual(["post:1", "post:2"].sort());
    });

    it("should return empty array for non-matching pattern", async () => {
      const keys = await memoryCache.keys("comment:*");
      expect(keys).toEqual([]);
    });

    it("should skip expired keys", async () => {
      await memoryCache.set("user:4:profile", "profile4", 500);

      // Advance time beyond TTL
      jest.spyOn(Date, "now").mockReturnValue(2000);

      const keys = await memoryCache.keys("user:*:profile");
      expect(keys).not.toContain("user:4:profile");
    });
  });

  describe("scanKeys", () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        await memoryCache.set(`key:${i}`, `value${i}`);
      }
    });

    it("should scan keys with pagination", async () => {
      const firstBatch = await memoryCache.scanKeys("key:*", 0, 5);
      expect(firstBatch.cursor).not.toBe(0);
      expect(firstBatch.keys.length).toBeLessThanOrEqual(5);

      const secondBatch = await memoryCache.scanKeys("key:*", firstBatch.cursor, 5);
      expect(secondBatch.keys.length).toBeGreaterThan(0);

      // All keys should be found between the two batches
      const allKeys = [...firstBatch.keys, ...secondBatch.keys];
      expect(allKeys.length).toBe(10);
    });

    it("should return cursor 0 when scan complete", async () => {
      // Large count to get all in one scan
      const result = await memoryCache.scanKeys("key:*", 0, 100);
      expect(result.cursor).toBe(0);
      expect(result.keys.length).toBe(10);
    });

    it("should filter by pattern", async () => {
      await memoryCache.set("other:1", "other");

      const result = await memoryCache.scanKeys("key:*", 0, 100);
      expect(result.keys.length).toBe(10);
      expect(result.keys.some((key) => key.startsWith("other"))).toBe(false);
    });
  });
});
