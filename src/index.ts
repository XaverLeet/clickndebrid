/*
 * clickndebrid - A Click'n'Load proxy server that converts links via debrid services API and submits them to PyLoad et al.
 * Copyright (C) 2023-2025 XaverLeet
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
 * ClicknDebrid Application Entry Point
 *
 * This is the main entry point for the ClicknDebrid application. It:
 * - Loads environment variables and configuration
 * - Sets up graceful shutdown handlers
 * - Initializes the Express application
 * - Configures error handling for uncaught exceptions
 * - Starts the HTTP server
 *
 * The application flow:
 * 1. Load environment variables before any other imports
 * 2. Initialize Redis client (but don't connect yet - that happens in app.ts)
 * 3. Set up process event handlers for graceful shutdown
 * 4. Start the server and listen for connections
 */

// Load environment variables first, before any other imports
import { loadEnvironment, config, validateConfig, logEnvironmentInfo } from "./config/index.js";

// Load environment variables immediately
const envLoadResult = loadEnvironment();

// Now it's safe to import other modules that use environment variables
import { createApp } from "./app.js";
import { loggerService } from "./services/loggerService.js";
// Import RedisClientSingleton instead of the initialized instance
import { RedisClientSingleton } from "./services/redis/redisClient.js";
import { Server } from "http";
// Import package.json for version information
import packageJson from "../package.json" with { type: "json" };

// Initialize the Redis client singleton (but don't connect yet)
const redisClient = RedisClientSingleton.getInstance();

let server: Server;

/**
 * Graceful shutdown function
 *
 * Handles application shutdown by:
 * 1. Stopping the HTTP server gracefully
 * 2. Closing the Redis connection if enabled
 * 3. Logging shutdown progress
 * 4. Terminating the process with appropriate exit code
 *
 * Includes timeouts to force termination if graceful shutdown takes too long.
 *
 * @param {string} signal - The signal that triggered the shutdown (SIGTERM, SIGINT, etc.)
 */
async function shutdown(signal: string) {
  loggerService.info(`${signal} received, shutting down gracefully`);

  // Set a shorter timeout for the graceful shutdown
  const shutdownTimeout = setTimeout(() => {
    loggerService.warn("Graceful shutdown timed out, forcing exit");
    process.exit(0); // Use 0 as this is an expected timeout
  }, 3000); // 3 seconds timeout

  try {
    if (server) {
      // Stop accepting new connections immediately
      server.unref();
      // Force close existing connections after 1 second
      setTimeout(() => {
        server.close();
      }, 1000);
      loggerService.info("Server stopping");
    }

    // Close Redis connection if enabled
    if (config.redis.enabled) {
      await Promise.race([
        redisClient.disconnect(),
        new Promise((resolve) => setTimeout(resolve, 1000)), // 1 second timeout for Redis
      ]);
      loggerService.info("Redis connection closed");
    }

    clearTimeout(shutdownTimeout);
    loggerService.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    loggerService.error("Error during graceful shutdown", { error });
    clearTimeout(shutdownTimeout);
    process.exit(0); // Use 0 as errors during shutdown are not critical
  }
}

// Graceful shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error: Error) => {
  loggerService.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  // Attempt graceful shutdown
  shutdown("UNCAUGHT_EXCEPTION").catch(() => process.exit(1));
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  loggerService.error("Unhandled rejection", {
    error: error.message,
    stack: error.stack,
    promise,
  });
  // Attempt graceful shutdown
  shutdown("UNHANDLED_REJECTION").catch(() => process.exit(1));
});

/**
 * Start the server and initialize the application
 *
 * This function:
 * 1. Logs environment information
 * 2. Validates configuration
 * 3. Creates and initializes the Express application
 * 4. Starts the HTTP server on the configured port
 *
 * If any errors occur during startup, they are logged and the process exits.
 */
const startServer = async () => {
  try {
    // Log environment info using the real logger service
    logEnvironmentInfo(envLoadResult);

    // Log version information
    loggerService.info(`Starting clickndebrid version ${packageJson.version}`);

    // Validate configuration
    validateConfig();

    // Create the app
    const app = await createApp();

    // Start the server
    server = app.listen(config.port, () => {
      loggerService.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    loggerService.error("Failed to start server", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    });
    console.error("Startup error:", error);
    process.exit(1);
  }
};

// Start the application
startServer();
