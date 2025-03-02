/*
 * clickndebrid - A Click'n'Load proxy server that converts links via real-debrid.com API and submits them to PyLoad et al.
 * Copyright (C) 2023 XaverLeet
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Configuration Module
 *
 * This module handles loading, validating, and providing access to application configuration.
 * It supports configuration through:
 * - Environment variables
 * - .env file
 *
 * The configuration includes:
 * - Server settings (port, destination URL)
 * - Debrid service settings (API tokens, service selection)
 * - Redis configuration (connection, authentication)
 * - Logging settings
 *
 * The module validates critical configuration options and provides sensible defaults.
 */

import { loggerService } from "../services/loggerService.js";
import { Config, DebridServiceType } from "../types/config.js";
import * as dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * Result of loading environment variables
 */
export interface EnvLoadResult {
  /** Whether the .env file was found and loaded */
  loaded: boolean;
  /** The path to the .env file that was loaded, if any */
  path?: string;
  /** Any error that occurred while loading the .env file */
  error?: Error;
  /** The source of environment variables (file or system) */
  source: "file" | "system";
}

/**
 * Loads environment variables from .env file if it exists,
 * otherwise uses system environment variables.
 *
 * @returns {EnvLoadResult} Result of loading environment variables
 */
export const loadEnvironment = (): EnvLoadResult => {
  const envPath = resolve(process.cwd(), ".env");

  if (existsSync(envPath)) {
    // Load .env file if it exists
    try {
      const result = dotenv.config({ path: envPath });

      if (result.error) {
        return {
          loaded: false,
          path: envPath,
          error: result.error,
          source: "system", // Fallback to system env vars on error
        };
      }

      return {
        loaded: true,
        path: envPath,
        source: "file",
      };
    } catch (error) {
      return {
        loaded: false,
        path: envPath,
        error: error instanceof Error ? error : new Error(String(error)),
        source: "system", // Fallback to system env vars on error
      };
    }
  } else {
    // No .env file found, using system environment variables
    return {
      loaded: false,
      source: "system",
    };
  }
};

/**
 * Logs information about the environment source
 * @param envLoadResult The result of loading environment variables
 */
export const logEnvironmentInfo = (envLoadResult: EnvLoadResult): void => {
  if (envLoadResult.source === "file") {
    loggerService.info(`Environment variables loaded from .env file: ${envLoadResult.path}`);
  } else {
    if (envLoadResult.path) {
      if (envLoadResult.error) {
        loggerService.warn(
          `Error loading .env file (${envLoadResult.path}): ${envLoadResult.error.message}`
        );
        loggerService.warn("Using system environment variables as fallback");
      } else {
        loggerService.info("No .env file found, using system environment variables");
      }
    } else {
      loggerService.info("Using system environment variables");
    }
  }
};

// Helper function to validate log level
const validateLogLevel = (level: string | undefined): Config["logLevel"] => {
  const validLevels = ["error", "warn", "info", "debug"] as const;
  return validLevels.includes(level as Config["logLevel"]) ? (level as Config["logLevel"]) : "info";
};

// Helper function to validate debrid service
const validateDebridService = (service: string | undefined): DebridServiceType => {
  return service === "realdebrid" ? service : "realdebrid";
};

/**
 * Application configuration object
 *
 * This object contains all configuration settings for the application, loaded
 * from environment variables with sensible defaults.
 *
 * Environment variables:
 * - CND_DESTINATION_URL: URL to forward links to (e.g., download manager URL)
 * - CND_DEBRIDSERVICE: Which debrid service to use (currently only 'realdebrid')
 * - CND_PORT: Port for the server to listen on (default: 9666)
 * - CND_REDIS_*: Redis connection settings
 * - CND_LOG_LEVEL: Logging verbosity (error, warn, info, debug)
 * - CND_REALDEBRID_APITOKEN: API token for Real-Debrid
 */
export const config: Config = {
  destinationUrl: process.env.CND_DESTINATION_URL || "http://localhost:8000",
  debridService: validateDebridService(process.env.CND_DEBRIDSERVICE),
  port: parseInt(process.env.CND_PORT || "9666", 10),
  redis: {
    enabled: process.env.CND_REDIS_ENABLED !== "false",
    url: process.env.CND_REDIS_URL || "redis://localhost:6379",
    username: process.env.CND_REDIS_USERNAME,
    password: process.env.CND_REDIS_PASSWORD,
    ttl: parseInt(process.env.CND_REDIS_TTL || "86400", 10),
  },
  logLevel: validateLogLevel(process.env.CND_LOG_LEVEL),
  errorOnApiError: process.env.CND_ERROR_ON_API_ERROR === "true",
  realDebridApiToken: process.env.CND_REALDEBRID_APITOKEN || "",
};

/**
 * Validates the application configuration
 *
 * This function checks critical configuration settings and logs warnings or errors
 * if essential settings are missing or invalid. It:
 *
 * 1. Verifies that the Real-Debrid API token is set
 * 2. Logs information about Redis configuration
 *
 * A validation failure doesn't stop the application but logs appropriate errors
 * to help with troubleshooting.
 */
export const validateConfig = (): void => {
  if (!config.realDebridApiToken) {
    loggerService.error("CND_REALDEBRID_APITOKEN not set, service will not work properly");
  }

  // Log Redis configuration
  if (config.redis.enabled) {
    loggerService.info(
      `Redis is enabled, using URL: ${config.redis.url || "redis://localhost:6379"}`
    );
  }
  // The log message about using memory cache is already handled in cacheFactory.ts
};
