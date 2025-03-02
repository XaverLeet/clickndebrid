import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";
import packagesRouter from "./packages.js";
import { getCacheService } from "../../../services/cache/cacheFactory.js";
import { debridService } from "../../../services/debridService.js";
import { cnlService } from "../../../services/cnlService.js";
// Config is used in mocked modules
import "../../../config/index.js";
import { CnlData } from "../../../types/index.js";

// Mock dependencies
jest.mock("../../../services/cache/cacheFactory");
jest.mock("../../../services/debridService");
jest.mock("../../../services/cnlService");
jest.mock("../../../config");

describe("Packages API", () => {
  let app: express.Application;
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn(),
    scanKeys: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock getCacheService to return our mock implementation
    (getCacheService as jest.Mock).mockReturnValue(mockCacheService);

    // Setup Express app with the packages router
    app = express();
    app.use(express.json());
    app.use("/api/v1/packages", packagesRouter);
  });

  describe("GET /", () => {
    it("should return paginated packages", async () => {
      // Mock data
      const packageKeys = ["package:test:123", "package:test:456"];
      const packagesData = [
        {
          package: "test:123",
          files: {
            results: [
              {
                processed: "link1",
                original: "original-link1",
                processedAt: new Date().toISOString(),
                success: true,
              },
            ],
            stats: {
              processedAt: new Date().toISOString(),
              debridService: "test-service",
              totalLinks: 1,
              validLinks: 1,
              skippedLinks: 0,
              successCount: 1,
              failureCount: 0,
              successRate: 100,
              processingTimeMs: 100,
            },
          },
          crypted: "test-crypted",
          jk: "test-jk",
          passwords: "test-passwords",
          source: "test-source",
        },
        {
          package: "test:456",
          files: {
            results: [
              {
                processed: "link2",
                original: "original-link2",
                processedAt: new Date().toISOString(),
                success: true,
              },
            ],
            stats: {
              processedAt: new Date().toISOString(),
              debridService: "test-service",
              totalLinks: 1,
              validLinks: 1,
              skippedLinks: 0,
              successCount: 1,
              failureCount: 0,
              successRate: 100,
              processingTimeMs: 100,
            },
          },
          crypted: "test-crypted",
          jk: "test-jk",
          passwords: "test-passwords",
          source: "test-source",
        },
      ];

      // Setup mocks
      mockCacheService.keys.mockImplementation(() => Promise.resolve(packageKeys));
      mockCacheService.scanKeys.mockImplementation(() =>
        Promise.resolve({
          keys: packageKeys,
          cursor: 0,
        })
      );
      mockCacheService.get
        .mockImplementationOnce(() => Promise.resolve(packagesData[0]))
        .mockImplementationOnce(() => Promise.resolve(packagesData[1]));

      // Make request
      const response = await request(app).get("/").query({ page: 1, pageSize: 10 });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
        hasMore: false,
      });
    });

    it("should handle invalid pagination parameters", async () => {
      const response = await request(app).get("/").query({ page: "invalid", pageSize: 10 });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /:packageName", () => {
    it("should return package details when found", async () => {
      // Mock data
      const packageName = "test:123";
      const packageData = {
        package: packageName,
        files: {
          results: [
            {
              processed: "link1",
              original: "original-link1",
              processedAt: new Date().toISOString(),
              success: true,
            },
          ],
          stats: {
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            totalLinks: 1,
            validLinks: 1,
            skippedLinks: 0,
            successCount: 1,
            failureCount: 0,
            successRate: 100,
            processingTimeMs: 100,
          },
        },
        crypted: "test-crypted",
        jk: "test-jk",
        passwords: "test-passwords",
        source: "test-source",
      };

      // Setup mocks
      mockCacheService.get.mockImplementation(() => Promise.resolve(packageData));

      // Make request
      const response = await request(app).get(`/${packageName}`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(packageData);
    });

    it("should return 404 when package not found", async () => {
      // Setup mocks
      mockCacheService.get.mockImplementation(() => Promise.resolve(null));

      // Make request
      const response = await request(app).get("/nonexistent");

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Package not found");
    });
  });

  describe("GET /:packageName/filelist", () => {
    it("should return file list as plain text", async () => {
      // Mock data
      const packageName = "test:123";
      const packageData = {
        files: {
          results: [
            {
              success: true,
              processed: "link1",
              original: "original-link1",
              processedAt: new Date().toISOString(),
            },
            {
              success: true,
              processed: "link2",
              original: "original-link2",
              processedAt: new Date().toISOString(),
            },
          ],
          stats: {
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            totalLinks: 2,
            validLinks: 2,
            skippedLinks: 0,
            successCount: 2,
            failureCount: 0,
            successRate: 100,
            processingTimeMs: 100,
          },
        },
        crypted: "test-crypted",
        jk: "test-jk",
        passwords: "test-passwords",
        source: "test-source",
      };

      // Setup mocks
      mockCacheService.get.mockImplementation(() => Promise.resolve(packageData));

      // Make request
      const response = await request(app).get(`/${packageName}/filelist`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toBe("text/plain; charset=utf-8");
      expect(response.header["content-disposition"]).toBe(
        `attachment; filename="${packageName}-filelist.txt"`
      );
      expect(response.text).toBe("link1\nlink2");
    });

    it("should return 404 when package not found", async () => {
      // Setup mocks
      mockCacheService.get.mockImplementation(() => Promise.resolve(null));

      // Make request
      const response = await request(app).get("/nonexistent/filelist");

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /:packageName/resubmit", () => {
    it("should resubmit package successfully", async () => {
      // Mock data
      const packageName = "test:123";
      const packageData = {
        files: {
          results: [
            {
              processed: "link1",
              original: "original-link1",
              processedAt: new Date().toISOString(),
              success: true,
            },
          ],
          stats: {
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            totalLinks: 1,
            validLinks: 1,
            skippedLinks: 0,
            successCount: 1,
            failureCount: 0,
            successRate: 100,
            processingTimeMs: 100,
          },
        },
        crypted: "test-crypted",
        jk: "test-jk",
        passwords: "test-passwords",
        source: "test-source",
        package: "test-package",
      } as CnlData;

      // Setup mocks
      mockCacheService.get.mockImplementation(() => Promise.resolve(packageData));
      (cnlService.submitToDestinationService as jest.Mock).mockImplementation(() =>
        Promise.resolve("encrypted-response")
      );

      // Make request
      const response = await request(app).post(`/${packageName}/resubmit`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Package resubmitted successfully");
      expect(cnlService.submitToDestinationService).toHaveBeenCalledWith(packageData);
    });
  });

  describe("POST /:packageName/redebrid", () => {
    it("should reprocess package with debrid service", async () => {
      // Mock data
      const packageName = "test:123";
      const packageData = {
        files: {
          results: [
            {
              processed: "link1",
              original: "original-link1",
              processedAt: new Date().toISOString(),
              success: true,
            },
          ],
          stats: {
            processedAt: new Date().toISOString(),
            debridService: "test-service",
            totalLinks: 1,
            validLinks: 1,
            skippedLinks: 0,
            successCount: 1,
            failureCount: 0,
            successRate: 100,
            processingTimeMs: 100,
          },
        },
        crypted: "test-crypted",
        jk: "test-jk",
        passwords: "test-passwords",
        source: "test-source",
        package: "test-package",
      } as CnlData;
      const processedFiles = {
        results: [
          {
            processed: "processed-link1",
            original: "original-link1",
            processedAt: new Date().toISOString(),
            success: true,
          },
        ],
        stats: {
          processedAt: new Date().toISOString(),
          debridService: "test-service",
          totalLinks: 1,
          validLinks: 1,
          skippedLinks: 0,
          successCount: 1,
          failureCount: 0,
          successRate: 100,
          processingTimeMs: 100,
        },
      };

      // Setup mocks
      mockCacheService.get.mockImplementation(() => Promise.resolve(packageData));
      (debridService.processRequest as jest.Mock).mockImplementation(() =>
        Promise.resolve(processedFiles)
      );

      // Make request
      const response = await request(app).post(`/${packageName}/redebrid`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Package re-processed successfully");
      expect(debridService.processRequest).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe("DELETE /:packageName", () => {
    it("should delete package successfully", async () => {
      // Mock data
      const packageName = "test:123";

      // Setup mocks
      mockCacheService.delete.mockImplementation(() => Promise.resolve(true));

      // Make request
      const response = await request(app).delete(`/${packageName}`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe(`Package ${packageName} deleted successfully`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`package:${packageName}`);
    });
  });
});
