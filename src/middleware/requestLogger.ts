import { Request, Response, NextFunction } from "express";
import { loggerService } from "../services/loggerService.js";

type RequestLogMetadata = {
  requestId: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
};

type ResponseLogMetadata = {
  requestId: string;
  method: string;
  url: string;
  status: number;
  duration: number;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Assert that these properties exist and are strings
  const method = req.method as string;
  const url = req.url as string;
  const ip = req.ip as string;
  const userAgent = req.get("user-agent") || "unknown";

  const requestMetadata: RequestLogMetadata = {
    requestId,
    method,
    url,
    ip,
    userAgent,
  };

  loggerService.info(`Incoming ${method} request`, requestMetadata);

  res.on("finish", () => {
    const responseMetadata: ResponseLogMetadata = {
      requestId,
      method,
      url,
      status: res.statusCode,
      duration: Date.now() - start,
    };

    loggerService.info(`Request completed`, responseMetadata);
  });

  next();
};
