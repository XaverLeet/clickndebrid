import { createResponse, createErrorResponse, ApiResponse } from './apiResponse';

describe('API Response Utilities', () => {
  describe('createResponse', () => {
    it('should create a successful response with data', () => {
      const testData = { name: 'test', value: 123 };
      const response = createResponse(testData);
      
      expect(response).toEqual({
        success: true,
        data: testData,
        error: undefined
      });
    });

    it('should create a successful response with empty data', () => {
      const response = createResponse(null);
      
      expect(response).toEqual({
        success: true,
        data: null,
        error: undefined
      });
    });

    it('should handle arrays as data', () => {
      const testArray = [1, 2, 3];
      const response = createResponse(testArray);
      
      expect(response).toEqual({
        success: true,
        data: testArray,
        error: undefined
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with a message', () => {
      const errorMessage = 'Something went wrong';
      const response = createErrorResponse(errorMessage);
      
      expect(response).toEqual({
        success: false,
        data: undefined,
        error: errorMessage
      });
    });

    it('should create an error response with an Error object', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error);
      
      expect(response).toEqual({
        success: false,
        data: undefined,
        error: 'Test error'
      });
    });

    it('should handle empty error message', () => {
      const response = createErrorResponse('');
      
      expect(response).toEqual({
        success: false,
        data: undefined,
        error: ''
      });
    });
  });

  // Type checking tests (these don't actually run but verify TypeScript types)
  it('should properly type the ApiResponse interface', () => {
    // Success response with string data
    const stringResponse: ApiResponse<string> = {
      success: true,
      data: 'test string',
      error: undefined
    };
    
    // Success response with object data
    const objectResponse: ApiResponse<{id: number}> = {
      success: true,
      data: {id: 123},
      error: undefined
    };
    
    // Error response
    const errorResponse: ApiResponse<never> = {
      success: false,
      data: undefined,
      error: 'Error message'
    };
    
    // These variables are just for type checking and won't be used
    expect(stringResponse).toBeDefined();
    expect(objectResponse).toBeDefined();
    expect(errorResponse).toBeDefined();
  });
});
