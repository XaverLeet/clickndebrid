import { CnlService } from "./cnlService";
import { CryptoService } from "./cryptoService";
import { LoggerService } from "./loggerService";
import { CnlData } from "../types/cnl";
import * as config from "../config";

// Mock dependencies
jest.mock("./cryptoService");
jest.mock("./loggerService");
jest.mock("../config", () => ({
  cnl: {
    destination: {
      url: "https://example.com/endpoint",
    },
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe("CnlService", () => {
  let cnlService: CnlService;
  let mockCryptoService: jest.Mocked<CryptoService>;
  let mockLoggerService: jest.Mocked<LoggerService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockCryptoService = CryptoService.getInstance() as jest.Mocked<CryptoService>;
    mockLoggerService = LoggerService.getInstance() as jest.Mocked<LoggerService>;

    mockCryptoService.encrypt.mockImplementation((data: string) => `encrypted-${data}`);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();

    cnlService = CnlService.getInstance();
  });

  describe("submitToDestinationService", () => {
    const validCnlData: CnlData = {
      source: "test-source",
      urls: ["http://example.com/file1.zip"],
      processedLinks: ["http://debrid.example.com/resolved1.zip"],
    };

    it("should encrypt and submit processed links to destination", async () => {
      // Setup fetch mock to return success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      });

      // Call method
      const result = await cnlService.submitToDestinationService(validCnlData);

      // Assertions
      expect(result).toBe(true);
      expect(mockCryptoService.encrypt).toHaveBeenCalledWith(
        JSON.stringify(validCnlData.processedLinks)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        config.cnl.destination.url,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.any(String),
        })
      );
      expect(mockLoggerService.info).toHaveBeenCalled();
    });

    it("should return false when there are no processed links", async () => {
      const noLinksData: CnlData = {
        ...validCnlData,
        processedLinks: [],
      };

      const result = await cnlService.submitToDestinationService(noLinksData);

      expect(result).toBe(false);
      expect(mockLoggerService.warn).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch errors gracefully", async () => {
      // Setup fetch to throw error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const result = await cnlService.submitToDestinationService(validCnlData);

      expect(result).toBe(false);
      expect(mockLoggerService.error).toHaveBeenCalled();
    });

    it("should handle non-ok responses from destination service", async () => {
      // Setup fetch to return error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await cnlService.submitToDestinationService(validCnlData);

      expect(result).toBe(false);
      expect(mockLoggerService.error).toHaveBeenCalled();
    });
  });
});
