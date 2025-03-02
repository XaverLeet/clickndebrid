import { ProcessingResult } from "./debrid.js";

export interface CnlData {
  crypted: string;
  jk: string;
  passwords: string;
  package: string;
  source: string;
  decrypted?: string;
  files?: ProcessingResult;
}
