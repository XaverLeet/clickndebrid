import CryptoJS from "crypto-js";
import { CnlData } from "../types";
import { loggerService } from "./loggerService";

/** Interface for encryption/decryption operations */
export interface ICryptoService {
  /**
   * Decrypt CNL request content
   * @param cnlData The CNL data containing encrypted data and key
   * @returns Updated CnlData with decrypted content
   */
  decrypt(cnlData: CnlData): CnlData;

  /**
   * Encrypt content for CNL response
   * @param cnlData The CNL data containing content to encrypt
   * @returns Updated CnlData with encrypted content
   */
  encrypt(cnlData: CnlData): CnlData;
}

export class CryptoService implements ICryptoService {
  private readonly keyFunctionRegex = /return ["']([\dA-Fa-f]+)["']/;

  private getKey(jk: string): CryptoJS.lib.WordArray {
    loggerService.debug("Extracting key from JK");
    const match = jk.match(this.keyFunctionRegex);
    if (!match?.[1]) {
      loggerService.error("Failed to extract key from JK", { jk });
      return CryptoJS.enc.Hex.parse("");
    }
    return CryptoJS.enc.Hex.parse(match[1]);
  }

  decrypt(cnlData: CnlData): CnlData {
    loggerService.debug("Decrypting CNL request");
    const key = this.getKey(cnlData.jk);

    const decrypted = CryptoJS.AES.decrypt(cnlData.crypted, key, {
      mode: CryptoJS.mode.CBC,
      iv: key,
    })
      .toString(CryptoJS.enc.Utf8)
      .replace(/\s+/g, "\n");

    // Return a new CnlData object with the decrypted content
    return {
      ...cnlData,
      decrypted,
    };
  }

  encrypt(cnlData: CnlData): CnlData {
    loggerService.debug("Encrypting CNL response");

    if (!cnlData.files || cnlData.files.results.length === 0) {
      loggerService.error("No links to encrypt", cnlData);
      throw new Error("No links to encrypt");
    }

    // Convert processed links to newline-separated string
    const processedLinksString = cnlData.files.results
      .map((r) => r.processed)
      .join("\r\n");

    const key = this.getKey(cnlData.jk);

    const encryptedContent = CryptoJS.AES.encrypt(processedLinksString, key, {
      mode: CryptoJS.mode.CBC,
      iv: key,
    }).toString();

    // Return a new CnlData object with the encrypted content
    return {
      ...cnlData,
      crypted: encryptedContent,
    };
  }
}

export const cryptoService = new CryptoService();
