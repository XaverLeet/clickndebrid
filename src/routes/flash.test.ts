/**
 * @jest-environment node
 */

// Import test dependencies
import { Request, Response } from "express";
import { jest } from "@jest/globals";

// Define Express Router as an any type to avoid complex type issues
// In a real application, we would define a proper type for the Express Router
type ExpressRouter = any;

// Create mock implementations with detailed test data
const mockCnlService = {
  submitToDestinationService: jest.fn(),
};
const mockCryptoService = {
  decrypt: jest.fn(),
  encrypt: jest.fn(),
};
const mockDebridService = {
  processRequest: jest.fn(),
};
const mockCacheService = {
  set: jest.fn(),
};
const mockGetCacheService = jest.fn();
const mockLoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
const mockConfig = {
  debridService: "realdebrid",
};

// Setup mocks
jest.unstable_mockModule("../services/cnlService.js", () => ({
  cnlService: mockCnlService,
}));

jest.unstable_mockModule("../services/cryptoService.js", () => ({
  cryptoService: mockCryptoService,
}));

jest.unstable_mockModule("../services/debridService.js", () => ({
  debridService: mockDebridService,
}));

jest.unstable_mockModule("../services/cache/cacheFactory.js", () => ({
  getCacheService: mockGetCacheService,
}));

jest.unstable_mockModule("../services/loggerService.js", () => ({
  loggerService: mockLoggerService,
}));

jest.unstable_mockModule("../config/index.js", () => ({
  config: mockConfig,
}));

// Set up mock implementations with type assertions to avoid TS errors
// @ts-expect-error - mockResolvedValue expects specific return type
mockCnlService.submitToDestinationService.mockResolvedValue("encryptedResponse");

mockCryptoService.decrypt.mockImplementation((data: unknown) => {
  return {
    ...(data as Record<string, unknown>),
    decrypted: "http://example.com/file.zip\nhttp://example.com/file2.zip",
  };
});

mockCryptoService.encrypt.mockImplementation((data: unknown) => {
  return {
    ...(data as Record<string, unknown>),
    crypted: "encrypted-data-response",
  };
});

// @ts-expect-error - mockResolvedValue expects specific return type
mockDebridService.processRequest.mockResolvedValue({
  results: [
    {
      original: "http://example.com/file.zip",
      processed: "https://debrid.com/file.zip",
      success: true,
      processedAt: new Date().toISOString(),
      filename: "file.zip",
    },
    {
      original: "http://example.com/file2.zip",
      processed: "https://debrid.com/file2.zip",
      success: true,
      processedAt: new Date().toISOString(),
      filename: "file2.zip",
    },
  ],
  stats: {
    processedAt: new Date().toISOString(),
    debridService: "realdebrid",
    totalLinks: 2,
    validLinks: 2,
    skippedLinks: 0,
    successCount: 2,
    failureCount: 0,
    successRate: 100,
    processingTimeMs: 1000,
  },
});

mockGetCacheService.mockReturnValue(mockCacheService);
// @ts-expect-error - mockResolvedValue expects specific return type
mockCacheService.set.mockResolvedValue(true);

describe("Flash Routes", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let router: ExpressRouter;

  // We need to import dynamically to ensure mocks are set up first
  beforeAll(async () => {
    router = (await import("./flash.js")).default;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up request and response objects
    req = {
      body: {
        crypted: "encrypted-data",
        jk: 'function f() { return "0123456789abcdef0123456789abcdef" }',
        passwords: "password1,password2",
        package: "test-package",
        source: "test-source",
      },
    };

    // Create a properly typed mock response
    const mockStatus = jest.fn().mockReturnThis();
    const mockSend = jest.fn().mockReturnThis();
    const mockJson = jest.fn().mockReturnThis();

    res = {
      status: mockStatus as unknown as Response["status"],
      send: mockSend as unknown as Response["send"],
      json: mockJson as unknown as Response["json"],
    };
  });

  describe("POST /addcrypted2", () => {
    it("successfully processes and caches a CNL request", async () => {
      // Find the route handler for /addcrypted2
      const route = router.stack.find(
        (r: any) => r.route && r.route.path === "/addcrypted2" && r.route.methods.post
      );
      expect(route).toBeDefined();

      // Execute the route handler
      await route?.route?.stack[0].handle(req as Request, res as Response);

      // Verify cryptoService.decrypt was called with correct data
      expect(mockCryptoService.decrypt).toHaveBeenCalledWith({
        crypted: "encrypted-data",
        jk: 'function f() { return "0123456789abcdef0123456789abcdef" }',
        passwords: "password1,password2",
        package: "test-package",
        source: "test-source",
      });

      // Verify debridService.processRequest was called
      expect(mockDebridService.processRequest).toHaveBeenCalled();

      // Verify cache service was called
      expect(mockGetCacheService).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockCacheService.set.mock.calls[0][0]).toMatch(/^package:test-package:/);

      // Verify cnlService.submitToDestinationService was called
      expect(mockCnlService.submitToDestinationService).toHaveBeenCalled();

      // Verify response was sent correctly
      expect(res.json).toHaveBeenCalledWith({
        jk: 'function f() { return "0123456789abcdef0123456789abcdef" }',
        crypted: "encryptedResponse",
        passwords: "password1,password2",
        source: "test-source",
        package: "test-package",
      });
    });

    it("handles errors during CNL processing", async () => {
      // Setup the test to trigger an error
      mockCryptoService.decrypt.mockImplementationOnce(() => {
        throw new Error("Decryption failed");
      });

      // Find the route handler
      const route = router.stack.find(
        (r: any) => r.route && r.route.path === "/addcrypted2" && r.route.methods.post
      );

      // Execute the route handler
      await route?.route?.stack[0].handle(req as Request, res as Response);

      // Verify error handling
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Error processing encrypted request");

      // Verify no further processing occurred
      expect(mockCnlService.submitToDestinationService).not.toHaveBeenCalled();
    });

    it("handles errors from destination service", async () => {
      // Setup the test to trigger an error in submitToDestinationService
      // Using any type to bypass type checking for the error value
      (mockCnlService.submitToDestinationService.mockRejectedValueOnce as any)(
        new Error("Destination service error")
      );

      // Find the route handler
      const route = router.stack.find(
        (r: any) => r.route && r.route.path === "/addcrypted2" && r.route.methods.post
      );

      // Execute the route handler
      await route?.route?.stack[0].handle(req as Request, res as Response);

      // Verify error handling
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Error processing encrypted request");
    });

    it("handles the case when no package name is provided", async () => {
      // Modify request to remove the package name
      req.body.package = "";

      // Find the route handler
      const route = router.stack.find(
        (r: any) => r.route && r.route.path === "/addcrypted2" && r.route.methods.post
      );

      // Execute the route handler
      await route?.route?.stack[0].handle(req as Request, res as Response);

      // Verify flow worked but cache service was not called
      expect(mockDebridService.processRequest).toHaveBeenCalled();
      expect(mockCnlService.submitToDestinationService).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();

      // Verify response was sent correctly
      expect(res.json).toHaveBeenCalled();
    });
  });
});
