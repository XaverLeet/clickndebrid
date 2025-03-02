import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";
import flashRouter from "./flash.js";
import { cryptoService } from "../services/cryptoService.js";
import { debridService } from "../services/debridService.js";
import { cnlService } from "../services/cnlService.js";
import { getCacheService } from "../services/cache/cacheFactory.js";
import { CnlData } from "../types/index.js";

// Mock dependencies
jest.mock("../services/cryptoService.js");
jest.mock("../services/debridService.js");
jest.mock("../services/cnlService.js");
jest.mock("../services/cache/cacheFactory.js");

describe("Flash Routes (Click'n'Load)", () => {
  let app: express.Application;
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock getCacheService to return our mock implementation
    (getCacheService as jest.Mock).mockReturnValue(mockCacheService);

    // Setup Express app with the flash router
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use("/flash", flashRouter);
  });

  describe("POST /flash/addcrypted2", () => {
    it("should process encrypted CNL request successfully", async () => {
      // Mock CNL data
      const cnlRequest = {
        crypted: "encrypted-content",
        jk: "crypto-key-function",
        passwords: "optional-passwords",
        package: "test-package",
        source: "source-site",
      };

      // Mock decrypted data
      const decryptedData: CnlData = {
        ...cnlRequest,
        decrypted: "http://example.com/file1.zip\nhttp://example.com/file2.zip",
      };

      // Mock processed data
      const processedData: CnlData = {
        ...decryptedData,
        files: {
          results: [
            {
              original: "http://example.com/file1.zip",
              processed: "https://debrid.com/dl/file1.zip",
              success: true,
              processedAt: new Date().toISOString(),
              filename: "file1.zip",
              filesize: 1000,
            },
          ],
          stats: {
            processedAt: new Date().toISOString(),
            debridService: "realdebrid",
            totalLinks: 2,
            validLinks: 2,
            skippedLinks: 0,
            successCount: 1,
            failureCount: 1,
            successRate: 50,
            processingTimeMs: 1000,
          },
        },
      };

      // Setup mocks
      (cryptoService.decrypt as jest.Mock).mockReturnValue(decryptedData);
      (debridService.processRequest as jest.Mock).mockImplementation(() =>
        Promise.resolve(processedData.files || {})
      );
      (cnlService.submitToDestinationService as jest.Mock).mockImplementation(() =>
        Promise.resolve("new-encrypted-response")
      );

      // Make request
      const response = await request(app).post("/flash/addcrypted2").type("form").send(cnlRequest);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        jk: cnlRequest.jk,
        crypted: "new-encrypted-response",
        passwords: cnlRequest.passwords,
        source: cnlRequest.source,
        package: cnlRequest.package,
      });

      // Verify correct function calls
      expect(cryptoService.decrypt).toHaveBeenCalledWith(expect.objectContaining(cnlRequest));
      expect(debridService.processRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(decryptedData)
      );
      expect(cnlService.submitToDestinationService).toHaveBeenCalledWith(
        expect.objectContaining({
          ...cnlRequest,
          files: expect.any(Object),
        })
      );
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should handle decryption errors", async () => {
      // Mock CNL data
      const cnlRequest = {
        crypted: "invalid-encrypted-content",
        jk: "invalid-key",
      };

      // Setup mock to throw an error
      (cryptoService.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      // Make request
      const response = await request(app).post("/flash/addcrypted2").type("form").send(cnlRequest);

      // Assertions
      expect(response.status).toBe(500);
      expect(response.text).toBe("Error processing encrypted request");
    });

    it("should handle empty packages", async () => {
      // Mock CNL data
      const cnlRequest = {
        crypted: "encrypted-content",
        jk: "crypto-key-function",
      };

      // Mock empty decrypted data
      const decryptedData: CnlData = {
        ...cnlRequest,
        decrypted: "",
        package: "test-package",
        passwords: "",
        source: "test-source",
      };

      // Setup mocks
      (cryptoService.decrypt as jest.Mock).mockReturnValue(decryptedData);
      (debridService.processRequest as jest.Mock).mockImplementation(() => {
        throw new Error("No links to process");
      });

      // Make request
      const response = await request(app).post("/flash/addcrypted2").type("form").send(cnlRequest);

      // Assertions
      expect(response.status).toBe(500);
      expect(response.text).toBe("Error processing encrypted request");
    });
  });
});
