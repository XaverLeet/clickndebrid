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
        passwords: "filecrypt.cc",
        source: "filecrypt.cc",
        package: "Looking.S02.German.DL.1080p.BluRay.x264-iNTENTiON - serienfans.org",
        jk: "function f(){ return '38303437343432323031353234393734';}",
        crypted:
          "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",
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
