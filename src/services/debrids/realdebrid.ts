import { loggerService } from "../loggerService";
import {
  RealDebridUnrestrictResponse,
  RealDebridErrorResponse,
} from "../../types/debrids/realdebrid";
import { config } from "../../config";

const API_BASE_URL = "https://api.real-debrid.com/rest/1.0";

/**
 * Call the Real-Debrid API with proper error handling and logging
 */
async function callRealDebridApi<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  loggerService.debug("Making Real-Debrid API request", {
    url,
    method: requestOptions.method || "GET",
    headers: requestOptions.headers,
  });

  try {
    const response = await fetch(url, requestOptions);
    const data = await response.json();

    loggerService.debug("Received Real-Debrid API response", {
      status: response.status,
      data,
    });

    if (!response.ok) {
      const error = data as RealDebridErrorResponse;
      throw new Error(
        `Real-Debrid API error: ${error.error} (${
          error.error_code || "unknown code"
        })`
      );
    }

    return data as T;
  } catch (error) {
    loggerService.error("Error calling Real-Debrid API", {
      url,
      method: requestOptions.method || "GET",
      error,
    });
    throw error;
  }
}

/**
 * Convert a link using Real-Debrid's unrestrict service
 */
export async function getLinkFromDebridService(
  link: string
): Promise<RealDebridUnrestrictResponse> {
  loggerService.debug("Attempting to unrestrict link", { link });

  try {
    // Prepare form data
    const formData = new URLSearchParams();
    formData.append("link", link);

    const unrestrict = await callRealDebridApi<RealDebridUnrestrictResponse>(
      "/unrestrict/link",
      config.realDebridApiToken,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    );

    if (unrestrict.download) {
      loggerService.debug("Successfully unrestricted link", {
        originalLink: link,
        unrestrictedLink: unrestrict.download,
        filename: unrestrict.filename,
        filesize: unrestrict.filesize,
      });
      return unrestrict;
    } else {
      throw new Error("No download link in response");
    }
  } catch (error) {
    loggerService.error("Error unrestricting link", { error, link });
    throw error;
  }
}
