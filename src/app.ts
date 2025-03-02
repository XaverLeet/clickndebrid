/**
 * Main application module for ClicknDebrid
 *
 * This module sets up the Express application with all necessary middleware,
 * view engines, static file serving, Redis connection, and route configurations.
 * It configures the application to handle Click'n'Load requests and process
 * them through debrid services.
 */
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import ejsLayouts from "express-ejs-layouts";
import { config } from "./config/index.js";
import routes from "./routes/index.js";
import { loggerService } from "./services/loggerService.js";
import { RedisClientSingleton } from "./services/redis/redisClient.js";
import { requestLogger } from "./middleware/requestLogger.js";
import packageJson from "../package.json" with { type: "json" };

// Get current file path for ES modules (replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get singleton Redis client instance for use throughout the application
const redisClient = RedisClientSingleton.getInstance();

/**
 * Creates and configures the Express application
 *
 * This function:
 * 1. Initializes Redis connection if enabled
 * 2. Configures logging
 * 3. Sets up middleware (body parsing, static files)
 * 4. Configures view engine and layouts
 * 5. Sets up application routes
 *
 * @returns {Promise<express.Application>} Configured Express application
 */
export const createApp = async () => {
  const app = express();

  // Initialize Redis if enabled
  if (config.redis.enabled) {
    try {
      // Add a timeout to prevent stalling if Redis is not available
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis connection timeout")), 5000)
        ),
      ]);

      // Only log success if we're actually connected
      if (!redisClient.isConnected()) {
        throw new Error("Failed to connect to Redis server");
      }
    } catch (error) {
      loggerService.error("Failed to initialize Redis client, falling back to memory cache", {
        error,
      });
      // Disable Redis for this session if connection fails
      config.redis.enabled = false;
    }
  }
  // The log message about using memory cache is already handled in cacheFactory.ts

  // Configure logger after Redis is ready
  loggerService.setLevel(config.logLevel || "info");

  // Request logging middleware
  app.use(requestLogger);

  // Body parsing middleware
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text({ type: "text/*" }));
  app.use(bodyParser.json());

  // Set up EJS templating engine
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(ejsLayouts);
  app.set("layout", "layouts/main");

  // Set global view variables - use app.locals for variables needed in layouts
  app.locals.version = packageJson.version;

  // Serve static files
  app.use(express.static(path.join(__dirname, "public")));

  // Routes
  app.use("/", routes);

  return app;
};
