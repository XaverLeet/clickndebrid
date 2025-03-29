// This utility provides mock helpers for ESM modules in Jest

/**
 * Create a manual mock for ESM modules to avoid issues with Jest mocking
 */
export function createMock<T extends object>(overrides: Partial<T> = {}): T {
  return new Proxy({} as T, {
    get(target, prop) {
      // Return override if it exists
      if (prop in overrides) {
        return overrides[prop as keyof typeof overrides];
      }

      // Create a mock function with mock methods
      if (typeof prop === "string" && !["then", "catch", "finally"].includes(prop)) {
        const mockFn = jest.fn();

        // Add common mock methods
        mockFn.mockReturnValue = jest.fn().mockImplementation((val) => {
          mockFn.mockImplementation(() => val);
          return mockFn;
        });

        mockFn.mockResolvedValue = jest.fn().mockImplementation((val) => {
          mockFn.mockImplementation(() => Promise.resolve(val));
          return mockFn;
        });

        mockFn.mockRejectedValue = jest.fn().mockImplementation((val) => {
          mockFn.mockImplementation(() => Promise.reject(val));
          return mockFn;
        });

        mockFn.mockImplementation = jest.fn().mockImplementation((impl) => {
          Object.defineProperty(mockFn, "implementation", {
            value: impl,
            configurable: true,
          });

          const originalFn = mockFn;
          const newFn = (...args: any[]) => impl(...args);

          // Copy all properties from originalFn to newFn
          Object.keys(originalFn).forEach((key) => {
            newFn[key] = originalFn[key];
          });

          return newFn;
        });

        return mockFn;
      }

      return undefined;
    },
  });
}

/**
 * Create mock functions for API responses
 */
export function createApiResponseMocks() {
  const createResponseMock = jest.fn((data) => ({ success: true, data }));
  const createErrorResponseMock = jest.fn((message) => ({ success: false, error: message }));

  return {
    createResponse: createResponseMock,
    createErrorResponse: createErrorResponseMock,
  };
}
