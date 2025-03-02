/**
 * Standard API response interface for consistent response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

/**
 * Creates a standardized API response object
 * @param data - The data to include in the response
 * @param success - Whether the request was successful (defaults to true)
 * @param meta - Optional metadata to include in the response
 * @returns A standardized API response object
 */
export const createResponse = <T>(
  data: T, 
  success = true, 
  meta?: Record<string, unknown>
): ApiResponse<T> => ({
  success,
  data,
  meta
});

/**
 * Creates an error response object
 * @param error - The error message or object
 * @param meta - Optional metadata to include in the response
 * @returns A standardized API error response object
 */
export const createErrorResponse = (
  error: string | Error,
  meta?: Record<string, unknown>
): ApiResponse<null> => ({
  success: false,
  error: typeof error === 'string' ? error : error.message,
  meta
});
