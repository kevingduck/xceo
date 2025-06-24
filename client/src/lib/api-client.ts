interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
  timestamp: string;
  path?: string;
}

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromResponse(response: ApiError): ApiClientError {
    return new ApiClientError(
      response.statusCode,
      response.code,
      response.message,
      response.details
    );
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

class ApiClient {
  private baseUrl: string = '';
  private defaultTimeout: number = 30000; // 30 seconds

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, ...fetchOptions } = options;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...fetchOptions.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new ApiClientError(
            response.status,
            'INVALID_RESPONSE',
            `Server returned non-JSON response: ${response.statusText}`
          );
        }
        return response.text() as T;
      }

      const data = await response.json();

      if (!response.ok) {
        throw ApiClientError.fromResponse(data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(
          408,
          'TIMEOUT',
          `Request timed out after ${timeout}ms`
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiClientError(
          0,
          'NETWORK_ERROR',
          'Network error: Please check your internet connection'
        );
      }

      // Re-throw ApiClientError
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Unknown error
      throw new ApiClientError(
        500,
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Helper function for React Query
export function createQueryFn<T>(endpoint: string) {
  return async () => apiClient.get<T>(endpoint);
}

// Helper function for mutations
export function createMutationFn<TData, TVariables>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) {
  return async (variables: TVariables) => {
    switch (method) {
      case 'POST':
        return apiClient.post<TData>(endpoint, variables);
      case 'PUT':
        return apiClient.put<TData>(endpoint, variables);
      case 'PATCH':
        return apiClient.patch<TData>(endpoint, variables);
      case 'DELETE':
        return apiClient.delete<TData>(endpoint);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  };
}