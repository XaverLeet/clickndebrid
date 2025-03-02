import { Router, Request, Response } from "express";
import { CnlData } from "../../../types";
import { getCacheService } from "../../../services/cache/cacheFactory";
import { debridService } from "../../../services/debridService";
import { config } from "../../../config";
import { loggerService } from "../../../services/loggerService";
import { cnlService } from "../../../services/cnlService";
import { createResponse, createErrorResponse } from "../../../utils/apiResponse";

const router = Router();

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Get all packages with pagination
 * GET /api/v1/packages?page=1&pageSize=10
 */
router.get("/", (req: Request, res: Response) => {
  (async () => {
    try {
      // Parse pagination parameters
      const page = parseInt((req.query.page as string) || "1", 10);
      const pageSize = parseInt((req.query.pageSize as string) || "10", 10);

      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        res.status(400).json(createErrorResponse("Invalid page parameter"));
        return;
      }

      if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
        res.status(400).json(
          createErrorResponse("Invalid pageSize parameter (must be between 1 and 50)")
        );
        return;
      }

      // Get total count first (for pagination metadata)
      const allKeysCount = (await getCacheService().keys("package:*")).length;

      // Calculate cursor position based on page and pageSize
      const cursor = (page - 1) * pageSize;

      // Use scanKeys for efficient pagination
      const { keys: paginatedKeys, cursor: nextCursor } =
        await getCacheService().scanKeys("package:*", cursor, pageSize);

      // Fetch all packages for the current page
      const packagesPromises = paginatedKeys.map((key) =>
        getCacheService().get<CnlData>(key)
      );
      const packagesData = await Promise.all(packagesPromises);

      // Filter out null values and map to response format
      const packages = packagesData
        .filter((pkg): pkg is CnlData => pkg !== null)
        .map((pkg) => {
          // Extract the package name from the key
          const keyParts = paginatedKeys[packagesData.indexOf(pkg)].split(":");
          const packageName = keyParts.slice(1).join(":");

          return {
            ...pkg,
            package: packageName, // Use the full package name with timestamp
          };
        });

      // Calculate total pages
      const totalPages = Math.ceil(allKeysCount / pageSize);

      // Create the response with pagination metadata
      const response: PaginatedResponse<
        Omit<CnlData, "crypted" | "decrypted" | "jk"> & { package: string }
      > = {
        data: packages,
        pagination: {
          page,
          pageSize,
          totalItems: allKeysCount,
          totalPages,
          hasMore: nextCursor !== 0,
        },
      };

      res.json(createResponse(response));
    } catch (error: unknown) {
      handleError(res, error);
    }
  })();
});

/**
 * Get a specific package by name (packagename:timestamp)
 * GET /api/v1/packages/:packageName
 */
router.get("/:packageName", (req: Request, res: Response) => {
  (async () => {
    try {
      const packageName = req.params.packageName;

      // Get the package from cache
      const cacheKey = `package:${packageName}`;
      const pkg = await getCacheService().get<CnlData>(cacheKey);

      if (!pkg) {
        res.status(404).json(createErrorResponse("Package not found"));
        return;
      }

      res.json(createResponse(pkg));
    } catch (error) {
      handleError(res, error);
    }
  })();
});

/**
 * Get a file list for a package
 * GET /api/v1/packages/:packageName/filelist
 */
router.get("/:packageName/filelist", (req: Request, res: Response) => {
  (async () => {
    try {
      const packageName = req.params.packageName;

      // Get the package from cache
      const cacheKey = `package:${packageName}`;
      const pkg = await getCacheService().get<CnlData>(cacheKey);

      if (!pkg) {
        res.status(404).json(createErrorResponse("Package not found"));
        return;
      }

      // Generate file list
      if (!pkg.files) {
        res.status(503).json(createErrorResponse("Package was empty"));
        return;
      }
      const fileContent = pkg.files.results
        .filter((link) => link.success) // Only include successful links
        .map((link) => link.processed)
        .join("\n");

      res.setHeader("Content-Type", "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${packageName}-filelist.txt"`
      );
      res.send(fileContent);
    } catch (error) {
      handleError(res, error);
    }
  })();
});

/**
 * Resubmit a package to the original source
 * POST /api/v1/packages/:packageName/resubmit
 */
router.post("/:packageName/resubmit", (req: Request, res: Response) => {
  (async () => {
    try {
      const packageName = req.params.packageName;

      // Get the package from cache
      const cacheKey = `package:${packageName}`;
      const pkg = await getCacheService().get<CnlData>(cacheKey);

      if (!pkg) {
        res.status(404).json(createErrorResponse("Package not found"));
        return;
      }

      // Submit to destination service
      let encryptedResponse;
      try {
        encryptedResponse = await cnlService.submitToDestinationService(pkg);
      } catch (err) {
        // Error is already logged in the service
      }

      res.json(createResponse({
        message: "Package resubmitted successfully",
        response: encryptedResponse,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json(createErrorResponse(message));
    }
  })();
});

/**
 * Re-process a package with the debrid service (creates a new timestamp-based package)
 * POST /api/v1/packages/:packageName/redebrid
 */
router.post("/:packageName/redebrid", (req: Request, res: Response) => {
  (async () => {
    try {
      const packageName = req.params.packageName;

      // Get the package from cache
      const cacheKey = `package:${packageName}`;
      const pkg = await getCacheService().get<CnlData>(cacheKey);

      if (!pkg) {
        res.status(404).json(createErrorResponse("Package not found"));
        return;
      }

      // Process the request again
      const debridServiceName = config.debridService.toLowerCase();
      const files = await debridService.processRequest(debridServiceName, pkg);

      // Create a new version with updated files
      const updatedPkg = { ...pkg, files };

      // Generate a new timestamp for the new version
      const timestamp = new Date().toISOString();
      const baseName = packageName.split(":")[0]; // Extract base name if it has a timestamp
      const newPackageName = `${baseName}:${timestamp}`;
      const newCacheKey = `package:${newPackageName}`;

      // Store the new version
      await getCacheService().set(newCacheKey, updatedPkg);

      res.json(createResponse({
        message: "Package re-processed successfully",
        package: updatedPkg,
        version: newPackageName,
      }));
    } catch (error) {
      handleError(res, error);
    }
  })();
});

/**
 * Delete a package
 * DELETE /api/v1/packages/:packageName
 */
router.delete("/:packageName", (req: Request, res: Response) => {
  (async () => {
    try {
      const packageName = req.params.packageName;

      // Delete the package from cache
      const cacheKey = `package:${packageName}`;
      await getCacheService().delete(cacheKey);

      res.json(createResponse({
        message: `Package ${packageName} deleted successfully`,
      }));
    } catch (error) {
      handleError(res, error);
    }
  })();
});

/**
 * Error handler
 */
const handleError = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  loggerService.error("API error", { error });
  res.status(500).json(createErrorResponse(message));
};

export default router;
