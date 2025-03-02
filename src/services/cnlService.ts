/**
 * Click'n'Load Service
 * 
 * This service handles Click'n'Load (CNL) protocol operations, primarily:
 * - Submitting decrypted and processed links to the destination service
 * - Formatting link data according to the CNL protocol requirements
 * - Handling encryption/decryption of CNL data
 * 
 * The CNL protocol allows websites to send encrypted download links to download
 * managers. This service acts as a middleware that processes these links through
 * debrid services before forwarding them to the final destination.
 */
import { URLSearchParams } from "url";
import { CnlData } from "../types";
import { cryptoService } from "./cryptoService";
import { loggerService } from "./loggerService";
import { config } from "../config/index";

/**
 * Service for handling Click'n'Load operations
 * 
 * Implements the singleton pattern to ensure only one instance exists.
 */
class CnlService {
  private static _instance: CnlService;

  private constructor() {}

  /**
   * Returns the singleton instance of the CnlService
   * 
   * @returns {CnlService} The singleton CnlService instance
   */
  public static getInstance(): CnlService {
    if (!CnlService._instance) {
      CnlService._instance = new CnlService();
    }
    return CnlService._instance;
  }

  /**
   * Submits processed CNL data to the destination service
   * 
   * This method:
   * 1. Takes CNL data that has been processed through debrid services
   * 2. Formats it according to the CNL protocol requirements
   * 3. Encrypts it as needed
   * 4. POSTs it to the configured destination URL (typically a download manager)
   * 5. Handles any errors during submission
   * 
   * @param {CnlData} cnlData - The processed CNL data to submit with unrestricted links
   * @returns {Promise<string>} Promise resolving to the encrypted response
   * @throws {Error} If submission fails or no links are available to submit
   */
  public async submitToDestinationService(cnlData: CnlData): Promise<string> {
    if (!cnlData.files || cnlData.files.results.length === 0) {
      loggerService.error("No links to submit", cnlData);
      throw new Error("No links to submit");
    }
    // Convert processed links to newline-separated string and encrypt the response
    const _processedLinksString = cnlData.files.results.map((r) => r.processed).join("\r\n");
    const CnlData = cryptoService.encrypt(cnlData);

    // Submit to destination service
    try {
      const formData = new URLSearchParams({
        passwords: cnlData.passwords || "",
        source: cnlData.source || "",
        package: cnlData.package || "",
        jk: cnlData.jk,
        crypted: cnlData.crypted,
      });

      const submitResponse = await fetch(`${config.destinationUrl}/flash/addcrypted2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!submitResponse.ok) {
        throw new Error(`HTTP error! status: ${submitResponse.status}`);
      }

      // Log the response status
      loggerService.debug("Destination service response", {
        status: submitResponse.status,
        statusText: submitResponse.statusText,
        headers: Object.fromEntries([...submitResponse.headers.entries()]),
        package: cnlData.package,
      });

      loggerService.info("Successfully submitted package to destination service", {
        package: cnlData.package,
        destination: config.destinationUrl,
      });

      loggerService.debug("Full request data posted", {
        formData: {
          passwords: cnlData.passwords || "",
          source: cnlData.source || "",
          package: cnlData.package || "",
          jk: cnlData.jk,
          crypted: cnlData.crypted,
        },
      });
    } catch (err) {
      loggerService.error("Failed to submit package to destination service", {
        error: err,
        package: cnlData.package,
        destination: config.destinationUrl,
      });
      throw err; // Re-throw to allow caller to handle the error
    }

    return CnlData.crypted;
  }
}

// Export singleton instance
export const cnlService: CnlService = CnlService.getInstance();
