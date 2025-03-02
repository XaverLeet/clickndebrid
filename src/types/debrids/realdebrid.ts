export type DebridPluginType = "realdebrid";

// Real-Debrid API Response Types
export interface RealDebridUnrestrictResponse {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  chunks: number;
  crc: number;
  download: string;
  streamable: number;
}

export interface RealDebridErrorResponse {
  error: string;
  error_code?: number;
}

export interface RealDebridHostStatus {
  status: "up" | "down";
  supported: 0 | 1;
  check_time: string;
}

export interface RealDebridUserData {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: string;
  premium: number;
  expiration: string;
}
