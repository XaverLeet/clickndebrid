import { ProcessingResult } from "./debrid";

export interface CnlData {
  crypted: string;
  jk: string;
  passwords: string;
  package: string;
  source: string;
  decrypted?: string;
  files?: ProcessingResult;
}
