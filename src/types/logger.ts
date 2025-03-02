export interface LogMetadata {
  metadata?: Record<string, any>;
}

export interface LoggerService {
  error(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  setLevel(level: string): void;
}
