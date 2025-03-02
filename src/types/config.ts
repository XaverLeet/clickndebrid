/** Redis configuration interface */
export interface RedisConfig {
  /** Whether Redis is enabled (default: true) */
  enabled: boolean;
  /** Redis URL (default: "redis://localhost:6379") */
  url: string;
  /** Redis username (optional) */
  username?: string;
  /** Redis password (optional) */
  password?: string;
  /** Redis TTL in seconds (default: 3600) */
  ttl: number;
}

/** Supported debrid services */
export type DebridServiceType = "realdebrid";

/** Main application configuration interface */
export interface Config {
  /** URL of the CNL-compatible destination service (e.g., PyLoad) */
  destinationUrl: string;
  /** The debrid service to use (default: "realdebrid") */
  debridService: DebridServiceType;
  /** The port to listen on (default: 3000) */
  port: number;
  /** Redis configuration */
  redis: RedisConfig;
  /** Real-Debrid API token */
  realDebridApiToken: string;
  /** Log level (default: "info") */
  logLevel: "error" | "warn" | "info" | "debug";
  /** Whether to error on API errors (default: false) */
  errorOnApiError: boolean;
}
