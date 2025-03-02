import { Router, Request, Response } from "express";
import { CnlData } from "../types";
import { debridService } from "../services/debridService";
import { config } from "../config";
import { loggerService } from "../services/loggerService";
import { cnlService } from "../services/cnlService";
import { cryptoService } from "../services/cryptoService";
import { getCacheService } from "../services/cache/cacheFactory";

const router = Router();

router.post("/add", async (_req: Request, _res: Response) => {});

router.post("/addcrypted2", async (req: Request, res: Response) => {
  try {
    // Handle URL-encoded form data
    let cnlData: CnlData = {
      crypted: req.body.crypted,
      jk: req.body.jk,
      passwords: req.body.passwords,
      package: req.body.package,
      source: req.body.source,
    };

    // Decrypt the request
    cnlData = cryptoService.decrypt(cnlData);

    // Process the request
    const debridServiceName = config.debridService.toLowerCase();

    cnlData.files = await debridService.processRequest(debridServiceName, cnlData);

    // Cache complete processing result if we have a package name
    if (cnlData.files.results.length > 0 && cnlData.package) {
      try {
        // Generate timestamp for the package - explicitly using UTC
        const timestamp = new Date().toISOString();
        const packageName = `${cnlData.package}:${timestamp}`;
        const cacheKey = `package:${packageName}`;

        // Store in cache
        await getCacheService().set(cacheKey, cnlData);

        loggerService.info("Cached package", {
          package: packageName,
        });
        loggerService.debug("Full cached data", { data: cnlData });
      } catch (err) {
        loggerService.error("Cache request failed", { error: err });
      }
    }

    // Submit to destination service
    let encryptedResponse;
    try {
      encryptedResponse = await cnlService.submitToDestinationService(cnlData);
    } catch (err) {
      res.status(500).send("Error processing encrypted request");
      // Error is already logged in the service
      return;
    }

    // Build response with all original fields
    res.json({
      jk: cnlData.jk,
      crypted: encryptedResponse,
      passwords: cnlData.passwords,
      source: cnlData.source,
      package: cnlData.package,
    });
  } catch (error) {
    loggerService.error("Error processing encrypted request:", { error });
    res.status(500).send("Error processing encrypted request");
  }
});

export default router;
