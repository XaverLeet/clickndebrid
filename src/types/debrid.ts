import { CnlData as _CnlData } from "./cnl.js";

export interface ProcessedLink {
  /** Original link before processing */
  original: string;
  /** Processed debrid link, or original link if processing failed */
  processed: string;
  /** Whether the link was successfully processed */
  success: boolean;
  /** Error message if processing failed */
  error?: string;
  /** Timestamp when the link was processed (in UTC) */
  processedAt: string;
  /** Filename of the processed file */
  filename?: string;
  /** Size of the file in bytes */
  filesize?: number;
}

/** Result of a batch link processing operation */
export interface ProcessingResult {
  /** Array of processed links with their results */
  results: ProcessedLink[];
  /** Statistics about the processing operation */
  stats: {
    /** Timestamp when processing was finished (in UTC) */
    processedAt: string;
    /** Name of the debrid service used for processing */
    debridService: string;
    /** Total number of links submitted */
    totalLinks: number;
    /** Number of valid links (non-empty) */
    validLinks: number;
    /** Number of skipped links (empty) */
    skippedLinks: number;
    /** Number of successfully processed links */
    successCount: number;
    /** Number of failed links */
    failureCount: number;
    /** Success rate as a percentage */
    successRate: number;
    /** Total processing time in milliseconds */
    processingTimeMs: number;
  };
}
