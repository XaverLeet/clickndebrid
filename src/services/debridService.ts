/**
 * Debrid Service
 *
 * This service orchestrates link processing through various debrid services.
 * It's responsible for:
 * - Routing link processing requests to the appropriate debrid service implementation
 * - Aggregating results from link processing
 * - Handling errors and retries during link processing
 * - Collecting statistics about the processing
 *
 * Currently supported debrid services:
 * - Real-Debrid
 *
 * The service uses a singleton pattern to ensure only one instance exists at runtime.
 */
import { loggerService } from "./loggerService.js";
import { config } from "../config/index.js";
import * as realDebrid from "./debrids/realdebrid.js";
import { CnlData } from "../types/index.js";
import { ProcessingResult, ProcessedLink } from "../types/debrid.js";

/**
 * Service for processing links through debrid services
 */
class DebridService {
  private static _instance: DebridService;

  private constructor() {}

  /**
   * Returns the singleton instance of the DebridService
   *
   * @returns {DebridService} The singleton DebridService instance
   */
  public static getInstance(): DebridService {
    if (!DebridService._instance) {
      DebridService._instance = new DebridService();
    }
    return DebridService._instance;
  }

  /**
   * Routes a link to the appropriate debrid service for processing
   *
   * @param {string} link - The original download link to process
   * @param {string} debridService - The debrid service to use (e.g., "realdebrid")
   * @returns {Promise<{download: string, filename: string, filesize: number}>} Processed link details
   * @private
   */
  private async getLinkFromDebridService(
    link: string,
    debridService: string
  ): Promise<{ download: string; filename: string; filesize: number }> {
    switch (debridService.toLowerCase()) {
      case "realdebrid": {
        const result = await realDebrid.getLinkFromDebridService(link);
        return {
          download: result.download,
          filename: result.filename,
          filesize: result.filesize,
        };
      }
      default:
        loggerService.error("Invalid debrid service specified", {
          service: debridService,
        });
        loggerService.warn(`Falling back to realdebrid`);
        const result = await realDebrid.getLinkFromDebridService(link);
        return {
          download: result.download,
          filename: result.filename,
          filesize: result.filesize,
        };
    }
  }

  /**
   * Processes a CNL request through the specified debrid service
   *
   * This method:
   * 1. Extracts links from the CNL data
   * 2. Processes each link through the appropriate debrid service
   * 3. Collects results and statistics
   * 4. Handles errors according to configuration
   *
   * @param {string} debridService - The debrid service to use (e.g., "realdebrid")
   * @param {CnlData} cnlData - The CNL data containing links to process
   * @returns {Promise<ProcessingResult>} Results of processing including statistics
   * @throws {Error} If processing fails and errorOnApiError is enabled
   */
  async processRequest(debridService: string, cnlData: CnlData): Promise<ProcessingResult> {
    const startTime = Date.now();
    const links = cnlData.decrypted?.split("\n");
    if (!links) {
      loggerService.error("No links to process", { cnlData });
      throw new Error("No links to process");
    }
    const validLinks = links.filter((l: string) => l.length > 0);
    const skippedLinks = links.length - validLinks.length;

    loggerService.info("Starting link processing", {
      totalLinks: links.length,
      validLinks: validLinks.length,
      skippedLinks,
      debridService,
    });

    const results: ProcessedLink[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const link of validLinks) {
      loggerService.debug("Processing link", { link });
      const processedAt = new Date(Date.now()).toISOString();

      try {
        const debridResult = await this.getLinkFromDebridService(link, debridService);
        results.push({
          original: link,
          processed: debridResult.download,
          success: true,
          processedAt,
          filename: debridResult.filename,
          filesize: debridResult.filesize,
        });
        successCount++;
        loggerService.debug("Successfully processed link", {
          original: link,
          processed: debridResult.download,
          filename: debridResult.filename,
          filesize: debridResult.filesize,
        });
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (config.errorOnApiError) {
          const remainingLinks = validLinks.length - (successCount + failureCount);
          loggerService.error(
            "Error processing link, stopping due to CND_ERROR_ON_API_ERROR=true",
            {
              error: errorMessage,
              link,
              successCount,
              failureCount,
              remainingLinks,
            }
          );
          throw error;
        } else {
          loggerService.warn("Error processing link, using original link", {
            error: errorMessage,
            link,
          });
          results.push({
            original: link,
            processed: link,
            success: false,
            error: errorMessage,
            processedAt,
          });
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const successRate = validLinks.length > 0 ? (successCount / validLinks.length) * 100 : 0;

    const result: ProcessingResult = {
      results,
      stats: {
        processedAt: new Date(Date.now()).toISOString(),
        debridService,
        totalLinks: links.length,
        validLinks: validLinks.length,
        skippedLinks,
        successCount,
        failureCount,
        successRate,
        processingTimeMs,
      },
    };

    // Log final results with complete information
    loggerService.info("Completed link processing", {
      stats: {
        ...result.stats,
        successRateFormatted: `${result.stats.successRate.toFixed(1)}%`,
      },
      results: result.results.map((r) => ({
        original: r.original,
        processed: r.processed,
        success: r.success,
        error: r.error,
        processedAt: r.processedAt,
        filename: r.filename,
        filesize: r.filesize,
      })),
    });

    return result;
  }
}

export const debridService = DebridService.getInstance();
