export interface LogMetadata {
  metadata?: Record<string, unknown>;
}

export interface LoggerService {
  error(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  setLevel(level: string): void;
}
