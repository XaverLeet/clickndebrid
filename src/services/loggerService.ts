import * as winston from "winston";
import chalk from "chalk";
import { LoggerService, LogMetadata as _LogMetadata, Config as _Config } from "../types/index.js";
import { config as _config } from "../config/index.js";

// Internal implementation
export class WinstonLoggerService implements LoggerService {
  private static _instance: WinstonLoggerService;
  private _logger: winston.Logger;

  private constructor() {
    this._logger = this.createLogger();
  }

  public static getInstance(): WinstonLoggerService {
    if (!WinstonLoggerService._instance) {
      WinstonLoggerService._instance = new WinstonLoggerService();
    }
    return WinstonLoggerService._instance;
  }

  private createLogger(): winston.Logger {
    const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      let coloredLevel: string;

      switch (level) {
        case "error":
          coloredLevel = chalk.red(level);
          break;
        case "warn":
          coloredLevel = chalk.yellow(level);
          break;
        case "info":
          coloredLevel = chalk.blue(level);
          break;
        default:
          coloredLevel = level;
      }

      // Only stringify metadata if it has properties and isn't empty
      const meta =
        metadata && Object.keys(metadata).length && !metadata.hasOwnProperty("metadata")
          ? " " + JSON.stringify(metadata, null, 2)
          : "";

      return `${timestamp} [${coloredLevel}]: ${message}${meta}`;
    });

    return winston.createLogger({
      level: "info", // Default level, can be changed later via setLevel
      format: winston.format.combine(winston.format.timestamp(), winston.format.json(), logFormat),
      transports: [new winston.transports.Console()],
    });
  }

  public error(message: string, metadata?: Record<string, unknown>): void {
    this._logger.error(message, metadata || {});
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this._logger.warn(message, metadata || {});
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this._logger.info(message, metadata || {});
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this._logger.debug(message, metadata || {});
  }

  public setLevel(level: string): void {
    this._logger.level = level;
  }
}

// Export singleton instance
export const loggerService: LoggerService = WinstonLoggerService.getInstance();
