import { cnlService } from "./cnlService.js";
import { cryptoService } from "./cryptoService.js";
import { loggerService } from "./loggerService.js";
import { config } from "../config/index.js";

// Mock dependencies
jest.mock("./cryptoService");
jest.mock("./loggerService");
jest.mock("../config/index.js", () => ({
  config: {
    destinationUrl: "https://example.com/endpoint",
  },
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe("CnlService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks for the imported services
    jest.spyOn(cryptoService, "encrypt").mockImplementation((data) => ({
      ...data,
      isEncrypted: true,
    }));

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe("submitToDestinationService", () => {
    const validCnlData = {
      source: "test-source",
      crypted: "encrypted-data",
      jk: "jk-value",
      passwords: "password",
      package: "package-name",
      files: {
        results: [
          {
            original: "http://example.com/file1.zip",
            processed: "http://debrid.example.com/resolved1.zip",
            success: true,
            processedAt: new Date().toISOString(),
          },
        ],
        stats: {
          processedAt: new Date().toISOString(),
          debridService: "TestDebrid",
          totalLinks: 1,
          validLinks: 1,
          skippedLinks: 0,
          successCount: 1,
          failureCount: 0,
          successRate: 100,
          processingTimeMs: 120,
        },
      },
    };

    it("should encrypt and submit processed links to destination", async () => {
      // Setup fetch mock to return success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        statusText: "OK",
      });

      // Setup crypto mock
      jest.spyOn(cryptoService, "encrypt").mockReturnValueOnce({
        ...validCnlData,
        crypted: "encrypted-result",
      });

      // Call method
      const result = await cnlService.submitToDestinationService(validCnlData);

      // Assertions
      expect(result).toBe("encrypted-result");
      expect(cryptoService.encrypt).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        `${config.destinationUrl}/flash/addcrypted2`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
          body: expect.any(String),
        })
      );
      expect(loggerService.info).toHaveBeenCalled();
    });

    it("should return false when there are no processed links", async () => {
      const noLinksData = {
        ...validCnlData,
        files: {
          results: [],
          stats: {
            processedAt: new Date().toISOString(),
            debridService: "TestDebrid",
            totalLinks: 0,
            validLinks: 0,
            skippedLinks: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0,
            processingTimeMs: 10,
          },
        },
      };

      await expect(cnlService.submitToDestinationService(noLinksData)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch errors gracefully", async () => {
      // Setup fetch to throw error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      // Setup crypto mock
      jest.spyOn(cryptoService, "encrypt").mockReturnValueOnce({
        ...validCnlData,
        crypted: "encrypted-result",
      });

      await expect(cnlService.submitToDestinationService(validCnlData)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it("should handle non-ok responses from destination service", async () => {
      // Setup fetch to return error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Map(),
      });

      // Setup crypto mock
      jest.spyOn(cryptoService, "encrypt").mockReturnValueOnce({
        ...validCnlData,
        crypted: "encrypted-result",
      });

      await expect(cnlService.submitToDestinationService(validCnlData)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
