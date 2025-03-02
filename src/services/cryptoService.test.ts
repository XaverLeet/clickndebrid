import { jest } from "@jest/globals";
import { cryptoService } from "./cryptoService.js";
import { loggerService } from "./loggerService.js";
import { CnlData } from "../types/index.js";
import CryptoJS from "crypto-js";

// Mock dependencies
jest.mock("./loggerService");

describe("CryptoService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("decrypt", () => {
    it("should correctly decrypt CNL data", () => {
      // Create test data with a known key and encrypted content
      const testKey = "0102030405060708090a0b0c0d0e0f10";
      const jkFunction = `function(){ return "${testKey}"; }`;

      // Create an encrypted string using the same key for testing
      const originalText = "http://example.com/file1.zip\nhttp://example.com/file2.zip";
      const key = CryptoJS.enc.Hex.parse(testKey);
      const encryptedData = CryptoJS.AES.encrypt(originalText, key, {
        mode: CryptoJS.mode.CBC,
        iv: key,
      }).toString();

      // Create CNL data object
      const cnlData: CnlData = {
        crypted: encryptedData,
        jk: jkFunction,
        source: "test-source",
        package: "test-package",
        passwords: "",
      };

      // Decrypt the data
      const result = cryptoService.decrypt(cnlData);

      // Assertions
      expect(result.decrypted?.replace(/\s+/g, "\n").trim()).toBe(originalText);
      expect(result.crypted).toBe(encryptedData);
      expect(result.jk).toBe(jkFunction);
      expect(result.source).toBe("test-source");
      expect(result.package).toBe("test-package");
    });

    it("should handle invalid JK function", () => {
      // Create test data with invalid key
      const cnlData: CnlData = {
        crypted: "some-encrypted-data",
        jk: "invalid-key-function",
        source: "test-source",
        package: "test-package",
        passwords: "",
      };

      // Try to decrypt the data - should not throw
      expect(() => cryptoService.decrypt(cnlData)).not.toThrow();

      // Verify error was logged
      expect(loggerService.error).toHaveBeenCalledWith(
        "Failed to extract key from JK",
        expect.objectContaining({ jk: "invalid-key-function" })
      );
    });
  });

  describe("encrypt", () => {
    it("should correctly encrypt processed links", () => {
      // Create test data
      const testKey = "0102030405060708090a0b0c0d0e0f10";
      const jkFunction = `function(){ return "${testKey}"; }`;

      // Create CNL data with processed files
      const cnlData: CnlData = {
        jk: jkFunction,
        source: "test-source",
        package: "test-package",
        passwords: "",
        crypted: "",
        files: {
          results: [
            {
              processed: "https://debrid.com/dl/file1.zip",
              success: true,
              original: "http://example.com/file1.zip",
              processedAt: new Date().toISOString(),
            },
            {
              processed: "https://debrid.com/dl/file2.zip",
              success: true,
              original: "http://example.com/file2.zip",
              processedAt: new Date().toISOString(),
            },
          ],
          stats: {
            successCount: 2,
            totalLinks: 2,
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            validLinks: 2,
            skippedLinks: 0,
            failureCount: 0,
            successRate: 100,
            processingTimeMs: 100,
          },
        },
      };

      // Encrypt the data
      const result = cryptoService.encrypt(cnlData);

      // Verify we have encrypted content
      expect(result.crypted).toBeDefined();
      expect(typeof result.crypted).toBe("string");
      expect(result.crypted.length).toBeGreaterThan(0);

      // Decrypt to verify content
      const key = CryptoJS.enc.Hex.parse(testKey);
      const decrypted = CryptoJS.AES.decrypt(result.crypted, key, {
        mode: CryptoJS.mode.CBC,
        iv: key,
      }).toString(CryptoJS.enc.Utf8);

      // Should contain our processed links
      expect(decrypted).toContain("https://debrid.com/dl/file1.zip");
      expect(decrypted).toContain("https://debrid.com/dl/file2.zip");
    });

    it("should throw error when no links to encrypt", () => {
      // Create CNL data with no processed files
      const cnlData: CnlData = {
        jk: 'function(){ return "key"; }',
        source: "test-source",
        package: "test-package",
        passwords: "",
        crypted: "",
        files: {
          results: [],
          stats: {
            successCount: 0,
            totalLinks: 0,
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            validLinks: 0,
            skippedLinks: 0,
            failureCount: 0,
            successRate: 0,
            processingTimeMs: 0,
          },
        },
      };

      // Try to encrypt - should throw
      expect(() => cryptoService.encrypt(cnlData)).toThrow("No links to encrypt");

      // Verify error was logged
      expect(loggerService.error).toHaveBeenCalledWith(
        "No links to encrypt",
        expect.objectContaining({ cnlData })
      );
    });

    it("should throw error when files property is missing", () => {
      // Create incomplete CNL data
      const cnlData: CnlData = {
        jk: 'function(){ return "key"; }',
        source: "test-source",
        package: "test-package",
        passwords: "",
        crypted: "",
      };

      // Try to encrypt - should throw
      expect(() => cryptoService.encrypt(cnlData)).toThrow("No links to encrypt");
    });
  });

  describe("round trip encryption/decryption", () => {
    it("should correctly handle a full encryption and decryption cycle", () => {
      // Create test data
      const testKey = "0102030405060708090a0b0c0d0e0f10";
      const jkFunction = `function(){ return "${testKey}"; }`;

      const originalLinks = ["https://debrid.com/dl/file1.zip", "https://debrid.com/dl/file2.zip"];

      // Create CNL data
      const cnlData: CnlData = {
        jk: jkFunction,
        source: "test-source",
        package: "test-package",
        passwords: "",
        crypted: "",
        files: {
          results: originalLinks.map((link) => ({
            processed: link,
            success: true,
            original: link.replace("debrid.com/dl", "example.com"),
            processedAt: new Date().toISOString(),
          })),
          stats: {
            successCount: originalLinks.length,
            totalLinks: originalLinks.length,
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            validLinks: originalLinks.length,
            skippedLinks: 0,
            failureCount: 0,
            successRate: 100,
            processingTimeMs: 100,
          },
        },
      };

      // Encrypt the data
      const encrypted = cryptoService.encrypt(cnlData);

      // Create new CNL data object for decryption (simulating a new request)
      const newRequest: CnlData = {
        jk: jkFunction,
        crypted: encrypted.crypted,
        source: "test-source",
        package: "test-package",
        passwords: "",
      };

      // Decrypt the data
      const decrypted = cryptoService.decrypt(newRequest);

      // Verify decrypted content contains our original links
      originalLinks.forEach((link) => {
        expect(decrypted.decrypted).toContain(link);
      });
    });
  });
});
