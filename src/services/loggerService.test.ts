import { loggerService } from "./loggerService.js";
import winston from "winston";
import { jest } from "@jest/globals";

// Mock winston
jest.mock("winston", () => ({
  format: {
    combine: jest.fn().mockReturnValue("combinedFormat"),
    timestamp: jest.fn().mockReturnValue("timestampFormat"),
    printf: jest.fn().mockImplementation((_formatter) => "printfFormat"),
    colorize: jest.fn().mockReturnValue("colorizeFormat"),
    json: jest.fn().mockReturnValue("jsonFormat"),
  },
  transports: {
    Console: jest.fn().mockImplementation(() => ({ name: "consoleTransport" })),
  },
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    level: "info",
  }),
}));

// Mock loggerService module
jest.mock("./loggerService.js", () => {
  return {
    loggerService: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      setLevel: jest.fn(),
    },
  };
});

describe("LoggerService", () => {
  let mockWinstonLogger: {
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
    debug: jest.Mock;
    level: string;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock winston logger
    mockWinstonLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      level: "info",
    };

    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);
  });

  describe("loggerService", () => {
    it("should be defined", () => {
      expect(loggerService).toBeDefined();
    });
  });

  describe("error", () => {
    it("should call winston logger error with correct arguments", () => {
      const message = "Test error message";
      const metadata = { context: "test" };

      loggerService.error(message, metadata);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining(metadata)
      );
    });

    it("should call winston logger error with just message when no metadata", () => {
      const message = "Test error message";

      loggerService.error(message);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {});
    });
  });

  describe("warn", () => {
    it("should call winston logger warn with correct arguments", () => {
      const message = "Test warning message";
      const metadata = { context: "test" };

      loggerService.warn(message, metadata);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        message,
        expect.objectContaining(metadata)
      );
    });
  });

  describe("info", () => {
    it("should call winston logger info with correct arguments", () => {
      const message = "Test info message";
      const metadata = { context: "test" };

      loggerService.info(message, metadata);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining(metadata)
      );
    });
  });

  describe("debug", () => {
    it("should call winston logger debug with correct arguments", () => {
      const message = "Test debug message";
      const metadata = { context: "test" };

      loggerService.debug(message, metadata);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        message,
        expect.objectContaining(metadata)
      );
    });
  });

  describe("setLevel", () => {
    it("should change winston logger level", () => {
      loggerService.setLevel("debug");

      expect(mockWinstonLogger.level).toBe("debug");
    });

    it("should handle invalid level by keeping existing level", () => {
      const originalLevel = mockWinstonLogger.level;

      loggerService.setLevel("invalid");

      expect(mockWinstonLogger.level).toBe(originalLevel);
    });
  });
});
