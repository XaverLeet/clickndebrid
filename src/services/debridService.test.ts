import { jest } from "@jest/globals";
import { debridService } from "./debridService.js";
import * as realDebrid from "./debrids/realdebrid.js";
import { loggerService } from "./loggerService.js";
import { config } from "../config/index.js";
import { CnlData } from "../types/index.js";
import { RealDebridUnrestrictResponse } from "../types/debrids/realdebrid.js";

// Mock dependencies
jest.mock("./debrids/realdebrid.js");
jest.mock("./loggerService.js");
jest.mock("../config/index.js");

describe("DebridService", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Set default config
    jest.spyOn(config, "errorOnApiError", "get").mockReturnValue(false);
  });

  describe("processRequest", () => {
    it("should process links successfully", async () => {
      // Mock CNL data
      const cnlData: CnlData = {
        decrypted: "http://example.com/file1.zip\nhttp://example.com/file2.zip",
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Mock realDebrid service responses
      const mockResponse1: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file1.zip",
        filename: "file1.zip",
        filesize: 1000,
        id: "123",
        mimeType: "application/zip",
        link: "http://example.com/file1.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      const mockResponse2: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file2.zip",
        filename: "file2.zip",
        filesize: 2000,
        id: "456",
        mimeType: "application/zip",
        link: "http://example.com/file2.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse1);
      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse2);

      // Process the request
      const result = await debridService.processRequest("realdebrid", cnlData);

      // Assert results
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          original: "http://example.com/file1.zip",
          processed: "https://debrid.com/dl/file1.zip",
          success: true,
          filename: "file1.zip",
          filesize: 1000,
        })
      );

      // Assert statistics
      expect(result.stats).toEqual(
        expect.objectContaining({
          debridService: "realdebrid",
          totalLinks: 2,
          validLinks: 2,
          skippedLinks: 0,
          successCount: 2,
          failureCount: 0,
          successRate: 100,
        })
      );

      // Verify function calls
      expect(realDebrid.getLinkFromDebridService).toHaveBeenCalledTimes(2);
      expect(realDebrid.getLinkFromDebridService).toHaveBeenCalledWith(
        "http://example.com/file1.zip"
      );
      expect(realDebrid.getLinkFromDebridService).toHaveBeenCalledWith(
        "http://example.com/file2.zip"
      );
    });

    it("should handle processing errors when errorOnApiError is false", async () => {
      // Mock CNL data
      const cnlData: CnlData = {
        decrypted: "http://example.com/file1.zip\nhttp://example.com/file2.zip",
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Mock realDebrid service responses
      const mockResponse: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file1.zip",
        filename: "file1.zip",
        filesize: 1000,
        id: "123",
        mimeType: "application/zip",
        link: "http://example.com/file1.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse);
      jest
        .mocked(realDebrid.getLinkFromDebridService)
        .mockRejectedValueOnce(new Error("API error"));

      // Process the request
      const result = await debridService.processRequest("realdebrid", cnlData);

      // Assert results
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          original: "http://example.com/file1.zip",
          processed: "https://debrid.com/dl/file1.zip",
          success: true,
        })
      );

      expect(result.results[1]).toEqual(
        expect.objectContaining({
          original: "http://example.com/file2.zip",
          processed: "http://example.com/file2.zip",
          success: false,
          error: "API error",
        })
      );

      // Assert statistics
      expect(result.stats).toEqual(
        expect.objectContaining({
          successCount: 1,
          failureCount: 1,
          successRate: 50,
        })
      );

      // Verify logger was called with warning
      expect(loggerService.warn).toHaveBeenCalledWith(
        "Error processing link, using original link",
        expect.objectContaining({
          error: "API error",
          link: "http://example.com/file2.zip",
        })
      );
    });

    it("should stop processing on error when errorOnApiError is true", async () => {
      // Configure errorOnApiError to true
      jest.spyOn(config, "errorOnApiError", "get").mockReturnValue(true);

      // Mock CNL data
      const cnlData: CnlData = {
        decrypted:
          "http://example.com/file1.zip\nhttp://example.com/file2.zip\nhttp://example.com/file3.zip",
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Mock realDebrid service responses
      const mockResponse: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file1.zip",
        filename: "file1.zip",
        filesize: 1000,
        id: "123",
        mimeType: "application/zip",
        link: "http://example.com/file1.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse);
      jest
        .mocked(realDebrid.getLinkFromDebridService)
        .mockRejectedValueOnce(new Error("API error"));

      // Process the request - should throw error
      await expect(debridService.processRequest("realdebrid", cnlData)).rejects.toThrow(
        "API error"
      );

      // Verify we only processed the first two links
      expect(realDebrid.getLinkFromDebridService).toHaveBeenCalledTimes(2);

      // Verify logger was called with error
      expect(loggerService.error).toHaveBeenCalledWith(
        "Error processing link, stopping due to CND_ERROR_ON_API_ERROR=true",
        expect.objectContaining({
          error: "API error",
          link: "http://example.com/file2.zip",
          successCount: 1,
          failureCount: 1,
          remainingLinks: 1,
        })
      );
    });

    it("should handle empty links", async () => {
      // Mock CNL data with empty decrypted content
      const cnlData: CnlData = {
        decrypted: "",
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Process the request - should throw error
      await expect(debridService.processRequest("realdebrid", cnlData)).rejects.toThrow(
        "No links to process"
      );

      // Verify logger was called with error
      expect(loggerService.error).toHaveBeenCalledWith(
        "No links to process",
        expect.objectContaining({ cnlData })
      );
    });

    it("should handle null decrypted data", async () => {
      // Mock CNL data with null decrypted content
      const cnlData: CnlData = {
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Process the request - should throw error
      await expect(debridService.processRequest("realdebrid", cnlData)).rejects.toThrow(
        "No links to process"
      );
    });

    it("should skip empty lines in decrypted data", async () => {
      // Mock CNL data with empty lines
      const cnlData: CnlData = {
        decrypted: "http://example.com/file1.zip\n\nhttp://example.com/file2.zip\n",
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Mock realDebrid service responses
      const mockResponse1: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file1.zip",
        filename: "file1.zip",
        filesize: 1000,
        id: "123",
        mimeType: "application/zip",
        link: "http://example.com/file1.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      const mockResponse2: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file2.zip",
        filename: "file2.zip",
        filesize: 2000,
        id: "456",
        mimeType: "application/zip",
        link: "http://example.com/file2.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse1);
      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse2);

      // Process the request
      const result = await debridService.processRequest("realdebrid", cnlData);

      // Assert statistics - should show skipped links
      expect(result.stats).toEqual(
        expect.objectContaining({
          totalLinks: 4, // Includes empty lines and trailing newline
          validLinks: 2, // Only the actual links
          skippedLinks: 2, // Empty lines
        })
      );

      // Verify we only processed the valid links
      expect(realDebrid.getLinkFromDebridService).toHaveBeenCalledTimes(2);
    });

    it("should fall back to realdebrid for invalid debrid service", async () => {
      // Mock CNL data
      const cnlData: CnlData = {
        decrypted: "http://example.com/file1.zip",
        crypted: "encrypted-content",
        jk: "jk-function",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Mock realDebrid service response
      const mockResponse: RealDebridUnrestrictResponse = {
        download: "https://debrid.com/dl/file1.zip",
        filename: "file1.zip",
        filesize: 1000,
        id: "123",
        mimeType: "application/zip",
        link: "http://example.com/file1.zip",
        host: "example.com",
        chunks: 1,
        crc: 0,
        streamable: 0,
      };

      jest.mocked(realDebrid.getLinkFromDebridService).mockResolvedValueOnce(mockResponse);

      // Process the request with invalid service
      const result = await debridService.processRequest("invalidservice", cnlData);

      // Assert results - should still work
      expect(result.results).toHaveLength(1);
      expect(result.results[0].processed).toBe("https://debrid.com/dl/file1.zip");

      // Verify logger warnings
      expect(loggerService.error).toHaveBeenCalledWith(
        "Invalid debrid service specified",
        expect.objectContaining({ service: "invalidservice" })
      );
      expect(loggerService.warn).toHaveBeenCalledWith("Falling back to realdebrid");
    });
  });
});
